import { YAMLError as YAMLError$1, ErrorCode as ErrorCode$1, ParseOptions, DocumentOptions, SchemaOptions, ToJSOptions, Scalar, Alias, YAMLMap, YAMLSeq } from 'yaml';
export { CollectionTag, CreateNodeOptions, DocumentOptions, ParseOptions, ScalarTag, Schema, SchemaOptions, TagId, Tags, ToJSOptions, ToStringOptions } from 'yaml';

declare function tokenizeText(input: string, keyValueTok: KeyValueToken | undefined, tempState: TempParseState, depth?: number): TextToken[];
type TokenizeTextFunc = typeof tokenizeText;

/**
 * Types of data in YAML
 */
type YAMLDataTypes = "scalar" | "map" | "seq";
/**
 * Object that hold position of token inside single line.
 */
type LinePos = {
    line: number;
    col: number;
};
/**
 * Array with start and end absolute positions.
 */
type Pos = [number, number];
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
    linePos: [LinePos, LinePos] | undefined;
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
    linePos: [LinePos, LinePos] | undefined;
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
 * General type that holds all directive tokens.
 */
type DirectiveToken = TagDirectiveToken | YamlDirectiveToken | FilenameDirectiveToken | ImportDirectiveToken | LocalDirectiveToken | ParamDirectiveToken | PrivateDirectiveToken;
/**
 * Helper to get specific type of directive token from general type.
 */
type DirectiveOf<T extends DirectiveToken["type"]> = Extract<DirectiveToken, {
    type: T;
}>;
/**
 * Minimal state used in scalar tokenizer step.
 */
type BasicState = {
    input: string;
    len: number;
    pos: number;
    line: number;
    absLineStart: number;
};
/**
 * State of text step of scalar tokenizer
 */
type TextTokenizerState = BasicState;
/**
 * State of expression step of scalar tokenizer
 */
type ExprTokenizerState = BasicState & {
    afterParen: boolean;
    afterWhiteSpace: boolean;
};
/**
 * State of arguments step of scalar tokenizer
 */
type ArgsTokenizerState = BasicState;
/**
 * State of keyValue step of scalar tokenizer
 */
type KeyValueTokenizerState = BasicState & {
    afterEqual: boolean;
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
    depth: number;
    freeExpr: boolean;
    exprTokens?: ExprToken[];
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
    linePos: [LinePos, LinePos] | undefined;
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
 * Class to handle dependency checks.
 */
declare class DependencyHandler {
    /** Set that holds: path -> set of dependencies paths. */
    depGraphs: Map<string, Set<string>>;
    /** Set that holds: path -> set of paths importing it. */
    reverseDepGraphs: Map<string, Set<string>>;
    /** All paths add to handler. */
    paths: Set<string>;
    /** Paths added as entery points. */
    entryPaths: Set<string>;
    /**
     * Method to remove any path that is not currently being imported by entery paths.
     * @param paths - Optional paths to delete from entery paths before purging.
     * @returns Array of paths that are deleted.
     */
    purge(paths?: string[]): string[];
    /**
     * Method to reset dependency class state.
     * @returns Array of deleted paths.
     */
    reset(): string[];
    getDeps(node: string): string[];
    /**
     * Method to delete path from graph. It's not advised to use it, use purge instead as manual deletion can break the graphs state.
     * @param path - Path that will be deleted.
     */
    deleteDep(path: string): void;
    /**
     * Method to add new paths.
     * @param path - Path that will be added.
     * @param entery - Boolean to indicate if path is an entry path.
     */
    addDep(path: string, entery?: boolean): void;
    /**
     * Method to bind paths and check for circular dependency. Note that it will abort bind if circular dependency is found.
     * @param modulePath - Path of the current module.
     * @param targetPath - Path of the imported module.
     * @returns - null if no circular dependency is present or array of paths of the circular dependency.
     */
    bindPaths(modulePath: string, targetPath: string): string[] | null;
    /** Method to recursively add dependencies of entery path to a set. */
    private _recursiveGetDep;
    /** Method to find path of circular dependency. */
    private _findPath;
}

/**
 * Function used to resolve the output of "yaml" lib to allow extended modules.
 */
type Resolve = (item: unknown, anchored: boolean, state: ParseState, tempState: TempParseState) => Promise<unknown>;
/**
 * State object generated for each parse function execution or live loader. Persistant state and hold data generated from parsing YAML file.
 */
type ParseState = {
    /** Cache that hold data for each module. */
    cache: Cache;
    /** Class to handle dependency in modules. */
    dependency: DependencyHandler;
    /** Internally used only. */
    depth: number;
};
/**
 * Temporary state only needed during parsing and resolving YAML file, specific for each parse execution.
 */
type TempParseState = {
    source: string;
    options: Options & {
        basePath: string;
    };
    errors: YAMLError[];
    importedErrors: YAMLError[];
    resolvedPath: string;
    filename: string;
    range: [number, number];
    anchors: Map<string, unknown>;
    locals: Record<string, unknown>[];
    lineStarts: number[];
    resolveFunc: Resolve;
    parseFunc: ParseExtend;
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
    /** Boolean to indicate if state object should be returned and persisted. */
    returnState?: boolean;
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
    parseCache: Map<string, ParseEntry>;
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

declare function parseExtend(path: string, options: Options & {
    returnState?: true;
}, state?: ParseState): Promise<{
    parse: unknown;
    errors: YAMLError[];
    importedErrors: YAMLError[];
    state: ParseState;
    cache: ModuleCache;
}>;
declare function parseExtend(path: string, options: Options & {
    returnState?: false | undefined;
}, state?: ParseState): Promise<{
    parse: unknown;
    errors: YAMLError[];
    importedErrors: YAMLError[];
    state: undefined;
    cache: undefined;
}>;
declare function parseExtend(path: string, options?: Options & {
    returnState?: boolean | undefined;
}, state?: ParseState): Promise<{
    parse: unknown;
    errors: YAMLError[];
    importedErrors: YAMLError[];
    state: ParseState | undefined;
    cache: ModuleCache | undefined;
}>;
type ParseExtend = typeof parseExtend;

/**
 * Class to preserve state along parsing multiple entry paths.
 */
declare class LiveParser {
    /** State object of the parser. It should never be mutated. */
    state: ParseState;
    private _options;
    private _purgeInterval;
    private _isDestroyed;
    /**
     * @param options - Options object passed to control parser behavior.
     * @param intervalPurge - Should set an interval to purge un-used path caches.
     */
    constructor(options?: Omit<Options, "params">, intervalPurge?: boolean);
    /**
     * Method to set options, note that cache will be reseted every time options change.
     * @param options - Options object passed to control parser behavior.
     */
    setOptions(options: Omit<Options, "params">): void;
    /**
     * Method to parse YAML file at specific path.
     * @param path - Path that will be parsed.
     * @returns Parse value of this path.
     */
    parse(path: string): Promise<Awaited<ReturnType<ParseExtend>>>;
    /**
     * Method to delete path as an entry point.
     * @param path - Path the will be deleted.
     * @returns Boolean to indicate if path is fully removed from cache of is still preserved as an imported path.
     */
    purge(path: string): boolean;
    destroy(): void;
}

export { ArgsTokenType, ExprTokenType, KeyValueTokenType, LiveParser, TextTokenType, YAMLError, YAMLExprError, YAMLParseError, YAMLWarning, parseExtend };
export type { ArgsToken, ArgsTokenizerState, BasicState, Cache, DirectiveOf, DirectiveToken, Directives, ErrorCode, ErrorName, ExprErrorCode, ExprToken, ExprTokenizerState, ExtendParseOptions, FilenameDirectiveToken, ImportDirectiveToken, ImportParamInfo, KeyValueToken, KeyValueTokenizerState, LinePos, LocalDirectiveToken, ModuleCache, Options, ParamDirectiveToken, ParseEntry, ParseState, Pos, PrivateDirectiveToken, RawToken, TagDirectiveToken, TextToken, TextTokenizerState, TokenizeTextFunc, YAMLDataTypes, YamlDirectiveToken };
