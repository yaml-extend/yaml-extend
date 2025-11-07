import { ImportExprParts, ResolveCtx } from "../../../types.js";
import { YAMLExprError, YAMLError } from "../../extendClasses/error.js";
import { traverseNodes } from "./helpers.js";
import { resolve, dirname } from "path";
import { circularDepClass } from "../../circularDep.js";
import { isInsideSandBox, isYamlFile } from "../../helpers.js";
import { internalParseExtend } from "../parse.js";

/**
 * Method to handle 'import' expression. works sync.
 * @param parts - Data parts.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
export async function handleImp(
  parts: ImportExprParts,
  ctx: ResolveCtx
): Promise<unknown> {
  // destrcture parts
  const { nodepath: aliasWithPath, keyValue: params } = parts;

  // get data from context
  const { moduleCache, options, loadId } = ctx;

  // get directives object along with resolved path from cache
  const { directives, resolvedPath } = moduleCache;
  // get importsMap from directives object
  const { importsMap } = directives;

  // get alias and node path from expr path
  const alias = aliasWithPath[0];
  const nodepath = aliasWithPath.slice(1);

  // use imports map to get path and defualt params of this import
  const impData = importsMap.get(alias);
  // if no import data return error
  if (!impData) {
    ctx.errors.push(
      new YAMLExprError(
        ctx.range ? [...ctx.range] : [0, 99999],
        "",
        `Alias used in import expression: '${aliasWithPath}' is not defined in directives.`
      )
    );
    return undefined;
  }
  const { params: defParamsVal, path: targetPath } = impData;

  // merge default with defined params
  const finalParams = { ...defParamsVal, ...params };

  // import file
  try {
    const { load, errors } = await importMod(
      resolvedPath,
      targetPath,
      finalParams,
      ctx
    );
    // add errors if present
    ctx.errors.push(...errors);
    // traverse load using nodepath and return value
    return await traverseNodes(load, nodepath, ctx);
  } catch (err) {
    if (err instanceof YAMLError) ctx.errors.push(err);
    else
      ctx.errors.push(
        new YAMLExprError(
          ctx.range ? [...ctx.range] : [0, 99999],
          "",
          err as string
        )
      );
    return undefined;
  }
}

/**
 * Method to import another YAML files asynchronously.
 * @param modulePath - Path of the current YAML file.
 * @param targetPath - Path of the imported YAML file.
 * @param targetParams - Params value passed to imported YAML file.
 * @param loadOpts - Options object passed to load function and updated using imported module's filepath.
 * @param loadId - Load id generated for this load function execution.
 * @returns Final load of the imported file.
 */
async function importMod(
  modulePath: string,
  targetPath: string,
  targetParams: Record<string, unknown>,
  ctx: ResolveCtx
): Promise<{
  load: unknown;
  errors: YAMLError[];
}> {
  const { options, loadId } = ctx;
  // remove file name from module path if present
  const dirModulePath = removeFileName(modulePath);

  // resolve path by adding targer path to module path
  const resolvedPath = handlePath(
    options?.basePath ?? process.cwd(),
    dirModulePath,
    targetPath,
    ctx
  );

  // if error while resolving path return empty errors and undefined load
  if (!resolvedPath) return { errors: [], load: undefined };

  // load str
  const parseData = await internalParseExtend(
    resolvedPath,
    {
      ...options,
      params: targetParams,
      filename: undefined, // remove the prev filename
    },
    loadId
  );

  // return load
  return parseData;
}

/**
 * Method to handle relative paths by resolving & insuring that they live inside the sandbox and are actual YAML files, also detect circular dependency if present.
 * @param basePath - Base path defined by user in the options (or cwd if was omitted by user) that will contain and sandbox all imports.
 * @param modulePath - Path of the current YAML file.
 * @param targetPath - Path of the imported YAML file.
 * @param loadOpts - Options object passed to load function and updated using imported module's filepath.
 * @param loadId - Unique id that identifies this load.
 * @returns Resolved safe path that will be passed to fs readFile function.
 */
function handlePath(
  basePath: string,
  modulePath: string,
  targetPath: string,
  ctx: ResolveCtx
): string | undefined {
  const { options, loadId } = ctx;
  // resolve path
  const resolvedPath = resolve(modulePath, targetPath);

  // make sure it's inside sandbox
  const isSandboxed = isInsideSandBox(resolvedPath, basePath);
  if (!isSandboxed && !options.unsafe)
    throw new YAMLExprError(
      ctx.range ? [...ctx.range] : [0, 99999],
      "",
      `Path used: ${targetPath} is out of scope of base path: ${basePath}`
    );

  const isYaml = isYamlFile(resolvedPath);
  if (!isYaml)
    throw new YAMLExprError(
      ctx.range ? [...ctx.range] : [0, 99999],
      "",
      `You can only load YAML files the loader. loaded file: ${resolvedPath}`
    );

  // detect circular dependency if present
  const circularDep = circularDepClass.addDep(modulePath, resolvedPath, loadId);
  if (circularDep)
    throw new YAMLExprError(
      ctx.range ? [...ctx.range] : [0, 99999],
      "",
      `Circular dependency detected: ${circularDep.join(" -> ")}`
    );

  // return path
  return resolvedPath;
}

/**
 * Method to remove file name from path and just keep path until last directory.
 * @param path - Path that will be handled.
 * @returns Path after file name removal.
 */
function removeFileName(path: string): string {
  return isYamlFile(path) ? dirname(path) : path;
}
