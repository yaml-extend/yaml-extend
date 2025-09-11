import type { Type } from "./wrapperClasses/type.js";
import type { Schema } from "./wrapperClasses/schema.js";
import type { WrapperYAMLException } from "./wrapperClasses/wrapperError.js";
import type { YAMLException } from "./wrapperClasses/error.js";
import type { BlueprintInstance } from "./core/load/lazyLoadClasses/blueprintInstance.js";
import type { TagResolveInstance } from "./core/load/lazyLoadClasses/tagResolveInstance.js";
import type {
  Load,
  LoadAsync,
  InternalLoad,
  InternalLoadAsync,
} from "./core/load/load.js";
import type { Resolve, ResolveAsync } from "./core/resolve/resolve.js";
import { LiveLoader } from "./core/liveLoader/liveLoader.js";

// Exprot imported funcs, classes
export {
  Type,
  Schema,
  WrapperYAMLException,
  YAMLException,
  BlueprintInstance,
  TagResolveInstance,
  Load,
  LoadAsync,
  InternalLoad,
  InternalLoadAsync,
  Resolve,
  ResolveAsync,
  LiveLoader,
};
/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
export let FAILSAFE_SCHEMA: Schema;
/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
export let JSON_SCHEMA: Schema;
/** same as JSON_SCHEMA: http://www.yaml.org/spec/1.2/spec.html#id2804923 */
export let CORE_SCHEMA: Schema;
/** all supported YAML types */
export let DEFAULT_SCHEMA: Schema;

//
//
//
//
//
//
//
//
//
//

// directives types
/** Object the holds directives data for YAML file. */
export type DirectivesObj = {
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
  importsMap: Map<string, { path: string; params: Record<string, string> }>;
};

/** List of directives handled by lib. */
export type DirectiveTypes =
  | "TAG"
  | "FILENAME"
  | "PARAM"
  | "LOCAL"
  | "IMPORT"
  | "PRIVATE";

/** Object that defines tokens extracted from directives. */
export type DirectivePartsObj = {
  alias: string;
  defValue: string;
  metadata: string;
  arrMetadata: string[];
  keyValue: Record<string, string>;
};

/** Specific tokens extracted from %TAG. */
export type TagDirParts = Pick<DirectivePartsObj, "alias" | "metadata">;

/** Specific tokens extracted from %FILENAME. */
export type FilenameDirParts = Pick<DirectivePartsObj, "metadata">;

/** Specific tokens extracted from %PARAM. */
export type ParamDirParts = Pick<DirectivePartsObj, "alias" | "defValue">;

/** Specific tokens extracted from %LOCAL. */
export type LocalDirParts = Pick<DirectivePartsObj, "alias" | "defValue">;

/** Specific tokens extracted from %IMPORT. */
export type ImportDirParts = Pick<
  DirectivePartsObj,
  "alias" | "metadata" | "keyValue"
>;

/** Specific tokens extracted from %PRIVATE. */
export type PrivateDirParts = Pick<DirectivePartsObj, "arrMetadata">;

//
//
//
//
//
//
//
//
//
//

// expression types
/** List of expressions handled by lib. */
export type ExpressionTypes = "this" | "import" | "param" | "local";

/** Object that defines tokens extracted from expressions. */
export type ExpressionPartsObj = {
  nodepath: string[];
  keyValue: Record<string, string>;
  alias: string;
};

/** Specific tokens extracted from $this. */
export type ThisExprParts = Pick<ExpressionPartsObj, "nodepath" | "keyValue">;

/** Specific tokens extracted from $import. */
export type ImportExprParts = Pick<ExpressionPartsObj, "nodepath" | "keyValue">;

/** Specific tokens extracted from $param. */
export type ParamExprParts = Pick<ExpressionPartsObj, "alias">;

/** Specific tokens extracted from $local. */
export type LocalExprParts = Pick<ExpressionPartsObj, "alias">;

//
//
//
//
//
//
//
//
//
//

// cache types

/**
 * Entry representing a resolved module load for a specific set of params.
 * Keyed in the parent cache by a hash computed from `params`.
 */
export type ParamLoadEntry = {
  /** Parameter values used to produce this load (may be undefined). */
  params?: Record<string, string>;

  /** Final resolved value returned after parsing/loading the YAML module. */
  load: unknown;
};

/**
 * Cache that stores all resolved loads and metadata for a single YAML module.
 */
export type ModuleLoadCache = {
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

/** Cache of the modules loaded by load functions (load, loadAsync, createLoader...). each module loaded is keyed by its resolved path. */
export type LoadCache = Map<string, ModuleLoadCache>;

/** Map that links each loadId with modules read by this load. */
export type LoadIdsToModules = Map<string, Set<string>>;

/** Map that links module with loadIds that read this module. */
export type ModulesToLoadIds = Map<string, Set<string>>;

/** Cache of each specific module under specific load id resolve. used in expression handler. */
export type ModuleResolveCache = DirectivesObj & {
  /** Options passed to load(). used in interpolations. */
  opts: HandledLoadOpts;

  /** Resolved path of this module. */
  path: string | undefined;

  /** Blueprint of this module. */
  blueprint: unknown;

  /** Params value passed along with load(). along with paramsMap's defualt values they are used to resolve params defined in module. */
  params: Record<string, string>;

  /**
   * Locals value defined after $this interpolation. along with localsMap's defualt values they are used to resolve locals defined in module.
   * array as each $this read will add it's defined locals value and delete it after being handled
   */
  localsVal: Record<string, string>[];
};

/** Map that holds all caches for expression handler. */
export type ResolveCache = Map<string, ModuleResolveCache>;

//
//
//
//
//
//
//
//
//
//

// function options
/** Options object passed to control load behavior. */
export interface LoadOptions {
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

/** Internal, LoadOptions after being handled in load/loadAsync. basePath and params are not optional. */
export type HandledLoadOpts = {
  basePath: string;
  unsafe?: boolean | undefined;
  filepath?: string | undefined;
  params: Record<string, string>;
  filename?: string | undefined;
  onWarning?(this: null, e: YAMLException | WrapperYAMLException): void;
  schema?: Schema | undefined;
  json?: boolean | undefined;
  listener?(this: State, eventType: ParseEventType, state: State): void;
};

/** Options object passed to control dump behavior. */
export interface DumpOptions {
  /** indentation width to use (in spaces). */
  indent?: number | undefined;

  /** when true, will not add an indentation level to array elements */
  noArrayIndent?: boolean | undefined;

  /** do not throw on invalid types (like function in the safe schema) and skip pairs and single values with such types. */
  skipInvalid?: boolean | undefined;

  /** specifies level of nesting, when to switch from block to flow style for collections. -1 means block style everwhere */
  flowLevel?: number | undefined;

  /** Each tag may have own set of styles.    - "tag" => "style" map. */
  styles?: { [x: string]: any } | undefined;

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
export type ResolveOptions = LoadOptions &
  DumpOptions & {
    /** Filesystem path to write generated resolved YAML text into. */
    outputPath?: string;
  };

/** Options object passed to control liveLoader behavior. */
export type LiveLoaderOptions = Omit<
  LoadOptions,
  "filename" | "filepath" | "params"
> & {
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

//
//
//
//
//
//
//
//
//
//

// Classs types
/**
 * Configirations and options that defines how tag handle data.
 */
export interface TypeConstructorOptions {
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
   * @param arg - Argument passed along with the tag which is single scalar value.
   * @returns Value that will replace node's raw value in the load.
   */
  construct?: ((data: any, type?: string, arg?: string) => unknown) | undefined;

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
  represent?:
    | ((data: object) => any)
    | { [x: string]: (data: object) => any }
    | undefined;

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
  styleAliases?: { [x: string]: any } | undefined;
}

/**
 * Definition of schema by supplying both implicit and explicit types.
 */
export interface SchemaDefinition {
  /** Internal YAML tags or types. */
  implicit?: Type[] | undefined;

  /** Extenral YAML tags or types. */
  explicit?: Type[] | undefined;
}

/**
 * State of the YAML file parse.
 */
export interface State {
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
export interface Mark {
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
export type Kind = "sequence" | "scalar" | "mapping";

/**
 * Types of parse event.
 */
export type ParseEventType = "open" | "close";

/**
 * Legacy type.
 */
export type EventType = "open" | "close";

/**
 * Types of file system event.
 */
export type FileEventType = "change" | "rename";

/**
 * Built-in schemas by js-yaml.
 */
export type Group = "FAILSAFE" | "JSON" | "CORE" | "DEFAULT";
