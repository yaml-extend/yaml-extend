import { LocalExprParts, ResolveCtx } from "../../../types.js";
import { YAMLExprError } from "../../extendClasses/error.js";

/**
 * Method to handle 'local' expression.
 * @param parts - Data parts.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
export function handleLocal(parts: LocalExprParts, ctx: ResolveCtx): unknown {
  // destrcture parts
  const { alias } = parts;

  const { moduleCache, locals } = ctx;
  const { directives } = moduleCache;
  const { localsMap } = directives;

  // check if alias is defined in directives using localsMap
  if (!localsMap.has(alias)) {
    ctx.errors.push(
      new YAMLExprError(
        ctx.range ? [...ctx.range] : [0, 99999],
        "",
        `Alias used in local expression: '${alias}' is not defined in directives.`
      )
    );
    return undefined;
  }
  const defLocal = localsMap.get(alias);

  // generate localsVal object from values passed after $this
  const handledLocalsVal = Object.fromEntries(
    locals
      .map((obj) => {
        return Object.entries(obj);
      })
      .flat(1)
  );

  // if value is passed for this alias use it otherwise use default value
  return handledLocalsVal[alias] ?? defLocal ?? null;
}
