import { createHash } from "crypto";

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
export function hashParams(params: Record<string, unknown>): string {
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
