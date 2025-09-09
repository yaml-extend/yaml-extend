/**
 * Error object when yaml-extend resolve error is thrown.
 */
declare class WrapperYAMLException extends Error {
    /** Logical name of the YAML string where error is thrown. */
    name: string;
    /** Filesystem path of the YAML file where error is thrown. */
    filepath: string;
    /** Reason of the error. */
    reason: string;
    /**
     * @param reason - Reason of the error.
     * @param filepath - Filesystem path of the YAML file where error is thrown.
     * @param name - Logical name of the YAML string where error is thrown.
     */
    constructor(reason?: string, filepath?: string, name?: string);
    /**
     * Method to convert Error object into string.
     * @param compact - Boolean to indicated if output error string should be compacted.
     * @returns Stringified error.
     */
    toString(compact?: boolean): string;
    /**
     * Method to reset additional data (filapath and name) of the error.
     * @param filepath - Filesystem path of the YAML file where error is thrown.
     * @param name - Logical name of the YAML string where error is thrown.
     */
    setAdditionalData(filepath: string | undefined, name: string | undefined): void;
}

/**
 * Type to handle tags and custom data types in YAML.
 */
declare class Type {
    /** YAML data type that will be handled by this Tag/Type. */
    kind?: TypeConstructorOptions["kind"];
    /**
     * Runtime type guard used when parsing YAML to decide whether a raw node (scalar, mapping or sequence) should be treated as this custom type.
     * Return true when the incoming data matches this type.
     * @param data - Raw node's value.
     * @returns Boolean to indicate if raw value should be handled using this type.
     */
    resolve?: TypeConstructorOptions["resolve"];
    /**
     * Function that will be executed on raw node to return custom type in the load.
     * @param data - Raw node's value.
     * @param type - Type of the tag.
     * @param param - Param passed along with the tag which is single scalar value.
     * @returns Value that will replace node's raw value in the load.
     */
    construct?: TypeConstructorOptions["construct"];
    /**
     * Used when dumping (serializing) JS objects to YAML. If a value is an instance of the provided constructor (or matches the object prototype),
     * the dumper can choose this type to represent it.
     */
    instanceOf?: TypeConstructorOptions["instanceOf"];
    /**
     *  Alternative to instanceOf for dump-time detection. If predicate returns true for a JS value, the dumper can select this type to represent that object.
     * Useful when instanceof is not possible (plain objects, duck-typing).
     */
    predicate?: TypeConstructorOptions["predicate"];
    /**
     * Controls how a JS value is converted into a YAML node when serializing (dumping). Return either a primitive, array or mapping representation suitable for YAML.
     * When provided as an object, each property maps a style name to a function that produces the representation for that style.
     */
    represent?: TypeConstructorOptions["represent"];
    /**
     * When represent is given as a map of styles, representName chooses which style to use for a particular value at dump time. It should return the
     * style key (e.g., "canonical" or "short").
     */
    representName?: TypeConstructorOptions["representName"];
    /** The fallback style name to use when represent provides multiple styles and representName is not present (or does not return a valid style). */
    defaultStyle?: TypeConstructorOptions["defaultStyle"];
    /**
     * Indicates whether this tag/type can be used for multiple YAML tags (i.e., it is not strictly tied to a single tag). This affects how the
     * parser/dumper treats tag resolution and may allow more flexible matching.
     */
    multi?: TypeConstructorOptions["multi"];
    /**
     * Map alias style names to canonical style identifiers. This lets users refer to styles by alternate names; the dumper normalizes them to the canonical style
     * before selecting a represent function.
     */
    styleAliases?: TypeConstructorOptions["styleAliases"];
    /**
     * @param tag - Tag that will be used in YAML text.
     * @param opts - Configirations and options that defines how tag handle data.
     */
    constructor(tag: string, opts?: TypeConstructorOptions);
    /** Read only, Tag name of the type. */
    get tag(): string;
}

/**
 * Schema that holds Types used for loading and dumping YAML string.
 */
declare class Schema {
    /**
     * @param definition - Either schema definition or types that will control how parser handle tags in YAML.
     * @param group - Optional built-in schema to use.
     */
    constructor(definition: SchemaDefinition | Type | Type[], group?: "FAILSAFE" | "JSON" | "CORE" | "DEFAULT" | undefined);
    /**
     * @param types - Either schema definition or types that will control how parser handle tags in YAML.
     * @returns Reference to the schema.
     */
    extend(types: SchemaDefinition | Type[] | Type): Schema;
    get types(): Type[];
    get group(): "FAILSAFE" | "JSON" | "CORE" | "DEFAULT" | undefined;
}

/**
 * Class that replace and store primitives, expression strings or TagResolveInstances in raw-load from js-yaml which enable lazy resolving based on different $param or %local values.
 * It also record resolve state to insure left-to-right evaluation order.
 */
declare class BlueprintInstance {
    /** Boolean, initially false. Set to true after the instance is fully resolved. */
    resolved: boolean;
    /**
     * @param rawValue - The original raw value from js-yaml (primitive, expression string or TagResolveInstance).
     */
    constructor(rawValue: unknown);
    /** Read only, The original raw value from js-yaml (primitive, expression string or TagResolveInstance). */
    get rawValue(): unknown;
}

/**
 * Class returned from user-defined type's contruct functions. stores data, type and arg passed to the function, so they can be resolved first.
 */
declare class TagResolveInstance {
    /**
     * @param func - Constructor function used by the tag.
     * @param data - Data passed to the tag.
     * @param type - Type passed to the tag.
     * @param arg - Argument string passed to the tag.
     */
    constructor(func: (data: any, type?: string, arg?: string) => unknown | Promise<unknown>, data: any, type: string | undefined, arg: string | undefined);
    /**
     * Method to execute the constructor function and get value from the tag. works sync.
     * @param data - Data passed to the tag.
     * @param type - Type passed to the tag.
     * @param arg - Argument string passed to the tag.
     * @retunrs Value from construct function exectution on resolved data.
     */
    resolve(data: any, type?: string, arg?: string): unknown;
    /**
     * Method to execute the constructor function and get value from the tag. works async.
     * @param data - Data passed to the tag.
     * @param type - Type passed to the tag.
     * @param arg - Argument string passed to the tag.
     * @retunrs Value from construct function exectution on resolved data.
     */
    resolveAsync(data: any, type?: string, arg?: string): Promise<unknown>;
    /** Read only, Data passed to the tag. */
    get data(): any;
    /** Read only, Type passed to the tag. */
    get type(): string | undefined;
    /** Read only, Argument passed to the tag. */
    get arg(): string | undefined;
}

/**
 * Function to load YAML string into js value. works sync so all file system reads are sync, also all tag's construct functions executions will be treated as sync
 * functions and not awaited. If you are using imports or async tag construct functions use loadAsync instead.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control load behavior.
 * @returns Js value of loaded YAML string.
 */
declare function load(str: string, opts?: LoadOptions): unknown;
/**
 * Function to load YAML string into js value. works async so all file system reads are async, also all tag's construct functions executions are awaited.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control load behavior.
 * @returns Js value of loaded YAML string.
 */
declare function loadAsync(str: string, opts?: LoadOptions): Promise<unknown>;

/**
 * Function to resolve tags and wrapper expressions (imports, params, locals and privates) to generate one resolved YAML string. short hand for calling load()
 * then dump(). useful to convert YAML modules into one YAML string that will be passed for configiration. works sync.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control resolve behavior.
 */
declare function resolve(str: string, opts?: ResolveOptions): string;
/**
 * Function to resolve tags and wrapper expressions (imports, params, locals and privates) to generate one resolved YAML string. short hand for calling load()
 * then dump(). useful to convert YAML modules into one YAML string that will be passed for configiration. works async.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control resolve behavior.
 */
declare function resolveAsync(str: string, opts?: ResolveOptions): Promise<string>;

/**
 * Class that handles loading multiple YAML files at the same time while watching loaded files and update there loads as files change.
 */
declare class LiveLoader {
    /**
     * @param opts - Options object passed to control live loader behavior.
     */
    constructor(opts?: LiveLoaderOptions);
    /**
     * Method to set options of the class.
     * @param opts - Options object passed to control live loader behavior.
     */
    setOptions(opts: LiveLoaderOptions): void;
    /**
     * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that
     * imported YAML files in the read YAML string are watched as well. works sync so all file watch, reads are sync and tags executions are handled
     * as sync functions and will not be awaited.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @param params - Object of module params aliases and there values to be used in this load. so it's almost always better to use addModuleAsync instead.
     * @returns Value of loaded YAML file.
     */
    addModule(path: string, params?: Record<string, string>): unknown;
    /**
     * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that imported
     * YAML files in the read YAML string are watched as well. works async so all file watch, reads are async and tags executions will be awaited.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @param params - Object of module params aliases and there values to be used in this load.
     * @returns Value of loaded YAML file.
     */
    addModuleAsync(path: string, params?: Record<string, string>): Promise<unknown>;
    /**
     * Method to get cached value of loaded module or file. note that value retuned is module's resolve when params is undefined (default params value are used).
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @returns Cached value of YAML file with default modules params or undefined if file is not loaded.
     */
    getModule(path: string): unknown | undefined;
    /**
     * Method to get cached value of all loaded modules or files. note that values retuned are module's resolve when params is undefined (default params value are used).
     * @returns Object with keys resolved paths of loaded YAML files and values cached values of YAML files with default modules params.
     */
    getAllModules(): Record<string, unknown>;
    /**
     * Method to get all cached data about specific module. note that they are passed by reference and should never be mutated.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @returns Module load cache object.
     */
    getCache(path: string): ModuleLoadCache | undefined;
    /**
     * Method to get all cached data of all loaded module. note that they are passed by reference and should never be mutated.
     * @returns Object with keys resolved paths of loaded YAML files and values Module cache objects for these module.
     */
    getAllCache(): Record<string, ModuleLoadCache>;
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

/** Object the holds directives data for YAML file. */
type DirectivesObj = {
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
};
/**
 * Entry representing a resolved module load for a specific set of params.
 * Keyed in the parent cache by a hash computed from `params`.
 */
type ParamLoadEntry = {
    /** Parameter values used to produce this load (may be undefined). */
    params?: Record<string, string>;
    /** Final resolved value returned after parsing/loading the YAML module. */
    load: unknown;
};
/**
 * Cache that stores all resolved loads and metadata for a single YAML module.
 */
type ModuleLoadCache = {
    /**
     * Map from params-hash → ParamLoadEntry.
     * Use the hash of the params (string) as the map key so different param sets map to their respective resolved load results.
     */
    loadByParamHash: Map<string, ParamLoadEntry>;
    /** Parsed directive data for the module (e.g., %TAG, %PARAM, %LOCAL, %PRIVATE). */
    directives: DirectivesObj;
    /** Absolute or resolved filesystem path of the module. */
    resolvedPath: string;
    /** Original string provided to `load()` for this module. */
    source: string;
    /** Hash computed from `source` (used to detect changes / cache misses). */
    sourceHash: string;
    /** Canonical "blueprint" produced from the YAML text used to generate loads. */
    blueprint: unknown;
};
/** Options object passed to control load behavior. */
interface LoadOptions {
    /**
     * Filesystem path used as the sandbox root for imports. Prevents access to files outside this directory and is used as the base when resolving relative
     * imports or special `@base/...` import syntax. Example: if basePath is `/proj` and an import says `./configs/a.yaml`, the loader resolves against `/proj`.
     */
    basePath?: string | undefined;
    /** Boolean to disable basePath black boxing. it's not recommend to set it to true unless you have strong reason. */
    unsafe?: boolean | undefined;
    /**
     * The resolved path of the YAML source. Useful for error messages, caching, and resolving relative imports. If you call `load("./file.yaml")` the loader should
     * set this to the resolved absolute path automatically. `Note that imports and caching will not work if filepath is not supplied here or in function's str field.`
     */
    filepath?: string | undefined;
    /** Mapping of module param aliases to string values that will be used to resolve %PARAM declarations in the module. Loader-supplied params should override any defaults declared with %PARAM. */
    params?: Record<string, string> | undefined;
    /** String to be used as a file path in error/warning messages. It will be overwritten by YAML text `FILENAME` directive if used. */
    filename?: string | undefined;
    /** Function to call on warning messages. */
    onWarning?(this: null, e: YAMLException | WrapperYAMLException): void;
    /** Specific schema to use. */
    schema?: Schema | undefined;
    /** Compatibility with JSON.parse behaviour. */
    json?: boolean | undefined;
    /** Listener for parse events. */
    listener?(this: State, eventType: ParseEventType, state: State): void;
}
/** Options object passed to control dump behavior. */
interface DumpOptions {
    /** indentation width to use (in spaces). */
    indent?: number | undefined;
    /** when true, will not add an indentation level to array elements */
    noArrayIndent?: boolean | undefined;
    /** do not throw on invalid types (like function in the safe schema) and skip pairs and single values with such types. */
    skipInvalid?: boolean | undefined;
    /** specifies level of nesting, when to switch from block to flow style for collections. -1 means block style everwhere */
    flowLevel?: number | undefined;
    /** Each tag may have own set of styles.    - "tag" => "style" map. */
    styles?: {
        [x: string]: any;
    } | undefined;
    /** specifies a schema to use. */
    schema?: Schema | undefined;
    /** if true, sort keys when dumping YAML. If a function, use the function to sort the keys. (default: false) */
    sortKeys?: boolean | ((a: any, b: any) => number) | undefined;
    /** set max line width. (default: 80) */
    lineWidth?: number | undefined;
    /** if true, don't convert duplicate objects into references (default: false) */
    noRefs?: boolean | undefined;
    /** if true don't try to be compatible with older yaml versions. Currently: don't quote "yes", "no" and so on, as required for YAML 1.1 (default: false) */
    noCompatMode?: boolean | undefined;
    /**
     * if true flow sequences will be condensed, omitting the space between `key: value` or `a, b`. Eg. `'[a,b]'` or `{a:{b:c}}`.
     * Can be useful when using yaml for pretty URL query params as spaces are %-encoded. (default: false).
     */
    condenseFlow?: boolean | undefined;
    /** strings will be quoted using this quoting style. If you specify single quotes, double quotes will still be used for non-printable characters. (default: `'`) */
    quotingType?: "'" | '"' | undefined;
    /** if true, all non-key strings will be quoted even if they normally don't need to. (default: false) */
    forceQuotes?: boolean | undefined;
    /** callback `function (key, value)` called recursively on each key/value in source object (see `replacer` docs for `JSON.stringify`). */
    replacer?: ((key: string, value: any) => any) | undefined;
}
/** Options object passed to control resolve behavior. */
type ResolveOptions = LoadOptions & DumpOptions & {
    /** Filesystem path to write generated resolved YAML text into. */
    outputPath?: string;
};
/** Options object passed to control liveLoader behavior. */
type LiveLoaderOptions = Omit<LoadOptions, "filename" | "filepath" | "params"> & {
    /**
     * Function to call when a watcher detect file change.
     * @param eventType - Type of the file change event. either "change" or "rename".
     * @param path - Path of updated YAML file.
     * @param load - New load value of the YAML file or last cached load value if error is thrown.
     */
    onUpdate?: (eventType: FileEventType, path: string, newLoad: unknown) => void;
    /**
     * How live loader will react when load error is thrown. You should note that error throwing will be very likely to occur when you update files. if setted to true
     * errors will be passed to onWarning function otherwise errors will be ommited. default is false.
     */
    warnOnError?: boolean;
    /**
     * How live loader will react when load error is thrown. You should note that error throwing will be very likely to occur when you update files. if setted to true
     * cache of this module will be reseted to null otherwise nothing will happen to old cache when error is thrown. default is false.
     */
    resetOnError?: boolean;
};
/**
 * Configirations and options that defines how tag handle data.
 */
interface TypeConstructorOptions {
    /** YAML data type that will be handled by this Tag/Type. */
    kind?: Kind | undefined;
    /**
     * Runtime type guard used when parsing YAML to decide whether a raw node (scalar, mapping or sequence) should be treated as this custom type.
     * Return true when the incoming data matches this type.
     * @param data - Raw node's value.
     * @returns Boolean to indicate if raw value should be handled using this type.
     */
    resolve?: ((data: any) => boolean) | undefined;
    /**
     * Function that will be executed on raw node to return custom data type in the load.
     * @param data - Raw node's value.
     * @param type - Type of the tag.
     * @param param - Param passed along with the tag which is single scalar value.
     * @returns Value that will replace node's raw value in the load.
     */
    construct?: ((data: any, type?: string, params?: string) => unknown) | undefined;
    /**
     * Used when dumping (serializing) JS objects to YAML. If a value is an instance of the provided constructor (or matches the object prototype),
     * the dumper can choose this type to represent it.
     */
    instanceOf?: object | undefined;
    /**
     * Alternative to instanceOf for dump-time detection. If predicate returns true for a JS value, the dumper can select this type to represent that object.
     * Useful when instanceof is not possible (plain objects, duck-typing).
     * @param data - Raw node's value.
     * @returns Boolean to indicate if type will represent object or not while dumping.
     */
    predicate?: ((data: object) => boolean) | undefined;
    /**
     * Controls how a JS value is converted into a YAML node when serializing (dumping). Return either a primitive, array or mapping representation suitable for YAML.
     * When provided as an object, each property maps a style name to a function that produces the representation for that style.
     */
    represent?: ((data: object) => any) | {
        [x: string]: (data: object) => any;
    } | undefined;
    /**
     * When represent is given as a map of styles, representName chooses which style to use for a particular value at dump time.
     * It should return the style key (e.g., "canonical" or "short").
     * @param data - Raw node's value.
     * @returns Style key of represent.
     */
    representName?: ((data: object) => any) | undefined;
    /** The fallback style name to use when represent provides multiple styles and representName is not present (or does not return a valid style). */
    defaultStyle?: string | undefined;
    /**
     * Indicates whether this tag/type can be used for multiple YAML tags (i.e., it is not strictly tied to a single tag). This affects how the
     * parser/dumper treats tag resolution and may allow more flexible matching.
     */
    multi?: boolean | undefined;
    /**
     * Map alias style names to canonical style identifiers. This lets users refer to styles by alternate names; the dumper normalizes them to the
     * canonical style before selecting a represent function.
     */
    styleAliases?: {
        [x: string]: any;
    } | undefined;
}
/**
 * Definition of schema by supplying both implicit and explicit types.
 */
interface SchemaDefinition {
    /** Internal YAML tags or types. */
    implicit?: Type[] | undefined;
    /** Extenral YAML tags or types. */
    explicit?: Type[] | undefined;
}
/**
 * State of the YAML file parse.
 */
interface State {
    /** The raw YAML text being parsed. */
    input: string;
    /** Logical name for YAML string. */
    filename: string | null;
    /** The `Schema` instance currently in use. */
    schema: Schema;
    /** Optional callback invoked for non-fatal parse warnings. */
    onWarning: (this: null, e: YAMLException) => void;
    /** If true, parser attempts to behave like `JSON.parse` where applicable (restricts some YAML behaviors for JSON compatibility). */
    json: boolean;
    /** The total length (number of characters) of `input`. */
    length: number;
    /** Current zero-based index within `input` where the parser is reading. */
    position: number;
    /** Current line number (zero-based). */
    line: number;
    /** The index in `input` where the current line begins. Combined with `position` to compute the `column`. */
    lineStart: number;
    /** Number of spaces (indent) at the current line. */
    lineIndent: number;
    /** YAML version (e.g. 1.1, 1.2) if the document declares one; otherwise null. */
    version: null | number;
    /** Whether to validate line-break characters strictly. */
    checkLineBreaks: boolean;
    /** Internal marker describing the current parsing context (for example document, mapping, sequence, etc.). */
    kind: string;
    /** The partially- or fully-parsed JavaScript value produced so far for the current document. Updated as nodes are constructed. */
    result: any;
    /** Array of `Type` instances that the parser should consider implicitly when trying to recognize scalars/values. */
    implicitTypes: Type[];
}
/**
 * Mark for YAMLException that defines error's details.
 */
interface Mark {
    /** The original input text (or the relevant buffer slice) used to produce the error. */
    buffer: string;
    /** Zero-based column number (character offset from lineStart) where the error occurred. */
    column: number;
    /** Zero-based line number where the problem was detected. */
    line: number;
    /** The logical name for YAML string (filename). */
    name: string;
    /** Absolute character index in `buffer` for the error location. */
    position: number;
    /** short excerpt from the input surrounding the error. */
    snippet: string;
}
/**
 * Kind or type of YAML data.
 */
type Kind = "sequence" | "scalar" | "mapping";
/**
 * Types of parse event.
 */
type ParseEventType = "open" | "close";
/**
 * Types of file system event.
 */
type FileEventType = "change" | "rename";
/**
 * Built-in schemas by js-yaml.
 */
type Group = "FAILSAFE" | "JSON" | "CORE" | "DEFAULT";

/** Error object when `js-yaml` parse error it thrown. */
declare class YAMLException extends Error {
    /** Logical name of the YAML string where error is thrown. */
    name: string;
    /** Reason of the error. */
    reason?: string;
    /** Mark for YAMLException that defines error's details. */
    mark?: any;
    /**
     * @param reason - Reason of the error.
     * @param mark - Mark for YAMLException that defines error's details.
     */
    constructor(reason?: string, mark?: Mark);
    /**
     * Method to convert Error object into string.
     * @param compact - Boolean to indicated if output error string should be compacted.
     * @returns Stringified error.
     */
    toString(compact?: boolean): string;
}

/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
declare const FAILSAFE_SCHEMA: Schema;
/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
declare const JSON_SCHEMA: Schema;
/** same as JSON_SCHEMA: http://www.yaml.org/spec/1.2/spec.html#id2804923 */
declare const CORE_SCHEMA: Schema;
/** all supported YAML types */
declare const DEFAULT_SCHEMA: Schema;

/**
 * Function to dump js value into YAML string.
 * @param obj - Js object that will be converted to YAML string
 * @param opts - Options object passed to control dump behavior.
 * @returns YAML string of dumped js value.
 */
declare function dump(obj: any, opts?: DumpOptions | undefined): string;

/**
 * Function to normalize and hash params object.
 * @param params - Params object that will be hashed.
 * @returns Stable hash of params object that will only change if value or key inside object changed.
 */
declare function hashParams(params: Record<string, string>): string;

export { BlueprintInstance, CORE_SCHEMA, DEFAULT_SCHEMA, FAILSAFE_SCHEMA, JSON_SCHEMA, LiveLoader, Schema, TagResolveInstance, Type, WrapperYAMLException, YAMLException, dump, hashParams, load, loadAsync, resolve, resolveAsync };
export type { DirectivesObj, DumpOptions, FileEventType, Group, Kind, LiveLoaderOptions, LoadOptions, Mark, ModuleLoadCache, ParamLoadEntry, ParseEventType, ResolveOptions, SchemaDefinition, State, TypeConstructorOptions };
