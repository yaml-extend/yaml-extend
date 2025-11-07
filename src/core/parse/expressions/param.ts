import { ParamExprParts, ResolveCtx } from "../../../types.js";
import { YAMLExprError } from "../../extendClasses/error.js";

/**
 * Method to handle 'param' expression.
 * @param parts - Data parts.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
export function handleParam(parts: ParamExprParts, ctx: ResolveCtx): unknown {
  // destrcture parts
  const { alias } = parts;

  const { moduleCache, options } = ctx;
  const { directives } = moduleCache;
  const { paramsMap } = directives;

  // check if alias is defined in directives using paramsMap, if yes get def param value
  if (!paramsMap.has(alias)) {
    ctx.errors.push(
      new YAMLExprError(
        ctx.range ? [...ctx.range] : [0, 99999],
        "",
        `Alias used in params expression: '${alias}' is not defined in directives.`
      )
    );
    return undefined;
  }

  const defParam = paramsMap.get(alias);

  // if value is passed for this alias use it otherwise use default value
  return options.params?.[alias] ?? defParam ?? null;
}
