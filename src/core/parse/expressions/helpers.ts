import { Alias, Scalar, YAMLMap, YAMLSeq } from "yaml";
import { YAMLExprError } from "../../extendClasses/error.js";
import { ResolveCtx } from "../../../types.js";
import { isRecord } from "../../helpers.js";

/**
 * Method to traverse through nodes tree. works sync.
 * @param tree - Node tree that will be traversed.
 * @param path - Path of traversal.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value after traversal and retuning subnode.
 */
export async function traverseNodes(
  tree: Alias | Scalar | YAMLMap | YAMLSeq | null | unknown,
  path: string[],
  ctx: ResolveCtx
): Promise<unknown> {
  // start node from base of the tree
  let node = tree;

  // start traversing
  for (const p of path) {
    // if path part is a number handle it accordingly
    const { node: childNode, resolved } = Number.isNaN(Number(p))
      ? await handleStrPath(node, p, ctx)
      : await handleNumPath(node, Number(p), ctx);

    // if node resolved add error and break
    if (!resolved) {
      ctx.errors.push(
        new YAMLExprError(
          ctx.range ? [...ctx.range] : [0, 99999],
          "",
          `Invalid path in expression: ${path.join(".")}`
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

export async function handleStrPath(
  node: Scalar | YAMLMap | YAMLSeq | null | unknown,
  pathPart: string,
  ctx: ResolveCtx
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
        const resVal = await ctx.resolveFunc(pair.value, true, true, ctx);
        return { node: resVal, resolved: true };
      }
    }
  }

  // if node is a YAMLSeq, check all the items
  if (node instanceof YAMLSeq) {
    for (const item of node.items) {
      const resItem = await ctx.resolveFunc(item, true, true, ctx);
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

export async function handleNumPath(
  node: Scalar | YAMLMap | YAMLSeq | null | unknown,
  pathPart: number,
  ctx: ResolveCtx
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
        const resVal = await ctx.resolveFunc(pair.value, true, true, ctx);
        return { node: resVal, resolved: true };
      }
    }
  }

  // if node is a YAMLSeq, get the index directly
  if (node instanceof YAMLSeq) {
    const length = node.items.length;
    if (pathPart < length) {
      const item = node.items[pathPart];
      const resItem = await ctx.resolveFunc(item, true, true, ctx);
      return { node: resItem, resolved: true };
    }
  }

  // if node is a scalar, get character at the index directly
  if (node instanceof Scalar) {
    const resScalar = await ctx.resolveFunc(node.value, true, true, ctx);
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
