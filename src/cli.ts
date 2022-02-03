#! /usr/bin/env node

import { writeFileSync } from "fs";
import path from "path";
import license from ".";

let returnMessage = "";

const collect = (check?: boolean) => {
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
  if (check) {
    const messages = license.check(pkg);
    messages.forEach(item => {
      if (item.type === "warn") {
        console.log(`# ${item.type} : ${item.message}`);
        return;
      }
      returnMessage += `\n# ${item.type} : ${item.message}`;
    });
  }
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
  const str = license.format(pkg, format, { includeRoot, onlyNeeded: check });
  if (argOutputIndex < 0) {
    console.log(str);
    return;
  }
  let outputFileName = "";
  outputFileName = process.argv[argOutputIndex + 1] || outputFileName;
  if (outputFileName === "" || outputFileName.startsWith("-")) throw new Error(`not valid dest name: ${outputFileName}`);
  if (str.length === 0) return;
  writeFileSync(path.join(process.cwd(), outputFileName), str);
};

switch (process.argv[2]) {
  case "collect":
    collect();
    break;
  case "check":
    collect(true);
    break;
  default:
    break;
}

if (returnMessage) throw new Error(returnMessage);