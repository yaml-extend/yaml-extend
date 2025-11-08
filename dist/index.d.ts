import { YAMLError as YAMLError$1, ErrorCode as ErrorCode$1, ParseOptions, DocumentOptions, SchemaOptions, ToJSOptions, Alias, Scalar, YAMLMap, YAMLSeq } from 'yaml';
export * from 'yaml';
export { YAMLParseError, YAMLWarning } from 'yaml';

type ErrorName = "YAMLParseError" | "YAMLWarning" | "YAMLExprError";
type ExprErrorCode = "";
type ErrorCode = ErrorCode$1 | ExprErrorCode;
declare class YAMLError extends YAMLError$1 {
    constructor(name: ErrorName, pos: [number, number], code: ErrorCode, message: string);
}
declare class YAMLExprError extends YAMLError {
    constructor(pos: [number, number], code: ErrorCode, message: string);
}

/** Object the holds directives data for YAML file. */
type DirectivesObj = {
    directives: {
        dir: string;
        pos: [number, number];
    }[];
    /** Logical filename as declared by the %FILENAME YAML directive. */
    filename: string | undefined;
    /** Map of handle → prefix (URI) as declared by the %TAG YAML directive. */
    tagsMap: Map<string, string>;
    /** Array of node paths declared private via the %PRIVATE YAML directive. */
    privateArr: string[];
    /** Map of alias → default value as declared by the %PARAM YAML directive. */
    paramsMap: Map<string, string>;
    /** Map of alias → default value as declared by the %LOCAL YAML directive. */
    localsMap: Map<string, string>;
    /** Map of alias → {path, params} as declared by the %PRIVATE YAML directive. */
    importsMap: Map<string, {
        path: string;
        params: Record<string, string>;
    }>;
    /** Errors present in directives. */
    errors: YAMLError[];
};
/** Entry representing a resolved module load for a specific set of params. Keyed in the parent cache by a hash computed from `params`. */
type ParamLoadEntry = {
    /** Final resolved value returned after parsing/loading the YAML module. */
    load: unknown;
    /** Final resolved value returned after parsing/loading the YAML module. but with keeping the private nodes. */
    privateLoad: unknown;
    /** Errors thrown with this resolve. */
    errors: YAMLError[];
};
/** Cache that stores all resolved loads and metadata for a single YAML module. */
type ModuleCache = {
    /**
     * Map from params-hash → ParamLoadEntry.
     * Use the hash of the params (string) as the map key so different param sets map to their respective resolved load results.
     */
    loadByParamHash: Map<string, ParamLoadEntry>;
    /** Load when params value is undefined. */
    pureLoad: ParamLoadEntry;
    /** Parsed directive data for the module (e.g., %TAG, %PARAM, %LOCAL, %PRIVATE). undefined if invalid YAML string is passed. */
    directives: DirectivesObj;
    /** Absolute or resolved filesystem path of the module. */
    resolvedPath: string;
    /** Hash computed from `source` (used to detect changes / cache misses). */
    sourceHash: string;
    /** Abstract Syntax Tree of this YAML file loaded using "yaml" library. */
    AST: Alias | Scalar | YAMLMap | YAMLSeq | null;
};
type ExtendParseOptions = {
    /**
     * Filesystem path used as the sandbox root for imports. Prevents access to files outside this directory and is used as the base when resolving relative
     * imports or special `@base/...` import syntax. Example: if basePath is `/proj` and an import says `./configs/a.yaml`, the loader resolves against `/proj`.
     */
    basePath?: string | undefined;
    /** Boolean to disable basePath black boxing. it's not recommend to set it to true unless you have strong reason. */
    unsafe?: boolean | undefined;
    /**
     * Mapping of module param aliases to string values that will be used to resolve %PARAM declarations in the module. Loader-supplied params should override any
     * defaults declared with %PARAM.
     */
    params?: Record<string, unknown> | undefined;
    /**
     * Controls which modules' private node definitions are ignored from the final output, Allowed values:
     *  - "all" — ignore private definitions in all loaded modules.
     *  - "current" — ignore private definitions only in the current entry-point module.
     *  - string[] — a list of module filenames. Private definitions are ignored only for modules whose filename matches an entry in this array.
     */
    ignorePrivate?: "all" | "current" | string[] | undefined;
    /** Option to ignore all custom tags defined in YAML file and just return raw value directly. */
    ignoreTags?: boolean | undefined;
    /** String to be used as a file path in error/warning messages. It will be overwritten by YAML text `FILENAME` directive if used. */
    filename?: string | undefined;
};
type Options = ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions & ExtendParseOptions;

/**
 * Class that handles loading multiple YAML files at the same time while watching loaded files and update there loads as files change.
 */
declare class LiveLoader {
    /**
     * @param opts - Options object passed to control live loader behavior. Note that these options will be default for all load functions, so it's not advised to define "filename" and
     * per module options here.
     */
    constructor(opts?: Options);
    /**
     * Method to set options of the class.
     * @param opts - Options object passed to control live loader behavior. Note that these options will be default for all load functions, so it's not advised to define "filename" and
     * per module options here.
     */
    setOptions(opts: Options): void;
    /**
     * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that
     * imported YAML files in the read YAML string are watched as well. works sync so all file watch, reads are sync and tags executions are handled
     * as sync functions and will not be awaited.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @param opts - Options object passed to control live loader behavior. overwrites default options defined for loader.
     * @returns Value of loaded YAML file.
     */
    addModule(filepath: string, options?: Options): Promise<{
        parse: unknown;
        errors: YAMLError$1[];
    }>;
    /**
     * Method to get cached value of loaded module or file. note that value retuned is module's resolve when params is undefined (default params value are used).
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @param ignorePrivate - Boolean to indicate if private nodes should be ignored in the cached load. overwrites value defined in "LiveLoaderOptions.ignorePrivate" for this module.
     * @returns Cached value of YAML file with default modules params or undefined if file is not loaded.
     */
    getModule(filepath: string, ignorePrivate?: boolean): {
        parse: unknown;
        errors: YAMLError$1[];
    } | undefined;
    /**
     * Method to get cached value of all loaded modules or files. note that values retuned are module's resolve when params is undefined (default params value are used).
     * @param ignorePrivate - Boolean to indicate if private nodes should be ignored in the cached load. overwrites value defined in "LiveLoaderOptions.ignorePrivate" for all modules.
     * @returns Object with keys resolved paths of loaded YAML files and values cached values of YAML files with default modules params.
     */
    getAllModules(ignorePrivate?: boolean): Record<string, {
        parse: unknown;
        errors: YAMLError$1[];
    } | undefined>;
    /**
     * Method to get all cached data about specific module. note that they are passed by reference and should never be mutated.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @returns Module load cache object.
     */
    getCache(path: string): ModuleCache | undefined;
    /**
     * Method to get all cached data of all loaded module. note that they are passed by reference and should never be mutated.
     * @returns Object with keys resolved paths of loaded YAML files and values Module cache objects for these module.
     */
    getAllCache(): Record<string, ModuleCache | undefined>;
    /**
     * Method to delete module or file from live loader.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     */
    deleteModule(path: string): void;
    /**
     * Method to clear cache of live loader by deleting all modules or files from live loader.
     */
    deleteAllModules(): void;
    /**
     * Method to clear live loader along with all of its watchers and cache from memory.
     */
    destroy(): void;
}

/**
 * Function to normalize and hash params object.
 * @param params - Params object that will be hashed.
 * @returns Stable hash of params object that will only change if value or key inside object changed.
 */
declare function hashParams(params: Record<string, unknown>): string;

declare function parseExtend(filepath: string, options?: Options): Promise<{
    parse: unknown;
    errors: YAMLError$1[];
}>;

export { LiveLoader, YAMLError, YAMLExprError, hashParams, parseExtend };
export type { DirectivesObj, ModuleCache, Options, ParamLoadEntry };
