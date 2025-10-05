import {
  LiveLoaderOptions,
  YAMLException,
  ModuleLoadCache,
  WrapperYAMLException,
} from "../../types.js";
import { FileSystem } from "./fileSystem.js";
import { Debouncer } from "./debouncer.js";
import {
  loadIdsToModules,
  deleteModuleCache,
  resetModuleCache,
  getLoadCache,
  getModuleCache,
  deleteLoadIdFromCache,
} from "../cache.js";
import { internalLoad, internalLoadAsync } from "../load/load.js";
import {
  readFile,
  readFileAsync,
  resolvePath,
  generateId,
  handlePrivateLoad,
} from "../helpers.js";
import type { WatchEventType } from "fs";
import { circularDepClass } from "../circularDep.js";

/**
 * Class that handles loading multiple YAML files at the same time while watching loaded files and update there loads as files change.
 */
export class LiveLoader {
  /** @internal - implementation detail, not part of public API */
  /** Class to handle file system interactions in live loader. */
  private _fileSystem: FileSystem = new FileSystem();

  /** @internal - implementation detail, not part of public API */
  /** Class to debounce updates of live loader. */
  private _debouncer: Debouncer<void> = new Debouncer(200);

  /** @internal - implementation detail, not part of public API */
  /** Options of the live loading. */
  private _liveLoaderOpts: LiveLoaderOptions = { basePath: process.cwd() };

  /** @internal - implementation detail, not part of public API */
  /** Random id generated for live loader and used as loadId in load function. */
  private _liveLoaderId: string = generateId();

  /**
   * @param opts - Options object passed to control live loader behavior. Note that these options will be default for all load functions, so it's not advised to define "filename" and
   * per module options here.
   */
  constructor(opts?: LiveLoaderOptions) {
    if (opts) this.setOptions(opts);
  }

  /**
   * Method to set options of the class.
   * @param opts - Options object passed to control live loader behavior. Note that these options will be default for all load functions, so it's not advised to define "filename" and
   * per module options here.
   */
  setOptions(opts: LiveLoaderOptions) {
    this._liveLoaderOpts = { ...this._liveLoaderOpts, ...opts };
    if (!this._liveLoaderOpts.basePath)
      this._liveLoaderOpts.basePath = process.cwd();
  }

  /**
   * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that
   * imported YAML files in the read YAML string are watched as well. works sync so all file watch, reads are sync and tags executions are handled
   * as sync functions and will not be awaited.
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   * @param opts - Options object passed to control live loader behavior. overwrites default options defined for loader.
   * @returns Value of loaded YAML file.
   */
  addModule(path: string, opts?: LiveLoaderOptions): unknown {
    // get resolved path
    const resolvedPath = resolvePath(path, this._liveLoaderOpts.basePath!);
    // add module to watch
    const callback = this._watchCallbackFactory(resolvedPath, false);
    this._fileSystem.addFile(resolvedPath, callback);
    // read str
    const str = readFile(
      resolvedPath,
      this._liveLoaderOpts.basePath!,
      this._liveLoaderOpts
    );

    try {
      // load str
      const load = internalLoad(
        str,
        { ...opts, ...this._liveLoaderOpts, filepath: resolvedPath },
        this._liveLoaderId
      );
      // check cache using loadId to get paths utilized by the live loader
      const paths = loadIdsToModules.get(this._liveLoaderId);
      // if no paths return load directly
      if (!paths) return load;
      // if paths watch all of them then return load
      for (const p of paths) {
        if (this._fileSystem.hasFile(p)) continue;
        const callback = this._watchCallbackFactory(p, false);
        this._fileSystem.addFile(p, callback);
      }
      // execute onUpdate
      this._liveLoaderOpts.onUpdate?.(path, load);
      // return load
      return load;
    } catch (err) {
      // reset if defined to do so
      if (this._liveLoaderOpts.resetOnError) resetModuleCache(path);
      // execute onError
      this._liveLoaderOpts.onError?.(
        resolvedPath,
        err as WrapperYAMLException | YAMLException
      );
    }
  }

  /**
   * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that imported
   * YAML files in the read YAML string are watched as well. works async so all file watch, reads are async and tags executions will be awaited.
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   * @param opts - Options object passed to control live loader behavior. overwrites default options defined for loader.
   * @returns Value of loaded YAML file.
   */
  async addModuleAsync(
    path: string,
    opts?: LiveLoaderOptions
  ): Promise<unknown> {
    // get resolved path
    const resolvedPath = resolvePath(path, this._liveLoaderOpts.basePath!);
    // add module to watch
    const callback = this._watchCallbackFactory(resolvedPath, false);
    this._fileSystem.addFile(resolvedPath, callback);
    // read str
    const str = await readFileAsync(
      resolvedPath,
      this._liveLoaderOpts.basePath!,
      this._liveLoaderOpts
    );

    try {
      // load str
      const load = await internalLoadAsync(
        str,
        { ...opts, ...this._liveLoaderOpts, filepath: resolvedPath },
        this._liveLoaderId
      );
      // check cache using loadId to get paths utilized by the live loader
      const paths = loadIdsToModules.get(this._liveLoaderId);
      // if no paths return load directly
      if (!paths) return load;
      // if paths watch all of them then return load
      for (const p of paths) {
        if (this._fileSystem.hasFile(p)) continue;
        const callback = this._watchCallbackFactory(p, true);
        this._fileSystem.addFile(p, callback);
      }
      // execute onUpdate
      this._liveLoaderOpts.onUpdate?.(path, load);
      // return load
      return load;
    } catch (err) {
      // reset if defined to do so
      if (this._liveLoaderOpts.resetOnError) resetModuleCache(path);
      // execute onError
      this._liveLoaderOpts.onError?.(
        resolvedPath,
        err as WrapperYAMLException | YAMLException
      );
    }
  }

  /**
   * Method to get cached value of loaded module or file. note that value retuned is module's resolve when params is undefined (default params value are used).
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   * @param ignorePrivate - Boolean to indicate if private nodes should be ignored in the cached load. overwrites value defined in "LiveLoaderOptions.ignorePrivate" for this module.
   * @returns Cached value of YAML file with default modules params or undefined if file is not loaded.
   */
  getModule(path: string, ignorePrivate?: boolean): unknown | undefined {
    // get resolved path
    const resolvedPath = resolvePath(path, this._liveLoaderOpts.basePath!);

    // get filename
    const cache = getModuleCache(resolvedPath);
    const filename = cache?.directives?.filename;

    // get cached loads
    const cachedLoads = getLoadCache(resolvedPath, undefined);
    if (!cachedLoads) return undefined;
    // if ignorePrivate is defined, handle return load based on it
    if (ignorePrivate !== undefined) {
      if (ignorePrivate) return cachedLoads.privateLoad;
      else return cachedLoads.load;
    }

    // Execute privateLoad to define which load to return
    const privateLoad = handlePrivateLoad(
      cachedLoads.load,
      cachedLoads.privateLoad,
      filename,
      this._liveLoaderOpts.ignorePrivate
    );
    return privateLoad;
  }

  /**
   * Method to get cached value of all loaded modules or files. note that values retuned are module's resolve when params is undefined (default params value are used).
   * @param ignorePrivate - Boolean to indicate if private nodes should be ignored in the cached load. overwrites value defined in "LiveLoaderOptions.ignorePrivate" for all modules.
   * @returns Object with keys resolved paths of loaded YAML files and values cached values of YAML files with default modules params.
   */
  getAllModules(ignorePrivate?: boolean): Record<string, unknown> {
    // check cache using loadId to get paths utilized by the live loader
    const paths = loadIdsToModules.get(this._liveLoaderId);
    if (!paths) return {};
    let modules: Record<string, unknown> = {};
    for (const p of paths)
      modules[p] = this.getModule(p, ignorePrivate) as unknown;
    return modules;
  }

  /**
   * Method to get all cached data about specific module. note that they are passed by reference and should never be mutated.
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   * @returns Module load cache object.
   */
  getCache(path: string): ModuleLoadCache | undefined {
    // get resolved path
    const resolvedPath = resolvePath(path, this._liveLoaderOpts.basePath!);
    return getModuleCache(resolvedPath);
  }

  /**
   * Method to get all cached data of all loaded module. note that they are passed by reference and should never be mutated.
   * @returns Object with keys resolved paths of loaded YAML files and values Module cache objects for these module.
   */
  getAllCache(): Record<string, ModuleLoadCache> {
    // check cache using loadId to get paths utilized by the live loader
    const paths = loadIdsToModules.get(this._liveLoaderId);
    if (!paths) return {};
    let caches: Record<string, ModuleLoadCache> = {};
    for (const p of paths) caches[p] = this.getCache(p) as ModuleLoadCache;
    return caches;
  }

  /**
   * Method to delete module or file from live loader.
   * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
   */
  deleteModule(path: string): void {
    // get resolved path
    const resolvedPath = resolvePath(path, this._liveLoaderOpts.basePath!);
    // delete module's cache
    deleteModuleCache(this._liveLoaderId, resolvedPath);
    // delete watcher
    this._fileSystem.deleteFile(resolvedPath);
    // delete circular dep
    circularDepClass.deleteDep(resolvedPath, this._liveLoaderId);
  }

  /**
   * Method to clear cache of live loader by deleting all modules or files from live loader.
   */
  deleteAllModules(): void {
    // check cache using loadId to get paths utilized by the live loader
    const paths = loadIdsToModules.get(this._liveLoaderId);
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
    deleteLoadIdFromCache(this._liveLoaderId);
    // delete circular dependencies
    circularDepClass.deleteLoadId(this._liveLoaderId);
    // destroy helper classes
    this._debouncer.destroy();
    this._fileSystem.destroy();
    // null helper classes
    this._debouncer = null as unknown as Debouncer<void>;
    this._fileSystem = null as unknown as FileSystem;
  }

  /** @internal - implementation detail, not part of public API */
  /**
   * Method to create callbacks that will be passed to fs watch function.
   * @param path - Path of the YAML file.
   * @param async - Boolean that indicates if file load in the change callback should run async or not.
   * @returns Callback function that will be passed to fs watch function.
   */
  private _watchCallbackFactory(
    path: string,
    isAsync: boolean
  ): (eventType: WatchEventType) => void {
    return (e) => {
      this._debouncer.debounce(async () => {
        // if file is change reset it's cache then re-load it
        if (e === "change") {
          // reset module cache so it will be re-evaluated
          resetModuleCache(path);
          // re-load
          isAsync ? await this.addModuleAsync(path) : this.addModule(path);
        }

        // if file is renamed delete it's cache as all future loads will use the new name
        if (e === "rename") {
          this.deleteModule(path);
        }
      });
    };
  }
}
