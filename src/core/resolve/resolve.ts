import { load, loadAsync } from "../load/load.js";
import { dump } from "../dump/dump.js";
import { ResolveOptions } from "../../types.js";
import { isYamlFile } from "../helpers.js";
import { WrapperYAMLException } from "../../wrapperClasses/error.js";
import { writeFileSync } from "fs";
import { writeFile as writeFileAsync } from "fs/promises";
import { resolve as pathResolve } from "path";

/**
 * Function to resolve YAML files into one resolved normal syntax YAML file by resolving imports, tags, private fields etc... . works sync.
 * @param str - Base YAML string or path of it.
 * @param opts - LoadOptions supplied to load YAML files.
 */
export function resolve(str: string, opts?: ResolveOptions): string {
  // read file
  const loaded = load(str, opts);
  // dump file
  const dumped = dump(loaded);
  // if output path is supplied write file
  if (opts?.outputPath) {
    // resolve target path
    const resPath = handleTargetPath(opts.outputPath, opts.basePath);
    // make sure supplied path is yaml file
    const isYaml = isYamlFile(resPath);
    if (!isYaml)
      throw new WrapperYAMLException(
        `Target path supplied to resolve function is not YALM file.`
      );
    writeFileSync(resPath, dumped, { encoding: "utf8" });
  }
  // return dumped value
  return dumped;
}

/**
 * Function to resolve YAML files into one resolved normal syntax YAML file by resolving imports, tags, private fields etc... . works async.
 * @param str - Base YAML string or path of it.
 * @param opts - LoadOptions supplied to load YAML files.
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
    const resPath = handleTargetPath(opts.outputPath, opts.basePath);
    // make sure supplied path is yaml file
    const isYaml = isYamlFile(resPath);
    if (!isYaml)
      throw new WrapperYAMLException(
        `Target path supplied to resolve function is not YALM file.`
      );
    writeFileAsync(resPath, dumped, { encoding: "utf8" });
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
