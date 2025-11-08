import { handleExpression } from "../tokiner/expressions.js";
import {
  ResolveCtx,
  ThisExprParts,
  ImportExprParts,
  ParamExprParts,
  LocalExprParts,
} from "../../../types.js";
import { YAMLExprError } from "../../extendClasses/error.js";
import { handleThis } from "./this.js";
import { handleParam } from "./param.js";
import { handleLocal } from "./local.js";
import { handleImp } from "./import.js";

/**
 * Method to resolve interpolations. works sync.
 * @param expr - Expression that will be handled.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value returned from expression resolve.
 */
export async function handleExpr(
  expr: string,
  ctx: ResolveCtx
): Promise<unknown> {
  const exprData = await handleExpression(expr, ctx);
  if (!exprData) {
    ctx.errors.push(
      new YAMLExprError(
        ctx.range ? [...ctx.range] : [0, 99999],
        "",
        `Invalid type in expression: ${expr} defined types are: 'this' , 'import', 'param' and 'local'`
      )
    );
    return expr;
  }

  // destructure expression data
  const { type, parts } = exprData;

  // handle expression according to base
  switch (type) {
    case "this":
      return await handleThis(parts as ThisExprParts, ctx);
    case "import":
      return await handleImp(parts as ImportExprParts, ctx);
    case "param":
      return handleParam(parts as ParamExprParts, ctx);
    case "local":
      return handleLocal(parts as LocalExprParts, ctx);
  }
}
