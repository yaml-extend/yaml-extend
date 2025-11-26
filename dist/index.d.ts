import { YAMLError as YAMLError$1, ErrorCode as ErrorCode$1, ParseOptions, DocumentOptions, SchemaOptions, ToJSOptions, Scalar, Alias, YAMLMap, YAMLSeq } from 'yaml';
export { CollectionTag, CreateNodeOptions, DocumentOptions, ParseOptions, ScalarTag, Schema, SchemaOptions, TagId, Tags, ToJSOptions, ToStringOptions } from 'yaml';

/**
 * Object that hold position of token inside single line.
 */
type ExtendLinePos = {
    line: number;
    start: number;
    end: number;
};
/**
 * Object that hold absolute position of token inside a text.
 */
type Pos = {
    start: number;
    end: number;
};
/**
 * Minimal data used in a single token.
 */
type RawToken<T> = {
    /** Raw text. */
    raw: string;
    /** Text after escaping. */
    text: string;
    /** Value of the token (can be number, null or even objects) */
    value: T;
    /** Boolean to define if text was quoted or not. */
    quoted: boolean;
    /** Array of lines in which token spans along with it's position inside each line. */
    linePos: ExtendLinePos[];
    /** Absolute position of token in text */
    pos: Pos;
};
/**
 * Object that holds tokens of directives to be used in parsing.
 */
type Directives = {
    filename: FilenameDirectiveToken[];
    tag: TagDirectiveToken[];
    private: PrivateDirectiveToken[];
    param: ParamDirectiveToken[];
    local: LocalDirectiveToken[];
    import: ImportDirectiveToken[];
    version: YamlDirectiveToken[];
    errors: YAMLError[];
};
/**
 * Minimal data used in a single directive token.
 */
type RawDirectiveToken = {
    type: "TAG" | "YAML" | "FILENAME" | "IMPORT" | "PARAM" | "LOCAL" | "PRIVATE";
    rawLine: string;
    linePos: ExtendLinePos[];
    pos: Pos;
    valid: boolean;
    errors: YAMLExprError[];
};
/**
 * TAG's directive token.
 */
type TagDirectiveToken = RawDirectiveToken & {
    type: "TAG";
    base: RawToken<string>;
    handle: RawToken<string> | undefined;
    prefix: RawToken<string> | undefined;
};
/**
 * YAML's directive token.
 */
type YamlDirectiveToken = RawDirectiveToken & {
    type: "YAML";
    base: RawToken<string>;
    version: RawToken<number> | undefined;
};
/**
 * FILENAME's directive token.
 */
type FilenameDirectiveToken = RawDirectiveToken & {
    type: "FILENAME";
    base: RawToken<string>;
    filename: RawToken<string> | undefined;
};
/**
 * Data of key=value param pairs in import token
 */
type ImportParamInfo = {
    raw: string;
    equal: RawToken<string> | undefined;
    key: RawToken<string> | undefined;
    value: RawToken<unknown> | undefined;
};
/**
 * IMPORT's directive token.
 */
type ImportDirectiveToken = RawDirectiveToken & {
    type: "IMPORT";
    base: RawToken<string>;
    alias: RawToken<string> | undefined;
    path: RawToken<string> | undefined;
    params: Record<string, ImportParamInfo>;
    resolvedParams: Record<string, unknown>;
};
/**
 * LOCAL's directive token.
 */
type LocalDirectiveToken = RawDirectiveToken & {
    type: "LOCAL";
    base: RawToken<string>;
    alias: RawToken<string> | undefined;
    yamlType: RawToken<string | undefined> | undefined;
    defValue: RawToken<unknown> | undefined;
};
/**
 * PARAM's directive token.
 */
type ParamDirectiveToken = RawDirectiveToken & {
    type: "PARAM";
    base: RawToken<string>;
    alias: RawToken<string> | undefined;
    yamlType: RawToken<string | undefined> | undefined;
    defValue: RawToken<unknown> | undefined;
};
/**
 * PRIVATE's directive token.
 */
type PrivateDirectiveToken = RawDirectiveToken & {
    type: "PRIVATE";
    base: RawToken<string>;
    paths: RawToken<string>[];
    resolvedPaths: Record<string, {
        pathParts: string[];
        token: RawToken<string>;
    }>;
};
/**
 * Token types from text step of scalar tokenizer
 */
declare enum TextTokenType {
    TEXT = "TEXT",
    EXPR = "EXPR",
    EOF = "EOF"
}
/**
 * Token types from expression step of scalar tokenizer
 */
declare enum ExprTokenType {
    PATH = "PATH",
    DOT = "DOT",
    ARGS = "ARGS",
    WHITE_SPACE = "WHITE_SPACE",
    TYPE = "TYPE",
    EOF = "EOF"
}
/**
 * Token types from arguments step of scalar tokenizer
 */
declare enum ArgsTokenType {
    KEY_VALUE = "KEY_VALUE",
    COMMA = "COMMA",
    EOF = "EOF"
}
/**
 * Token types from keyValue step of scalar tokenizer
 */
declare enum KeyValueTokenType {
    EQUAL = "EQUAL",
    KEY = "KEY",
    VALUE = "VALUE",
    EOF = "EOF"
}
/**
 * Text token from text step of scalar tokenizer
 */
type TextToken = RawToken<string> & {
    type: TextTokenType;
    exprTokens?: ExprToken[];
    freeExpr?: boolean;
};
/**
 * Expression token from expression step of scalar tokenizer
 */
type ExprToken = RawToken<string> & {
    type: ExprTokenType;
    argTokens?: ArgsToken[];
};
/**
 * Arguments token from arguments step of scalar tokenizer
 */
type ArgsToken = RawToken<string> & {
    type: ArgsTokenType;
    keyValueToks?: KeyValueToken[];
};
/**
 * KeyValue token from KeyValue step of scalar tokenizer
 */
type KeyValueToken = RawToken<unknown> & {
    type: KeyValueTokenType;
    valueToks?: TextToken[];
};

type ErrorName = "YAMLParseError" | "YAMLWarning" | "YAMLExprError";
type ExprErrorCode = "";
type ErrorCode = ErrorCode$1 | ExprErrorCode;
declare class YAMLError extends YAMLError$1 {
    path: string;
    extendLinePos: ExtendLinePos[];
    filename: string;
    constructor(name: ErrorName, pos: [number, number], code: ErrorCode, message: string);
}
declare class YAMLExprError extends YAMLError {
    constructor(pos: [number, number], code: ErrorCode, message: string);
}
declare class YAMLParseError extends YAMLError {
    constructor(pos: [number, number], code: ErrorCode, message: string);
}
declare class YAMLWarning extends YAMLError {
    constructor(pos: [number, number], code: ErrorCode, message: string);
}

/**
 * Class to handle circular dependency checks.
 */
declare class CircularDepHandler {
    /** adjacency list: node -> set of dependencies (edges node -> dep) */
    private _graphs;
    /**
     * Method to handle checking of the circular dependency.
     * @param modulePath - Path of the current module.
     * @param targetPath - Path of the imported module.
     * @returns - null if no circular dependency is present or array of paths or the circular dependency.
     */
    addDep(modulePath: string, targetPath: string | undefined): string[] | null;
    /**
     * Method to delete dependency node (path of a module) from graph.
     * @param modulePath - Path that will be deleted.
     */
    deleteDep(modulePath: string): void;
    /** Method to find path of circular dependency. */
    private _findPath;
}

/**
 * State object generated for each parse function execution or live loader. Persistant state and hold data generated from parsing YAML file.
 */
type ParseState = {
    cache: Cache;
    parsedPaths: Set<string>;
    circularDep: CircularDepHandler;
    depth: number;
};
/**
 * Additional options that can be passed to parse function used by extend module.
 */
type ExtendParseOptions = {
    /**
     * Filesystem path used as the sandbox root for imports. Prevents access to files outside this directory and is used as the base when resolving relative
     * imports or special `@base/...` import syntax. Example: if basePath is `/proj` and an import says `./configs/a.yaml`, the loader resolves against `/proj`.
     */
    basePath?: string;
    /** Boolean to disable basePath black boxing. it's not recommend to set it to true. */
    unsafe?: boolean;
    /** Boolean to show private nodes of YAML file after parsing, so it only affect base YAML file. */
    ignorePrivate?: boolean;
    /** Params object to overwrite default values of '%PARAM' directive in the parsed YAML file. works only on the base parsed YAML file. */
    params?: Record<string, unknown>;
    /** Params object to overwrite default values of '%PARAM' directive in the parsed YAML file. inherited and affect imported YAML files as well. */
    universalParams?: Record<string, unknown>;
    /** Boolean to indicate if tags should be resolved or ignored. inherited and affect imported YAML files as well. */
    ignoreTags?: boolean;
};
/**
 * Options parse to parseExtend function.
 */
type Options = ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions & ExtendParseOptions;
/**
 * Entry representing a resolved module parse for a specific set of params. Keyed in the parent cache by a hash computed from `params`.
 */
type ParseEntry = {
    /** Final parse value. */
    parse: unknown;
    /** Errors thrown during parsing this YAML file. */
    errors: YAMLError[];
    /** Errors thrown during parsing imported YAML files. */
    importedErrors: YAMLError[];
};
/**
 * Cache of single YAML module or file.
 */
type ModuleCache = {
    /**
     * Map from params-hash → ParamLoadEntry.
     * Use the hash of the params (string) as the map key so different param sets map to their respective resolved load results.
     */
    loadByParamHash: Map<string, ParseEntry>;
    /** Object that holds tokens of directives to be used in parsing. */
    directives: Directives;
    /** Absolute or resolved filesystem path of the module. */
    resolvedPath: string;
    /** Hash computed from `source` (used to detect changes / cache misses). */
    sourceHash: string;
    /** Tokens for each scalar text */
    scalarTokens: Record<string, {
        scalars: Scalar[];
        tokens: TextToken[];
    }>;
    /** Abstract Syntax Tree of this YAML file loaded using "yaml" library. */
    AST: Alias | Scalar | YAMLMap | YAMLSeq | null;
};
/**
 * Cache of the modules parsed by parseExtend and saved in ParseState. each module loaded is keyed by its resolved path.
 */
type Cache = Map<string, ModuleCache>;

/**
 *
 * @param filepath - Path of YAML file in filesystem.
 * @param options - Options object passed to control parser behavior.
 * @param state - For internal use don't pass any thing here.
 * @returns Object that hold parse value along with errors thrown in this YAML file and errors thrown in imported YAML files.
 */
declare function parseExtend(filepath: string, options?: Options, state?: ParseState): Promise<{
    parse: unknown;
    errors: YAMLError[];
    importedErrors: YAMLError[];
}>;

export { YAMLError, YAMLExprError, YAMLParseError, YAMLWarning, parseExtend };
export type { ErrorCode, ErrorName, ExprErrorCode, ExtendParseOptions, Options };
