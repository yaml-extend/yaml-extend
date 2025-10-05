import { load as JLoad } from "js-yaml";
import type { LoadOptions as jLoadOptions } from "js-yaml";
import type {
  DirectivesObj,
  LoadOptions,
  ModuleLoadCache,
  HandledLoadOpts,
} from "../../types.js";
import { TagsHandler } from "./preload/tagHandlers.js";
import { bridgeHandler } from "../bridge.js";
import { DirectivesHandler } from "./preload/directives.js";
import { ResolveHandler } from "./postload/resolveHandler.js";
import { WrapperYAMLException } from "../../wrapperClasses/wrapperError.js";
import { circularDepClass } from "../circularDep.js";
import {
  readFile,
  readFileAsync,
  resolvePath,
  generateId,
  handlePrivateLoad,
} from "../helpers.js";
import {
  getModuleCache,
  getLoadCache,
  addModuleCache,
  addLoadCache,
  deleteLoadIdFromCache,
} from "../cache.js";
import { pathRegex } from "./regex.js";
import { resolve } from "path";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper classes that are used to load and resolve YAML strings.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Directives handler class instance that is used to handle reading and normalizing directives back to normal YAML.
 */
const directivesHandler: DirectivesHandler = new DirectivesHandler();

/**
 * Tags handler class instance that is used to handle initial read of str using regex to capture tags and conversion of these tags into wrapper composite type
 * class that is ready to be bridged into js-yaml type class.
 */
const tagsHandler: TagsHandler = new TagsHandler();

/**
 * Resolve handler class that is used to resolve the raw node tree passed from js-yaml (handle tags and interpolation expressions).
 */
const resolveHandler: ResolveHandler = new ResolveHandler(
  internalLoad,
  internalLoadAsync
);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main load functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Function to load YAML string into js value. works sync so all file system reads are sync, also all tag's construct functions executions will be treated as sync
 * functions and not awaited. If you are using imports or async tag construct functions use loadAsync instead.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control load behavior.
 * @returns Js value of loaded YAML string.
 */
export function load(str: string, opts?: LoadOptions): unknown {
  // if no str present throw an error
  if (str === undefined)
    throw new WrapperYAMLException(
      `You should pass either YAML string or url path of YAML file in str.`
    );

  // set new loadId
  const loadId = generateId();

  // handle options
  const handledOpts = handleOpts(opts);

  // check if string passed is actually a url, if yes read the file and update both str and filepath of opts
  const match = str.match(pathRegex);
  if (match) {
    handledOpts.filepath = resolve(handledOpts.basePath!, str!);
    str = rootFileRead(handledOpts);
  }

  // if no string present read file using options's filepath
  if (str === undefined) str = rootFileRead(handledOpts);

  try {
    // define vars that will hold blueprint and directives
    let blueprint: ModuleLoadCache["blueprint"];
    let directives: ModuleLoadCache["directives"];

    // get cache of the module
    const cachedModule = getModuleCache(handledOpts.filepath, str);

    // if module is cached get blue print and dir obj from it directly, if not execute string
    if (
      cachedModule &&
      cachedModule.blueprint !== undefined &&
      cachedModule.directives !== undefined
    ) {
      blueprint = cachedModule.blueprint;
      directives = cachedModule.directives;
      if (directives.filename) handledOpts.filename = directives.filename;
    } else {
      const val = handleNewModule(str, handledOpts, loadId);
      blueprint = val.blueprint;
      directives = val.directives;
      if (val.filename) handledOpts.filename = val.filename;
    }

    // check if load with params is present in the cache
    const cachedLoad = getLoadCache(handledOpts.filepath, handledOpts.params);

    // if load is cached return it
    if (cachedLoad !== undefined) {
      const privateReturn = handlePrivateLoad(
        cachedLoad.load,
        cachedLoad.privateLoad,
        handledOpts.filename,
        handledOpts.ignorePrivate
      );
      return privateReturn;
    }

    // resolve blueprint and return
    const { load, privateLoad } = resolveHandler.resolve(
      handledOpts.filepath,
      blueprint,
      directives,
      handledOpts.params ?? {},
      loadId,
      handledOpts
    );

    // add load to the cache if filepath is supplied
    if (handledOpts.filepath)
      addLoadCache(handledOpts.filepath, handledOpts.params, load, privateLoad);

    // handle private nodes and return
    const privateReturn = handlePrivateLoad(
      load,
      privateLoad,
      handledOpts.filename,
      handledOpts.ignorePrivate
    );
    return privateReturn;
  } catch (err) {
    // if error instance of WrapperYAMLException set additional data
    if (err instanceof WrapperYAMLException)
      err.setAdditionalData(handledOpts.filepath, handledOpts.filename);
    // rethrow
    throw err;
  } finally {
    deleteLoadIdFromCache(loadId);
    circularDepClass.deleteLoadId(loadId);
  }
}

/**
 * Function to load YAML string into js value. works async so all file system reads are async, also all tag's construct functions executions are awaited.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control load behavior.
 * @returns Js value of loaded YAML string.
 */
export async function loadAsync(
  str: string,
  opts?: LoadOptions
): Promise<unknown> {
  // if no str present throw an error
  if (str === undefined)
    throw new WrapperYAMLException(
      `You should pass either YAML string or url path of YAML file in str.`
    );

  // set new loadId
  const loadId = generateId();

  // handle options
  const handledOpts = handleOpts(opts);

  // check if string passed is actually a url, if yes read the file and update both str and filepath of opts
  const match = str.match(pathRegex);
  if (match) {
    handledOpts.filepath = resolve(handledOpts.basePath!, str!);
    str = await rootFileReadAsync(handledOpts);
  }

  try {
    // define vars that will hold blueprint and directives
    let blueprint: ModuleLoadCache["blueprint"];
    let directives: ModuleLoadCache["directives"];

    // get cache of the module
    const cachedModule = getModuleCache(handledOpts.filepath, str);

    // if module is cached get blue print and dir obj from it directly, if not execute string
    if (
      cachedModule &&
      cachedModule.blueprint !== undefined &&
      cachedModule.directives !== undefined
    ) {
      blueprint = cachedModule.blueprint;
      directives = cachedModule.directives;
      if (directives.filename) handledOpts.filename = directives.filename;
    } else {
      const val = await handleNewModuleAsync(str, handledOpts, loadId);
      blueprint = val.blueprint;
      directives = val.directives;
      if (val.filename) handledOpts.filename = val.filename;
    }

    // check if load with params is present in the cache
    const cachedLoad = getLoadCache(handledOpts.filepath, handledOpts.params);

    // if load is cached return it
    if (cachedLoad !== undefined) {
      const privateReturn = handlePrivateLoad(
        cachedLoad.load,
        cachedLoad.privateLoad,
        handledOpts.filename,
        handledOpts.ignorePrivate
      );
      return privateReturn;
    }

    // resolve blueprint and return
    const { load, privateLoad } = await resolveHandler.resolveAsync(
      handledOpts.filepath,
      blueprint,
      directives,
      handledOpts.params ?? {},
      loadId,
      handledOpts
    );

    // add load to the cache if filepath is supplied
    if (handledOpts.filepath)
      addLoadCache(handledOpts.filepath, handledOpts.params, load, privateLoad);

    // handle private nodes and return
    const privateReturn = handlePrivateLoad(
      load,
      privateLoad,
      handledOpts.filename,
      handledOpts.ignorePrivate
    );
    return privateReturn;
  } catch (err) {
    // if error instance of WrapperYAMLException set additional data
    if (err instanceof WrapperYAMLException)
      err.setAdditionalData(handledOpts.filepath, handledOpts.filename);
    // rethrow
    throw err;
  } finally {
    deleteLoadIdFromCache(loadId);
    circularDepClass.deleteLoadId(loadId);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Methods used by helper classes
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Just like load function but used in the code inside live loader and resolve handler. they execute the YAML string the same way load does but they don't create
 * new load id or handle clean-up and input validation. works sync.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returnsL Loaded YAML string into js object.
 */
export function internalLoad(
  str: string,
  opts: LoadOptions,
  loadId: string
): unknown {
  // handle options
  const handledOpts = handleOpts(opts);

  try {
    // define vars that will hold blueprint and directives
    let blueprint: ModuleLoadCache["blueprint"];
    let directives: ModuleLoadCache["directives"];

    // get cache of the module
    const cachedModule = getModuleCache(handledOpts.filepath, str);

    // if module is cached get blue print and dir obj from it directly, if not execute string
    if (
      cachedModule &&
      cachedModule.blueprint !== undefined &&
      cachedModule.directives !== undefined
    ) {
      blueprint = cachedModule.blueprint;
      directives = cachedModule.directives;
      if (directives.filename) handledOpts.filename = directives.filename;
    } else {
      const val = handleNewModule(str, handledOpts, loadId);
      blueprint = val.blueprint;
      directives = val.directives;
      if (val.filename) handledOpts.filename = val.filename;
    }

    // check if load with params is present in the cache
    const cachedLoad = getLoadCache(handledOpts.filepath, handledOpts.params);

    // if load is cached return it
    if (cachedLoad !== undefined) {
      const privateReturn = handlePrivateLoad(
        cachedLoad.load,
        cachedLoad.privateLoad,
        handledOpts.filename,
        handledOpts.ignorePrivate
      );
      return privateReturn;
    }

    // resolve blueprint and return
    const { load, privateLoad } = resolveHandler.resolve(
      handledOpts.filepath,
      blueprint,
      directives,
      handledOpts.params ?? {},
      loadId,
      handledOpts
    );

    // add load to the cache if filepath is supplied
    if (handledOpts.filepath)
      addLoadCache(handledOpts.filepath, handledOpts.params, load, privateLoad);

    // handle private nodes and return
    const privateReturn = handlePrivateLoad(
      load,
      privateLoad,
      handledOpts.filename,
      handledOpts.ignorePrivate
    );
    return privateReturn;
  } catch (err) {
    // if error instance of WrapperYAMLException set additional data
    if (err instanceof WrapperYAMLException)
      err.setAdditionalData(handledOpts.filepath, handledOpts.filename);
    // rethrow
    throw err;
  }
}

/**
 * Just like load function but used in the code inside live loader and resolve handler. they execute the YAML string the same way load does but they don't create
 * new load id or handle clean-up and input validation. works async.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returnsL Loaded YAML string into js object.
 */
export async function internalLoadAsync(
  str: string,
  opts: LoadOptions,
  loadId: string
): Promise<unknown> {
  // handle options
  const handledOpts = handleOpts(opts);

  try {
    // define vars that will hold blueprint and directives
    let blueprint: ModuleLoadCache["blueprint"];
    let directives: ModuleLoadCache["directives"];

    // get cache of the module
    const cachedModule = getModuleCache(handledOpts.filepath, str);

    // if module is cached get blue print and dir obj from it directly, if not execute string
    if (
      cachedModule &&
      cachedModule.blueprint !== undefined &&
      cachedModule.directives !== undefined
    ) {
      blueprint = cachedModule.blueprint;
      directives = cachedModule.directives;
      if (directives.filename) handledOpts.filename = directives.filename;
    } else {
      const val = await handleNewModuleAsync(str, handledOpts, loadId);
      blueprint = val.blueprint;
      directives = val.directives;
      if (val.filename) handledOpts.filename = val.filename;
    }

    // check if load with params is present in the cache
    const cachedLoad = getLoadCache(handledOpts.filepath, handledOpts.params);

    // if load is cached return it
    if (cachedLoad !== undefined) {
      const privateReturn = handlePrivateLoad(
        cachedLoad.load,
        cachedLoad.privateLoad,
        handledOpts.filename,
        handledOpts.ignorePrivate
      );
      return privateReturn;
    }

    // resolve blueprint and return
    const { load, privateLoad } = await resolveHandler.resolveAsync(
      handledOpts.filepath,
      blueprint,
      directives,
      handledOpts.params ?? {},
      loadId,
      handledOpts
    );

    // add load to the cache if filepath is supplied
    if (handledOpts.filepath)
      addLoadCache(handledOpts.filepath, handledOpts.params, load, privateLoad);

    // handle private nodes and return
    const privateReturn = handlePrivateLoad(
      load,
      privateLoad,
      handledOpts.filename,
      handledOpts.ignorePrivate
    );
    return privateReturn;
  } catch (err) {
    // if error instance of WrapperYAMLException set additional data
    if (err instanceof WrapperYAMLException)
      err.setAdditionalData(handledOpts.filepath, handledOpts.filename);
    // rethrow
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper methdos
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Method to handle options by adding default needed values (basePath) if they weren't passed by user.
 * @param opts - Load options object.
 * @returns Options object with needed values.
 */
function handleOpts(opts: LoadOptions | undefined): HandledLoadOpts {
  const basePath = opts?.basePath
    ? resolve(process.cwd(), opts.basePath)
    : process.cwd();
  const filepath = opts?.filepath && resolve(basePath, opts.filepath);
  const params = opts?.params ?? {};
  const ignorePrivate =
    opts?.ignorePrivate &&
    (opts.ignorePrivate === "current" ? opts.filename : opts.ignorePrivate);
  return {
    ...opts,
    basePath,
    params,
    filepath,
    ignorePrivate,
  } as HandledLoadOpts;
}

/**
 * Function to read file from file system directly if str passed to load function was a path url or filepath passed without str. works sync.
 * @param opts - Load options object.
 * @returns Read YAML string.
 */
function rootFileRead(opts: HandledLoadOpts): string {
  // if no filepath present throw
  if (!opts || !opts.filepath)
    throw new WrapperYAMLException(
      `You should pass either a string to read or filepath of the YAML file.`
    );
  // resolve path
  const resolvedPath = resolvePath(opts.filepath, opts.basePath!);
  // read file
  return readFile(resolvedPath, opts.basePath!, opts);
}

/**
 * Function to read file from file system directly if str passed to load function was a path url or filepath passed without str. works async.
 * @param opts - Load options object.
 * @returns Read YAML string.
 */
async function rootFileReadAsync(opts: HandledLoadOpts): Promise<string> {
  // if no filepath present throw
  if (!opts || !opts.filepath)
    throw new WrapperYAMLException(
      `You should pass either a string to read or filepath of the YAML file.`
    );
  // resolve path
  const resolvedPath = resolvePath(opts.filepath, opts.basePath!);
  // read file
  return await readFileAsync(resolvedPath, opts.basePath!, opts);
}

/**
 * Function to handle new YAML file that hasn't been loaded before by creating module cache with blueprint for it. it also resolve the blueprint with empty params
 * value and save this load as it's the pure load of the module only. works sync.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returns Object that holds blue print and directive object which has meta data read from directive part of the YAML.
 */
function handleNewModule(
  str: string,
  opts: HandledLoadOpts,
  loadId: string
): {
  blueprint: unknown;
  directives: DirectivesObj;
  filename: string | undefined;
} {
  // execute string
  const val = executeStr(str, opts, loadId);
  const blueprint = val.blueprint;
  const directives = val.directives;
  const filename = directives.filename;
  // resolve with undefined params and add load to the cache if filepath is supplied
  if (opts.filepath) {
    const { load, privateLoad } = resolveHandler.resolve(
      opts.filepath,
      blueprint,
      directives,
      {},
      loadId,
      opts
    );
    addLoadCache(opts.filepath, opts.params, load, privateLoad);
  }
  // return blueprint and directives object
  return { blueprint, directives, filename };
}

/**
 * Function to handle new YAML file that hasn't been loaded before by creating module cache with blueprint for it. it also resolve the blueprint with empty params
 * value and save this load as it's the pure load of the module only. works async.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returns Object that holds blue print and directive object which has meta data read from directive part of the YAML.
 */
async function handleNewModuleAsync(
  str: string,
  opts: HandledLoadOpts,
  loadId: string
): Promise<{
  blueprint: unknown;
  directives: DirectivesObj;
  filename: string | undefined;
}> {
  // execute string
  const val = await executeStrAsync(str, opts, loadId);
  const blueprint = val.blueprint;
  const directives = val.directives;
  const filename = directives.filename;
  // resolve with undefined params
  const { load, privateLoad } = await resolveHandler.resolveAsync(
    opts.filepath,
    blueprint,
    directives,
    {},
    loadId,
    opts
  );
  // add load to the cache if filepath is supplied
  if (opts.filepath)
    addLoadCache(opts.filepath, opts.params, load, privateLoad);
  // return blueprint and directives object
  return { blueprint, directives, filename };
}

/**
 * Method to start handling the str by converting it to js-yaml compatible string and converting wrapper classes into js-yaml classes. it also convert the raw load
 * from js-yaml to a blueprint that is used to resolve the load. works sync.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returns Object that holds blue print and directive object which has meta data read from directive part of the YAML.
 */
function executeStr(
  str: string,
  opts: HandledLoadOpts,
  loadId: string
): { blueprint: unknown; directives: DirectivesObj } {
  // create empty module cache
  if (opts.filepath) addModuleCache(loadId, str, opts.filepath);

  // read directives
  const directives = directivesHandler.handle(str);

  // overwrite filename if defined in directives
  if (directives.filename) opts.filename = directives.filename;

  // load all imports with there default params
  for (const imp of directives.importsMap.values()) {
    const params = imp.params;
    const path = imp.path;
    internalLoad(path, { ...(opts as LoadOptions), params }, loadId);
  }

  // handle tags by fetching them then converting them to wrapper types
  const tags = tagsHandler.captureTags(str);
  const types = tagsHandler.convertTagsToTypes(
    tags,
    directives.tagsMap,
    opts.schema
  );

  // bridge from wrapper types to js-yaml types
  const JTypes = bridgeHandler.typesBridge(types);
  const JSchema = bridgeHandler.schemaBridge(opts.schema, JTypes);

  // load using js-yaml
  const rawLoad = JSchema
    ? JLoad(str, { ...opts, schema: JSchema } as jLoadOptions)
    : JLoad(str, { ...opts } as jLoadOptions);

  // create blueprint
  const blueprint = resolveHandler.createBlueprint(rawLoad);

  // add blueprint along with other module's data to the cache
  if (opts.filepath)
    addModuleCache(loadId, str, opts.filepath, blueprint, directives);

  // return blueprint
  return { blueprint, directives };
}

/**
 * Method to start handling the str by converting it to js-yaml compatible string and converting wrapper classes into js-yaml classes. it also convert the raw load
 * from js-yaml to a blueprint that is used to resolve the load. works async.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returns Object that holds blue print and directive object which has meta data read from directive part of the YAML.
 */
async function executeStrAsync(
  str: string,
  opts: HandledLoadOpts,
  loadId: string
): Promise<{ blueprint: unknown; directives: DirectivesObj }> {
  // create empty module cache
  if (opts.filepath) addModuleCache(loadId, str, opts.filepath);

  // read directives
  const directives = directivesHandler.handle(str);

  // overwrite filename if defined in directives
  if (directives.filename) opts.filename = directives.filename;

  // load all imports with there default params
  for (const imp of directives.importsMap.values()) {
    const params = imp.params;
    const path = imp.path;
    await internalLoadAsync(path, { ...(opts as LoadOptions), params }, loadId);
  }

  // handle tags by fetching them then converting them to wrapper types
  const tags = tagsHandler.captureTags(str);
  const types = tagsHandler.convertTagsToTypes(
    tags,
    directives.tagsMap,
    opts.schema
  );

  // bridge from wrapper types to js-yaml types
  const JTypes = bridgeHandler.typesBridge(types);
  const JSchema = bridgeHandler.schemaBridge(opts.schema, JTypes);

  // load using js-yaml
  const rawLoad = JSchema
    ? JLoad(str, { ...opts, schema: JSchema } as jLoadOptions)
    : JLoad(str, { ...opts } as jLoadOptions);

  // create blueprint
  const blueprint = resolveHandler.createBlueprint(rawLoad);

  // add blueprint along with other module's data to the cache
  if (opts.filepath)
    addModuleCache(loadId, str, opts.filepath, blueprint, directives);

  // return blueprint
  return { blueprint, directives };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Exported types
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export type Load = typeof load;
export type LoadAsync = typeof loadAsync;
export type InternalLoad = typeof internalLoad;
export type InternalLoadAsync = typeof internalLoadAsync;
