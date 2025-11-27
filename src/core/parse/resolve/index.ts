import { isRecord, stringify } from "../utils/random.js";
import { Schema, Scalar, YAMLMap, YAMLSeq, Alias } from "yaml";
import { YAMLExprError } from "../../extendClasses/error.js";
import { ModuleCache, ParseState, TempParseState } from "../parseTypes.js";
import { getPrivate } from "../tokenizerParser/directives/index.js";
import { handleScalar } from "../tokenizerParser/scalar/index.js";

/**
 * Method to resolve blueprint into final load returned to user. works sync meaning any YAML file read or tag construct function execution is executed synchronously.
 * @param loadId - Load id generated to this load function execution.
 * @param opts - Options passed with this load function execution.
 * @returns Final load after resolving the blueprint, what is returned to the user after load functions finishes.
 */
export async function resolve(
  state: ParseState,
  tempState: TempParseState,
  cache: ModuleCache
): Promise<unknown> {
  // resolve
  const parse = await resolveUnknown(cache.AST, false, state, tempState);

  // remove private nodes if set to do so only
  const ignorePrivate = tempState.options.ignorePrivate && state.depth === 1;
  if (!ignorePrivate) filterPrivate(parse, tempState, cache);

  //  and return value
  return parse;
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
  item: unknown,
  anchored: boolean,
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  if (item instanceof Alias) return resolveAlias(item, tempState);
  if (item instanceof YAMLSeq)
    return await resolveSeq(item, anchored, state, tempState);
  if (item instanceof YAMLMap)
    return await resolveMap(item, anchored, state, tempState);
  if (item instanceof Scalar)
    return await resolveScalar(item, anchored, state, tempState);

  return item;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper methods.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function resolveAlias(alias: Alias, tempState: TempParseState) {
  // update range
  if (alias.range) tempState.range = [alias.range[0], alias.range[1]];
  else tempState.range = [0, 99999];
  // var to hold out value
  let out: unknown;
  // check if it's saved in aliases
  const present = tempState.anchors.has(alias.source);
  // resolve anchor
  if (present) out = tempState.anchors.get(alias.source);
  else
    tempState.errors.push(
      new YAMLExprError(
        tempState.range,
        "",
        "No anchor is defined yet for this alias."
      )
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
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  // update range
  if (scalar.range) tempState.range = [scalar.range[0], scalar.range[1]];
  else tempState.range = [0, 99999];
  // Detect circular dependency
  if (anchored && !scalar.resolved) {
    tempState.errors.push(
      new YAMLExprError(
        tempState.range,
        "",
        "Tried to access node before being defined."
      )
    );
    return undefined;
  }
  // Handle value
  if (typeof scalar.value !== "string") return scalar.value;
  let out: unknown = await handleScalar(scalar.value, scalar, state, tempState);
  // handle tag if present
  if (scalar.tag) out = await resolveTag(scalar.value, scalar.tag, tempState);
  // handle anchor if present
  if (scalar.anchor) tempState.anchors.set(scalar.anchor, out);
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
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  // update range
  if (map.range) tempState.range = [map.range[0], map.range[1]];
  else tempState.range = [0, 99999];
  // var to hold out value
  if (anchored && !map.resolved) {
    tempState.errors.push(
      new YAMLExprError(
        tempState.range,
        "",
        "Tried to access node before being defined."
      )
    );
    return undefined;
  }
  // handle value
  let res: Record<string, unknown> = {};
  for (const pair of map.items) {
    let hKey = await resolveUnknown(pair.key, anchored, state, tempState);
    let hVal = await resolveUnknown(pair.value, anchored, state, tempState);
    res[stringify(hKey, true)] = hVal;
  }
  let out: unknown = res; // just to avoid ts errors
  if (map.tag) out = await resolveTag(out, map.tag, tempState);
  if (map.anchor) tempState.anchors.set(map.anchor, out);
  map.resolved = true;
  map.resolvedValue = out;
  return out;
}

async function resolveSeq(
  seq: YAMLMap,
  anchored: boolean,
  state: ParseState,
  tempState: TempParseState
) {
  // update range
  if (seq.range) tempState.range = [seq.range[0], seq.range[1]];
  else tempState.range = [0, 99999];
  // check resolve status
  if (anchored && !seq.resolved) {
    tempState.errors.push(
      new YAMLExprError(
        tempState.range,
        "",
        "Tried to access node before being defined."
      )
    );
    return undefined;
  }
  let res: unknown[] = [];
  for (const item of seq.items)
    res.push(await resolveUnknown(item, anchored, state, tempState));
  let out: unknown = res; // just to avoid ts errors
  if (seq.tag) out = await resolveTag(out, seq.tag, tempState);
  if (seq.anchor) tempState.anchors.set(seq.anchor, out);
  seq.resolved = true;
  seq.resolvedValue = out;
  return out;
}

async function resolveTag(
  data: unknown,
  tag: string,
  tempState: TempParseState
): Promise<unknown> {
  // get tag from schema
  const { options } = tempState;
  if (options.ignoreTags) return data;
  if (!(options.schema instanceof Schema)) {
    tempState.errors.push(
      new YAMLExprError(
        tempState.range,
        "",
        "No schema is defined to handle tags."
      )
    );
    return data;
  }
  const tags = options.schema.tags;

  // get matching tag from tags
  const matchTag = tags.find((t) => t.tag === tag);
  if (!matchTag || !matchTag.resolve) {
    tempState.errors.push(
      new YAMLExprError(
        tempState.range,
        "",
        "This tag is not found in the schema."
      )
    );
    return data;
  }

  // execute tag's resolve
  try {
    const resTag = matchTag.resolve(
      // @ts-ignore
      data,
      (err) => {
        tempState.errors.push(
          new YAMLExprError(
            tempState.range,
            "",
            `Error while resolving tag: ${err}.`
          )
        );
      },
      options
    );
    return resTag;
  } catch (err) {
    tempState.errors.push(
      new YAMLExprError(
        tempState.range,
        "",
        `Unkown error while resolving tag: ${err}.`
      )
    );
    return data;
  }
}

/**
 * Method to filter private nodes from final load.
 * @param resolve - resolved value returned from resolve method.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Final value after removal or private items.
 */
function filterPrivate(
  parse: unknown,
  tempState: TempParseState,
  cache: ModuleCache
): void {
  // get private array
  const privateObj = getPrivate(cache.directives.private, true, true);

  // loop through private array to handle each path
  for (const [pathStr, { pathParts, token, dirToken }] of Object.entries(
    privateObj
  )) {
    // var that holds the resolve to transverse through it
    let node = parse;
    for (let i = 0; i < pathParts.length; i++) {
      // get current part of the path
      const p = pathParts[i];

      // if it's not a record then path is not true
      if (!isRecord(node)) {
        // create error
        const error = new YAMLExprError(
          [token.pos.start, token.pos.end],
          "",
          `Path: ${pathStr} is not present in target YAML tree.`
        );
        // push error into directive token, directives object and overall errors
        dirToken.errors.push(error);
        cache.directives.errors.push(error);
        tempState.errors.push(error);
        break;
      }

      // in last iteraion delete the child based on the parent type
      if (pathParts.length - 1 === i) {
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
}
