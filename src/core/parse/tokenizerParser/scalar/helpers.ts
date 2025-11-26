import { Alias, Scalar, YAMLMap, YAMLSeq } from "yaml";
import { YAMLExprError } from "../../../extendClasses/error.js";
import { isRecord } from "../../utils/random.js";
import type { Context } from "./index.js";
import { ParseState, TempParseState } from "../../parseTypes.js";

export function verifyNodeType(node: unknown, type: string): boolean {
  if (!type) return true;
  switch (type) {
    case "as map":
      return typeof node === "object" && !Array.isArray(node) && node != null;
    case "as seq":
      return Array.isArray(node);
    case "as scalar":
      return (
        typeof node === "string" ||
        typeof node === "number" ||
        typeof node === "boolean"
      );
    default:
      return true;
  }
}

/**
 * Method to traverse through nodes tree. works sync.
 * @param tree - Node tree that will be traversed.
 * @param path - Path of traversal.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value after traversal and retuning subnode.
 */
export async function traverseNodes(
  tree: Alias | Scalar | YAMLMap | YAMLSeq | null | unknown,
  paths: Context["paths"],
  state: ParseState,
  tempState: TempParseState,
  skipNum?: number
): Promise<unknown> {
  // start node from base of the tree
  let node = tree;
  let start = skipNum ? skipNum : 0;

  // start traversing
  for (let i = start; i < paths.length; i++) {
    // get path
    const p = paths[i];

    // get path and token
    const { path, tok } = p;

    // if path part is a number handle it accordingly
    const { node: childNode, resolved } = Number.isNaN(Number(path))
      ? await handleStrPath(node, path, state, tempState)
      : await handleNumPath(node, Number(path), state, tempState);

    // if node resolved add error and break
    if (!resolved) {
      const pathStr = paths.map((p) => p.path).join(".");
      tempState.errors.push(
        new YAMLExprError(
          [tok.pos.start, tok.pos.end],
          "",
          `Path: ${pathStr} is not present in target YAML tree.`
        )
      );
      node = undefined;
      break;
    }

    // equal childNode with node
    node = childNode;
  }

  // return node
  return node;
}

async function handleStrPath(
  node: Scalar | YAMLMap | YAMLSeq | null | unknown,
  pathPart: string,
  state: ParseState,
  tempState: TempParseState
): Promise<{
  node: Alias | Scalar | YAMLMap | YAMLSeq | null | unknown;
  resolved: boolean;
}> {
  // if parent node is a YAMLMap, check all the keys
  if (node instanceof YAMLMap) {
    for (const pair of node.items) {
      let key;
      if (pair.key instanceof Scalar) key = pair.key.value;
      else key = pair.key;
      if (key === pathPart) {
        const resVal = await tempState.resolveFunc(
          pair.value,
          true,
          state,
          tempState
        );
        return { node: resVal, resolved: true };
      }
    }
  }

  // if node is a YAMLSeq, check all the items
  if (node instanceof YAMLSeq) {
    for (const item of node.items) {
      const resItem = await tempState.resolveFunc(item, true, state, tempState);
      if (typeof resItem === "string" && resItem === pathPart)
        return { node: resItem, resolved: true };
    }
  }

  // if node is a record, check keys for the path part, except if it's YAML's scalar or alias
  if (isRecord(node) && !(node instanceof Scalar) && !(node instanceof Alias))
    if (pathPart in node) return { node: node[pathPart], resolved: true };

  // default return if no match found
  return {
    node: undefined,
    resolved: false,
  };
}

async function handleNumPath(
  node: Scalar | YAMLMap | YAMLSeq | null | unknown,
  pathPart: number,
  state: ParseState,
  tempState: TempParseState
): Promise<{
  node: Alias | Scalar | YAMLMap | YAMLSeq | null | unknown;
  resolved: boolean;
}> {
  // if parent node is a YAMLMap, check all the keys for this number
  if (node instanceof YAMLMap) {
    for (const pair of node.items) {
      let key;
      if (pair.key instanceof Scalar) key = pair.key.value;
      else key = pair.key;
      if (key === `${pathPart}`) {
        const resVal = await tempState.resolveFunc(
          pair.value,
          true,
          state,
          tempState
        );
        return { node: resVal, resolved: true };
      }
    }
  }

  // if node is a YAMLSeq, get the index directly
  if (node instanceof YAMLSeq) {
    const length = node.items.length;
    if (pathPart < length) {
      const item = node.items[pathPart];
      const resItem = await tempState.resolveFunc(item, true, state, tempState);
      return { node: resItem, resolved: true };
    }
  }

  // if node is a scalar, get character at the index directly
  if (node instanceof Scalar) {
    const resScalar = await tempState.resolveFunc(
      node.value,
      true,
      state,
      tempState
    );
    if (typeof resScalar === "string") {
      const length = node.value.length;
      if (pathPart < length)
        return { node: node.value[pathPart], resolved: true };
    }
  }

  // if node is an Array or string get item at specific character directly
  if (Array.isArray(node) || typeof node === "string") {
    const length = node.length;
    if (pathPart < length) return { node: node[pathPart], resolved: true };
  }

  // default return if no match found
  return { node: undefined, resolved: false };
}
