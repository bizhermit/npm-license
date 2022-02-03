import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

type NpmPackage = {
  name: string;
  version?: string;
  license?: string;
  licenses?: Array<string>;
  licenseFile?: Array<string>;
  repository?: string;
  publisher?: string;
  email?: string;
  url?: string;
  private?: boolean;
  dependencies?: Array<NpmPackage>;
  devDependencies?: Array<NpmPackage>;
};

const findLicenseFileNames = (dirname: string) => {
  const fileNames = readdirSync(dirname);
  const rets: Array<string> = [];
  for (const fileName of fileNames) {
    const ctx = fileName.match(/^(license|copying|ofl|patents)/i);
    if (ctx == null) continue;
    const filePath = path.join(dirname, fileName);
    if (statSync(filePath).isDirectory()) {
      readdirSync(filePath).forEach(name => rets.push(path.join(fileName, name)));
      continue;
    }
    rets.push(fileName);
  }
  return rets;
};

type Deps = {[key: string]: string};

const readPackage = (dirname: string) => {
  const pkgJson = JSON.parse(readFileSync(path.join(dirname, "package.json")).toString());

  // base
  const pkg: NpmPackage = {
    name: pkgJson.name ?? "",
    version: pkgJson.version ?? "",
  };

  // license/license files
  const license = pkgJson.license;
  if (license != null) {
    if (typeof license === "string") pkg.license = license;
    else if (license.type) pkg.license = license.type ?? "";
    else pkg.license = "";
  } else {
    const licenses = pkgJson.licenses;
    if (Array.isArray(licenses)) {
      licenses.forEach(lItem => {
        if (pkg.licenses == null) pkg.licenses = [];
        if (typeof lItem === "string") pkg.licenses.push(lItem);
        else if (lItem.type) pkg.licenses.push(lItem.type ?? "");
        else pkg.licenses.push("");
      });
      if (pkg.licenses && pkg.licenses.length > 0) pkg.license = pkg.licenses.join(",");
    }
  }
  const licenseFiles = findLicenseFileNames(path.join(dirname));
  if (licenseFiles.length > 0) pkg.licenseFile = licenseFiles;


  // repo
  const repo = pkgJson.repository;
  if (repo != null) {
    if (typeof repo === "string") pkg.repository = repo;
    else if (repo.url) pkg.repository = repo.url ?? "";
  }

  // author
  const author = pkgJson.author;
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

  // deps
  const deps: Deps = pkgJson.dependencies ?? {};
  const devDeps: Deps = pkgJson.devDependencies ?? {};
  return { pkg, deps, devDeps };
};

type CollectProps = {
  dirname: string;
  includeDevDependencies?: boolean;
  includePrivate?: boolean;
  excludes?: Array<string>;
};

const collect = (props: CollectProps) => {
  const root = readPackage(props.dirname);
  const packagesDirname = path.join(props.dirname, "node_modules");

  const isExclude = (pkg: NpmPackage) => {
    if (props.includePrivate !== true && pkg.private) return true;
    if ((props.excludes?.indexOf(pkg.name) ?? -1) >= 0) return true;
    return false;
  };

  const collectRoot = (deps: Deps, pushFunc: (pkg: NpmPackage) => void) => {
    Object.keys(deps).forEach(depName => {
      const dep = readPackage(path.join(packagesDirname, depName));
      if (isExclude(dep.pkg)) return;

      const depMap: {[key: string]: NpmPackage; } = {};
      const collectDeps = (deps: Deps) => {
        Object.keys(deps).forEach(name => {
          let map = depMap[name];
          if (map != null) return;
          const cDep = readPackage(path.join(packagesDirname, name));
          depMap[name] = cDep.pkg;
          collectDeps(cDep.deps);
        });
      };
      collectDeps(dep.deps);

      Object.keys(depMap).forEach(name => {
        if (dep.pkg.dependencies == null) dep.pkg.dependencies = [];
        dep.pkg.dependencies.push(depMap[name]);
      });
      pushFunc(dep.pkg);
    });
  };

  collectRoot(root.deps, pkg => {
    if (isExclude(pkg)) return;
    if (root.pkg.dependencies == null) root.pkg.dependencies = [];
    root.pkg.dependencies.push(pkg);
  });

  if (props.includeDevDependencies) {
    collectRoot(root.devDeps, pkg => {
      if (isExclude(pkg)) return;
      if (root.pkg.devDependencies == null) root.pkg.devDependencies = [];
      root.pkg.devDependencies.push(pkg);
    });
  }

  return root.pkg;
};

type ValidateProps = {
  pkg: NpmPackage;
};
const validate = (props: ValidateProps) => {
  const messages: Array<{ type: "err" | "warn" | "info"; message: string; }> = [];
  const validatePackage = (parentPkg: NpmPackage, pkg: NpmPackage, isDev: boolean) => {
    const l = pkg.license;
    const messageTarget = `\n  ${parentPkg.name}@${parentPkg.version}: ${parentPkg.license}\n  ${isDev ? "-" : "+"} ${pkg.name}@${pkg.version}: ${pkg.license}`;
    if (l.match(/^cc0/i)) { // CC0
    } else if (l.match(/mit/i)) { // MIT
    } else if (l.match(/isc/i)) { // ISC
    } else if (l.match(/bsd*.3/i)) { // BSD-3-Clause
    } else if (l.match(/bsd*.2/i)) { // BSD-2-Clause
    } else if (l.match(/(bsd|bsd*.4)/i)) { // BSD/BSD-4-Clause
      messages.push({
        type: "err",
        message: `\n# need to acknowledgments${messageTarget}`,
      });
    } else if (l.match(/apache.*2/i)) { // Apache-2.0
    } else if (l.match(/apache.*1/i)) { // Apache-1.0
      messages.push({
        type: "err",
        message: `\n# complex license${messageTarget}`,
      });
    } else if (l.match(/mpl/i)) { // GPL
      messages.push({
        type: "err",
        message: `\n# complex license${messageTarget}`,
      });
    } else if (l.match(/mpl/i)) { // MPL
      messages.push({
        type: "err",
        message: `\n# complex license${messageTarget}`,
      });
    } else {
      messages.push({
        type: "err",
        message: `\n# not supported license${messageTarget}`
      });
    }
    pkg.dependencies?.forEach(cpkg => validatePackage(pkg, cpkg, false));
    pkg.devDependencies?.forEach(cpkg => validatePackage(pkg, cpkg, true));
  };
  props.pkg.dependencies?.forEach(pkg => validatePackage(props.pkg, pkg, false));
  props.pkg.devDependencies?.forEach(pkg => validatePackage(props.pkg, pkg, true));
  return messages;
};

type FormatProps = {
  pkg: NpmPackage;
  format?: string;
  includeRoot?: boolean;
  all?: boolean;
};

const format = (props: FormatProps) => {
  if (props.format === "json") return formatToJson(props);
  if (props.format === "csv") return formatToCsv(props);
  return formatToList(props);
};

const endLine = "\n";

const isRequiredToAddLicense = (pkg: NpmPackage) => {
  if (pkg.license.match(/bsd.*4/)) return true;
  return false;
};

const formatToList = (props: FormatProps) => {
  let ret = "";
  const writePackage = (p: NpmPackage, nest: number, dev?: boolean) => {
    const nestStr = "|   ".repeat(Math.max(0, nest - (props?.includeRoot === true ? 0 : 1)));
    const append = (str: string) => ret += nestStr + str + endLine;
    const appendInfo = nest > 0 || props.includeRoot === true;
    const pre = `${dev ? "-" : "+"} `, npre = `|   `;
    if (props?.all !== true && !isRequiredToAddLicense(p)) return;
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
    if (p.dependencies && p.dependencies.length > 0) p.dependencies.forEach(cp => writePackage(cp, nest + 1));
    if (p.devDependencies && p.devDependencies.length > 0) p.devDependencies.forEach(cp => writePackage(cp, nest + 1, true));
  };
  writePackage(props.pkg, 0);
  return ret;
};

const formatToJson = (props: FormatProps) => {
  return "";
};

const formatToCsv = (props: FormatProps) => {
  if (props.includeRoot === true) return JSON.stringify(props.pkg, null, 2);
  return JSON.stringify({
    ...(props.pkg.dependencies ?? {}),
    ...(props.pkg.devDependencies ?? {}),
  }, null, 2);
};

const license = {
  collect,
  validate,
  format,
};

export default license;