import { realpathSync, existsSync } from "fs";
import { resolve, relative, parse, dirname } from "path";
import type { TempParseState } from "../parseTypes.js";

// Path related helper functions.

/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param state - Path of the current module.
 * @returns Read value of the file in UTF-8 format.
 */
export function verifyPath(
  path: string,
  tempState: TempParseState
): { status: false; errorMessage: string };
export function verifyPath(
  path: string,
  tempState: TempParseState
): { status: true; errorMessage: undefined };
export function verifyPath(
  path: string,
  tempState: TempParseState
): { status: boolean; errorMessage: string | undefined } {
  // get base path and resolved path
  const basePath = tempState.options.basePath;

  // make sure path is indeed present
  if (!existsSync(path))
    return {
      status: false,
      errorMessage: `Invalid path, Path used: ${path} is not present in filesystem.`,
    };

  // handle yaml file check
  if (!isYamlFile(path))
    return {
      status: false,
      errorMessage: `Invalid path, You can only parse YAML files that end with '.yaml' or '.yml' extension, path used: ${path}.`,
    };

  // handle sandbox check
  if (!tempState.options.unsafe && !isInsideSandBox(path, basePath))
    return {
      status: false,
      errorMessage: `Invalid path, Path used: ${path} is out of scope of base path: ${basePath}.`,
    };

  return { status: true, errorMessage: undefined };
}

export function mergePath(
  targetPath: string,
  tempState: TempParseState
): string {
  const modulePath = dirname(tempState.resolvedPath);
  const resPath = resolve(modulePath, targetPath);
  return resPath;
}

/**
 * Function to check if file reads are black boxed.
 * @param path - Resolved path from concatinating current file path with imported file path. works async.
 * @param basePath - Base path passed in opts of load function. used to black box the file reads.
 * @returns Boolean that indicates if resolved path actually lives inside base path.
 */
function isInsideSandBox(path: string, basePath: string): boolean {
  // Resolve symlinks to avoid escaping via symlink tricks
  const realBase = realpathSync(basePath);
  const realRes = realpathSync(path);

  // Windows: different root/drive => definitely outside (compare case-insensitive)
  const baseRoot = parse(realBase).root.toLowerCase();
  const resRoot = parse(realRes).root.toLowerCase();
  if (baseRoot !== resRoot) return false;

  // Correct order: from base -> to res
  const rel = relative(realBase, realRes);

  // same path
  if (rel === "") return true;

  // if it starts with '..' it escapes the base
  return !rel.startsWith("..");
}

/**
 * Function to check if read files are YAML files only.
 * @param path - Url path of the file.
 * @returns Boolean to indicate if file path is YAML file path.
 */
function isYamlFile(path: string): boolean {
  return path.endsWith(".yaml") || path.endsWith(".yml");
}
