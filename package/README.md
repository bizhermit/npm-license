# npm License tool

Check using complex license npm package at dependencies.  
This tool pass license:
* MIT
* ISC
* CC0
* BSD-3-Clause
* BSD-2-Clause
* 0BSD
* Apache-2.0

---

## CLI

No install
```bash
npx @bizhermit/license <options>
```

Install
```bash
npm i -D @bizhermit/license
npx license <options>
```

Output:
```
- @types/node
|   version: 17.0.14
|   license: MIT
|   licenseFile: /node_modules/@types/node/LICENSE
|   repository: https://github.com/DefinitelyTyped/DefinitelyTyped.git
- typescript
|   version: 4.5.5
|   license: Apache-2.0
|   licenseFile: /node_modules/typescript/LICENSE.txt
|   publisher: Microsoft Corp.
|   repository: https://github.com/Microsoft/TypeScript.git
```

### Options

* `--quiet` not print messages.

Collect:
* `--dev` include development dependencies.
* `--includePrivate` include private packages.

Validate:
* `--returnError` throw error when has error.
* `-exclude [packageNames]` exclude package names. colon-separete list.

Output:
* `-f ["json"]` write the data format.
* `-o [fileName]` write the data to file.
* `--includeRoot` include root package information.
* `--outputAll` default output is only copyleft license. but this option set to output all.
* `--outputForce` default write file when write anyone. but this option set to write file.

### Example

```bash
# write to file: CREDIT
npx @bizhermit/license -o ./CREDIT

# wirte json format
npx @bizhermit/license -o ./CREDIT -f json

# include devDependencies
npx @bizhermit/license -o ./CREDIT --dev

# exclude packages (@types/node and typescript)
npx @bizhermit/license -o ./CREDIT --dev --outputAll -exclude @types/node,typescript

# print to terminal that all dependence and devDependence
npx @bizhermit/license --outputAll --dev
```

---

## Module

Install
```bash
npm i @bizhermit/license
```

### Example
```ts
import license from "@bizhermit/license";

const rootDir = process.cwd();

// collect
const pkg = license.collect({
  dirname: rootDir,
  excludes: ["@types/node"],    // Array<string> default: []
  includePrivate: true,         // boolean default: false
  includeDevDependencies: true, // boolean default: true
});

// format
const str = license.format({
  pkg, // collected value
  includeRoot: true,
  all: true,
});
```