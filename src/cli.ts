#! /usr/bin/env node

import { writeFileSync } from "fs";
import path from "path";
import license from ".";

let returnMessage = "";

const getArgFlag = (key: string) => {
  return process.argv.findIndex(v => v === key) >= 0;
};
const getArgV = (key: string) => {
  const index = process.argv.findIndex(v => v === key);
  if (index < 0) return null;
  const val = process.argv[index + 1];
  if (val.startsWith("-")) return null;
  return val;
};

const main = () => {
  const quiet = getArgFlag("--quiet");
  const excludes = [];
  const excludesStr = getArgV("-exclude");
  if (excludesStr) excludesStr.split(",").forEach(n => excludes.push(n));
  const pkg = license.collect({
    dirname: process.cwd(),
    includeDevDependencies: getArgFlag("--dev"),
    includePrivate: getArgFlag("--includePrivate"),
    excludes,
  });

  const messages = license.validate({
    pkg,
  });

  messages.forEach(item => {
    if (item.type === "info") {
      if (!quiet) process.stdout.write(`\n#info:: ${item.message}`);
      return;
    }
    if (item.type === "warn") {
      if (!quiet) process.stdout.write(`\nwarn:: ${item.message}`);
      return;
    }
    if (!quiet) process.stderr.write(`\nerr :: ${item.message}`);
    returnMessage += `${item.message}\n`;
  });
  if (!getArgFlag("--returnError")) returnMessage = "";

  const outputStr = license.format({
    pkg,
    format: getArgV("-f"),
    includeRoot: getArgFlag("--includeRoot"),
    all: getArgFlag("--outputAll"),
  });
  const outputFileName = getArgV("-o");
  if (outputFileName == null) {
    if (!quiet) process.stdout.write("\n" + outputStr + "\n");
    return;
  }
  if (outputStr.length > 0 || getArgFlag("--outputForce")) writeFileSync(path.join(process.cwd(), outputFileName), outputStr);
};

main();

if (returnMessage) throw new Error("\n" + returnMessage);