declare type Message = {
    type: "err" | "warn" | "info";
    message: string;
};
declare type NpmPackage = {
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
declare type CollectProps = {
    dirname: string;
    includeDevDependencies?: boolean;
    includePrivate?: boolean;
    absoluteLicenseFilePath?: boolean;
};
declare type ValidateProps = {
    pkg: NpmPackage;
    excludes: Array<string>;
};
declare type FormatProps = {
    pkg: NpmPackage;
    format?: string;
    includeRoot?: boolean;
    all?: boolean;
};
declare const license: {
    collect: (props: CollectProps, messagesRef: Array<Message>) => NpmPackage | undefined;
    validate: (props: ValidateProps, messagesRef: Array<Message>) => Message[];
    format: (props: FormatProps) => string;
};
export default license;
