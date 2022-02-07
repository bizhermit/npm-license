#! /usr/bin/env node

import { writeFileSync } from "fs";
import path from "path";
import license from "../dist";

let returnMessage = "";

const getArgFlag = (key: string) => {
  return process.argv.findIndex(v => v === key) >= 0;
};
const getArgV = (key: string) => {
  const index = process.argv.findIndex(v => v === key);
  if (index < 0) return undefined;
  const val = process.argv[index + 1];
  if (val.startsWith("-")) return undefined;
  return val;
};

const main = () => {
  const quiet = getArgFlag("--quiet");
  const excludes: Array<string> = [];
  const excludesStr = getArgV("-exclude");
  if (excludesStr) excludesStr.split(",").forEach(n => excludes.push(n));
  const messages: Array<any> = [];
  const pkg = license.collect({
    dirname: process.cwd(),
    includeDevDependencies: getArgFlag("--dev"),
    includePrivate: getArgFlag("--includePrivate"),
  }, messages);
  if (pkg == null) {
    messages.forEach(item => {
      if (!quiet) process.stderr.write(`\nerr :: ${item.message}`);
      returnMessage += `${item.message}\n`;
    });
    return;
  }

  license.validate({ pkg, excludes }, messages);

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