import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";

type Message = { type: "err" | "warn" | "info"; message: string; };

type NpmPackage = {
  name: string;
  path: string;
  version?: string;
  licenses: Array<string>;
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
    const ctx = fileName.match(/^(license|licence|copying|ofl|patents)/i);
    if (ctx == null) continue;
    const filePath = path.join(dirname, fileName);
    if (statSync(filePath).isDirectory()) {
      readdirSync(filePath).forEach(name => rets.push(path.join(fileName, name)));
      continue;
    }
    rets.push(filePath);
  }
  return rets;
};

type Deps = {[key: string]: string};

const readPackage = (name: string | null, dirname: string, messagesRef: Array<Message>, collectProps: CollectProps) => {
  let pkgJson: {[key: string]: any}, dirPath = dirname, searchedDirnames = [];
  try {
    if (name == null) {
      pkgJson = JSON.parse(readFileSync(path.join(dirname, "package.json")).toString());
    } else {
      let cursorDirname = dirname;
      do {
        const pkgPath = path.join(dirPath = path.join(cursorDirname, "node_modules", name), "package.json");
        searchedDirnames.push(pkgPath);
        if (existsSync(pkgPath)) {
          pkgJson = JSON.parse(readFileSync(pkgPath).toString());
          break;
        }
        const index = cursorDirname.lastIndexOf("node_modules");
        if (index < 0) break;
        cursorDirname = cursorDirname.substring(0, index - 1);
      } while (dirname !== cursorDirname);
    }
  } catch {}
  if (pkgJson == null) {
    messagesRef.push({
      type: "err",
      message: `\n# not found or read package.json.\n  - ${searchedDirnames.join(`\n  - `)}\n`,
    });
    return null;
  }

  // base
  const pkg: NpmPackage = {
    name: pkgJson.name ?? "",
    version: pkgJson.version ?? "",
    path: dirPath,
    licenses: [],
  };

  // license/license files
  const licenseFiles = findLicenseFileNames(dirPath);
  const license = pkgJson.license || pkgJson.licence || pkgJson.licenses || pkgJson.licences;
  if (license != null) {
    const readLicenseObject = (obj: any) => {
      if (obj == null) return;
      if (typeof obj === "string") {
        if (obj.length === 0) return;
        pkg.licenses.push(obj);
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach(o => readLicenseObject(o));
        return;
      }
      if (typeof obj.type === "string" && obj.type.length > 0) pkg.licenses.push(obj.type);
      if (licenseFiles.length === 0) {
        if (obj.path) licenseFiles.push(String(obj.path));
        else if (obj.url) licenseFiles.push(String(obj.url));
      }
    }
    readLicenseObject(license);
  }
  if (licenseFiles.length > 0) {
    pkg.licenseFile = collectProps.absoluteLicenseFilePath ?
      licenseFiles :
      licenseFiles.map(fileName => fileName.replace(collectProps.dirname, ""));
  }

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
  absoluteLicenseFilePath?: boolean;
};

const collect = (props: CollectProps, messagesRef: Array<Message>) => {
  const root = readPackage(null, props.dirname, messagesRef, props);

  const isExclude = (pkg: NpmPackage) => {
    if (props.includePrivate !== true && pkg.private) return true;
    if ((props.excludes?.indexOf(pkg.name) ?? -1) >= 0) return true;
    return false;
  };

  const collectRoot = (deps: Deps, pushFunc: (pkg: NpmPackage) => void) => {
    Object.keys(deps).forEach(depName => {
      const dep = readPackage(depName, props.dirname, messagesRef, props);
      if (isExclude(dep.pkg)) return;

      const depMap: {[key: string]: NpmPackage; } = {};
      const collectDeps = (deps: Deps, parentPkg: NpmPackage) => {
        Object.keys(deps).forEach(name => {
          let map = depMap[name];
          if (map != null) return;
          const cDep = readPackage(name, parentPkg.path, messagesRef, props);
          if (cDep == null) return;
          depMap[name] = cDep.pkg;
          collectDeps(cDep.deps, cDep.pkg);
        });
      };
      collectDeps(dep.deps, dep.pkg);

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
const validate = (props: ValidateProps, messagesRef: Array<Message>) => {
  const messages: Array<Message> = messagesRef ?? [];
  const validatePackage = (parentPkg: NpmPackage, pkg: NpmPackage, isDev: boolean) => {
    const messageTarget = `\n  ${parentPkg.name}@${parentPkg.version}: ${parentPkg.licenses.join(",")}\n  ${isDev ? "-" : "+"} ${pkg.name}@${pkg.version}: ${pkg.licenses.join(",")}`;
    if (pkg.licenses.length === 0) {
      messages.push({
        type: "err",
        message: `\n# use unkown or not extract license${messageTarget}`,
      });
    } else {
      for (const l of pkg.licenses) {
        if (l == null || l.length === 0)  {
          messages.push({
            type: "err",
            message: `\n# use unkown or not extract license${messageTarget}`,
          });
        } else if (l.match(/^cc0/i)) { // CC0
        } else if (l.match(/^cc.*4/i)) { // CC-BY-4.0
          messages.push({
            type: "err",
            message: `\n# use need to acknowledgments license${messageTarget}`,
          });
        } else if (l.match(/mit/i)) { // MIT
        } else if (l.match(/isc/i)) { // ISC
        } else if (l.match(/(0bsd|bsd*.0)/i)) { // 0BSD
        } else if (l.match(/bsd*.3/i)) { // BSD-3-Clause
        } else if (l.match(/bsd*.2/i)) { // BSD-2-Clause
        } else if (l.match(/(bsd|bsd*.4)/i)) { // BSD/BSD-4-Clause
          messages.push({
            type: "err",
            message: `\n# use need to acknowledgments license${messageTarget}`,
          });
        } else if (l.match(/apache.*2/i)) { // Apache-2.0
        } else if (l.match(/apache.*1/i)) { // Apache-1.0
          messages.push({
            type: "err",
            message: `\n# use complex license${messageTarget}`,
          });
        } else if (l.match(/mpl/i)) { // GPL
          messages.push({
            type: "err",
            message: `\n# use complex license${messageTarget}`,
          });
        } else if (l.match(/mpl/i)) { // MPL
          messages.push({
            type: "err",
            message: `\n# use complex license${messageTarget}`,
          });
        } else {
          messages.push({
            type: "err",
            message: `\n# use not supported license${messageTarget}`
          });
        }
      }
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
  if (pkg.licenses == null) return false;
  for (const license of pkg.licenses) {
    if (license.match(/bsd.*4/i)) return true;
    if (license.match(/^cc.*4/i)) return true;
  }
  return false;
};

const formatToList = (props: FormatProps) => {
  const writePackage = (p: NpmPackage, nest: number, dev?: boolean) => {
    let cRet = "";
    if (p.dependencies && p.dependencies.length > 0) {
      p.dependencies.forEach(cp => {
        cRet += writePackage(cp, nest + 1);
      });
    }
    if (p.devDependencies && p.devDependencies.length > 0) {
      p.devDependencies.forEach(cp => {
        cRet += writePackage(cp, nest + 1, true);
      });
    }
    let ret = "";
    if (cRet === "" && !isRequiredToAddLicense(p) && props.all !== true) return ret;
    const nestStr = "|   ".repeat(Math.max(0, nest - (props?.includeRoot === true ? 0 : 1)));
    const append = (str: string) => ret += nestStr + str + endLine;
    const appendInfo = nest > 0 || props.includeRoot === true;
    const pre = `${dev ? "-" : "+"} `, npre = `|   `;
    if (appendInfo) {
      append(`${pre}${p.name}`);
      append(`${npre}version: ${p.version}`);
      append(`${npre}license: ${p.licenses.join(",") ?? ""}`);
      if (p.licenseFile && p.licenseFile.length > 0) append(`${npre}licenseFile: ${p.licenseFile.join(",")}`);
      if (p.publisher) append(`${npre}publisher: ${p.publisher}`);
      if (p.email) append(`${npre}email: ${p.email}`);
      if (p.url) append(`${npre}url: ${p.url}`);
      if (p.repository) append(`${npre}repository: ${p.repository}`);
    }
    ret += cRet;
    return ret;
  };
  return writePackage(props.pkg, 0);
};

const formatToJson = (props: FormatProps) => {
  if (props.includeRoot === true) return JSON.stringify(props.pkg, null, 2);
  return JSON.stringify({
    ...(props.pkg.dependencies ?? {}),
    ...(props.pkg.devDependencies ?? {}),
  }, null, 2);
};

const formatToCsv = (props: FormatProps) => {
  // TODO:
  return formatToList(props);
};

const license = {
  collect,
  validate,
  format,
};

export default license;