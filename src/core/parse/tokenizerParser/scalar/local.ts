import { YAMLExprError } from "../../../extendClasses/error.js";
import { Context } from "./index.js";
import { ParseState, TempParseState } from "../../parseTypes.js";
import { getLocal } from "../directives/index.js";
import { verifyNodeType } from "./helpers.js";

/**
 * Method to handle 'local' expression.
 * @param parts - Data parts.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
export function handleLocal(
  ctx: Context,
  state: ParseState,
  tempState: TempParseState
): unknown {
  // destrcture parts
  const alias = ctx.paths[1].path;

  // get needed cache data
  const cache = state.cache.get(tempState.resolvedPath);
  if (!cache) return;

  const local = getLocal(cache.directives.local, alias, true);
  let defLocal = local?.defauleValue;

  // generate localsVal object from values passed after $this
  const handledLocalsVal = Object.fromEntries(
    tempState.locals
      .map((obj) => {
        return Object.entries(obj);
      })
      .flat(1)
  );

  // if value is passed for this alias use it otherwise use default value
  const value = handledLocalsVal[alias] ?? defLocal ?? null;
  if (local?.yamlType) {
    const type = "as " + local.yamlType;
    const verified = verifyNodeType(value, type);
    if (!verified) {
      tempState.errors.push(
        new YAMLExprError(
          ctx.textToken.pos,
          "",
          `Type mis-match, value used is not of type: ${local.yamlType}.`
        )
      );
      return null;
    }
  }

  return value;
}
