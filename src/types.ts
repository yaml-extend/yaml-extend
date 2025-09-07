import type { Type } from "./wrapperClasses/type.js";
import type { Schema } from "./wrapperClasses/schema.js";
import type { WrapperYAMLException } from "./wrapperClasses/error.js";
import type { YAMLException } from "js-yaml";
import type {
  Load,
  LoadAsync,
  InternalLoad,
  InternalLoadAsync,
} from "./core/load/load.js";
import type { Resolve, ResolveAsync } from "./core/resolve/resolve.js";
import { LiveLoader } from "./core/liveLoader/liveLoader.js";

/** Map the holds directives data. */
export type DirectivesObj = {
  /** Array of node paths that are defined to be private in YAML directive. */
  privateArr: string[];
  /** Map of <handle> <prefix> for tags defined in YAML directive. */
  tagsMap: Map<string, string>;
  /** Map of <alias> <defualt value> for the params defined in YAML directive. */
  paramsMap: Map<string, string>;
  /** Map of <alias> <defualt value> for the locals defined in YAML directive. */
  localsMap: Map<string, string>;
  /** Map of <alias> <path> <params value> for the imports defined in YAML directive. */
  importsMap: Map<string, { path: string; paramsVal: Record<string, string> }>;
  /** Logical filename if supplied in the directives. */
  filename: string | undefined;
};

export type DirectiveTypes =
  | "TAG"
  | "FILENAME"
  | "PARAM"
  | "LOCAL"
  | "IMPORT"
  | "PRIVATE";
export type DirectivePartsObj = {
  alias: string;
  defValue: string;
  metadata: string;
  arrMetadata: string[];
  keyValue: Record<string, string>;
};
export type TagDirParts = Pick<DirectivePartsObj, "alias" | "metadata">;
export type ImportDirParts = Pick<
  DirectivePartsObj,
  "alias" | "metadata" | "keyValue"
>;
export type FilenameDirParts = Pick<DirectivePartsObj, "metadata">;
export type LocalDirParts = Pick<DirectivePartsObj, "alias" | "defValue">;
export type ParamDirParts = Pick<DirectivePartsObj, "alias" | "defValue">;
export type PrivateDirParts = Pick<DirectivePartsObj, "arrMetadata">;

export type ExpressionTypes = "this" | "import" | "param" | "local";
export type ExpressionPartsObj = {
  nodepath: string[];
  keyValue: Record<string, string>;
  alias: string;
};
export type ThisExprParts = Pick<ExpressionPartsObj, "nodepath" | "keyValue">;
export type ImportExprParts = Pick<ExpressionPartsObj, "nodepath" | "keyValue">;
export type ParamExprParts = Pick<ExpressionPartsObj, "alias">;
export type LocalExprParts = Pick<ExpressionPartsObj, "alias">;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Classes types
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// TYPE
export type { Type };
export interface TypeConstructorOptions {
  kind?: "sequence" | "scalar" | "mapping" | undefined;
  resolve?: ((data: any) => boolean) | undefined;
  construct?:
    | ((data: any, type?: string, params?: string) => unknown)
    | undefined;
  instanceOf?: object | undefined;
  predicate?: ((data: object) => boolean) | undefined;
  represent?:
    | ((data: object) => any)
    | { [x: string]: (data: object) => any }
    | undefined;
  representName?: ((data: object) => any) | undefined;
  defaultStyle?: string | undefined;
  multi?: boolean | undefined;
  styleAliases?: { [x: string]: any } | undefined;
}

////////// ERROR
export type { WrapperYAMLException };
export type { YAMLException };
export interface Mark {
  buffer: string;
  column: number;
  line: number;
  name: string;
  position: number;
  snippet: string;
}

////////// SCHEMA
export type { Schema };
export interface SchemaDefinition {
  implicit?: Type[] | undefined;
  explicit?: Type[] | undefined;
}
export type Group = "FAILSAFE" | "JSON" | "CORE" | "DEFAULT";
/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
export let FAILSAFE_SCHEMA: Schema;
/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
export let JSON_SCHEMA: Schema;
/** same as JSON_SCHEMA: http://www.yaml.org/spec/1.2/spec.html#id2804923 */
export let CORE_SCHEMA: Schema;
/** all supported YAML types */
export let DEFAULT_SCHEMA: Schema;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Load types
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// MAIN FUNCTIONS
export { Load, LoadAsync, InternalLoad, InternalLoadAsync };

////////// JS-YAML RELATED
export interface LoadOptions {
  /**
   * Filesystem path that will sandbox YAML file imports. it will prevent any external file access and act as base path when URL path is passed to `LoadOptions.filename` or
   * when `@base/path/file.yaml` is used inside YAML string for imports. for example if "./path" is used when you supply filename "./file.yaml" the resolved filename will
   * be "./path/file.yaml". default is process.cwd().
   */
  basePath?: string | undefined;
  /** path of the loaded file. It should be passed to allow imports and caching. defualt in undefined and is overwritten by str if filesystem path is passed. */
  filepath?: string | undefined;
  /** logical name of YAML string. used in error messages */
  filename?: string | undefined;
  /** function to call on warning messages. */
  onWarning?(this: null, e: YAMLException | WrapperYAMLException): void;
  /** specifies a schema to use. */
  schema?: Schema | undefined;
  /** compatibility with JSON.parse behaviour. */
  json?: boolean | undefined;
  /** listener for parse events */
  listener?(this: State, eventType: EventType, state: State): void;
  /** Params value to be used in module (str). */
  paramsVal?: Record<string, string> | undefined;
}
/** Options passed to load function after being handled (basePath and paramsVal default values are added). */
export type HandledLoadOpts = {
  filename?: string | undefined;
  filepath?: string | undefined;
  onWarning?(this: null, e: YAMLException | WrapperYAMLException): void;
  schema?: Schema | undefined;
  json?: boolean | undefined;
  listener?(this: State, eventType: EventType, state: State): void;
  basePath: string;
  paramsVal: Record<string, string>;
};

export type LiveLoaderOptions = Omit<
  LoadOptions,
  "filename" | "filepath" | "paramsVal"
> & {
  /** listener that will run with every update to files loaded in live loader. */
  onUpdate?: (
    eventType: "change" | "rename",
    path: string,
    newLoad: unknown
  ) => void;

  /**
   * How live loader will react when load error is thrown. You should note that error throwing will be very likely to occur when you update files. if setted to true
   * errors will be logger using console.warn(), if setted to warning will be logged. default is false.
   */
  warnOnError?: boolean;
  /**
   * How live loader will react when load error is thrown. You should note that error throwing will be very likely to occur when you update files. if setted to true
   * load of this module will be reseted to null, if setted to false nothing will happen and last load value will be returned. default is false.
   */
  resetOnError?: boolean;
};
export type EventType = "open" | "close";
export interface State {
  input: string;
  filename: string | null;
  schema: Schema;
  onWarning: (this: null, e: YAMLException) => void;
  json: boolean;
  length: number;
  position: number;
  line: number;
  lineStart: number;
  lineIndent: number;
  version: null | number;
  checkLineBreaks: boolean;
  kind: string;
  result: any;
  implicitTypes: Type[];
}

////////// WRAPPER RELATED
export type ParamsCache = {
  /** Params used to load module. */
  paramsVal: Record<string, string> | undefined;
  /** Final load after parsing YAML text. */
  load: unknown;
};
/** Cache of single module (str) read by load(). map of params hash as keys. */
export type ModuleLoadCache = {
  /** Map of params hash as a key and load with params used as value. */
  loadCache: Map<string, ParamsCache>;
  /** Object that holds data of directives. */
  dirObj: DirectivesObj;
  /** Resolved path of the module. */
  resPath: string;
  /** String passed from load(). */
  str: string;
  /** Hash of the string passed to load(). */
  hashedStr: string;
  /** Blueprint of the YAML text used to generate loads. */
  blueprint: unknown;
};
/** Cache of the modules loaded by load functions (load, loadAsync, createLoader...). each module loaded is keyed by hash of it's resolved path. */
export type LoadCache = Map<string, ModuleLoadCache>;
/** Map that links each loadId with modules read by this load. */
export type LoadIdsToModules = Map<string, Set<string>>;
/** Map that links module with loadIds that read this module. */
export type ModulesToLoadIds = Map<string, Set<string>>;
export type ModuleResolveCache = DirectivesObj & {
  /** Options passed to load(). used in interpolations. */
  opts: HandledLoadOpts;

  /** Resolved path of this module. */
  path: string | undefined;

  /** Blueprint of this module. */
  blueprint: unknown;

  /** Params value passed along with load(). along with paramsMap's defualt values they are used to resolve params defined in module. */
  paramsVal: Record<string, string>;

  /**
   * Locals value defined after $this interpolation. along with localsMap's defualt values they are used to resolve locals defined in module.
   * array as each $this read will add it's defined locals value and delete it after being handled
   */
  localsVal: Record<string, string>[];
};
export type ResolveCache = Map<string, ModuleResolveCache>;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Dump types
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Resolve types
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export { Resolve, ResolveAsync };
export type ResolveOptions = LoadOptions &
  DumpOptions & {
    /** Path to write resolved file. */
    outputPath?: string;
  };
