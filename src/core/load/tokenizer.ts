import {
  DirectiveTypes,
  DirectivePartsObj,
  ParamDirParts,
  LocalDirParts,
  PrivateDirParts,
  FilenameDirParts,
  ImportDirParts,
  ExpressionTypes,
  ExpressionPartsObj,
  ParamExprParts,
  LocalExprParts,
  ImportExprParts,
  ThisExprParts,
  TagDirParts,
} from "../../types.js";
import { WrapperYAMLException } from "../../wrapperClasses/wrapperError.js";

/** Regex that holds escape characters. */
const ESCAPE_CHAR = /\"|\[/;

/** Map that maps each escape character with it's closing character. */
const ESCAPE_CLOSE_MAP: Record<string, string> = {
  '"': '"',
  "[": "]",
};

/** Delimiters used in the directives and expressions. */
const DELIMITERS = /\s|\.|\=/;

/** Regex to handle white spaces. */
const WHITE_SPACE = /\s/;

/** Regex to capture starting dot. */
const START_WITH_DOT = /^\./;

/**
 * Class to handle reading Directive declerations and expressions
 */
export class Tokenizer {
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // External methods.
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Method to handle directive by returning it's type and deviding it into it's structural parts creating directive parts object.
   * @param dir - Directive that will be divided.
   * @returns Object that holds type along with structural parts of this directive. returns undefined if invalid directive is passed.
   */
  handleDirective(dir: string):
    | {
        type: DirectiveTypes;
        parts: Partial<DirectivePartsObj>;
      }
    | undefined {
    if (dir.startsWith("%TAG"))
      return { type: "TAG", parts: this._handleDirTag(dir) };
    if (dir.startsWith("%FILENAME"))
      return { type: "FILENAME", parts: this._handleDirFilename(dir) };
    if (dir.startsWith("%PARAM"))
      return { type: "PARAM", parts: this._handleDirParam(dir) };
    if (dir.startsWith("%LOCAL"))
      return { type: "LOCAL", parts: this._handleDirLocal(dir) };
    if (dir.startsWith("%IMPORT"))
      return { type: "IMPORT", parts: this._handleDirImport(dir) };
    if (dir.startsWith("%PRIVATE"))
      return { type: "PRIVATE", parts: this._handleDirPrivate(dir) };
  }

  handleExpression(
    expr: string
  ): { type: ExpressionTypes; parts: Partial<ExpressionPartsObj> } | undefined {
    if (expr.startsWith("$this"))
      return { type: "this", parts: this._handleExprThis(expr) };
    if (expr.startsWith("$import"))
      return { type: "import", parts: this._handleExprImport(expr) };
    if (expr.startsWith("$local"))
      return { type: "local", parts: this._handleExprLocal(expr) };
    if (expr.startsWith("$param"))
      return { type: "param", parts: this._handleExprParam(expr) };
  }

  divideNodepath(nodepath: string): string[] {
    const parts = this._divideByDelimiter(nodepath, ".");
    const handledParts = parts.map(this._removeEscChar);
    return handledParts;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Directive divide methods.
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Method to handle tag directive deviding into it's structure parts. */
  private _handleDirTag(dir: string): TagDirParts {
    // remove statring %TAG and trim
    const data = dir.replace("%TAG", "").trim();
    // devide directive into parts
    const parts = this._divideDirective(data, 2);
    const handle = parts[0];
    const prefix = parts[1];
    if (!handle || !prefix)
      throw new WrapperYAMLException(
        "You should pass handle and prefix after '%TAG' directive, structure of TAG directive: %TAG <handle> <prefix>"
      );
    return { alias: handle, metadata: prefix };
  }

  /** Method to handle private directive deviding into it's structure parts. */
  private _handleDirPrivate(dir: string): PrivateDirParts {
    // remove statring %PRIVATE and trim
    const data = dir.replace("%PRIVATE", "").trim();
    // divide directive into parts, all parts are <private-nodes>
    const privateNodes = this._divideDirective(data);
    // return private nodes
    return { arrMetadata: privateNodes };
  }

  /** Method to handle local directive deviding into it's structure parts. */
  private _handleDirLocal(dir: string): LocalDirParts {
    // remove statring %LOCAL and trim
    const data = dir.replace("%LOCAL", "").trim();
    // divide directive into parts, first part is <alias> and second is <def-value>
    const parts = this._divideDirective(data, 2);
    const alias = parts[0];
    const defValue = parts[1];
    // verify that alais is present
    if (!alias)
      throw new WrapperYAMLException(
        "You should pass alias after '%LOCAL' directive, structure of PARAM directive: %LOCAL <alias>"
      );
    // remove wrapping escape char if present
    const handledAlias = this._removeEscChar(alias);
    const handledDefValue = defValue && this._removeEscChar(defValue);
    // return parts
    return { alias: handledAlias, defValue: handledDefValue };
  }

  /** Method to handle param directive deviding into it's structure parts. */
  private _handleDirParam(dir: string): ParamDirParts {
    // remove statring %PARAM and trim
    const data = dir.replace("%PARAM", "").trim();
    // divide directive into parts, first part is <alias> and second is <def-value>
    const parts = this._divideDirective(data, 2);
    const alias = parts[0];
    const defValue = parts[1];
    // verify that alais is present
    if (!alias)
      throw new WrapperYAMLException(
        "You should pass alias after '%PARAM' directive, structure of PARAM directive: %PARAM <alias>"
      );
    // remove wrapping escape char if present
    const handledAlias = this._removeEscChar(alias);
    const handledDefValue = defValue && this._removeEscChar(defValue);
    // return parts
    return { alias: handledAlias, defValue: handledDefValue };
  }

  /** Method to handle filename directive deviding into it's structure parts. */
  private _handleDirFilename(dir: string): FilenameDirParts {
    // remove statring %FILENAME and trim
    const data = dir.replace("%FILENAME", "").trim();
    // remove wrapping escape char if present
    const handledMetadata = data && this._removeEscChar(data);
    // the filename is composed of only the <filename> so return directly
    return { metadata: handledMetadata };
  }

  /** Method to handle import directive deviding into it's structure parts. */
  private _handleDirImport(dir: string): ImportDirParts {
    // remove statring %IMPORT and trim
    const data = dir.replace("%IMPORT", "").trim();
    // divide directive into parts, first part is <alias> and second is <path> and last part is [key=value ...]
    const parts = this._divideDirective(data);
    const alias = parts[0];
    const path = parts[1];
    const keyValueParts = parts.slice(2);
    // verify that alais and path are present
    if (!alias || !path)
      throw new WrapperYAMLException(
        "You should pass alias and path after '%IMPORT' directive, structure of IMPORT directive: %IMPORT <alias> <path> [key=value ...]"
      );
    // remove wrapping escape char if present
    const handledAlias = this._removeEscChar(alias);
    const handledPath = this._removeEscChar(path);
    // handle conversion of keyValue parts into an object
    const keyValue: Record<string, string> = {};
    if (keyValueParts)
      for (const keyVal of keyValueParts) {
        const [key, value] = this._divideKeyValue(keyVal);
        // remove wrapping escape char if present
        const handledKey = key && this._removeEscChar(key);
        const handledValue = value && this._removeEscChar(value);
        // add to keyValue object
        keyValue[handledKey] = handledValue;
      }

    // return parts
    return { alias: handledAlias, metadata: handledPath, keyValue };
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Expression divide methods.
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  private _handleExprThis(expr: string): ThisExprParts {
    // only trim for now (as we want to get part with $this)
    const data = expr.trim();
    // divide expression into parts, first part is <nodepath> and second is [key-value ...]
    const parts = this._divideExpression(data, 2);
    const nodepathStr = parts[0]
      ?.replace("$this", "")
      ?.replace(START_WITH_DOT, "");
    const keyValueParts = parts.slice(1);
    // verify that nodepathStr is present ($this should have path)
    if (!nodepathStr)
      throw new WrapperYAMLException(
        "You should pass node path after '$this' expression, structure of this expression: $this.<node-path> [key=value ...]"
      );
    // handle division of nodepath string into parts
    const nodepath = this._divideNodepath(nodepathStr);
    const handledNodepath = nodepath.map(this._removeEscChar);
    // handle conversion of keyValue parts into an object
    const keyValue: Record<string, string> = {};
    if (keyValueParts)
      for (const keyVal of keyValueParts) {
        const [key, value] = this._divideKeyValue(keyVal);
        // remove wrapping escape char if present
        const handledKey = key && this._removeEscChar(key);
        const handledValue = value && this._removeEscChar(value);
        // add to keyValue object
        keyValue[handledKey] = handledValue;
      }
    // return parts
    return { nodepath: handledNodepath, keyValue };
  }

  private _handleExprImport(expr: string): ImportExprParts {
    // only trim for now (as we want to get part with $import)
    const data = expr.trim();
    // divide expression into parts, first part is <nodepath> and second is [key-value ...]
    const parts = this._divideExpression(data, 2);
    const nodepathStr = parts[0]
      ?.replace("$import", "")
      ?.replace(START_WITH_DOT, "");
    const keyValueParts = parts.slice(1);
    // handle division of nodepath string into parts
    const nodepath = this._divideNodepath(nodepathStr);
    const handledNodepath = nodepath.map(this._removeEscChar);
    // handle conversion of keyValue parts into an object
    const keyValue: Record<string, string> = {};
    if (keyValueParts)
      for (const keyVal of keyValueParts) {
        const [key, value] = this._divideKeyValue(keyVal);
        // remove wrapping escape char if present
        const handledKey = key && this._removeEscChar(key);
        const handledValue = value && this._removeEscChar(value);
        // add to keyValue object
        keyValue[handledKey] = handledValue;
      }
    // return parts
    return { nodepath: handledNodepath, keyValue };
  }

  private _handleExprLocal(expr: string): LocalExprParts {
    // remove statring $local and trim, also remove dot if new string starts with a dot
    const data = expr.replace("$local", "").trim().replace(START_WITH_DOT, "");
    // get alias (first and only part)
    const parts = this._divideExpression(data, 1);
    const alias = parts[0];
    if (!alias)
      throw new WrapperYAMLException(
        "You should pass alias after '$local' expression, strcuture of local expression: $local.<alias>"
      );
    const handledAlias = this._removeEscChar(alias);
    return { alias: handledAlias };
  }

  private _handleExprParam(expr: string): ParamExprParts {
    // remove statring $param and trim, also remove dot if new string starts with a dot
    const data = expr.replace("$param", "").trim().replace(START_WITH_DOT, "");
    // get alias (first and only part)
    const parts = this._divideExpression(data, 1);
    const alias = parts[0];
    if (!alias)
      throw new WrapperYAMLException(
        "You should pass alias after '$param' expression, structure of local expression: $local.<alias>"
      );
    const handledAlias = this._removeEscChar(alias);
    return { alias: handledAlias };
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Core helper methods.
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Method to divide directive into parts by dividing at non-escaped white spaces.
   * @param dir - Directive string that will be divided.
   * @param maxParts - Max number of parts as different directives accept x number of parts.
   * @returns Array of divided parts.
   */
  private _divideDirective(dir: string, maxParts?: number): string[] {
    const parts = this._divideByDelimiter(dir, " ", maxParts);
    return parts;
  }

  private _divideExpression(expr: string, maxParts?: number): string[] {
    const parts = this._divideByDelimiter(expr, " ", maxParts);
    return parts;
  }

  private _divideNodepath(path: string | undefined): string[] {
    if (!path) return [];
    const parts = this._divideByDelimiter(path, ".");
    return parts;
  }

  /**
   * Method to divide <key=value> string into key value pair (entery).
   * @param keyValue - <key=value> string that will be divided.
   * @returns Entery of key and value.
   */
  private _divideKeyValue(keyValue: string): [string, string] {
    const parts = this._divideByDelimiter(keyValue, "=", 2);
    return [parts[0], parts[1]];
  }

  /**
   * Helper method to retun function that will be used to check delimiter.
   * @param delimiter - Delimiter used to divide string.
   * @returns Function that accept single charachter and decide if it matches delimiter used or not.
   */
  private _getDelimiterFunc(delimiter: string): (ch: string) => boolean {
    if (delimiter === " ") return (ch: string) => WHITE_SPACE.test(ch);
    else return (ch: string) => ch === delimiter;
  }

  /**
   * Method to divide string based on single delimiter.
   * @param str - String that will be divided.
   * @param delimiter - Delimiter used to divide string.
   * @param maxParts - Max parts before ommiting the remaining string.
   * @returns Array that holds divided parts.
   */
  private _divideByDelimiter(
    str: string,
    delimiter: string,
    maxParts?: number
  ): string[] {
    const delimiterFunc = this._getDelimiterFunc(delimiter);
    const parts: string[] = [];
    const len: number = str.length;
    let start: number = 0;
    let i: number = 0;
    while (i < len) {
      // get current char
      const cur = str[i];

      // if escape char skip until close
      if (ESCAPE_CHAR.test(cur) && (i === 0 || DELIMITERS.test(str[i - 1]))) {
        const closeChar = ESCAPE_CLOSE_MAP[cur];
        const endIdx = this._handleEscapeBlock(str, i, closeChar);
        i = endIdx;
        continue;
      }

      // if delimiter add to parts
      if (delimiterFunc(cur)) {
        const part = str.slice(start, i);
        const handledPart = this._removeEscBlackSlash(part);
        parts.push(handledPart);
        if (maxParts && parts.length === maxParts) return parts;
        i++;
        while (i < len && WHITE_SPACE.test(str[i])) i++;
        start = i;
        continue;
      }

      i++;
    }

    if (start < len) {
      const lastPart = str.slice(start);
      const handledPart = this._removeEscBlackSlash(lastPart);
      parts.push(handledPart);
    }

    return parts;
  }

  private _removeEscChar(str: string) {
    // if string is less that 2 return str directly
    if (str.length < 2) return str;
    // handle removal of leading and end escape char
    if (ESCAPE_CHAR.test(str[0]) && ESCAPE_CHAR.test(str[str.length - 1])) {
      str = str.slice(1, str.length - 1);
    }
    return str;
  }

  private _removeEscBlackSlash(str: string): string {
    // handle removal of escape "\"
    let out = "";
    let i = 0;
    while (i < str.length) {
      if (str[i] === "\\") i++;
      out += str[i] ?? "";
      i++;
    }
    return out;
  }

  /**
   * Method to handle escape blocks by reading string until closing character and returning end index.
   * @param str - String that will be checked.
   * @param startIndex - Index at which scan will start.
   * @param closeChar - Character that closes escape block.
   * @returns end index.
   */
  private _handleEscapeBlock(
    str: string,
    startIndex: number,
    closeChar: string
  ): number {
    const len = str.length;
    let j = startIndex + 1;
    let isClosed = false;
    while (j < len) {
      const cur = str[j];
      if (cur === "\\") {
        // handle escaped char (e.g. \" or \\)
        if (j + 1 < len) {
          j += 2;
          continue;
        } else {
          // trailing backslash — include it
          j++;
          continue;
        }
      }
      if (cur === closeChar) {
        isClosed = true;
        j++; // move index to char after closing
        break;
      }
      j++;
    }

    if (!isClosed)
      throw new WrapperYAMLException(`Opened escape char without close`);

    return j;
  }
}

export const tokenizer = new Tokenizer();
