import { readFileSync as readFileSyncFS, realpathSync } from "fs";
import { readFile as readFileAsyncFS } from "fs/promises";
import { resolve, relative, parse } from "path";
import { WrapperYAMLException } from "../wrapperClasses/wrapperError.js";
import { fileNameRegex } from "./load/regex.js";
import { createHash, randomBytes } from "crypto";
import type { HandledLoadOpts, LiveLoaderOptions } from "../types.js";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This file contains Helper functions that are not related to our core work directly.

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Path related helper functions.
/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param targetPath - Path of the imported module.
 * @param currentPath - Path of the current module.
 * @returns Resolve of the two paths.
 */
export function resolvePath(targetPath: string, currentPath: string) {
  return resolve(currentPath, targetPath);
}

/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param resolvedPath - Resolved path from concatinating current file path with imported file path. works sync.
 * @param currentPath - Path of the current module.
 * @returns Read value of the file in UTF-8 format.
 */
export function readFile(
  resolvedPath: string,
  currentPath: string,
  loadOpts: HandledLoadOpts | LiveLoaderOptions
): string {
  const resCurrentPath = resolve(currentPath);

  if (!isInsideSandBox(resolvedPath, resCurrentPath) && !loadOpts.unsafe)
    throw new WrapperYAMLException(
      `Path used: ${resolvedPath} is out of scope of base path: ${resCurrentPath}`
    );

  if (!isYamlFile(resolvedPath))
    throw new WrapperYAMLException(`You can only load YAML files the loader.`);

  return readFileSyncFS(resolvedPath, { encoding: "utf8" });
}

/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param resolvedPath - Resolved path from concatinating current file path with imported file path. works async.
 * @param currentPath - Path of the current module.
 * @returns Read value of the file in UTF-8 format.
 */
export async function readFileAsync(
  resolvedPath: string,
  currentPath: string,
  loadOpts: HandledLoadOpts | LiveLoaderOptions
): Promise<string> {
  const resCurrentPath = resolve(currentPath);

  if (!isInsideSandBox(resolvedPath, resCurrentPath) && !loadOpts.unsafe)
    throw new WrapperYAMLException(
      `Path used: ${resolvedPath} is out of scope of base path: ${resCurrentPath}`
    );

  if (!isYamlFile(resolvedPath))
    throw new WrapperYAMLException(
      `You can only load YAML files the loader. loaded file: ${resolvedPath}`
    );

  return await readFileAsyncFS(resolvedPath, { encoding: "utf8" });
}

/**
 * Function to check if file reads are black boxed.
 * @param resolvedPath - Resolved path from concatinating current file path with imported file path. works async.
 * @param basePath - Base path passed in opts of load function. used to black box the file reads.
 * @returns Boolean that indicates if resolved path actually lives inside base path.
 */
export function isInsideSandBox(
  resolvedPath: string,
  basePath: string
): boolean {
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
export function isYamlFile(path: string): boolean {
  return fileNameRegex.test(path);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ID and hash related helper functions.
/**
 * Function to generate random id.
 */
export function generateId() {
  return randomBytes(12).toString("hex");
}

/**
 * Function to stringify objects uniformly to generate stable hashed from them.
 * @param obj - Object that will be stringified.
 * @returns String that holds the stringified object.
 */
export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
    .join(",")}}`;
}

/**
 * Function to normalize and hash params object.
 * @param params - Params object that will be hashed.
 * @returns Stable hash of params object that will only change if value or key inside object changed.
 */
export function hashParams(params: Record<string, string>): string {
  // stringify object
  const strObj = stableStringify(params);
  // hash and return
  return createHash("sha256").update(strObj).digest().toString("hex");
}

/**
 * Function to hash string.
 * @param str - String that will be hashed.
 * @returns Hash of the string.
 */
export function hashStr(str: string): string {
  return createHash("sha256").update(str).digest().toString("hex");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// String functions.
/**
 * Function to get number of times specific characters are repeated.
 * @param str - string that will be checked.
 * @param searchChar - Array of character for search. can only be single character.
 * @returns Number of times passed characters are repeated.
 */
export function numChar(str: string, searchChar: string[]): number {
  // gaurd from dev errors
  for (const c of searchChar)
    if (c.length > 1)
      throw new Error(`numChar function can only handle single characters.`);

  // handling
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    for (const c of searchChar) if (ch === c) num++;
  }
  return num;
}

/**
 * Function to ge first closing character at the same depth.
 * @param str - Sting that will be looped through.
 * @param openCh - Character used to open the expression (e.g. '{' or '[').
 * @param closeCh - Character used to close the expression (e.g. '}' or ']').
 * @param startIdx - Index to start searching from in the string.
 * @returns Number at which closest closing character at the same depth is present, or -1 if it's not closed.
 */
export function getClosingChar(
  str: string,
  openCh: string,
  closeCh: string,
  startIdx?: number
): number {
  /** Var to hold depth of the opening and closing characters. */
  let depth = 0;
  /** Var to hold index of the looping. */
  let i = startIdx ?? 0;

  // start loop string
  while (i < str.length) {
    // get character
    const ch = str[i];

    // if char is closing char and depth already zero return index other whise decrease depth by one
    if (ch === closeCh && str[i - 1] !== "\\")
      if (depth === 0) return i;
      else depth--;

    // if char is opening char increment depth by one
    if (ch === openCh && str[i - 1] !== "\\") depth++;

    // increment loop index
    i++;
  }

  // if no closing at depth zero return -1
  return -1;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Random helpers.
/**
 * Method to check if value is an array or object (record that can contains other primative values).
 * @param val - Value that will be checked.
 * @returns Boolean that indicates if value is a record or not.
 */
export function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

// deep-clone the input so we don't mutate the original
export function deepClone(value: unknown): unknown {
  // prefer structuredClone if available (native deep clone)
  if (typeof (globalThis as any).structuredClone === "function") {
    return (globalThis as any).structuredClone(value);
  }

  // fallback recursive clone that respects records/arrays using isRecord
  const cloneRec = (v: unknown): unknown => {
    if (!isRecord(v)) return v;
    if (Array.isArray(v)) {
      const arr: unknown[] = [];
      for (let i = 0; i < (v as any).length; i++) {
        arr[i] = cloneRec((v as any)[i]);
      }
      return arr;
    } else {
      const out: Record<string, unknown> = {};
      for (const k in v as any) {
        if (Object.prototype.hasOwnProperty.call(v as any, k)) {
          out[k] = cloneRec((v as any)[k]);
        }
      }
      return out;
    }
  };

  return cloneRec(value);
}

/**
 * Function to allow ignore private load on specific module.
 * @param load - Load after removing private loads.
 * @param privateLoad - Load with private nodes still present.
 * @param opts - Options object passed to the loader.
 * @returns Either load or privateLoad if file defined to ignore private nodes.
 */
export function handlePrivateLoad(
  load: unknown,
  privateLoad: unknown,
  filename: string | undefined,
  ignorePrivate: "all" | string | string[] | undefined
) {
  // if ignore private not defined return privateLoad directly
  if (ignorePrivate === undefined) return load;
  // if all modules defined to ignore private return fullLoad directly
  if (ignorePrivate === "all") return privateLoad;
  // return fullLoad only if filename matches the name of ignores files
  if (filename && ignorePrivate.includes(filename)) return privateLoad;
  // return privateLoad as default
  return load;
}
