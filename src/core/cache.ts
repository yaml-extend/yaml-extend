import { resolve } from "path";
import { hashParams, hashStr } from "./helpers.js";
import type {
  LoadCache,
  LoadIdsToModules,
  ModulesToLoadIds,
  DirectivesObj,
  ModuleLoadCache,
  ParamLoadEntry,
} from "../types.js";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This file contains all the stores (cache) used in the library (for load and LiveLoader) along with functions to interact with these stores.

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main cache stores.
/**
 * Map of all loads, which is keyed by loadId and each load id stores the important input and output of load function.
 */
export const modulesCache: LoadCache = new Map();

/**
 *  Map that links load ids to modules they utilize.
 */
export const loadIdsToModules: LoadIdsToModules = new Map();

/**
 * Map that links modules to load ids that calls them.
 */
export const modulesToLoadIds: ModulesToLoadIds = new Map();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Cache interaction functions.
/**
 * Function to add module (str) data under existing loadId. while updating links between loadIds and modules as well.
 * @param loadId - Unique id that identifies this load.
 * @param str - YAML String passed.
 * @param filepath - Path of the readed YAML file.
 * @param blueprint - Output from execution of the YAML string.
 * @param directives - Object that holds metadata about the directives.
 */
export function addModuleCache(
  loadId: string,
  str: string,
  filepath: string,
  blueprint?: unknown,
  directives?: DirectivesObj
): void {
  // resolve filepath
  const resolvedPath = resolve(filepath);

  // hash string, params and path
  const hashedStr = hashStr(str);

  // get module cache
  let moduleCache = modulesCache.get(resolvedPath);

  // if module cache already present update it, otherwise create new object
  if (moduleCache) {
    moduleCache.source = str;
    moduleCache.sourceHash = hashedStr;
    moduleCache.resolvedPath = resolvedPath;
    moduleCache.directives = directives;
    moduleCache.blueprint = blueprint;
  } else {
    moduleCache = {
      source: str,
      sourceHash: hashedStr,
      resolvedPath,
      directives,
      blueprint: undefined,
      loadByParamHash: new Map(),
    };
    modulesCache.set(resolvedPath, moduleCache);
  }

  // id -> paths
  let paths = loadIdsToModules.get(loadId);
  if (!paths) {
    paths = new Set<string>();
    loadIdsToModules.set(loadId, paths);
  }
  paths.add(resolvedPath);

  // path -> ids
  let ids = modulesToLoadIds.get(resolvedPath);
  if (!ids) {
    ids = new Set<string>();
    modulesToLoadIds.set(resolvedPath, ids);
  }
  ids.add(loadId);
}

export function addLoadCache(
  filepath: string,
  params: Record<string, string> | undefined,
  load: unknown,
  privateLoad: unknown
) {
  // resolve filepath
  const resolvedPath = resolve(filepath);

  // get module cache
  const moduleCache = modulesCache.get(resolvedPath);
  if (moduleCache === undefined) return;

  // hash params
  const hashedParams = hashParams(params ?? {});

  // add load
  moduleCache.loadByParamHash.set(hashedParams, { params, load, privateLoad });
}

/**
 * Function that checks if module's data are cached and return them, if not it returns undefined.
 * @param modulePath - Url path of the module that will be deleted.
 * @param str - Optional String passed to load function so it can verify if it has changed or not.
 * @returns Module's cache data or undefined if not present.
 */
export function getModuleCache(
  modulePath: string | undefined,
  str?: string
): ModuleLoadCache | undefined {
  // if no path supplied return
  if (!modulePath) return;

  // check if module cache is present
  const moduleCache = modulesCache.get(modulePath);
  if (moduleCache === undefined) return;

  // 2nd step verification by comparing old and new hashed str
  if (str) {
    const newStrHash = hashStr(str);
    if (newStrHash !== moduleCache.sourceHash) return;
  }

  // return blue print
  return moduleCache;
}

/**
 * Function that checks if specific load with module params is cached.
 * @param modulePath - Url path of the module that will be deleted.
 * @param params - Value of module params in YAML sting.
 * @returns Object that stores load value and module params used to load it.
 */
export function getLoadCache(
  modulePath: string | undefined,
  params: Record<string, string> | undefined
): ParamLoadEntry | undefined {
  // if no path supplied return
  if (!modulePath) return;

  // check if module cache is present (should be present but do this for ts)
  const moduleCache = modulesCache.get(modulePath);
  if (!moduleCache) return;

  // hash params
  const hashedParams = hashParams(params ?? {});

  // get cache of this load with params using hashed params
  const cache = moduleCache.loadByParamHash.get(hashedParams);

  // return cache
  return cache;
}

/**
 * Function to reset blueprint and all loads of the module.
 * @param modulePath - Url path of the module that will be deleted.
 */
export function resetModuleCache(modulePath: string): void {
  const moduleCache = modulesCache.get(modulePath);
  if (moduleCache !== undefined) {
    moduleCache.blueprint = undefined;
    moduleCache.loadByParamHash.clear();
  }
}

/**
 * Function to delete a module from load id, using in live loader.
 * @param loadId - Unique id that identifies this load.
 * @param modulePath - Url path of the module that will be deleted.
 */
export function deleteModuleCache(loadId: string, modulePath: string): void {
  // delete link between loadId (live loader id) and the path or module
  loadIdsToModules.get(loadId)?.delete(modulePath);
  modulesToLoadIds.get(modulePath)?.delete(loadId);
  if (modulesToLoadIds.get(modulePath)?.size === 0)
    modulesCache.delete(modulePath);
}

/**
 * Function to delete load id along with all its links and modules cache if it was the only one utilizing them.
 * @param loadId - Unique id that identifies this load.
 */
export function deleteLoadIdFromCache(loadId: string): void {
  // get modules of this loadId, if not present just return
  const modules = loadIdsToModules.get(loadId);

  // for each modules remove the loadId from it, and if it became empty delete the modulesCache
  if (modules)
    for (const m of modules) {
      const ids = modulesToLoadIds.get(m);
      if (!ids) continue;

      ids.delete(loadId);

      if (ids.size === 0) modulesCache.delete(m);
    }

  // finally remove the entry for loadId
  loadIdsToModules.delete(loadId);
}
