import { FilenameDirParts } from "../../../types.js";

/**
 * Method to return filename. Only method here that returns value as filename is a string and can't be referenced.
 * @param parts - Directive parts object with metadata filename.
 * @returns filename.
 */
export function handleFilename(parts: FilenameDirParts): string {
  return parts.metadata;
}
