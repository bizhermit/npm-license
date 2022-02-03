# npm License tool

Check complex license used at dependencies.  
This tool pass license:
- MIT
- ISC
- CC0
- BSD-3-Clause
- BSD-2-Clause
- Apache-2.0

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
|   licenseFile: ./node_modules/@types/node/LICENSE
|   repository: https://github.com/DefinitelyTyped/DefinitelyTyped.git
- typescript
|   version: 4.5.5
|   license: Apache-2.0
|   licenseFile: ./node_modules/typescript/LICENSE.txt
|   publisher: Microsoft Corp.
|   repository: https://github.com/Microsoft/TypeScript.git
```

### Options

Collect:
* `-exclude [packageNames]` exclude package names. colon-separete list.
* `--dev` include development dependencies.
* `--includePrivate` include private packages.

Validate:
* `--skipValidate` skip throw error when has error.

Output:
* `-f ["json"]` write the data format.
* `-o [fileName]` write the data to file.
* `--includeRoot` include root package information.
* `--outputAll` default output is only copyleft license. but this option set to output all.
* `--outputForce` default write file when write anyone. but this option set to write file.

### Example

```bash
# write to file: LICENSE-ADD
npx @bizhermit/license -o ./LICENSE-ADD

# wirte json format
npx @bizhermit/license -o ./LICENSE-ADD -f json

# include devDependencies
npx @bizhermit/license -o ./LICENSE-ADD --dev

# exclude packages (@types/node and typescript)
npx @bizhermit/license -o ./LICENSE-ADD --dev --outputAll -exclude @types/node,typescript

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
const pkg = license.collect(rootDir, {
  excludes: ["@types/node"],    // Array<string> default: []
  includePrivate: true,         // boolean default: false
  includeDevDependencies: true, // boolean default: true
});

console.log(pkg); // comfirm object

// format
const str = license.format({
  pkg,
  includeRoot: true,
});

console.log(str); // comfirm str
```