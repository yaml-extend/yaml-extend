import {
  ExpressionPartsObj,
  ExpressionTypes,
  ResolveCtx,
  ThisExprParts,
  ImportExprParts,
  LocalExprParts,
  ParamExprParts,
} from "../../../types.js";
import { YAMLExprError } from "../../extendClasses/error.js";
import {
  divideExpression,
  removeEscChar,
  divideKeyValue,
  divideNodepath,
} from "./helpers.js";

/** Regex to capture starting dot. */
const START_WITH_DOT = /^\./;

export function handleExpression(
  expr: string,
  ctx: ResolveCtx
): { type: ExpressionTypes; parts: Partial<ExpressionPartsObj> } | undefined {
  if (expr.startsWith("$this"))
    return { type: "this", parts: handleExprThis(expr, ctx) };
  if (expr.startsWith("$import"))
    return { type: "import", parts: handleExprImport(expr, ctx) };
  if (expr.startsWith("$local"))
    return { type: "local", parts: handleExprLocal(expr, ctx) };
  if (expr.startsWith("$param"))
    return { type: "param", parts: handleExprParam(expr, ctx) };
}

function handleExprThis(expr: string, ctx: ResolveCtx): ThisExprParts {
  // get current position (used in error messages)
  const pos: [number, number] = ctx.range ? ctx.range : [0, 99999];
  // only trim for now (as we want to get part with $this)
  const data = expr.trim();
  // divide expression into parts, first part is <nodepath> and second is [key-value ...]
  const parts = divideExpression(data, pos, 2);
  const nodepathStr = parts[0]
    ?.replace("$this", "")
    ?.replace(START_WITH_DOT, "");
  const keyValueParts = parts.slice(1);
  // verify that nodepathStr is present ($this should have path)
  if (!nodepathStr)
    throw new YAMLExprError(
      pos,
      "",
      "You should pass node path after '$this' expression, structure of this expression: $this.<node-path> [key=value ...]"
    );
  // handle division of nodepath string into parts
  const nodepath = divideNodepath(nodepathStr, pos);
  const handledNodepath = nodepath.map(removeEscChar);
  // handle conversion of keyValue parts into an object
  const keyValue: Record<string, string> = {};
  if (keyValueParts)
    for (const keyVal of keyValueParts) {
      const [key, value] = divideKeyValue(keyVal, pos);
      // remove wrapping escape char if present
      const handledKey = key && removeEscChar(key);
      const handledValue = value && removeEscChar(value);
      // add to keyValue object
      keyValue[handledKey] = handledValue;
    }
  // return parts
  return { nodepath: handledNodepath, keyValue };
}

function handleExprImport(expr: string, ctx: ResolveCtx): ImportExprParts {
  // get current position (used in error messages)
  const pos: [number, number] = ctx.range ? ctx.range : [0, 99999];
  // only trim for now (as we want to get part with $import)
  const data = expr.trim();
  // divide expression into parts, first part is <nodepath> and second is [key-value ...]
  const parts = divideExpression(data, pos, 2);
  const nodepathStr = parts[0]
    ?.replace("$import", "")
    ?.replace(START_WITH_DOT, "");
  const keyValueParts = parts.slice(1);
  // handle division of nodepath string into parts
  const nodepath = divideNodepath(nodepathStr, pos);
  const handledNodepath = nodepath.map(removeEscChar);
  // handle conversion of keyValue parts into an object
  const keyValue: Record<string, string> = {};
  if (keyValueParts)
    for (const keyVal of keyValueParts) {
      const [key, value] = divideKeyValue(keyVal, pos);
      // remove wrapping escape char if present
      const handledKey = key && removeEscChar(key);
      const handledValue = value && removeEscChar(value);
      // add to keyValue object
      keyValue[handledKey] = handledValue;
    }
  // return parts
  return { nodepath: handledNodepath, keyValue };
}

function handleExprLocal(expr: string, ctx: ResolveCtx): LocalExprParts {
  // get current position (used in error messages)
  const pos: [number, number] = ctx.range ? ctx.range : [0, 99999];
  // remove statring $local and trim, also remove dot if new string starts with a dot
  const data = expr.replace("$local", "").trim().replace(START_WITH_DOT, "");
  // get alias (first and only part)
  const parts = divideExpression(data, pos, 1);
  const alias = parts[0];
  if (!alias)
    throw new YAMLExprError(
      pos,
      "",
      "You should pass alias after '$local' expression, strcuture of local expression: $local.<alias>"
    );
  const handledAlias = removeEscChar(alias);
  return { alias: handledAlias };
}

function handleExprParam(expr: string, ctx: ResolveCtx): ParamExprParts {
  // get current position (used in error messages)
  const pos: [number, number] = ctx.range ? ctx.range : [0, 99999];
  // remove statring $param and trim, also remove dot if new string starts with a dot
  const data = expr.replace("$param", "").trim().replace(START_WITH_DOT, "");
  // get alias (first and only part)
  const parts = divideExpression(data, pos, 1);
  const alias = parts[0];
  if (!alias)
    throw new YAMLExprError(
      pos,
      "",
      "You should pass alias after '$param' expression, structure of local expression: $local.<alias>"
    );
  const handledAlias = removeEscChar(alias);
  return { alias: handledAlias };
}
