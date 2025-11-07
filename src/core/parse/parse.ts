import { handleDir } from "./directives/index.js";
import { circularDepClass } from "../circularDep.js";
import {
  readFile,
  resolvePath,
  generateId,
  handlePrivateLoad,
} from "../helpers.js";
import {
  getModuleCache,
  getResolveCache,
  addModuleCache,
  addResolveCache,
  deleteLoadIdFromCache,
} from "../cache.js";
import { resolve as fsResolve } from "path";
import { parse as jParse, parseDocument, YAMLError } from "yaml";
import { Options, HandledOptions } from "../../types.js";
import { resolve } from "./resolveHandler.js";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main load functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export async function parseExtend(
  filepath: string,
  options?: Options
): Promise<{ parse: unknown; errors: YAMLError[] }> {
  // set new loadId
  const loadId = generateId();
  // set array that will hold errors
  const errors: YAMLError[] = [];

  try {
    // handle options
    const handledOpts = handleOpts(options);

    // resolve path
    const resolvedPath = resolvePath(filepath, handledOpts.basePath);

    // read file
    const src = await readFile(resolvedPath, handledOpts.basePath, handledOpts);

    // get cache of the module
    let moduleCache = getModuleCache(handledOpts.filename, src);

    // if cache of the module is not present, get directives and AST from src directly to create module cache, also save pureLoad and privatePureLoad
    if (!moduleCache) {
      const directives = handleDir(src);
      const parsedDoc = parseDocument(src, handledOpts);
      const AST = parsedDoc.contents;
      const pureParseErrors: YAMLError[] = [];
      moduleCache = addModuleCache(loadId, resolvedPath, src, AST, directives);
      const { parse, privateParse } = await resolve(
        loadId,
        pureParseErrors,
        moduleCache,
        {
          ...handledOpts,
          params: undefined,
        }
      );
      addResolveCache(resolvedPath, undefined, parse, privateParse, [
        ...pureParseErrors,
        ...directives.errors,
      ]);
    }

    // check if load with params is present in the cache and return it if present
    const cachedResolve = getResolveCache(resolvedPath, handledOpts.params);
    if (cachedResolve !== undefined) {
      const privateReturn = handlePrivateLoad(
        cachedResolve.load,
        cachedResolve.privateLoad,
        handledOpts.filename,
        handledOpts.ignorePrivate
      );
      return { parse: privateReturn, errors: cachedResolve.errors };
    }

    // overwrite filename if defined in directives
    if (moduleCache.directives.filename)
      handledOpts.filename = moduleCache.directives.filename;

    // load imports before preceeding in resolving this module
    for (const imp of moduleCache.directives.importsMap.values()) {
      const params = imp.params;
      const path = imp.path;
      await internalParseExtend(path, { ...handledOpts, params }, loadId);
    }

    // resolve AST
    const { parse, privateParse } = await resolve(
      loadId,
      errors,
      moduleCache,
      handledOpts
    );

    // Var to hold both resolve errors and directive errors
    const comErrors = [...errors, ...moduleCache.directives.errors];

    // add load to the cache
    addResolveCache(
      resolvedPath,
      handledOpts.params,
      parse,
      privateParse,
      comErrors
    );

    // handle private nodes and return
    const privateReturn = handlePrivateLoad(
      parse,
      privateParse,
      handledOpts.filename,
      handledOpts.ignorePrivate
    );
    return { parse: privateReturn, errors: comErrors };
  } finally {
    deleteLoadId(loadId);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Methods used by helper classes
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Just like load function but used in the code inside live loader and resolve handler. they execute the YAML string the same way load does but they don't create
 * new load id or handle clean-up and input validation. works sync.
 * @param filepath - YAML string or url path for YAML file.
 * @param options - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returnsL Loaded YAML string into js object.
 */
export async function internalParseExtend(
  filepath: string,
  options: Options,
  loadId: string
): Promise<{ parse: unknown; errors: YAMLError[] }> {
  // set array that will hold errors
  const errors: YAMLError[] = [];

  // handle options
  const handledOpts = handleOpts(options);

  // resolve path
  const resolvedPath = resolvePath(filepath, handledOpts.basePath);

  // read file
  const src = await readFile(resolvedPath, handledOpts.basePath, handledOpts);

  // get cache of the module
  let moduleCache = getModuleCache(handledOpts.filename, src);

  // if cache of the module is not present, get directives and AST from src directly to create module cache, also save pureLoad and privatePureLoad
  if (!moduleCache) {
    const directives = handleDir(src);
    const AST = jParse(src, handledOpts);
    const pureParseErrors: YAMLError[] = [];
    moduleCache = addModuleCache(loadId, resolvedPath, src, AST, directives);
    const { parse, privateParse } = await resolve(
      loadId,
      pureParseErrors,
      moduleCache,
      {
        ...handledOpts,
        params: undefined,
      }
    );
    addResolveCache(resolvedPath, undefined, parse, privateParse, [
      ...pureParseErrors,
      ...directives.errors,
    ]);
  }

  // check if load with params is present in the cache and return it if present
  const cachedResolve = getResolveCache(resolvedPath, handledOpts.params);
  if (cachedResolve !== undefined) {
    const privateReturn = handlePrivateLoad(
      cachedResolve.load,
      cachedResolve.privateLoad,
      handledOpts.filename,
      handledOpts.ignorePrivate
    );
    return { parse: privateReturn, errors: cachedResolve.errors };
  }

  // overwrite filename if defined in directives
  if (moduleCache.directives.filename)
    handledOpts.filename = moduleCache.directives.filename;

  // load imports before preceeding in resolving this module
  for (const imp of moduleCache.directives.importsMap.values()) {
    const params = imp.params;
    const path = imp.path;
    await internalParseExtend(path, { ...handledOpts, params }, loadId);
  }

  // resolve AST
  const { parse, privateParse } = await resolve(
    loadId,
    errors,
    moduleCache,
    handledOpts
  );

  // Var to hold both resolve errors and directive errors
  const comErrors = [...errors, ...moduleCache.directives.errors];

  // add load to the cache
  addResolveCache(
    resolvedPath,
    handledOpts.params,
    parse,
    privateParse,
    comErrors
  );

  // handle private nodes and return
  const privateReturn = handlePrivateLoad(
    parse,
    privateParse,
    handledOpts.filename,
    handledOpts.ignorePrivate
  );
  return { parse: privateReturn, errors: comErrors };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper methdos
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Method to handle options by adding default needed values (basePath) if they weren't passed by user.
 * @param opts - Load options object.
 * @returns Options object with needed values.
 */
export function handleOpts(opts: Options | undefined): HandledOptions {
  const basePath = opts?.basePath
    ? fsResolve(process.cwd(), opts.basePath)
    : process.cwd();
  const params = opts?.params ?? {};
  const ignorePrivate = opts?.ignorePrivate
    ? opts.ignorePrivate === "current"
      ? [opts.filename ?? ""]
      : opts.ignorePrivate
    : [];
  return {
    ...opts,
    basePath,
    params,
    ignorePrivate,
  };
}

export function deleteLoadId(loadId: string): void {
  deleteLoadIdFromCache(loadId);
  circularDepClass.deleteLoadId(loadId);
}

export type ParseExtend = typeof parseExtend;
export type InternalParseExtend = typeof internalParseExtend;
