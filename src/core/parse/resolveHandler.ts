import { generateId, getClosingChar, isRecord, deepClone } from "../helpers.js";
import { divideNodepath } from "./tokiner/helpers.js";
import { Schema, Scalar, YAMLMap, YAMLSeq, Alias } from "yaml";
import { YAMLError, YAMLExprError } from "../extendClasses/error.js";
import {
  ModuleCache,
  ResolveCtx,
  HandledOptions,
  InternalParseExtend,
} from "../../types.js";
import {
  isMapExpr,
  isScalarExpr,
  isSeqExpr,
  isStringExpr,
} from "./expressions/checkExpr.js";
import { handleExpr } from "./expressions/index.js";

/**
 * Method to resolve blueprint into final load returned to user. works sync meaning any YAML file read or tag construct function execution is executed synchronously.
 * @param loadId - Load id generated to this load function execution.
 * @param opts - Options passed with this load function execution.
 * @returns Final load after resolving the blueprint, what is returned to the user after load functions finishes.
 */
export async function resolve(
  loadId: string,
  errors: YAMLError[],
  moduleCache: ModuleCache,
  opts: HandledOptions,
  parseFunc: InternalParseExtend
): Promise<{ parse: unknown; privateParse: unknown; errors: YAMLError[] }> {
  // generate id specific for this load
  const resolveId = generateId();

  // create anchors map and locals array
  const anchors = new Map();
  const locals: Record<string, unknown>[] = [];

  // create context for this resolve
  const ctx: ResolveCtx = {
    options: opts,
    loadId,
    resolveId,
    moduleCache,
    errors,
    anchors,
    locals,
    range: [0, 0],
    resolveFunc: resolveUnknown,
    parseFunc,
  };

  // resolve
  const privateParse = await resolveUnknown(moduleCache.AST, false, true, ctx);

  // remove private nodes
  const clonedLoad = deepClone(privateParse);
  const parse = filterPrivate(clonedLoad, ctx);

  //  and return value
  return { parse, privateParse, errors: ctx.errors };
}

/**
 * Method to resolve unkown value types by checking type and using appropriate specific resolver function. it's also the place where blueprintInstance is resolved. works sync.
 * @param item - Item of unkown type.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param allowExpr - Boolean to indicate if expressions should be resolved. used to block resolve of expressions inside node's keys.
 * @param ctx - Context object that holds data about this resolve.
 * @returns Value of the specific resolve function based on type.
 */
export async function resolveUnknown(
  item: Alias | Scalar | YAMLMap | YAMLSeq | unknown,
  anchored: boolean,
  allowExpr: boolean,
  ctx: ResolveCtx
): Promise<unknown> {
  if (item instanceof Alias) return resolveAlias(item, ctx);
  if (item instanceof YAMLSeq) return await resolveSeq(item, anchored, ctx);
  if (item instanceof YAMLMap) return await resolveMap(item, anchored, ctx);
  if (item instanceof Scalar)
    return await resolveScalar(item, anchored, allowExpr, ctx);
  if (typeof item === "string") return await resolveString(item, ctx);
  return item;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper methods.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function resolveString(str: string, ctx: ResolveCtx) {
  let out: unknown = str;
  const { isExpr, expr } = isStringExpr(str);
  if (isExpr) out = await handleExpr(expr, ctx);
  return out;
}

function resolveAlias(alias: Alias, ctx: ResolveCtx) {
  // update range
  if (alias.range) ctx.range = [alias.range[0], alias.range[1]];
  else ctx.range = undefined;
  // var to hold out value
  let out: unknown;
  // check if it's saved in aliases
  const present = ctx.anchors.has(alias.source);
  // resolve anchor
  if (present) out = ctx.anchors.get(alias.source);
  else
    ctx.errors.push(
      new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", "")
    );
  alias.resolvedValue = out;
  return out;
}

/**
 * Method to resolve string (scalar in YAML). works sync.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value of the resolved string (scalar in YAML).
 */
async function resolveScalar(
  scalar: Scalar,
  anchored: boolean,
  allowExpr: boolean,
  ctx: ResolveCtx
): Promise<unknown> {
  // update range
  if (scalar.range) ctx.range = [scalar.range[0], scalar.range[1]];
  else ctx.range = undefined;
  // var to hold out value
  let out: unknown;
  // Detect circular dep
  if (anchored && !scalar.resolved) {
    ctx.errors.push(
      new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", "")
    );
    return undefined;
  }
  // Handle value
  const { isExpr, expr } = isScalarExpr(scalar);
  if (isExpr && allowExpr) {
    out = await handleExpr(expr, ctx);
    if (out && typeof out === "object") out = JSON.stringify(out);
  } else out = await handleString(scalar.value as string, ctx);
  // handle tag if present
  if (scalar.tag) out = await resolveTag(scalar.value, scalar.tag, ctx);
  // handle anchor if present
  if (scalar.anchor) ctx.anchors.set(scalar.anchor, out);
  // mark it as resolved, save resolved value return it
  scalar.resolved = true;
  scalar.resolvedValue = out;
  return out;
}

/**
 * Method to resolve mappings. works sync.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
 * @returns Value of the resolved object (mapping in YAML).
 */
async function resolveMap(
  map: YAMLMap,
  anchored: boolean,
  ctx: ResolveCtx
): Promise<unknown> {
  // update range
  if (map.range) ctx.range = [map.range[0], map.range[1]];
  else ctx.range = undefined;
  // var to hold out value
  let out: unknown;
  if (anchored && !map.resolved) {
    ctx.errors.push(
      new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", "")
    );
    return undefined;
  }
  const { isExpr, expr, scalar } = isMapExpr(map);
  if (isExpr) {
    const val = await handleExpr(expr, ctx);
    if (val && typeof val === "object" && !Array.isArray(val)) out = val;
    else {
      ctx.errors.push(
        new YAMLExprError(
          ctx.range ? [...ctx.range] : [0, 99999],
          "",
          `Expression: ${expr} is wrapped inside {} but it's value is not a mapping.`
        )
      );
      out = undefined;
    }
    scalar.resolvedValue = out;
  } else {
    const res: Record<string, unknown> = {};
    for (const pair of map.items) {
      let hKey = await resolveUnknown(pair.key, anchored, false, ctx);
      let hVal = await resolveUnknown(pair.value, anchored, true, ctx);
      if (typeof hKey === "string") res[hKey] = hVal;
      else res[JSON.stringify(hKey)] = hVal;
    }
    out = res;
  }
  if (map.tag) out = await resolveTag(out, map.tag, ctx);
  if (map.anchor) ctx.anchors.set(map.anchor, out);
  map.resolved = true;
  map.resolvedValue = out;
  return out;
}

async function resolveSeq(seq: YAMLMap, anchored: boolean, ctx: ResolveCtx) {
  // update range
  if (seq.range) ctx.range = [seq.range[0], seq.range[1]];
  else ctx.range = undefined;
  // var to hold out value
  let out: unknown;
  if (anchored && !seq.resolved) {
    ctx.errors.push(
      new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", "")
    );
    return undefined;
  }
  const { isExpr, expr, scalar } = isSeqExpr(seq);
  if (isExpr) {
    const val = await handleExpr(expr, ctx);
    if (Array.isArray(val)) out = val;
    else {
      ctx.errors.push(
        new YAMLExprError(
          ctx.range ? [...ctx.range] : [0, 99999],
          "",
          `Expression: ${expr} is wrapped inside [] but it's value is not a sequence.`
        )
      );
      out = undefined;
    }
    scalar.resolvedValue = out;
  } else {
    let res: unknown[] = [];
    for (const item of seq.items) {
      const val = await resolveUnknown(item, anchored, true, ctx);
      res.push(val);
    }
    out = res;
  }
  if (seq.tag) out = await resolveTag(out, seq.tag, ctx);
  if (seq.anchor) ctx.anchors.set(seq.anchor, out);
  seq.resolved = true;
  seq.resolvedValue = out;
  return out;
}

async function resolveTag(
  data: unknown,
  tag: string,
  ctx: ResolveCtx
): Promise<unknown> {
  // get tag from schema
  const { options } = ctx;
  if (options.ignoreTags) return data;
  if (!(options.schema instanceof Schema)) {
    ctx.errors.push(
      new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", "")
    );
    return data;
  }
  const tags = options.schema.tags;

  // get matching tag from tags
  const matchTag = tags.find((t) => t.tag === tag);
  if (!matchTag || !matchTag.resolve) {
    ctx.errors.push(
      new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", "")
    );
    return data;
  }

  // execute tag's resolve
  try {
    const resTag = matchTag.resolve(
      // @ts-ignore
      data,
      (err) => {
        ctx.errors.push(
          new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", "")
        );
      },
      options
    );
    return resTag;
  } catch (err) {
    ctx.errors.push(
      new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", "")
    );
    return data;
  }
}

async function handleString(
  str: string,
  ctx: ResolveCtx
): Promise<string | undefined> {
  // if type is not string (e.g. number) return directly
  if (typeof str !== "string") return str;
  /** Var to hold out string. */
  let out: string = "";
  /** Var to hold loop index. */
  let i = 0;
  // start loop
  while (i < str.length) {
    // get character
    const ch = str[i];
    // if charachter is $ handle it
    if (ch === "$") {
      // escaped -> $${}
      if (str[i + 1] === "$" && str[i + 2] === "{") {
        out += "${"; // ad only one "$" to the out string
        i += 3; // skip the reset of the expression
        continue;
      }
      // non escaped -> ${}
      if (str[i + 1] === "{") {
        const end = getClosingChar(str, "{", "}", i + 2);
        if (end === -1) {
          ctx.errors.push(
            new YAMLExprError(
              ctx.range ? [...ctx.range] : [0, 99999],
              "",
              `String interpolation used without closing '}' in: ${str}`
            )
          );
          return undefined;
        }
        let val = await handleExpr(str.slice(i, end + 1), ctx);
        if (typeof val !== "string") val = JSON.stringify(val);
        out += val;
        i = end + 1;
        continue;
      }
    }
    // any other char just add it and increment index
    out += ch;
    i++;
  }
  return out;
}

/**
 * Method to filter private nodes from final load.
 * @param resolve - resolved value returned from resolve method.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Final value after removal or private items.
 */
function filterPrivate(resolve: unknown, ctx: ResolveCtx): unknown {
  // get private array
  const privateArr = ctx.moduleCache.directives.privateArr;

  // loop through private array to handle each path
  for (const priv of privateArr) {
    // get parts of the path
    const path = divideNodepath(priv, ctx.range ? ctx.range : [0, 99999]);

    // var that holds the resolve to transverse through it
    let node = resolve;
    for (let i = 0; i < path.length; i++) {
      // get current part of the path
      const p = path[i];

      // if it's not a record then path is not true and just console a warning
      if (!isRecord(node)) break;

      // in last iteraion delete the child based on the parent type
      if (path.length - 1 === i) {
        if (p in node) {
          if (Array.isArray(node)) node.splice(Number(p), 1);
          else delete node[p];
        }
        if (Array.isArray(node) && typeof p === "string") {
          const idx = node.indexOf(p);
          if (idx !== -1) node.splice(idx, 1);
        }

        continue;
      }

      // if item is present in node update it and continue
      if (p in node) {
        node = node[p];
        continue;
      }

      // only if node is an array then try matching using string value
      if (Array.isArray(node) && typeof p === "string") {
        const idx = node.indexOf(p);
        if (idx !== -1) {
          node = node[idx];
          continue;
        }
      }
    }
  }

  return resolve;
}
