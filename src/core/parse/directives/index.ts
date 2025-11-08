import {
  DirectivesObj,
  TagDirParts,
  LocalDirParts,
  ParamDirParts,
  ImportDirParts,
  PrivateDirParts,
  FilenameDirParts,
} from "../../../types.js";
import { handleDirective } from "../tokiner/directives.js";
import { getDirectives } from "../tokiner/directives.js";

import { handleTags } from "./tags.js";
import { handleParams } from "./params.js";
import { handlePrivate } from "./private.js";
import { handleImports } from "./imports.js";
import { handleLocals } from "./locals.js";
import { handleFilename } from "./filename.js";
import { YAMLError } from "yaml";

/** Regex to capture directive end mark. */
export const dirEndRegex = /\n---\s*\n/;

/**
 * Method to read directives in YAML string, handle wrapper specific directives by converting them into directives object.
 * @param str - String passed in load function.
 * @returns Directives object which holds meta data about directives to be used in the resolver.
 */
export function handleDir(str: string): DirectivesObj {
  // array to hold errors
  const errors: YAMLError[] = [];
  // define main arrays and maps to hold directives data
  /** Holds list of private node's definition. */
  const privateArr: string[] = [];
  /** Holds list of tag handles and prefix values used in the module. */
  const tagsMap: Map<string, string> = new Map();
  /** Holds list of param's aliases and default values used in the module. */
  const paramsMap: Map<string, string> = new Map();
  /** Holds list of local's aliases and default values used in the module. */
  const localsMap: Map<string, string> = new Map();
  /** Map of aliases for imports and import data as path and modules params. */
  const importsMap: Map<
    string,
    { path: string; params: Record<string, string> }
  > = new Map();
  /** Filename defined in directives. */
  let filename: string = "";

  // get dirs from str
  const dirs = getDirectives(str);

  for (const dir of dirs) {
    const { dir: dirStr, pos } = dir;
    const trimmedDir = dirStr.trim();

    const dirData = handleDirective(trimmedDir, pos, errors);
    if (!dirData) continue;

    // destructure directive data
    const { type, parts: directiveParts } = dirData;

    switch (type) {
      case "TAG":
        handleTags(tagsMap, directiveParts as TagDirParts);
        break;
      case "PARAM":
        handleParams(paramsMap, directiveParts as ParamDirParts);
        break;
      case "PRIVATE":
        handlePrivate(privateArr, directiveParts as PrivateDirParts);
        break;
      case "IMPORT":
        handleImports(importsMap, directiveParts as ImportDirParts);
        break;
      case "LOCAL":
        handleLocals(localsMap, directiveParts as LocalDirParts);
        break;
      case "FILENAME":
        filename = handleFilename(directiveParts as FilenameDirParts);
        break;
    }
  }

  return {
    tagsMap,
    privateArr,
    paramsMap,
    localsMap,
    importsMap,
    filename,
    errors,
    directives: dirs,
  };
}
