import { YAMLExprError } from "../../extendClasses/error.js";

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

export function divideNodepath(
  nodepath: string,
  pos: [number, number]
): string[] {
  const parts = divideByDelimiter(nodepath, ".", pos);
  const handledParts = parts.map(removeEscChar);
  return handledParts;
}

/**
 * Method to divide directive into parts by dividing at non-escaped white spaces.
 * @param dir - Directive string that will be divided.
 * @param maxParts - Max number of parts as different directives accept x number of parts.
 * @returns Array of divided parts.
 */
export function divideDirective(
  dir: string,
  pos: [number, number],
  maxParts?: number
): string[] {
  const parts = divideByDelimiter(dir, " ", pos, maxParts);
  return parts;
}

export function divideExpression(
  expr: string,
  pos: [number, number],
  maxParts?: number
): string[] {
  const parts = divideByDelimiter(expr, " ", pos, maxParts);
  return parts;
}

/**
 * Method to divide <key=value> string into key value pair (entery).
 * @param keyValue - <key=value> string that will be divided.
 * @returns Entery of key and value.
 */
export function divideKeyValue(
  keyValue: string,
  pos: [number, number]
): [string, string] {
  const parts = divideByDelimiter(keyValue, "=", pos, 2);
  return [parts[0], parts[1]];
}

export function removeEscChar(str: string) {
  // if string is less that 2 return str directly
  if (str.length < 2) return str;
  // handle removal of leading and end escape char
  if (ESCAPE_CHAR.test(str[0]) && ESCAPE_CHAR.test(str[str.length - 1])) {
    str = str.slice(1, str.length - 1);
  }
  return str;
}

export function removeEscBlackSlash(str: string): string {
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
 * Method to divide string based on single delimiter.
 * @param str - String that will be divided.
 * @param delimiter - Delimiter used to divide string.
 * @param maxParts - Max parts before ommiting the remaining string.
 * @returns Array that holds divided parts.
 */
function divideByDelimiter(
  str: string,
  delimiter: string,
  pos: [number, number],
  maxParts?: number
): string[] {
  const delimiterFunc = getDelimiterFunc(delimiter);
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
      const endIdx = handleEscapeBlock(str, i, closeChar, pos);
      i = endIdx;
      continue;
    }

    // if delimiter add to parts
    if (delimiterFunc(cur)) {
      const part = str.slice(start, i);
      const handledPart = removeEscBlackSlash(part);
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
    const handledPart = removeEscBlackSlash(lastPart);
    parts.push(handledPart);
  }

  return parts;
}

/**
 * Helper method to retun function that will be used to check delimiter.
 * @param delimiter - Delimiter used to divide string.
 * @returns Function that accept single charachter and decide if it matches delimiter used or not.
 */
function getDelimiterFunc(delimiter: string): (ch: string) => boolean {
  if (delimiter === " ") return (ch: string) => WHITE_SPACE.test(ch);
  else return (ch: string) => ch === delimiter;
}

/**
 * Method to handle escape blocks by reading string until closing character and returning end index.
 * @param str - String that will be checked.
 * @param startIndex - Index at which scan will start.
 * @param closeChar - Character that closes escape block.
 * @returns end index.
 */
function handleEscapeBlock(
  str: string,
  startIndex: number,
  closeChar: string,
  pos: [number, number]
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
    throw new YAMLExprError(pos, "", `Opened escape char without close`);

  return j;
}
