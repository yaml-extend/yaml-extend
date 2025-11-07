import { ImportDirParts } from "../../../types.js";

/** Method to verify imports structure (<alias> <path>) and add them to the map. */
/**
 * Method to add to imports map where key is alias for the import and value is the path and default params values passed to this import.
 * @param importsMap - Reference to the map that holds imports's aliases and path with default params values and will be passed to directives object.
 * @param parts - Parts of the line.
 */
export function handleImports(
  importsMap: Map<string, { path: string; params: Record<string, string> }>,
  parts: ImportDirParts
): void {
  // get alias and path and params key value from parts
  const { alias, metadata: path, keyValue: params } = parts;
  // add parts to the map
  importsMap.set(alias, { path, params });
}
