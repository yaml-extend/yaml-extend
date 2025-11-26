import { realpathSync, existsSync } from "fs";
import { resolve, relative, parse, dirname } from "path";
import type { ParseState, TempParseState } from "../parseTypes.js";
import { YAMLExprError } from "../../extendClasses/error.js";

export function verifyPath(
  path: string,
  tempState: TempParseState
): {
  status: true;
  error: undefined;
};
export function verifyPath(
  path: string,
  tempState: TempParseState
): {
  status: false;
  error: "sandBox" | "yamlFile" | "exist";
};
// Path related helper functions.
/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param state - Path of the current module.
 * @returns Read value of the file in UTF-8 format.
 */
export function verifyPath(
  path: string,
  tempState: TempParseState
): {
  status: true | false;
  error?: "sandBox" | "yamlFile" | "exist";
} {
  // get base path and resolved path
  const basePath = tempState.options.basePath;

  // handle sandbox check
  if (!isInsideSandBox(path, basePath) && !tempState.options.unsafe) {
    tempState.errors.push(
      new YAMLExprError(
        [0, 99999],
        "",
        `Path used: ${path} is out of scope of base path: ${basePath}.`
      )
    );
    return { status: false, error: "sandBox" };
  }

  // handle yaml file check
  if (!isYamlFile(path)) {
    tempState.errors.push(
      new YAMLExprError(
        [0, 99999],
        "",
        `You can only parse YAML files that end with '.yaml' or '.yml' extension, path used: ${path}.`
      )
    );
    return { status: false, error: "yamlFile" };
  }

  // make sure path is indeed present
  if (!existsSync(path)) {
    tempState.errors.push(
      new YAMLExprError(
        [0, 99999],
        "",
        `Path used: ${path} is not present in filesystem.`
      )
    );
    return { status: false, error: "exist" };
  }

  return { status: true };
}

export function mergePath(
  targetPath: string,
  state: ParseState,
  tempState: TempParseState
): { status: true; value: string };
export function mergePath(
  targetPath: string,
  state: ParseState,
  tempState: TempParseState
): { status: false; value: undefined };
/**
 * Method to handle relative paths by resolving & insuring that they live inside the sandbox and are actual YAML files, also detect circular dependency if present.
 * @param basePath - Base path defined by user in the options (or cwd if was omitted by user) that will contain and sandbox all imports.
 * @param modulePath - Path of the current YAML file.
 * @param targetPath - Path of the imported YAML file.
 * @param loadOpts - Options object passed to load function and updated using imported module's filepath.
 * @param loadId - Unique id that identifies this load.
 * @returns Resolved safe path that will be passed to fs readFile function.
 */
export function mergePath(
  targetPath: string,
  state: ParseState,
  tempState: TempParseState
): {
  status: boolean;
  value: string | undefined;
} {
  // get resolved path and base path
  const modulePath = dirname(tempState.resolvedPath);
  const resPath = resolve(modulePath, targetPath);

  // verify path
  const verified = verifyPath(resPath, tempState);
  if (!verified) return { status: false, value: undefined };

  // bind nodes and check for circular dependencies
  const circularDep = state.dependency.bindPaths(modulePath, resPath);
  if (circularDep) {
    tempState.errors.push(
      new YAMLExprError(
        [0, 99999],
        "",
        `Circular dependency detected: ${circularDep.join(" -> ")}.`
      )
    );
    return { status: false, value: undefined };
  }

  // return path
  return { status: true, value: resPath };
}

/**
 * Function to check if file reads are black boxed.
 * @param resolvedPath - Resolved path from concatinating current file path with imported file path. works async.
 * @param basePath - Base path passed in opts of load function. used to black box the file reads.
 * @returns Boolean that indicates if resolved path actually lives inside base path.
 */
function isInsideSandBox(resolvedPath: string, basePath: string): boolean {
  // Resolve symlinks to avoid escaping via symlink tricks
  const realBase = realpathSync(basePath);
  const realRes = realpathSync(resolvedPath);

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
