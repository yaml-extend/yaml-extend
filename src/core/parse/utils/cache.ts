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

/**
 * Function to handle cache of YAML file, it initialize a dedicated module cache if not defined yet or if the file changed.
 * @param state - State object from first parse if this YAML file is imported.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 */
export async function handleModuleCache(
  state: ParseState,
  tempState: TempParseState
): Promise<void> {
  // add path to parsedPaths
  state.parsedPaths.add(tempState.resolvedPath);

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
    loadByParamHash: new Map(),
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
      error.linePos = e.linePos;
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

  // set entery in cache
  moduleCache.loadByParamHash.set(hashedParams, parseEntery);
}

/**
 * Function to get cache of specific YAML file from state.
 * @param state - State object from first parse if this YAML file is imported.
 * @param filepath - Path of YAML file in filesystem.
 * @returns
 */
export function getModuleCache(
  state: ParseState,
  filepath: string
): ModuleCache | undefined {
  return state.cache.get(filepath);
}

/**
 *
 * @param state - State object from first parse if this YAML file is imported.
 * @param filepath - Path of YAML file in filesystem.
 * @param params - Params object to defined values of params in the parsed YAML file, note that it only affect YAML file at passed filepath and not passed to imported files.
 * @param ignoreTags
 * @returns
 */
export function getParseEntery(
  state: ParseState,
  filepath: string,
  params: Record<string, unknown> | undefined
): ParseEntry | undefined {
  const moduleCache = state.cache.get(filepath);
  if (!moduleCache) return;

  // hash params and get cache of this load with params
  const hashedParams = hashParams(params ?? {});
  return moduleCache.loadByParamHash.get(hashedParams);
}

/**
 * Function to delete a module from load id, using in live loader.
 * @param loadId - Unique id that identifies this load.
 * @param modulePath - Url path of the module that will be deleted.
 */
export function deleteModuleCache(state: ParseState, path: string): void {
  state.cache.delete(path);
  state.parsedPaths.delete(path);
}
