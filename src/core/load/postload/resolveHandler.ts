import { WrapperYAMLException } from "../../../wrapperClasses/error.js";
import { Expression } from "./expressionsHandler.js";
import { TagResolveInstance } from "../lazyLoadClasses/tagResolveItem.js";
import type {
  DirectivesObj,
  HandledLoadOpts,
  ResolveCache,
  InternalLoad,
  InternalLoadAsync,
} from "../../../types.js";
import { BlueprintInstance } from "../lazyLoadClasses/blueprintItem.js";
import { generateId, getClosingChar } from "../../helpers.js";
import { tokenizer } from "../tokenizer.js";

/**
 * Class that handles resolving raw load, so signle raw load can be resolved to multiple final loads based on module params value.
 */
export class ResolveHandler {
  /**
   * Cache that holds resolve data for each resolve execution. it's keyed by concatinating loadId and resolved path (or random id if resolved path not passed). so each cache is
   * unique.
   */
  #resolveCache: ResolveCache = new Map();

  /** Class to handle interpolations resolving. */
  #exprHandler: Expression;

  /**
   * @param load - Reference to internalLoad function, so it can be used in $import interpolation. passed like this to avoid circular dependency.
   * @param loadAsync - Reference to internalLoadAsync function, so it can be used in $import interpolation. passed like this to avoid circular dependency.
   */
  constructor(load: InternalLoad, loadAsync: InternalLoadAsync) {
    // create interpolation class to handle interpolations while resolving.
    this.#exprHandler = new Expression(
      this.#resolveCache,
      this.#resolveUnknown.bind(this),
      this.#resolveUnknownAsync.bind(this),
      load,
      loadAsync
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Main methods.
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Method to create blueprint from raw load by looping through it and replacing any scalar or interpolation by BlueprintInstance class that store there value and return them when needed.
   * @param rawLoad - Raw load from js-yaml execution.
   * @returns Blueprint that can be resolved to final loads.
   */
  createBlueprint(rawLoad: unknown): unknown {
    // if tag resolve item return it directly
    if (rawLoad instanceof TagResolveInstance) return rawLoad;

    // if array generate similar array and all values go through emptyCopy method as well
    if (Array.isArray(rawLoad)) {
      // check if it's syntaxt [$val]
      if (this.#exprHandler.isExprSequence(rawLoad))
        return new BlueprintInstance(rawLoad);

      // otherwise handle as normal array
      const out: unknown[] = [];
      for (const v of rawLoad) out.push(this.createBlueprint(v));
      return out;
    }

    // if object generate object of similar keys and all values go through emptyCopy method as well
    if (rawLoad && typeof rawLoad === "object") {
      // convert to interies
      const enteries = Object.entries(rawLoad);

      // check if it's syntaxt {$val}
      if (this.#exprHandler.isExprMapping(enteries))
        return new BlueprintInstance(rawLoad);

      // otherwise handle as normal object
      const out: Record<any, unknown> = {};
      for (const [k, v] of enteries) {
        out[k] = this.createBlueprint(v);
      }
      return out;
    }

    // otherwise return blueprint item
    return new BlueprintInstance(rawLoad);
  }

  /**
   * Method to resolve blueprint into final load returned to user. works sync meaning any YAML file read or tag construct function execution is executed synchronously.
   * @param path - Resolved path of the module.
   * @param blueprint - Blueprint of the module.
   * @param directivesObj - Directives object of the module.
   * @param paramsVal - Params value passed with this load function execution.
   * @param loadId - Load id generated to this load function execution.
   * @param opts - Options passed with this load function execution.
   * @returns Final load after resolving the blueprint, what is returned to the user after load functions finishes.
   */
  resolve(
    path: string | undefined,
    blueprint: unknown,
    directivesObj: DirectivesObj,
    paramsVal: Record<string, string>,
    loadId: string,
    opts: HandledLoadOpts
  ): unknown {
    // generate id by concatinating loadId with resolved path or random id to uniquely identify this resolve
    const id = `${loadId}_${path ?? generateId()}`;

    // add execution cache data
    this.#resolveCache.set(id, {
      path,
      ...directivesObj,
      blueprint,
      paramsVal,
      localsVal: [],
      opts,
    });

    // start actual handling
    try {
      // resolve
      const resolved = this.#resolveUnknown(blueprint, id, false);
      // remove private and return value
      return this.#filterPrivate(resolved, id);
    } finally {
      this.#resolveCache.delete(id);
    }
  }

  /**
   * Method to resolve blueprint into final load returned to user. works ssync meaning any YAML file read or tag construct function execution is executed asynchronously.
   * @param path - Resolved path of the module.
   * @param blueprint - Blueprint of the module.
   * @param directivesObj - Directives object of the module.
   * @param paramsVal - Params value passed with this load function execution.
   * @param loadId - Load id generated to this load function execution.
   * @param opts - Options passed with this load function execution.
   * @returns Final load after resolving the blueprint, what is returned to the user after load functions finishes.
   */
  async resolveAsync(
    path: string | undefined,
    blueprint: unknown,
    directivesObj: DirectivesObj,
    paramsVal: Record<string, string>,
    loadId: string,
    opts: HandledLoadOpts
  ): Promise<unknown> {
    // generate id by concatinating loadId with resolved path or random id to uniquely identify this resolve
    const id = `${loadId}_${path ?? generateId()}`;

    // add execution cache data
    this.#resolveCache.set(id, {
      path,
      ...directivesObj,
      blueprint,
      paramsVal,
      localsVal: [],
      opts,
    });

    // start actual handling
    try {
      // resolve
      const resolved = await this.#resolveUnknownAsync(blueprint, id, false);
      // remove private and return value
      return this.#filterPrivate(resolved, id);
    } finally {
      this.#resolveCache.delete(id);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Helper methods.
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Method to resolve unkown value types by checking type and using appropriate specific resolver function. it's also the place where blueprintItem is resolved. works sync.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
   * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
   * @returns Value of the specific resolve function based on type.
   */
  #resolveUnknown(
    val: unknown,
    id: string,
    anchored: boolean,
    path?: string[]
  ): unknown {
    /** Var to hold value. */
    let rawVal = val;

    // if val is BlueprintInstance handle it (get rawValue from it and check resolve)
    if (val instanceof BlueprintInstance) {
      // get raw value
      rawVal = val.rawValue;
      // if read is anchor and BlueprintInstance not resolved yet throw
      if (anchored && !val.resolved)
        throw new WrapperYAMLException(
          `Tried to access ${
            path ? path.join(".") : "value"
          } before intialization.`
        );
    }

    // handle raw value resolve at the end
    try {
      // handle value according to its type
      if (typeof rawVal === "string") return this.#resolveString(rawVal, id);
      if (typeof rawVal !== "object" || rawVal == null) return rawVal;
      if (rawVal instanceof TagResolveInstance)
        return this.#resolveTag(rawVal, id, anchored, path);
      if (Array.isArray(rawVal))
        return this.#resolveArray(rawVal, id, anchored, path);
      return this.#resolveObject(rawVal, id, anchored, path);
    } finally {
      if (val instanceof BlueprintInstance) val.resolved = true;
    }
  }

  /**
   * Method to resolve unkown value types by checking type and using appropriate specific resolver function. it's also the place where blueprintItem is resolved. works async.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
   * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
   * @returns Value of the specific resolve function based on type.
   */
  async #resolveUnknownAsync(
    val: unknown,
    id: string,
    anchored: boolean,
    path?: string[]
  ): Promise<unknown> {
    /** Var to hold value. */
    let rawVal = val;

    // if val is BlueprintInstance handle it (get rawValue from it and check resolve)
    if (val instanceof BlueprintInstance) {
      // get raw value
      rawVal = val.rawValue;
      // if read is anchor and BlueprintInstance not resolved yet throw
      if (anchored && !val.resolved)
        throw new WrapperYAMLException(
          `Tried to access ${
            path ? path.join(".") : "value"
          } before intialization.`
        );
    }

    // handle raw value resolve at the end
    try {
      // handle value according to its type
      if (typeof rawVal === "string")
        return await this.#resolveStringAsync(rawVal, id);
      if (typeof rawVal !== "object" || rawVal === null) return rawVal;
      if (rawVal instanceof TagResolveInstance)
        return await this.#resolveTagAsync(rawVal, id, anchored, path);
      if (Array.isArray(rawVal))
        return await this.#resolveArrayAsync(rawVal, id, anchored, path);
      return await this.#resolveObjectAsync(rawVal, id, anchored, path);
    } finally {
      if (val instanceof BlueprintInstance) val.resolved = true;
    }
  }

  /**
   * Method to resolve objects (mapping in YAML). works sync.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
   * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
   * @returns Value of the resolved object (mapping in YAML).
   */
  #resolveObject(
    obj: object,
    id: string,
    anchored: boolean,
    path?: string[]
  ): object {
    // resolve all the enteries of the original blue print
    const newObj: Record<string, any> = { ...obj };
    const enteries = Object.entries(newObj);

    // if empty return empty object
    if (enteries.length === 0) return {};

    // check if it's syntaxt {$val}
    const intMapping = this.#exprHandler.handleExprMapping(enteries, id);
    if (intMapping) {
      if (
        typeof intMapping !== "object" ||
        intMapping == null ||
        Array.isArray(intMapping)
      )
        throw new WrapperYAMLException(
          `Interpolation: ${enteries[0][0]} is wrapped inside {} but it's value is not a mapping.`
        );
      return intMapping;
    }

    // loop enteries
    for (const [key, val] of enteries) {
      // prettier-ignore
      const exprMapping = this.#exprHandler.handleNestedExprMapping(key, val, id);
      if (exprMapping) {
        delete newObj[key];
        // prettier-ignore
        if (typeof exprMapping !== "object" || exprMapping == null || Array.isArray(exprMapping))
          throw new WrapperYAMLException(`Expression: ${key} is wrapped inside {} but it's value is not a mapping.`);
        for (const [key, val] of Object.entries(exprMapping)) newObj[key] = val;
        continue;
      }
      newObj[key] = this.#resolveUnknown(val, id, anchored, path);
    }

    return newObj;
  }

  /**
   * Method to resolve objects (mapping in YAML). works async.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
   * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
   * @returns Value of the resolved object (mapping in YAML).
   */
  async #resolveObjectAsync(
    obj: object,
    id: string,
    anchored: boolean,
    path?: string[]
  ): Promise<object> {
    // resolve all the enteries of the original blue print
    const newObj: Record<string, any> = { ...obj };
    const enteries = Object.entries(newObj);

    // if empty return empty object
    if (enteries.length === 0) return {};

    // check if it's syntaxt {$val}
    const exprMapping = await this.#exprHandler.handleExprMappingAsync(
      enteries,
      id
    );

    if (exprMapping) {
      if (
        typeof exprMapping !== "object" ||
        exprMapping == null ||
        Array.isArray(exprMapping)
      )
        throw new WrapperYAMLException(
          `Expression: ${enteries[0][0]} is wrapped inside {} but it's value is not a mapping.`
        );
      return exprMapping;
    }

    // loop enteries
    for (const [key, val] of enteries) {
      // prettier-ignore
      const exprMapping = await this.#exprHandler.handleNestedExprMappingAsync(key, val, id);
      if (exprMapping) {
        delete newObj[key];
        // prettier-ignore
        if (typeof exprMapping !== "object" || exprMapping == null || Array.isArray(exprMapping))
          throw new WrapperYAMLException(`Expression: ${key} is wrapped inside {} but it's value is not a mapping.`);
        for (const [key, val] of Object.entries(exprMapping)) newObj[key] = val;
        continue;
      }
      newObj[key] = await this.#resolveUnknownAsync(val, id, anchored, path);
    }

    return newObj;
  }

  /**
   * Method to resolve arrays (sequence in YAML). works sync.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
   * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
   * @returns Value of the resolved arrays (sequence in YAML).
   */
  #resolveArray(
    arr: any[],
    id: string,
    anchored: boolean,
    path?: string[]
  ): unknown[] {
    // resolve all the items of the original blue print
    const newArr = [...arr];

    // check if it's syntaxt [$val]
    const intSequence = this.#exprHandler.handleExprSequence(newArr, id);
    if (intSequence)
      return Array.isArray(intSequence) ? intSequence : [intSequence];

    // handle all the values in the array
    for (let i = 0; i < newArr.length; i++)
      newArr[i] = this.#resolveUnknown(newArr[i], id, anchored, path);

    // return new array
    return newArr;
  }

  /**
   * Method to resolve arrays (sequence in YAML). works async.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
   * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
   * @returns Value of the resolved arrays (sequence in YAML).
   */
  async #resolveArrayAsync(
    arr: any[],
    id: string,
    anchored: boolean,
    path?: string[]
  ): Promise<unknown[]> {
    // resolve all the items of the original blue print
    const newArr = [...arr];

    // check if it's syntaxt [$val]
    const exprSequence = await this.#exprHandler.handleExprSequenceAsync(
      newArr,
      id
    );
    if (exprSequence)
      return Array.isArray(exprSequence) ? exprSequence : [exprSequence];

    // handle all the values in the array
    for (let i = 0; i < newArr.length; i++)
      newArr[i] = await this.#resolveUnknownAsync(
        newArr[i],
        id,
        anchored,
        path
      );

    // return new array
    return newArr;
  }

  /**
   * Method to resolve string (scalar in YAML). works sync.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value of the resolved string (scalar in YAML).
   */
  #resolveString(str: string, id: string): string {
    // check if it's syntaxt $val
    const intScaler = this.#exprHandler.handleExprScalar(str, id);
    if (intScaler) return intScaler;

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
          if (end === -1)
            throw new WrapperYAMLException(
              `String interpolation used without closing '}' in: ${str}`
            );
          const val = this.#exprHandler.resolve(str.slice(i, end + 1), id);
          const stringifiedVal =
            typeof val === "string" ? val : JSON.stringify(val);
          out += stringifiedVal;
          i = end + 1;
          continue;
        }
      }

      // any other char just add it and increment index
      out += ch;
      i++;
    }

    // return out string
    return out;
  }

  /**
   * Method to resolve string (scalar in YAML). works async.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value of the resolved string (scalar in YAML).
   */
  async #resolveStringAsync(str: string, id: string): Promise<string> {
    // check if it's syntaxt $val
    const exprScaler = await this.#exprHandler.handleExprScalarAsync(str, id);
    if (exprScaler) return exprScaler;

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
          if (end === -1)
            throw new WrapperYAMLException(
              `String interpolation used without closing '}' in: ${str}`
            );
          const val = await this.#exprHandler.resolveAsync(
            str.slice(i, end + 1),
            id
          );
          const stringifiedVal =
            typeof val === "string" ? val : JSON.stringify(val);
          out += stringifiedVal;
          i = end + 1;
          continue;
        }
      }

      // any other char just add it and increment index
      out += ch;
      i++;
    }

    // return out string
    return out;
  }

  /**
   * Method to resolve tags. it uses resolveUnkown to resolve data passed to the tag and resolveString to resolve params passed and then execute construct function. works sync.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
   * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
   * @returns Value of the resolved tag.
   */
  #resolveTag(
    resolveItem: TagResolveInstance,
    id: string,
    anchored: boolean,
    path?: string[]
  ): unknown {
    // handle data and params (data's type is unkown but params type is string)
    const resolvedData = this.#resolveUnknown(
      resolveItem.data,
      id,
      anchored,
      path
    );
    const resolvedParams =
      resolveItem.params && this.#resolveString(resolveItem.params, id);

    // save resolved values in the tag resolve instance
    resolveItem.data = resolvedData;
    resolveItem.params = resolvedParams;

    // execute the constructor function
    const value = resolveItem.resolve();
    return value;
  }

  /**
   * Method to resolve tags. it uses resolveUnkown to resolve data passed to the tag and resolveString to resolve params passed and then execute construct function. works async.
   * @param val - Unknown value.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
   * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
   * @returns Value of the resolved tag.
   */
  async #resolveTagAsync(
    resolveItem: TagResolveInstance,
    id: string,
    anchored: boolean,
    path?: string[]
  ): Promise<unknown> {
    // handle data and params (data's type is unkown but params type is string)
    const resolvedData = await this.#resolveUnknownAsync(
      resolveItem.data,
      id,
      anchored,
      path
    );
    const resolvedParams =
      resolveItem.params &&
      (await this.#resolveStringAsync(resolveItem.params, id));

    // save resolved values in the tag resolve instance
    resolveItem.data = resolvedData;
    resolveItem.params = resolvedParams;

    // execute the constructor function
    const value = await resolveItem.resolveAsync();
    return value;
  }

  /**
   * Method to filter private nodes from final load.
   * @param resolve - resolved value returned from resolve method.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Final value after removal or private items.
   */
  #filterPrivate(resolve: unknown, id: string): unknown {
    // get private arr
    const privateArr = this.#resolveCache.get(id)?.privateArr;
    if (!privateArr) return resolve;

    // loop through private array to handle each path
    for (const priv of privateArr) {
      // get parts of the path
      const path = tokenizer.divideNodepath(priv);

      // var that holds the resolve to transverse through it
      let node = resolve;
      for (let i = 0; i < path.length; i++) {
        // get current part of the path
        const p = path[i];

        // if it's not a record then path is not true and just console a warning
        if (!this.#isRecord(node)) break;

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

  /**
   * Method to check if value is an array or object (record that can contains other primative values).
   * @param val - Value that will be checked.
   * @returns Boolean that indicates if value is a record or not.
   */
  #isRecord(val: unknown): val is Record<string, unknown> {
    return typeof val === "object" && val !== null;
  }
}
