import { YAMLError } from "yaml";
import {
  DirectiveTypes,
  DirectivePartsObj,
  TagDirParts,
  PrivateDirParts,
  LocalDirParts,
  ParamDirParts,
  FilenameDirParts,
  ImportDirParts,
} from "../../../types.js";
import { YAMLExprError } from "../../extendClasses/error.js";
import { divideDirective, removeEscChar, divideKeyValue } from "./helpers.js";

/**
 * Method to handle directive by returning it's type and deviding it into it's structural parts creating directive parts object.
 * @param dir - Directive that will be divided.
 * @returns Object that holds type along with structural parts of this directive. returns undefined if invalid directive is passed.
 */
export function handleDirective(
  dir: string,
  pos: [number, number],
  errors: YAMLError[]
):
  | {
      type: DirectiveTypes;
      parts: Partial<DirectivePartsObj>;
    }
  | undefined {
  // handle TAG directive
  if (dir.startsWith("%TAG")) {
    const parts = handleDirTag(dir, pos, errors);
    if (parts) return { type: "TAG", parts };
  }

  // handle FILENAME directive
  if (dir.startsWith("%FILENAME")) {
    const parts = handleDirFilename(dir, pos, errors);
    if (parts) return { type: "FILENAME", parts };
  }

  // handle PARAM directive
  if (dir.startsWith("%PARAM")) {
    const parts = handleDirParam(dir, pos, errors);
    if (parts) return { type: "PARAM", parts };
  }

  // handle LOCAL directive
  if (dir.startsWith("%LOCAL")) {
    const parts = handleDirLocal(dir, pos, errors);
    if (parts) return { type: "LOCAL", parts };
  }

  // handle IMPORT directive
  if (dir.startsWith("%IMPORT")) {
    const parts = handleDirImport(dir, pos, errors);
    if (parts) return { type: "IMPORT", parts };
  }

  // handle PRIVATE directive
  if (dir.startsWith("%PRIVATE"))
    return { type: "PRIVATE", parts: handleDirPrivate(dir, pos, errors) };
}

/** Method to handle tag directive deviding into it's structure parts. */
function handleDirTag(
  dir: string,
  pos: [number, number],
  errors: YAMLError[]
): TagDirParts | undefined {
  // remove statring %TAG and trim
  const data = dir.replace("%TAG", "").trim();
  // devide directive into parts
  const parts = divideDirective(data, pos, 2);
  const handle = parts[0];
  const prefix = parts[1];
  if (!handle || !prefix) {
    errors.push(
      new YAMLExprError(
        pos,
        "",
        "You should pass handle and prefix after '%TAG' directive, structure of TAG directive: %TAG <handle> <prefix>"
      )
    );
    return;
  }
  return { alias: handle, metadata: prefix };
}

/** Method to handle private directive deviding into it's structure parts. */
function handleDirPrivate(
  dir: string,
  pos: [number, number],
  errors: YAMLError[]
): PrivateDirParts {
  // remove statring %PRIVATE and trim
  const data = dir.replace("%PRIVATE", "").trim();
  // divide directive into parts, all parts are <private-nodes>
  const privateNodes = divideDirective(data, pos);
  // return private nodes
  return { arrMetadata: privateNodes };
}

/** Method to handle local directive deviding into it's structure parts. */
function handleDirLocal(
  dir: string,
  pos: [number, number],
  errors: YAMLError[]
): LocalDirParts | undefined {
  // remove statring %LOCAL and trim
  const data = dir.replace("%LOCAL", "").trim();
  // divide directive into parts, first part is <alias> and second is <def-value>
  const parts = divideDirective(data, pos, 2);
  const alias = parts[0];
  const defValue = parts[1];
  // verify that alais is present
  if (!alias) {
    errors.push(
      new YAMLExprError(
        pos,
        "",
        "You should pass alias after '%LOCAL' directive, structure of PARAM directive: %LOCAL <alias>"
      )
    );
    return;
  }
  // remove wrapping escape char if present
  const handledAlias = removeEscChar(alias);
  const handledDefValue = defValue && removeEscChar(defValue);
  // return parts
  return { alias: handledAlias, defValue: handledDefValue };
}

/** Method to handle param directive deviding into it's structure parts. */
function handleDirParam(
  dir: string,
  pos: [number, number],
  errors: YAMLError[]
): ParamDirParts | undefined {
  // remove statring %PARAM and trim
  const data = dir.replace("%PARAM", "").trim();
  // divide directive into parts, first part is <alias> and second is <def-value>
  const parts = divideDirective(data, pos, 2);
  const alias = parts[0];
  const defValue = parts[1];
  // verify that alais is present
  if (!alias) {
    errors.push(
      new YAMLExprError(
        pos,
        "",
        "You should pass alias after '%PARAM' directive, structure of PARAM directive: %PARAM <alias>"
      )
    );
    return;
  }
  // remove wrapping escape char if present
  const handledAlias = removeEscChar(alias);
  const handledDefValue = defValue && removeEscChar(defValue);
  // return parts
  return { alias: handledAlias, defValue: handledDefValue };
}

/** Method to handle filename directive deviding into it's structure parts. */
function handleDirFilename(
  dir: string,
  pos: [number, number],
  errors: YAMLError[]
): FilenameDirParts | undefined {
  // remove statring %FILENAME and trim
  const data = dir.replace("%FILENAME", "").trim();
  // remove wrapping escape char if present
  const handledMetadata = data && removeEscChar(data);
  // return error if empty filename was used
  if (!handledMetadata) {
    errors.push(
      new YAMLExprError(
        pos,
        "",
        "You should pass a scalar after %FILENAME directive."
      )
    );
    return;
  }
  // the filename is composed of only the <filename> so return directly
  return { metadata: handledMetadata };
}

/** Method to handle import directive deviding into it's structure parts. */
function handleDirImport(
  dir: string,
  pos: [number, number],
  errors: YAMLError[]
): ImportDirParts | undefined {
  // remove statring %IMPORT and trim
  const data = dir.replace("%IMPORT", "").trim();
  // divide directive into parts, first part is <alias> and second is <path> and last part is [key=value ...]
  const parts = divideDirective(data, pos);
  const alias = parts[0];
  const path = parts[1];
  const keyValueParts = parts.slice(2);
  // verify that alais and path are present
  if (!alias || !path) {
    errors.push(
      new YAMLExprError(
        pos,
        "",
        "You should pass alias and path after '%IMPORT' directive, structure of IMPORT directive: %IMPORT <alias> <path> [key=value ...]"
      )
    );
    return;
  }
  // remove wrapping escape char if present
  const handledAlias = removeEscChar(alias);
  const handledPath = removeEscChar(path);
  // handle conversion of keyValue parts into an object
  const keyValue: Record<string, string> = {};
  if (keyValueParts)
    for (const keyVal of keyValueParts) {
      const [key, value] = divideKeyValue(keyVal, pos);
      // remove wrapping escape char if present
      const handledKey = key && removeEscChar(key);
      const handledValue = value && removeEscChar(value);
      // add to keyValue object
      keyValue[handledKey] = handledValue;
    }

  // return parts
  return { alias: handledAlias, metadata: handledPath, keyValue };
}

export function getDirectives(
  str: string
): { dir: string; pos: [number, number] }[] {
  /** Array to hold defined directives. */
  const dirs: { dir: string; pos: [number, number] }[] = [];
  /** Number to track position in the loop of the hole str. */
  let i: number = 0;

  // Start looping the string
  while (i < str.length) {
    /** Var to hold start if first char in the new line is "%", otherwise will be undefined. */
    let start: undefined | number;

    // if current char is a "%" that mark start of a directive
    if (str[i] === "%") start = i;

    // skip to the next new line
    while (i < str.length)
      if (str[i] !== "\n") i++;
      else {
        i++;
        break;
      }

    // if start is defined (is dir) then add the directive
    if (start !== undefined) {
      const dir = str.slice(start, i);
      dirs.push({ dir, pos: [start, i] });
    }
  }

  // return directives
  return dirs;
}
