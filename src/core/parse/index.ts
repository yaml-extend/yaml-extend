import { readFile } from "fs/promises";
import { verifyPath } from "./utils/path.js";
import {
  deepClone,
  getLinePosFromRange,
  getLineStarts,
} from "./utils/random.js";
import {
  getParseEntery,
  setParseEntery,
  handleModuleCache,
} from "./utils/cache.js";
import { resolve, resolveUnknown } from "./resolve/index.js";
import {
  ParseState,
  Options,
  TempParseState,
  ParseEntry,
  ModuleCache,
} from "./parseTypes.js";
import { DependencyHandler } from "./utils/depHandler.js";
import { resolve as resolvePath } from "path";
import { getAllImports } from "./tokenizerParser/directives/index.js";
import { YAMLError } from "../extendClasses/error.js";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main load functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export async function parseExtend(
  path: string,
  options: Options & { returnState?: true },
  state?: ParseState
): Promise<{
  parse: unknown;
  errors: YAMLError[];
  importedErrors: YAMLError[];
  state: ParseState;
  cache: ModuleCache;
}>;
export async function parseExtend(
  path: string,
  options: Options & { returnState?: false | undefined },
  state?: ParseState
): Promise<{
  parse: unknown;
  errors: YAMLError[];
  importedErrors: YAMLError[];
  state: undefined;
  cache: undefined;
}>;
export async function parseExtend(
  path: string,
  options?: Options & { returnState?: boolean | undefined },
  state?: ParseState
): Promise<{
  parse: unknown;
  errors: YAMLError[];
  importedErrors: YAMLError[];
  state: ParseState | undefined;
  cache: ModuleCache | undefined;
}>;
/**
 *
 * @param path - Path of YAML file in filesystem.
 * @param options - Options object passed to control parser behavior.
 * @param state - For internal use don't pass any thing here.
 * @returns Object that hold parse value along with errors thrown in this YAML file and errors thrown in imported YAML files.
 */
export async function parseExtend(
  path: string,
  options: Options = {},
  state?: ParseState
): Promise<{
  parse: unknown;
  errors: YAMLError[];
  importedErrors: YAMLError[];
  state: ParseState | undefined;
  cache: ModuleCache | undefined;
}> {
  // init state and temp state
  const s = initState(state);
  const ts = initTempState(path, options);

  try {
    // increment depth
    s.depth++;

    // verify path
    if (!verifyPath(ts.resolvedPath, ts))
      return {
        parse: undefined,
        errors: ts.errors,
        importedErrors: ts.importedErrors,
        state: ts.options.returnState ? s : undefined,
        cache: undefined,
      };

    // read file and add source and lineStarts to tempState
    ts.source = await readFile(ts.resolvedPath, { encoding: "utf8" });
    ts.lineStarts = getLineStarts(ts.source);

    // handle module cache
    await handleModuleCache(s, ts);

    // get cache
    const cache = s.cache.get(ts.resolvedPath) as ModuleCache;

    // check if load with same passed params is present in the cache and return it if present
    const comParams = {
      ...(ts.options.params ?? {}),
      ...(ts.options.universalParams ?? {}),
    };
    const cachedParse = getParseEntery(cache, comParams);
    if (cachedParse !== undefined)
      return {
        ...cachedParse,
        state: ts.options.returnState ? s : undefined,
        cache: ts.options.returnState ? cache : undefined,
      };

    // load imports before preceeding in resolving this module
    await handleImports(s, ts, cache);

    // resolve AST
    const resolved = await resolve(s, ts, cache);

    // add filename, path and extendLinePos for this file's errors and update message by adding filename and path to it
    for (const e of ts.errors) {
      e.filename = ts.filename;
      e.path = ts.resolvedPath;
      e.extendLinePos = getLinePosFromRange(ts.source, ts.lineStarts, e.pos);
      e.message =
        e.message +
        ` This error occured in file: ${
          e.filename ? e.filename : "Not defined"
        }, at path: ${e.path}`;
    }

    // generate parseEntery for this file
    const parseEntery: ParseEntry = {
      parse: resolved,
      errors: ts.errors,
      importedErrors: ts.importedErrors,
    };

    // add parse entery to the cache
    setParseEntery(s, ts, parseEntery);

    return {
      ...parseEntery,
      state: ts.options.returnState ? s : undefined,
      cache: ts.options.returnState ? cache : undefined,
    };
  } finally {
    s.dependency.purge();
    s.depth--;
  }
}

export type ParseExtend = typeof parseExtend;

////////////////////////////////////////////////////////////////////////////////////
// Helper methdos

/**
 * Function to initialize parser state.
 * @param state - State object from first parse if this YAML file is imported.
 * @returns State object that holds data and cache needed to be presisted along parses of different YAML files.
 */
export function initState(state?: ParseState): ParseState {
  if (state) return state;
  return {
    cache: new Map(),
    dependency: new DependencyHandler(),
    depth: 0,
  };
}

/**
 * Function to initialize temporary parser state.
 * @param filepath - Path of YAML file in filesystem.
 * @param options - Options object passed to control parser behavior.
 * @returns Temporary state object that holds data needed for parsing this YAML file only.
 */
function initTempState(path: string, options: Options): TempParseState {
  const basePath = options?.basePath ?? process.cwd();
  return {
    source: "",
    lineStarts: [],
    options: {
      ...options,
      basePath: resolvePath(basePath),
    },
    errors: [],
    importedErrors: [],
    resolvedPath: resolvePath(basePath, path),
    filename: "",
    range: [0, 0],
    anchors: new Map(),
    locals: [],
    resolveFunc: resolveUnknown,
    parseFunc: parseExtend,
  };
}

/**
 * Function to handle importing YAML files defined in directives.
 * @param state - State object that holds data and cache needed to be presisted along parses of different YAML files.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 */
async function handleImports(
  state: ParseState,
  tempState: TempParseState,
  cache: ModuleCache
): Promise<void> {
  const imports = getAllImports(cache.directives.import, true);
  for (const i of imports) {
    const params = i.defaultParams;
    const path = i.path;
    if (!path) continue;
    const copyOptions = deepClone(tempState.options);
    await parseExtend(path, { ...copyOptions, params }, state);
  }
}
