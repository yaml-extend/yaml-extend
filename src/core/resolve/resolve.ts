import { load, loadAsync } from "../load/load.js";
import { dump } from "../dump/dump.js";
import { ResolveOptions } from "../../types.js";
import { isYamlFile } from "../helpers.js";
import { WrapperYAMLException } from "../../wrapperClasses/wrapperError.js";
import { writeFileSync } from "fs";
import { writeFile as writeFileAsync } from "fs/promises";
import { resolve as pathResolve } from "path";

/**
 * Function to resolve tags and wrapper expressions (imports, params, locals and privates) to generate one resolved YAML string. short hand for calling load()
 * then dump(). useful to convert YAML modules into one YAML string that will be passed for configiration. works sync.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control resolve behavior.
 */
export function resolve(str: string, opts?: ResolveOptions): string {
  // read file
  const loaded = load(str, opts);
  // dump file
  const dumped = dump(loaded);
  // if output path is supplied write file
  if (opts?.outputPath) {
    // resolve target path
    const resolvedPath = handleTargetPath(opts.outputPath, opts.basePath);
    // make sure supplied path is yaml file
    const isYaml = isYamlFile(resolvedPath);
    if (!isYaml)
      throw new WrapperYAMLException(
        `Target path supplied to resolve function is not YALM file.`
      );
    writeFileSync(resolvedPath, dumped, { encoding: "utf8" });
  }
  // return dumped value
  return dumped;
}

/**
 * Function to resolve tags and wrapper expressions (imports, params, locals and privates) to generate one resolved YAML string. short hand for calling load()
 * then dump(). useful to convert YAML modules into one YAML string that will be passed for configiration. works async.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control resolve behavior.
 */
export async function resolveAsync(
  str: string,
  opts?: ResolveOptions
): Promise<string> {
  // read file
  const loaded = await loadAsync(str, opts);
  // dump file
  const dumped = dump(loaded, opts);
  // if output path is supplied write file
  if (opts?.outputPath) {
    // resolve target path
    const resolvedPath = handleTargetPath(opts.outputPath, opts.basePath);
    // make sure supplied path is yaml file
    const isYaml = isYamlFile(resolvedPath);
    if (!isYaml)
      throw new WrapperYAMLException(
        `Target path supplied to resolve function is not YALM file.`
      );
    writeFileAsync(resolvedPath, dumped, { encoding: "utf8" });
  }
  // return dumped value
  return dumped;
}

/**
 * Function to add base path to target path if supplied.
 * @param targetPath - Path of resolved file.
 * @param basePath - Base path supplied in options.
 * @returns Resolved path.
 */
function handleTargetPath(
  targetPath: string,
  basePath: string | undefined
): string {
  if (basePath) return pathResolve(basePath, targetPath);
  else return targetPath;
}

export type Resolve = typeof resolve;
export type ResolveAsync = typeof resolveAsync;
