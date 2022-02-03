import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

type Package = {
  name: string;
  version?: string;
  license?: string;
  licenseFile?: Array<string>;
  repository?: string;
  publisher?: string;
  email?: string;
  url?: string;
  dependencies?: Array<Package>;
  devDependencies?: Array<Package>;
};

type CollectOptions = {
  excludes?: Array<string>;
  includePrivate?: boolean;
  includeDevDependencies?: boolean;
  deep?: boolean;
  maxNest?: number;
};

const collect = (rootDir: string, options?: CollectOptions) => {
  return collectImpl(rootDir, rootDir, options ?? {}, 0);
};

const collectImpl = (dir: string, rootDir: string, options: CollectOptions, nest: number) => {
  const packageJson = JSON.parse(readFileSync(path.join(dir, "package.json")).toString());
  const pkgName = packageJson.name ?? "";
  if (nest > 0) {
    if ((options.excludes?.indexOf(pkgName) ?? -1) >= 0) return null;
    if (options.includePrivate !== true && packageJson.private === true) return null;
  }
  if (nest > 1) {
    if (options.deep !== true) return null;
    if (options.maxNest != null && nest > options.maxNest) return null;
  }

  const pkg: Package = {
    name: pkgName,
    version: packageJson.version ?? "",
    license: packageJson.license ?? "",
  };

  const repo = packageJson.repository;
  if (repo != null) {
    if (typeof repo === "string") pkg.repository = repo;
    else if (repo.url) pkg.repository = repo.url ?? "";
  }

  const author = packageJson.author;
  if (author != null) {
    if (typeof author === "string") {
      const ctx = author.match(/^([^<(]+?)?\s*(?:<([^>(]+?)>)?\s*(?:\(([^)]+?)\)|$)/);
      if (ctx) {
        if (ctx[1]) pkg.publisher = ctx[1];
        if (ctx[2]) pkg.email = ctx[2];
        if (ctx[3]) pkg.url = ctx[3];
      }
    } else {
      if (author.name) pkg.publisher = author.name;
      if (author.email) pkg.email = author.email;
      if (author.url) pkg.url = author.url;
    }
  }


  const licenseFiles = findLicenseFileNames(path.join(dir));
  if (licenseFiles.length > 0) pkg.licenseFile = licenseFiles;

  const deps = packageJson.dependencies ?? {};
  Object.keys(deps).forEach(name => {
    if (pkg.dependencies == null) pkg.dependencies = [];
    try {
      const cpkg = collectImpl(path.join(rootDir, "node_modules", name), rootDir, options, nest + 1);
      if (cpkg == null) return;
      pkg.dependencies.push(cpkg);
    } catch (err) {
      console.log(`# ERR: dependencies ${dir} > ${name}`);
      throw err;
    }
  });

  if (options?.includeDevDependencies && nest === 0) {
    const devDeps = packageJson.devDependencies ?? {};
    Object.keys(devDeps).forEach(name => {
      if (pkg.devDependencies == null) pkg.devDependencies = [];
      try {
        const cpkg = collectImpl(path.join(rootDir, "node_modules", name), rootDir, options, nest + 1);
        if (cpkg == null) return;
        pkg.devDependencies.push(cpkg);
      } catch (err) {
        console.log(`# ERR: devDependencies ${dir} > ${name}`);
        throw err;
      }
    });
  }
  return pkg;
};

const findLicenseFileNames = (dir: string) => {
  const fileNames = readdirSync(dir);
  const rets: Array<string> = [];
  for (const fn of fileNames) {
    const ctx = fn.match(/^(license|copying|ofl|patents)/i);
    if (ctx == null) continue;
    const ffn = path.join(dir, fn);
    if (statSync(ffn).isDirectory()) {
      readdirSync(ffn).forEach(cfn => rets.push(path.join(fn, cfn)));
      continue;
    }
    rets.push(fn);
  }
  return rets;
};

type ConvertOptions = {
  includeRoot?: boolean;
  onlyNeeded?: boolean;
};

const format = (pkg: Package, formatType: string, options?: ConvertOptions) => {
  const opts = options ?? {};
  if (formatType === "csv") return formatToCsv(pkg, opts);
  if (formatType === "json") return formatToJson(pkg, opts);
  return formatToList(pkg, pkg, opts);
};

const endLine = "\n";
const formatToList = (pkg: Package, rootPkg: Package, options: ConvertOptions) => {
  let ret = "";
  const writePkg = (p: Package, nest: number, dev?: boolean) => {
    const nestStr = "|   ".repeat(Math.max(0, nest - (options?.includeRoot === true ? 0 : 1)));
    const append = (str: string) => ret += nestStr + str + endLine;
    const appendInfo = nest > 0 || options.includeRoot === true;
    const pre = `${dev ? "-" : "+"} `, npre = `|   `;
    if (options?.onlyNeeded === true) {
      const checkRet = checkOne(p, rootPkg);
      if (!checkRet.write) return;
    }
    if (appendInfo) {
      append(`${pre}${p.name}`);
      append(`${npre}version: ${p.version}`);
      append(`${npre}license: ${p.license ?? ""}`);
      if (p.licenseFile && p.licenseFile.length > 0) append(`${npre}licenseFile: ./node_modules/${p.name}/${p.licenseFile.join(",")}`);
      if (p.publisher) append(`${npre}publisher: ${p.publisher}`);
      if (p.email) append(`${npre}email: ${p.email}`);
      if (p.url) append(`${npre}url: ${p.url}`);
      if (p.repository) append(`${npre}repository: ${p.repository}`);
    }
    if (p.dependencies && p.dependencies.length > 0) p.dependencies.forEach(cp => writePkg(cp, nest + 1));
    if (p.devDependencies && p.devDependencies.length > 0) p.devDependencies.forEach(cp => writePkg(cp, nest + 1, true));
  };
  writePkg(pkg, 0);
  return ret;
};

const formatToCsv = (_pkg: Package, _options: ConvertOptions) => {
  let ret = "";
  return ret;
};

const formatToJson = (pkg: Package, options: ConvertOptions) => {
  if (options.includeRoot === true) return JSON.stringify(pkg, null, 2);
  return JSON.stringify({
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  }, null, 2);
};

type CheckOptions = {
  disclose?: boolean;
  deep?: boolean;
};

const check = (pkg: Package, options?: CheckOptions) => {
  const messages: Array<{ type: "err" | "warn"; message: string; }> = [];
  checkImpl(pkg, pkg, messages, options ?? {}, 0);
  return messages;
};

const checkImpl = (pkg: Package, rootPkg: Package, messages: Array<{ type: "err" | "warn"; message: string; }>, options: CheckOptions, nest: number) => {
  if (nest > 0) checkOne(pkg, rootPkg, messages);
  pkg.dependencies?.forEach(p => {
    checkImpl(p, rootPkg, messages, options, nest + 1);
  });
  pkg.devDependencies?.forEach(p => {
    checkImpl(p, rootPkg, messages, options, nest + 1);
  });
};

const checkOne = (pkg: Package, _rootPkg: Package, messages?: Array<{ type: "err" | "warn"; message: string; }>) => {
  // TODO: check
  const l = pkg.license, msgs: Array<{ type: "err" | "warn"; message: string; }> = [];
  const ret = {
    write: false,
  };
  if (l.match(/^cc0/i)) {
    // CC0
  } else if (l.match(/mit/i)) {
    // MIT
  } else if (l.match(/isc/i)) {
    // ISC
  } else if (l.match(/bsd/i)) {
    // BSD
    if (l.match(/4/i)) {
      msgs.push({ type: "warn", message: `need acknowledgments: ${pkg.name} ${pkg.license}` });
      ret.write = true;
    } else if (l.match(/3/i)) msgs.push({ type: "warn", message: `not allowed acknowledgments: ${pkg.name} ${pkg.license}` });
  } else if (l.match(/apache/i)) {
    // Apache
  } else if (l.match(/gnu/i)) {
    // GNU
    msgs.push({ type: "err", message: `${pkg.name} use ${pkg.license}` });
  } else {
    msgs.push({ type: "err", message: `${pkg.name} should not use: ${pkg.license}` });
  }
  if (messages) msgs.forEach(msg => messages.push(msg));
  return ret;
};

const license = {
  collect,
  format,
  formatToList,
  formatToJson,
  check,
};

export default license;