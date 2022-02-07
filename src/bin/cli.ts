#! /usr/bin/env node

import { getKeyArg, hasKeyArg } from "@bizhermit/cli-sdk";
import { writeFileSync } from "fs";
import path from "path";
import license from "../dist";

let returnMessage = "";

const main = () => {
    const quiet = hasKeyArg("--quiet");
    const excludes: Array<string> = [];
    const excludesStr = getKeyArg("-exclude");
    if (excludesStr) excludesStr.split(",").forEach(n => excludes.push(n));
    const messages: Array<any> = [];
    const pkg = license.collect({
        dirname: process.cwd(),
        includeDevDependencies: hasKeyArg("--dev"),
        includePrivate: hasKeyArg("--includePrivate"),
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
    if (!hasKeyArg("--returnError")) returnMessage = "";

    const outputStr = license.format({
        pkg,
        format: getKeyArg("-f"),
        includeRoot: hasKeyArg("--includeRoot"),
        all: hasKeyArg("--outputAll"),
    });
    const outputFileName = getKeyArg("-o");
    if (outputFileName == null) {
        if (!quiet) process.stdout.write("\n" + outputStr + "\n");
        return;
    }
    if (outputStr.length > 0 || hasKeyArg("--outputForce")) writeFileSync(path.join(process.cwd(), outputFileName), outputStr);
};

main();

if (returnMessage) throw new Error("\n" + returnMessage);