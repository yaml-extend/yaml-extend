import { ModuleCache } from "../../types.js";
import {
  loadIdsToModules,
  deleteModuleCache,
  getResolveCache,
  getModuleCache,
} from "../cache.js";

import { resolvePath, generateId, handlePrivateLoad } from "../helpers.js";
import { circularDepClass } from "../circularDep.js";

import { Options } from "../../types.js";
import { internalParseExtend, deleteLoadId } from "../parse/parse.js";
import { YAMLError } from "yaml";

/**
 * Class that handles loading multiple YAML files at the same time while watching loaded files and update there loads as files change.
 */
export class LiveLoader {
  /** @internal - implementation detail, not part of public API */
  /** Random id generated for live loader and used as loadId in load function. */
  private _loadId: string = generateId();

  /** @internal - implementation detail, not part of public API */
  /** Options of the live loading. */
  private _opts: Options = { basePath: process.cwd() };

  /**
   * @param opts - Options object passed to control live loader behavior. Note that these options will be default for all load functions, so it's not advised to define "filename" and
   * per module options here.
   */
  constructor(opts?: Options) {
    if (opts) this.setOptions(opts);
  }

  /**
   * Method to set options of the class.
   * @param opts - Options object passed to control live loader behavior. Note that these options will be default for all load functions, so it's not advised to define "filename" and
   * per module options here.
   */
  setOptions(opts: Options) {
    this._opts = { ...this._opts, ...opts };
    if (!this._opts.basePath) this._opts.basePath = process.cwd();
  }

  /**
   * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that
   * imported YAML files in the read YAML string are watched as well. works sync so all file watch, reads are sync and tags executions are handled
   * as sync functions and will not be awaited.
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   * @param opts - Options object passed to control live loader behavior. overwrites default options defined for loader.
   * @returns Value of loaded YAML file.
   */
  async addModule(
    filepath: string,
    options?: Options
  ): Promise<{ parse: unknown; errors: YAMLError[] }> {
    // get resolved path
    const resolvedPath = resolvePath(filepath, this._opts.basePath!);

    // parse str
    const parse = await internalParseExtend(
      resolvedPath,
      { ...options, ...this._opts },
      this._loadId
    );

    // return load
    return parse;
  }

  /**
   * Method to get cached value of loaded module or file. note that value retuned is module's resolve when params is undefined (default params value are used).
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   * @param ignorePrivate - Boolean to indicate if private nodes should be ignored in the cached load. overwrites value defined in "LiveLoaderOptions.ignorePrivate" for this module.
   * @returns Cached value of YAML file with default modules params or undefined if file is not loaded.
   */
  getModule(
    filepath: string,
    ignorePrivate?: boolean
  ): { parse: unknown; errors: YAMLError[] } | undefined {
    // get resolved path
    const resolvedPath = resolvePath(filepath, this._opts.basePath!);

    // get filename
    const cache = getModuleCache(resolvedPath);
    const filename = cache?.directives?.filename;

    // get cached loads
    const cachedLoads = getResolveCache(resolvedPath, undefined);
    if (!cachedLoads) return undefined;
    // if ignorePrivate is defined, handle return load based on it
    if (ignorePrivate !== undefined) {
      const finalParse = ignorePrivate
        ? cachedLoads.privateLoad
        : cachedLoads.errors;
      return { parse: finalParse, errors: cachedLoads.errors };
    }

    // Execute privateLoad to define which load to return
    const privateParse = handlePrivateLoad(
      cachedLoads.load,
      cachedLoads.privateLoad,
      filename,
      this._opts.ignorePrivate
    );
    return { parse: privateParse, errors: cachedLoads.errors };
  }

  /**
   * Method to get cached value of all loaded modules or files. note that values retuned are module's resolve when params is undefined (default params value are used).
   * @param ignorePrivate - Boolean to indicate if private nodes should be ignored in the cached load. overwrites value defined in "LiveLoaderOptions.ignorePrivate" for all modules.
   * @returns Object with keys resolved paths of loaded YAML files and values cached values of YAML files with default modules params.
   */
  getAllModules(
    ignorePrivate?: boolean
  ): Record<string, { parse: unknown; errors: YAMLError[] } | undefined> {
    // check cache using loadId to get paths utilized by the live loader
    const paths = loadIdsToModules.get(this._loadId);
    if (!paths) return {};
    let modules: Record<
      string,
      { parse: unknown; errors: YAMLError[] } | undefined
    > = {};
    for (const p of paths) modules[p] = this.getModule(p, ignorePrivate);
    return modules;
  }

  /**
   * Method to get all cached data about specific module. note that they are passed by reference and should never be mutated.
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   * @returns Module load cache object.
   */
  getCache(path: string): ModuleCache | undefined {
    // get resolved path
    const resolvedPath = resolvePath(path, this._opts.basePath!);
    return getModuleCache(resolvedPath);
  }

  /**
   * Method to get all cached data of all loaded module. note that they are passed by reference and should never be mutated.
   * @returns Object with keys resolved paths of loaded YAML files and values Module cache objects for these module.
   */
  getAllCache(): Record<string, ModuleCache | undefined> {
    // check cache using loadId to get paths utilized by the live loader
    const paths = loadIdsToModules.get(this._loadId);
    if (!paths) return {};
    let caches: Record<string, ModuleCache | undefined> = {};
    for (const p of paths) caches[p] = this.getCache(p);
    return caches;
  }

  /**
   * Method to delete module or file from live loader.
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   */
  deleteModule(path: string): void {
    // get resolved path
    const resolvedPath = resolvePath(path, this._opts.basePath!);
    // delete module's cache
    deleteModuleCache(this._loadId, resolvedPath);
    // delete circular dep
    circularDepClass.deleteDep(resolvedPath, this._loadId);
  }

  /**
   * Method to clear cache of live loader by deleting all modules or files from live loader.
   */
  deleteAllModules(): void {
    // check cache using loadId to get paths utilized by the live loader
    const paths = loadIdsToModules.get(this._loadId);
    if (!paths) return;
    // if paths delete all of them
    for (const p of paths) this.deleteModule(p);
  }

  /**
   * Method to clear live loader along with all of its watchers and cache from memory.
   */
  destroy() {
    // delete all modules
    this.deleteAllModules();
    // delete loadId
    deleteLoadId(this._loadId);
  }
}
