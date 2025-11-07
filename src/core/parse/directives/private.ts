import { PrivateDirParts } from "../../../types.js";

/**
 * Method to push private nodes to the private array of directives object.
 * @param privateArr - Reference to the array that holds private nodes and will be passed to directives object.
 * @param parts - Directive parts object with metadata being private nodes.
 */
export function handlePrivate(
  privateArr: string[],
  parts: PrivateDirParts
): void {
  const privateNodes = parts.arrMetadata;
  if (Array.isArray(privateNodes))
    for (const p of privateNodes) privateArr.push(p);
}
