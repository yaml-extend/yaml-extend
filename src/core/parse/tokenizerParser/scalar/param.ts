import { YAMLExprError } from "../../../extendClasses/error.js";
import { ParseState, TempParseState } from "../../parseTypes.js";
import { getParam } from "../directives/index.js";
import { verifyNodeType } from "./helpers.js";
import { Context } from "./index.js";

/**
 * Method to handle 'param' expression.
 * @param parts - Data parts.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
export function handleParam(
  ctx: Context,
  state: ParseState,
  tempState: TempParseState
): unknown {
  // destrcture parts
  const alias = ctx.paths[1].path;

  // get needed cache data
  const cache = state.cache.get(tempState.resolvedPath);
  if (!cache) return;

  const param = getParam(cache.directives.param, alias, true);
  const defParam = param?.defauleValue;

  // if value is passed for this alias use it otherwise use default value
  const value =
    tempState.options.params?.[alias] ??
    tempState.options.universalParams?.[alias] ??
    defParam ??
    null;
  if (param?.yamlType) {
    const type = "as " + param.yamlType;
    const verified = verifyNodeType(value, type);
    if (!verified) {
      tempState.errors.push(
        new YAMLExprError(
          ctx.textToken.pos,
          "",
          `Type mis-match, value used is not of type: ${param.yamlType}`
        )
      );
      return null;
    }
  }

  return value;
}
