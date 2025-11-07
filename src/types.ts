import type {
  ParseOptions,
  SchemaOptions,
  DocumentOptions,
  ToJSOptions,
  Alias,
  Scalar,
  YAMLMap,
  YAMLSeq,
} from "yaml";
import {
  YAMLError,
  YAMLExprError,
  YAMLParseError,
} from "./core/extendClasses/error.js";

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
  /** Errors present in directives. */
  errors: YAMLError[];
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

// expression types
/** List of expressions handled by lib. */
export type ExpressionTypes = "this" | "import" | "param" | "local";

/** Object that defines tokens extracted from expressions. */
export type ExpressionPartsObj = {
  nodepath: string[];
  keyValue: Record<string, unknown>;
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

/** Entry representing a resolved module load for a specific set of params. Keyed in the parent cache by a hash computed from `params`. */
export type ParamLoadEntry = {
  /** Final resolved value returned after parsing/loading the YAML module. */
  load: unknown;
  /** Final resolved value returned after parsing/loading the YAML module. but with keeping the private nodes. */
  privateLoad: unknown;
  /** Errors thrown with this resolve. */
  errors: YAMLError[];
};

/** Cache that stores all resolved loads and metadata for a single YAML module. */
export type ModuleCache = {
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

/** Cache of the modules loaded by load functions (load, loadAsync, createLoader...). each module loaded is keyed by its resolved path. */
export type LoadCache = Map<string, ModuleCache>;

/** Map that links each loadId with modules read by this load. */
export type LoadIdsToModules = Map<string, Set<string>>;

/** Map that links module with loadIds that read this module. */
export type ModulesToLoadIds = Map<string, Set<string>>;

export type ResolveCtx = {
  options: HandledOptions;
  loadId: string;
  resolveId: string;
  errors: (YAMLError | YAMLParseError | YAMLExprError)[];
  range: [number, number] | undefined;
  anchors: Map<string, unknown>;
  locals: Record<string, unknown>[];
  moduleCache: ModuleCache;
};

export type ExtendParseOptions = {
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

export type Options = ParseOptions &
  DocumentOptions &
  SchemaOptions &
  ToJSOptions &
  ExtendParseOptions;

export type HandledOptions = Options & {
  basePath: string;
  ignorePrivate: string[] | "all";
};
