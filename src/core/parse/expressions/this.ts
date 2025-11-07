import { ResolveCtx, ThisExprParts } from "../../../types.js";
import { traverseNodes } from "./helpers.js";

/**
 * Method to handle 'this' expression. works sync.
 * @param parts - Data parts.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
export async function handleThis(
  parts: ThisExprParts,
  ctx: ResolveCtx
): Promise<unknown> {
  // destrcture parts
  const { nodepath, keyValue: localsVal } = parts;

  // get needed cache data
  const { moduleCache, locals } = ctx;
  const { AST } = moduleCache;

  // update local values
  locals.push(localsVal);

  try {
    return await traverseNodes(AST, nodepath, ctx);
  } finally {
    locals.pop();
  }
}
