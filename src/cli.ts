#! /usr/bin/env node

import { writeFileSync } from "fs";
import path from "path";
import license from ".";

const create = () => {
  // TODO:
};

const check = () => {
  // TODO:
};

const collect = () => {
  const includeDevDependencies = process.argv.findIndex(v => v === "--dev") >= 0;
  const deep = process.argv.findIndex(v => v === "--deep") >= 0;
  const argMaxNestIndex = process.argv.findIndex(v => v === "-max");
  const includePrivate = process.argv.findIndex(v => v === "--includePrivate") >= 0;
  const excludes = [];
  const argExcludesIndex = process.argv.findIndex(v => v === "-exclude");
  if (argExcludesIndex >= 0) {
    const str = process.argv[argExcludesIndex + 1];
    str.split(",").forEach(n => excludes.push(n));
  }
  let maxNest: number = undefined;
  if (argMaxNestIndex >= 0) maxNest = Math.max(1, Number(process.argv[argMaxNestIndex + 1] || 0));
  const pkg = license.collect(process.cwd(), { deep, includeDevDependencies, maxNest, includePrivate, excludes });
  const argFormatIndex = process.argv.findIndex(v => v === "-f");
  let format = "";
  if (argFormatIndex >= 0) {
    switch (process.argv[argFormatIndex + 1]) {
      case "csv":
        format = "csv";
        break;
      case "json":
        format = "json";
        break;
      default:
        format = "";
        break;
    }
  }
  const argOutputIndex = process.argv.findIndex(v => v === "-o");
  const includeRoot = process.argv.findIndex(v => v === "--includeRoot") >= 0;
  const str = license.format(pkg, format, { includeRoot });
  if (argOutputIndex < 0) {
    console.log(str);
    return;
  }
  let outputFileName = "";
  outputFileName = process.argv[argOutputIndex + 1] || outputFileName;
  if (outputFileName === "" || outputFileName.startsWith("-")) throw new Error(`not valid dest name: ${outputFileName}`);
  writeFileSync(path.join(process.cwd(), outputFileName), str);
};

switch (process.argv[2]) {
  case "collect":
    collect();
    break;
  case "create":
    create();
    break;
  case "check":
    check();
    break;
  default:
    break;
}