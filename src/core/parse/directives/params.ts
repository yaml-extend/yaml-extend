import { ParamDirParts } from "../../../types.js";

/**
 * Method to add to params map where key is alias for the param and value is the default value.
 * @param paramsMap - Reference to the map that holds params's aliases and default values and will be passed to directives object.
 * @param parts - Parts of the line.
 */
export function handleParams(
  paramsMap: Map<string, string>,
  parts: ParamDirParts
) {
  // get alias and defValue from parts
  const { alias, defValue } = parts;
  // add the alias with default value to the paramsMap
  paramsMap.set(alias, defValue);
}
