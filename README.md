# npm License tool

## CLI

No install
```bash
npx @bizhermit/license [command] <options>
```

Install
```bash
npm i -D @bizhermit/license
npx license [command] <options>
```

### Command

#### Collect

Collect dependencies license information and print to terminal log.

```bash
npx @bizhermit/license collect <options>
```

output:
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

##### Options

* `-o [fileName]` write the data to file.
* `-f ["json"]` write the data format.
* `--deep` collect dependence package's dependencies.
* `-max [depth]` collect depth when use --deep option. depth >= 1.
* `--dev` include development dependencies.
* `--includeRoot` include root package information.
* `--includePrivate` include private packages.
* `-exclude [packageNames]` exclude package names. colon-separete list.

##### Example

```bash
# write to file: AUTHORS
npx @bizhermit/license collect -o ./AUTHORS

# wirte json format
npx @bizhermit/license collect -o ./AUTHORS -f json

# include devDependencies
npx @bizhermit/license collect -o ./AUTHORS --dev

# exclude packages (@types/node and typescript)
npx @bizhermit/license collect -o ./AUTHORS --dev -exclude @types/node,typescript
```

### Check

Collect dependencies license information and print to terminal log.

```bash
npx @bizhermit/license check <options>
```

##### Options

* `-o [fileName]` write the data to file.
* `-f ["json"]` write the data format.
* `--deep` collect dependence package's dependencies.
* `-max [depth]` collect depth when use --deep option. depth >= 1.
* `--dev` include development dependencies.
* `--includeRoot` include root package information.
* `--includePrivate` include private packages.
* `-exclude [packageNames]` exclude package names. colon-separete list.

---

## Module

Install
```bash
npm i @bizhermit/license
```

##### Example
```ts
import license from "@bizhermit/license";

const rootDir = process.cwd();

// collect
const pkg = license.collect(rootDir, {
  excludes: ["@types/node"],    // Array<string> default: []
  includePrivate: true,         // boolean default: false
  includeDevDependencies: true, // boolean default: true
  deep: true,                   // boolean default: false
  maxNest: 5,                   // number default: null
});

console.log(pkg); // comfirm object

// format
const str = license.format(pkg, "", {
  includeRoot: true, // boolean default: false
});

console.log(str); // comfirm str
```