import { LocalDirParts } from "../../../types.js";

/**
 * Method to add to locals map where key is alias for the local and value is the default value.
 * @param localsMap - Reference to the map that holds local's aliases and default values and will be passed to directives object.
 * @param parts - Parts of the line.
 */
export function handleLocals(
  localsMap: Map<string, string>,
  parts: LocalDirParts
): void {
  // get alias and defValue from parts
  const { alias, defValue } = parts;
  // add the alias with default value to the paramsMap
  localsMap.set(alias, defValue);
}
