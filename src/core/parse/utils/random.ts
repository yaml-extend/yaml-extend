import { LinePos } from "../tokenizer/tokenizerTypes.js";
import { createHash } from "crypto";

/**
 * Function to hash string.
 * @param str - String that will be hashed.
 * @returns Hash of the string.
 */
export function hashStr(str: string): string {
  return createHash("sha256").update(str).digest().toString("hex");
}

export function getValueFromText(text: string): unknown {
  // if empty string return null
  if (!text) return null;

  // try parse text and return it
  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (err) {}

  // trim text and check for true, false, null and numbers
  const trim = text.trim();
  if (trim === "true") return true;
  if (trim === "false") return false;
  if (trim === "null") return null;
  if (!Number.isNaN(Number(trim))) return Number(trim);

  // return text as it is
  return text;
}

/**
 * Method to check if value is an array or object (record that can contains other primative values).
 * @param val - Value that will be checked.
 * @returns Boolean that indicates if value is a record or not.
 */
export function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

// deep-clone the input so we don't mutate the original
export function deepClone<O>(value: O): O {
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

  return cloneRec(value) as O;
}

export function stringify(value: unknown, preserveNull?: boolean): string {
  if (typeof value === "string") return value;
  if (value == undefined) {
    if (preserveNull) return "undefined";
    else return "";
  }
  if (value == null) {
    if (preserveNull) return "null";
    else return "";
  }
  return JSON.stringify(value);
}

export function getLineStarts(str: string): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\n") {
      // next character (i+1) is the start of the following line
      starts.push(i + 1);
    }
  }
  return starts;
}

/**
 * Return line and column (both 0-based) from absolute position in text.
 * @param lineStarts - Sorted ascending array of line start absolute positions (from getLineStarts).
 * @param absPosition - absolute index into the string (0 .. str.length). Must be integer.
 * @returns { line, col } of absolute position, or null if out of range.
 */
export function binarySearchLine(
  lineStarts: number[],
  absPosition: number
): { line: number; col: number } | null {
  if (!Number.isInteger(absPosition) || absPosition < 0) return null;
  if (lineStarts.length === 0) return null;

  // If absPosition is beyond last possible position (e.g. > last char index),
  // you can treat it as invalid or allow absPosition === str.length (end-of-file).
  // Here we accept absPosition up to Infinity but rely on lineStarts to drive results.

  let low = 0;
  let high = lineStarts.length - 1;
  let resultIndex = -1;

  while (low <= high) {
    const mid = low + ((high - low) >> 1);
    if (lineStarts[mid] <= absPosition) {
      // candidate (<=) so move right to find closer (larger) candidate
      resultIndex = mid;
      low = mid + 1;
    } else {
      // lineStarts[mid] > absPosition -> search left half
      high = mid - 1;
    }
  }

  if (resultIndex === -1) return null;

  const line = resultIndex;
  const col = absPosition - lineStarts[line];

  return { line, col };
}

export function getLinePosFromRange(
  lineStarts: number[],
  range: [number, number]
): [LinePos, LinePos] | undefined {
  const start = binarySearchLine(lineStarts, range[0]);
  const end = binarySearchLine(lineStarts, range[1]);
  if (start == null || end == null) return;
  return [start, end];
}
