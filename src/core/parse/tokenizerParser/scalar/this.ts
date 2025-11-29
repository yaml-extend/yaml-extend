import type { Context } from "./index.js";
import { traverseNodes, verifyNodeType } from "./helpers.js";
import { ParseState, TempParseState } from "../../parseTypes.js";
import { YAMLExprError } from "../../../extendClasses/error.js";

/**
 * Method to handle 'this' expression. works sync.
 * @param parts - Data parts.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
export async function handleThis(
  ctx: Context,
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  // get needed state
  const paths = ctx.paths;
  const args: Record<string, unknown> = ctx.args?.argsObj ?? {};

  // get needed cache data
  const cache = state.cache.get(tempState.resolvedPath);
  if (!cache) return;

  // update local values
  tempState.locals.push(args);

  try {
    const node = await traverseNodes(cache.AST, paths, state, tempState);

    if (ctx.type) {
      const verified = verifyNodeType(node, ctx.type.type);
      if (!verified) {
        tempState.errors.push(
          new YAMLExprError(
            ctx.textToken.pos,
            "",
            `Type mis-match, value used is not of type: ${ctx.type.type}`
          )
        );
        return null;
      }
    }

    return node;
  } finally {
    tempState.locals.pop();
  }
}
