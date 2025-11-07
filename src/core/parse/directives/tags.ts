import { TagDirParts } from "../../../types.js";

/**
 * Method to add to tags map where key is handle for the tag and value is prefix.
 * @param tagsMap - Reference to the map that holds tags's handles and prefixes and will be passed to directives object.
 * @param parts - Parts of the line.
 */
export function handleTags(
  tagsMap: Map<string, string>,
  parts: TagDirParts
): void {
  const { alias, metadata } = parts;
  tagsMap.set(alias, metadata);
}
