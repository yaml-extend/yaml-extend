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
import type { YAMLError } from "../extendClasses/error.js";
import type { Directives, TextToken } from "./tokenizer/tokenizerTypes.js";
import type { DependencyHandler } from "./utils/depHandler.js";
import type { ParseExtend } from "./index.js";

////////////////////////////////////////////////////////////////////////////////////
////// Two main functions in the parser, ParseExtend is external while Resolve is internal only.
export { ParseExtend };
/**
 * Function used to resolve the output of "yaml" lib to allow extended modules.
 */
export type Resolve = (
  item: unknown,
  anchored: boolean,
  state: ParseState,
  tempState: TempParseState
) => Promise<unknown>;

////////////////////////////////////////////////////////////////////////////////////
////// Main state object that is used in the parseExtend function

/**
 * State object generated for each parse function execution or live loader. Persistant state and hold data generated from parsing YAML file.
 */
export type ParseState = {
  /** Cache that hold data for each module. */
  cache: Cache;
  /** Class to handle dependency in modules. */
  dependency: DependencyHandler;
  /** Internally used only. */
  depth: number;
  /** Array of paths parsed by order. */
  parsedPaths: string[];
};

/**
 * Temporary state only needed during parsing and resolving YAML file, specific for each parse execution.
 */
export type TempParseState = {
  source: string;
  options: Options & { basePath: string };
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

////////////////////////////////////////////////////////////////////////////////////
////// Additional options

/**
 * Additional options that can be passed to parse function used by extend module.
 */
export type ExtendParseOptions = {
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
export type Options = ParseOptions &
  DocumentOptions &
  SchemaOptions &
  ToJSOptions &
  ExtendParseOptions;

////////////////////////////////////////////////////////////////////////////////////
////// Result cache handling

/**
 * Entry representing a resolved module parse for a specific set of params. Keyed in the parent cache by a hash computed from `params`.
 */
export type ParseEntry = {
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
export type ModuleCache = {
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
  scalarTokens: Record<string, { scalars: Scalar[]; tokens: TextToken[] }>;
  /** Abstract Syntax Tree of this YAML file loaded using "yaml" library. */
  AST: Alias | Scalar | YAMLMap | YAMLSeq | null;
};

/**
 * Cache of the modules parsed by parseExtend and saved in ParseState. each module loaded is keyed by its resolved path.
 */
export type Cache = Map<string, ModuleCache>;
