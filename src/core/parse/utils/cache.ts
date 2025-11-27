import { hashParams, hashStr } from "../utils/hash.js";
import {
  ModuleCache,
  ParseEntry,
  ParseState,
  TempParseState,
} from "../parseTypes.js";
import { parseDocument } from "yaml";
import { tokenizeDirectives } from "../tokenizer/directives/index.js";
import { getFilename } from "../tokenizerParser/directives/index.js";
import { YAMLParseError, YAMLWarning } from "../../extendClasses/error.js";
import {
  YAMLParseError as OrigYAMLParseError,
  YAMLWarning as OrigYAMLWarning,
} from "yaml";
import { LinePos } from "../tokenizer/tokenizerTypes.js";

/////////////////////////////////////////////////////////////////////////
// Internal functions only to interact with cache

/**
 * Function to handle cache of YAML file, it initialize a dedicated module cache if not defined yet or if the file changed.
 * @param state - State object from first parse if this YAML file is imported.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 */
export async function handleModuleCache(
  state: ParseState,
  tempState: TempParseState
): Promise<void> {
  // add path to dependcy class
  state.dependency.addDep(tempState.resolvedPath, state.depth === 1);

  // check if module is present in cache, if not init it and return
  const moduleCache = state.cache.get(tempState.resolvedPath);
  if (!moduleCache) {
    await initModuleCache(state, tempState);
    return;
  }

  // verify that text didn't change, if not init it and return
  const hashedSource = hashStr(tempState.source);
  if (hashedSource !== moduleCache.sourceHash) {
    await initModuleCache(state, tempState);
    return;
  }

  // add directive errors to tempState errors
  tempState.errors.push(...moduleCache.directives.errors);
  tempState.filename = getFilename(moduleCache.directives.filename, true) ?? "";
}

/**
 * Helper method for handleModuleCache to initialize new module cache for specific YAML file.
 * @param state - State object from first parse if this YAML file is imported.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 */
async function initModuleCache(state: ParseState, tempState: TempParseState) {
  // get cache data
  const sourceHash = hashStr(tempState.resolvedPath);
  const directives = tokenizeDirectives(tempState.source, tempState);
  const AST = handleAST(tempState);

  // generate new cache
  const cache: ModuleCache = {
    parseCache: new Map(),
    directives,
    resolvedPath: tempState.resolvedPath,
    sourceHash,
    scalarTokens: {},
    AST,
  };
  // save new cache in the state
  state.cache.set(tempState.resolvedPath, cache);
  //  add directive errors and filename to tempState
  tempState.errors.push(...cache.directives.errors);
  tempState.filename = getFilename(directives.filename, true) ?? "";
}

function handleAST(tempState: TempParseState) {
  // pass source and options to yaml lib
  const AST = parseDocument(tempState.source, tempState.options);
  // add errors
  const errors = AST.errors;
  for (const e of errors) {
    let error: YAMLParseError | YAMLWarning | undefined;
    if (e instanceof OrigYAMLParseError)
      error = new YAMLParseError(e.pos, e.code, e.message);
    if (e instanceof OrigYAMLWarning)
      error = new YAMLWarning(e.pos, e.code, e.message);
    if (error) {
      error.cause = e.cause;
      error.linePos = e.linePos as [LinePos, LinePos];
      error.name = e.name;
      error.stack = e.stack;
      tempState.errors.push(error);
    }
  }
  // return contents
  return AST.contents;
}

/**
 * Function to add parse entery to cache of specific YAML file.
 * @param state - State object from first parse if this YAML file is imported.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 * @param parseEntery - Entery that holds parse value and errors of specific YAML file.
 */
export function setParseEntery(
  state: ParseState,
  tempState: TempParseState,
  parseEntery: ParseEntry
): void {
  // get path and params
  const path = tempState.resolvedPath;
  const comParams = {
    ...(tempState.options.universalParams ?? {}),
    ...(tempState.options.params ?? {}),
  };

  // get moduleCache params
  const moduleCache = state.cache.get(path);
  if (!moduleCache) return;

  // hash params
  const hashedParams = hashParams(comParams);

  // make reference for parse cache
  const parseCache = moduleCache.parseCache;

  // if number of cached enteries exceeded 100 remove first 25 enteries
  if (parseCache.size > 50) {
    const iterator = parseCache.keys();

    for (let i = 0; i < 25; i++) {
      const key = iterator.next().value;
      if (key === undefined) break;
      parseCache.delete(key);
    }
  }

  // set entery in cache
  parseCache.set(hashedParams, parseEntery);
}

/////////////////////////////////////////////////////////////////////////
// Internal and External functions to interact with cache

/**
 * Function to get cache of specific YAML file from state.
 * @param state - State object from first parse if this YAML file is imported.
 * @param path - Path of YAML file in filesystem.
 * @returns
 */
export function getModuleCache(
  state: ParseState,
  path: string
): ModuleCache | undefined {
  return state.cache.get(path);
}

/**
 * Function to get parse entery for specific YAML file with specific params value.
 * @param cache - Cache of the module.
 * @param params - All params passed to parseExtend during parsing YAML file, includes 'params' and 'universalParams' in options.
 * @returns
 */
export function getParseEntery(
  cache: ModuleCache,
  params: Record<string, unknown> | undefined
): ParseEntry | undefined {
  // hash params and get cache of this load with params
  const hashedParams = hashParams(params ?? {});
  return cache.parseCache.get(hashedParams);
}

/**
 * Function to reset cache. it's advised to call it when options which affect output as 'schema', 'params', 'universalParams' and 'ignoreTags'
 * is changed to avoid stale parse enteries
 * @param state - State object from first parse if this YAML file is imported.
 */
export function resetCache(state: ParseState): void {
  state.dependency.reset();
  state.cache = new Map();
}

/**
 * Function to purge cache and delete paths that are no longer loaded.
 * @param state - State object from first parse if this YAML file is imported.
 * @param paths - Paths that are no longer entry paths.
 */
export function purgeCache(state: ParseState, paths?: string[]): string[] {
  const deletedPaths = state.dependency.purge(paths);
  for (const p of deletedPaths) state.cache.delete(p);
  return deletedPaths;
}
