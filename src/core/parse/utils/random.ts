import { ExtendLinePos } from "../tokenizer/tokenizerTypes.js";
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
  const starts: number[] = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === "\n") starts.push(i);
    i++;
  }
  return starts;
}

/**
 * Find the rightmost element strictly less than `target` in a sorted ascending array.
 * @param arr Sorted ascending array of numbers.
 * @param target The number to compare against.
 * @returns { index, value } of the closest lower element, or null if none exists.
 */
function binarySearchLine(
  arr: number[],
  target: number
): { line: number; absolutePos: number } | null {
  let low = 0;
  let high = arr.length - 1;
  let resultIndex = -1;

  while (low <= high) {
    const mid = low + ((high - low) >> 1);
    if (arr[mid] < target) {
      // arr[mid] is a candidate; move right to find a closer (larger) candidate
      resultIndex = mid;
      low = mid + 1;
    } else {
      // arr[mid] >= target, we need strictly smaller => search left half
      high = mid - 1;
    }
  }

  if (resultIndex === -1) return null;
  return { line: resultIndex + 1, absolutePos: arr[resultIndex] };
}

export function getLinePosFromRange(
  str: string,
  lineStarts: number[],
  range: [number, number]
): ExtendLinePos[] {
  const start = range[0];
  const end = range[1];
  const search = binarySearchLine(lineStarts, start);
  if (!search) return [];
  let i = start;
  let line = search.line;
  let lineStart = start - search.absolutePos;
  let linePos: ExtendLinePos[] = [];
  while (i < str.length && i <= end) {
    if (str[i] === "\n") {
      if (i >= start)
        linePos.push({ start: lineStart, end: i - lineStart, line: line });
      line += 1;
      lineStart = 0;
    }
    i++;
  }
  linePos.push({ start: lineStart, end: i - lineStart, line });

  return linePos;
}
