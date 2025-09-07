import { WrapperYAMLException } from "../../../wrapperClasses/error.js";
import {
  ResolveCache,
  InternalLoad,
  InternalLoadAsync,
  ParamExprParts,
  LocalExprParts,
  ImportExprParts,
  ThisExprParts,
} from "../../../types.js";
import { BlueprintInstance } from "../lazyLoadClasses/blueprintItem.js";
import { ImportHandler } from "./import.js";
import { tokenizer } from "../tokenizer.js";

/** Message that will be sent if an error occured during resolving that should not happen. */
const BUG_MESSAGE = `Error while resolving, contact us about this error as it's most propably a bug.`;

/**
 * Class to handle resolving and handling of interpolations in YAML text.
 */
export class Expression {
  /** Reference to resolve cache of parent resolveHandler class. */
  #resolveCache: ResolveCache;

  /** Reference to resolveUnknown method of parent resolveHandler class. */
  #resolveUnknown: (
    val: unknown,
    id: string,
    anchored: boolean,
    path?: string[]
  ) => unknown;

  /** Reference to resolveUnknownAsync method of parent resolveHandler class. */
  #resolveUnknownAsync: (
    val: unknown,
    id: string,
    anchored: boolean,
    path?: string[]
  ) => unknown;

  /** Class to handle imports. */
  #importHandler: ImportHandler;

  /**
   * @param resolveCache - Reference to resolve cache of parent resolveHandler class.
   * @param resolveUnknown - Reference to resolveUnknown method of parent resolveHandler class. passed like this to avoid circular dependency.
   * @param resolveUnknownAsync - Reference to resolveUnknownAsync method of parent resolveHandler class. passed like this to avoid circular dependency.
   * @param load - Reference to internalLoad function, so it can be used in $import expression. passed like this to avoid circular dependency.
   * @param loadAsync - Reference to internalLoadAsync function, so it can be used in $import expression. passed like this to avoid circular dependency.
   */
  constructor(
    resolveCache: ResolveCache,
    resolveUnknown: (
      val: unknown,
      id: string,
      anchored: boolean,
      path?: string[]
    ) => unknown,
    resolveUnknownAsync: (
      val: unknown,
      id: string,
      anchored: boolean,
      path?: string[]
    ) => unknown,
    load: InternalLoad,
    loadAsync: InternalLoadAsync
  ) {
    this.#importHandler = new ImportHandler(load, loadAsync);
    this.#resolveCache = resolveCache;
    this.#resolveUnknown = resolveUnknown;
    this.#resolveUnknownAsync = resolveUnknownAsync;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Methods to handle expression check and resolve by calling resolving methods.
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Method to check if mapping (object) in raw load is actaully mapping expression. mapping interpolations are defined with this structure in YAML file: { $<int> }
   * which is pared by js-yaml to: { $<int>: null }. so it actally check if it's a one key object and the key is valid expression syntax with value null.
   * @param ent - Enteries of checked object.
   * @returns Boolean that indicate if it's an expression or not.
   */
  isExprMapping(ent: [string, unknown][]): boolean {
    return ent.length === 1 && this.#isIntNode(ent[0][0]) && ent[0][1] == null;
  }

  /**
   * Method to check if sequence (array) in raw load is actaully sequence expression. sequence interpolations are defined with this structure in YAML file: [ $<int> ]
   * which is pared by js-yaml to: [ $<int> ]. so it actally check if it's a one item array and the this item is valid expression syntax.
   * @param arr - Array that will be checked.
   * @returns Boolean that indicate if it's an expression or not.
   */
  isExprSequence(arr: unknown[]): boolean {
    return arr.length === 1 && this.#isIntNode(arr[0]);
  }

  /**
   * Method to check if scalar (string) in raw load is actaully scalar expression. scalar interpolations are defined with this structure in YAML file: $<int>
   * which is pared by js-yaml to: $<int>. so it actally check if the string is valid expression syntax.
   * @param str - string that will be checked.
   * @returns Boolean that indicate if it's an expression or not.
   */
  isExprScalar(str: string): boolean {
    return this.#isIntNode(str);
  }

  /**
   * Method to handle mapping interpolations by resolving value if it was indeed mapping expression, if it wasn't udnefined is returned instead. works sync.
   * @param ent - Enteries of handled object.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Resolved value of mapping expression.
   */
  handleExprMapping(ent: [string, unknown][], id: string): unknown | undefined {
    if (this.isExprMapping(ent)) {
      const val = this.resolve(ent[0][0], id);
      return val;
    }
  }

  /**
   * Method to handle nested mapping interpolations by resolving value if it was mapping expression, if it wasn't undefined is returned instead. works sync.
   * @param key - Key of the object.
   * @param val - Value of the object.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Resolved value of mapping expression.
   */
  handleNestedExprMapping(
    key: string,
    val: unknown,
    id: string
  ): unknown | undefined {
    if (val instanceof BlueprintInstance) val = val.rawValue;
    if (this.#isIntNode(key) && val == null) {
      const value = this.resolve(key, id);
      return value;
    }
  }

  /**
   * Method to handle nested mapping interpolations by resolving value if it was mapping expression, if it wasn't undefined is returned instead. works async.
   * @param key - Key of the object.
   * @param val - Value of the object.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Resolved value of mapping expression.
   */
  async handleNestedExprMappingAsync(key: string, val: unknown, id: string) {
    if (val instanceof BlueprintInstance) val = val.rawValue;
    if (this.#isIntNode(key) && val == null) {
      const value = await this.resolveAsync(key, id);
      return value;
    }
  }

  /**
   * Method to handle mapping interpolations by resolving value if it was indeed mapping expression, if it wasn't udnefined is returned instead. works async.
   * @param ent - Enteries of handled object.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Resolved value of mapping expression.
   */
  async handleExprMappingAsync(
    ent: [string, unknown][],
    id: string
  ): Promise<unknown | undefined> {
    if (this.isExprMapping(ent)) {
      const val = await this.resolveAsync(ent[0][0], id);
      return val;
    }
  }

  /**
   * Method to handle sequence interpolations by resolving value if it was indeed sequence expression, if it wasn't udnefined is returned instead. works sync.
   * @param arr - Array that will be handled.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Resolved value of sequence expression.
   */
  handleExprSequence(arr: unknown[], id: string): unknown | undefined {
    if (this.isExprSequence(arr)) {
      const val = this.resolve(arr[0] as string, id);
      return val;
    }
  }

  /**
   * Method to handle sequence interpolations by resolving value if it was indeed sequence expression, if it wasn't udnefined is returned instead. works async.
   * @param arr - Array that will be handled.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Resolved value of resolving expression.
   */
  async handleExprSequenceAsync(
    arr: unknown[],
    id: string
  ): Promise<unknown | undefined> {
    if (this.isExprSequence(arr)) {
      const val = await this.resolveAsync(arr[0] as string, id);
      return val;
    }
  }

  /**
   * Method to handle scalar interpolations by resolving value if it was indeed scalar expression, if it wasn't udnefined is returned instead. works sync.
   * @param str - string that will be handled.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Resolved value of scalar expression.
   */
  handleExprScalar(str: string, id: string): string | undefined {
    if (this.isExprScalar(str)) {
      const val = this.resolve(str, id);
      if (val && typeof val === "object") return JSON.stringify(val);
      else return val as string;
    }
  }

  /**
   * Method to handle scalar interpolations by resolving value if it was indeed scalar expression, if it wasn't udnefined is returned instead. works async.
   * @param str - string that will be handled.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Resolved value of scalar expression.
   */
  async handleExprScalarAsync(
    str: string,
    id: string
  ): Promise<string | undefined> {
    if (this.isExprScalar(str)) {
      const val = await this.resolveAsync(str, id);
      if (val && typeof val === "object") return JSON.stringify(val);
      else return val as string;
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Methods to handle expression resolve.
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Method to resolve interpolations. works sync.
   * @param expr - Expression that will be handled.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value returned from expression resolve.
   */
  resolve(expr: string, id: string): unknown {
    const exprData = tokenizer.handleExpression(expr);
    if (!exprData)
      throw new WrapperYAMLException(
        `Invalid type in expression: ${expr} defined types are: 'this' , 'import', 'param' and 'local'`
      );

    // destructure expression data
    const { type, parts } = exprData;

    // handle expression according to base
    switch (type) {
      case "this":
        return this.#handleThisExpr(parts as ThisExprParts, id);
      case "import":
        return this.#handleImpExpr(parts as ImportExprParts, id);
      case "param":
        return this.#handleParamExpr(parts as ParamExprParts, id);
      case "local":
        return this.#handleLocalExpr(parts as LocalExprParts, id);
    }
  }

  /**
   * Method to resolve interpolations. works async.
   * @param int - Interpolation that will be handled.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value returned from expression resolve.
   */
  async resolveAsync(expr: string, id: string) {
    // if expression is in interpolation syntax: ${expr} remove the wrapping {}
    if (expr.startsWith("${")) expr = "$" + expr.slice(2, expr.length - 1);

    const exprData = tokenizer.handleExpression(expr);
    if (!exprData)
      throw new WrapperYAMLException(
        `Invalid type in expression: ${expr} defined types are: 'this' , 'import', 'param' and 'local'`
      );

    // destructure expression data
    const { type, parts } = exprData;

    // handle expression according to base
    switch (type) {
      case "this":
        return await this.#handleThisExprAsync(parts as ThisExprParts, id);
      case "import":
        return await this.#handleImpExprAsync(parts as ImportExprParts, id);
      case "param":
        return this.#handleParamExpr(parts as ParamExprParts, id);
      case "local":
        return this.#handleLocalExpr(parts as LocalExprParts, id);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Helper methods
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Method to handle 'this' expression. works sync.
   * @param exprPath - Main metadata passed in the expression.
   * @param payload - Additional metadata passed after expression.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value from resolving the expression.
   */
  #handleThisExpr(parts: ThisExprParts, id: string): unknown {
    // destrcture parts
    const { nodepath, keyValue: localsVal } = parts;

    // get cache
    const cache = this.#resolveCache.get(id);
    if (!cache) throw new WrapperYAMLException(BUG_MESSAGE);

    // get needed cache data
    const { blueprint } = cache;

    // update local values
    cache.localsVal.push(localsVal);

    try {
      // read node and return value
      return this.#traverseNodes(blueprint, nodepath, id);
    } finally {
      // remove added localVals
      cache.localsVal.pop();
    }
  }

  /**
   * Method to handle 'this' expression. works async.
   * @param exprPath - Main metadata passed in the expression.
   * @param payload - Additional metadata passed after expression.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value from resolving the expression.
   */
  async #handleThisExprAsync(
    parts: ThisExprParts,
    id: string
  ): Promise<unknown> {
    // destrcture parts
    const { nodepath, keyValue: localsVal } = parts;

    // get cache
    const cache = this.#resolveCache.get(id);
    if (!cache) throw new WrapperYAMLException(BUG_MESSAGE);

    // get needed cache data
    const { blueprint } = cache;

    // update local values
    cache.localsVal.push(localsVal);
    try {
      // read node and return value
      return await this.#traverseNodesAsync(blueprint, nodepath, id);
    } finally {
      // remove added localVals
      cache.localsVal.pop();
    }
  }

  /**
   * Method to handle 'import' expression. works sync.
   * @param exprPath - Main metadata passed in the expression.
   * @param payload - Additional metadata passed after expression.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value from resolving the expression.
   */
  #handleImpExpr(parts: ImportExprParts, id: string): unknown {
    // destrcture parts
    const { nodepath: aliasWithPath, keyValue: paramsVal } = parts;

    // get cache
    const cache = this.#resolveCache.get(id);
    if (!cache) throw new WrapperYAMLException(BUG_MESSAGE);

    // get needed cache data
    const { importsMap, path, opts } = cache;

    // if no path supplied (which occurs only it the root load() by user) throw error that asks user to add filepath if he wants to use imports
    if (!path)
      throw new WrapperYAMLException(
        `You need to define filepath in options if you want to use imports.`
      );

    // get alias and node path from expr path
    const alias = aliasWithPath[0];
    const nodepath = aliasWithPath.slice(1);

    // use imports map to get path and defualt params of this import
    const impData = importsMap.get(alias);
    if (!impData)
      throw new WrapperYAMLException(
        `Alias used in import expression: '${aliasWithPath}' is not defined in directives.`
      );
    const { paramsVal: defParamsVal, path: targetPath } = impData;

    // merge default with defined params
    const finalParams = { ...defParamsVal, ...paramsVal };

    // import file
    const load = this.#importHandler.import(
      path,
      targetPath,
      finalParams,
      opts,
      id.split("_")[0] // get loadId from id back
    );

    // traverse load using nodepath and return value
    return this.#traverseNodes(load, nodepath, id);
  }

  /**
   * Method to handle 'import' expression. works async.
   * @param exprPath - Main metadata passed in the expression.
   * @param payload - Additional metadata passed after expression.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value from resolving the expression.
   */
  async #handleImpExprAsync(
    parts: ImportExprParts,
    id: string
  ): Promise<unknown> {
    // destrcture parts
    const { nodepath: aliasWithPath, keyValue: paramsVal } = parts;

    // get cache
    const cache = this.#resolveCache.get(id);
    if (!cache) throw new WrapperYAMLException(BUG_MESSAGE);

    // get needed cache data
    const { importsMap, path, opts } = cache;

    // if no path supplied (which occurs only it the root load() by user) throw error that asks user to add filepath if he wants to use imports
    if (!path)
      throw new WrapperYAMLException(
        `You need to define filepath in options if you want to use imports.`
      );

    // get alias and node path from expr path
    const alias = aliasWithPath[0];
    const nodepath = aliasWithPath.slice(1);

    // use imports map to get path and defualt params of this import
    const impData = importsMap.get(alias);
    if (!impData)
      throw new WrapperYAMLException(
        `Alias used in import expression: '${aliasWithPath}' is not defined in directives.`
      );
    const { paramsVal: defParamsVal, path: targetPath } = impData;

    // merge default with defined params
    const finalParams = { ...defParamsVal, ...paramsVal };

    // import file
    const load = await this.#importHandler.importAsync(
      path,
      targetPath,
      finalParams,
      opts,
      id.split("_")[0] // get loadId from id back
    );

    // traverse load using nodepath and return value
    return await this.#traverseNodesAsync(load, nodepath, id);
  }

  /**
   * Method to handle 'param' expression.
   * @param exprPath - Main metadata passed in the expression.
   * @param payload - Additional metadata passed after expression.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value from resolving the expression.
   */
  #handleParamExpr(parts: ParamExprParts, id: string): unknown {
    // destrcture parts
    const { alias } = parts;

    // get cache
    const cache = this.#resolveCache.get(id);
    if (!cache) throw new WrapperYAMLException(BUG_MESSAGE);

    // get needed cache data
    const { paramsMap, paramsVal } = cache;

    // check if alias is defined in directives using paramsMap, if yes get def param value
    if (!paramsMap.has(alias))
      throw new WrapperYAMLException(
        `Alias used in params expression: '${alias}' is not defined in directives.`
      );
    const defParam = paramsMap.get(alias);

    // if value is passed for this alias use it otherwise use default value
    return paramsVal[alias] ?? defParam ?? null;
  }

  /**
   * Method to handle 'local' expression.
   * @param exprPath - Main metadata passed in the expression.
   * @param payload - Additional metadata passed after expression.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value from resolving the expression.
   */
  #handleLocalExpr(parts: LocalExprParts, id: string): unknown {
    // destrcture parts
    const { alias } = parts;

    // get cache
    const cache = this.#resolveCache.get(id);
    if (!cache) throw new WrapperYAMLException(BUG_MESSAGE);

    // get needed cache data
    const { localsMap, localsVal } = cache;

    // check if alias is defined in directives using localsMap
    if (!localsMap.has(alias))
      throw new WrapperYAMLException(
        `Alias used in local expression: '${alias}' is not defined in directives.`
      );
    const defLocal = localsMap.get(alias);

    // generate localsVal object from values passed after $this
    const handledLocalsVal = Object.fromEntries(
      localsVal
        .map((obj) => {
          return Object.entries(obj);
        })
        .flat(1)
    );

    // if value is passed for this alias use it otherwise use default value
    return handledLocalsVal[alias] ?? defLocal ?? null;
  }

  /**
   * Method to traverse through nodes tree. works sync.
   * @param tree - Node tree that will be traversed.
   * @param path - Path of traversal.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value after traversal and retuning subnode.
   */
  #traverseNodes(tree: unknown, path: string[], id: string): unknown {
    // start node from base of the tree
    let node = tree;

    // start traversing
    for (const p of path) {
      // if node is not record throw
      if (!this.#isRecord(node) || node instanceof BlueprintInstance)
        throw new WrapperYAMLException(
          `Invalid path in expression: ${path.join(".")}`
        );

      // if item is present in node update it and continue
      if (p in node) {
        node = node[p];
        continue;
      }

      // only if node is an array then try matching using string value
      if (Array.isArray(node) && typeof p === "string") {
        // resolve array values to get strings from blueprint items
        const resolved = this.#resolveUnknown(node, id, true, path);
        // if resolved is still an array check if item is present, if yes update node and continue
        if (Array.isArray(resolved)) {
          const idx = resolved.indexOf(p);
          if (idx !== -1) {
            node = node[idx];
            continue;
          }
        }
      }

      // throw error if no resolving happened until now
      throw new WrapperYAMLException(
        `Invalid path in expression: ${path.join(".")}`
      );
    }

    // return node
    return this.#resolveUnknown(node, id, true, path);
  }

  /**
   * Method to traverse through nodes tree. works async.
   * @param tree - Node tree that will be traversed.
   * @param path - Path of traversal.
   * @param id - Unique id generated for this resolve executiion, used to access cache.
   * @returns Value after traversal and retuning subnode.
   */
  async #traverseNodesAsync(
    tree: unknown,
    path: string[],
    id: string
  ): Promise<unknown> {
    // start node from base of the tree
    let node = tree;

    // start traversing
    for (const p of path) {
      // if node is not record throw
      if (!this.#isRecord(node) || node instanceof BlueprintInstance)
        throw new WrapperYAMLException(
          `Invalid path in expression: ${path.join(".")}.`
        );

      // if item is present in node update it and continue
      if (p in node) {
        node = node[p];
        continue;
      }

      // only if node is an array then try matching using string value
      if (Array.isArray(node) && typeof p === "string") {
        // resolve array values to get strings from blueprint items
        const resolved = await this.#resolveUnknownAsync(node, id, true, path);
        // if resolved is still an array check if item is present, if yes update node and continue
        if (Array.isArray(resolved)) {
          const idx = resolved.indexOf(p);
          if (idx !== -1) {
            node = node[idx];
            continue;
          }
        }
      }

      // throw error if no resolving happened until now
      throw new WrapperYAMLException(
        `Invalid path in expression: ${path.join(".")}.`
      );
    }

    // return node
    return await this.#resolveUnknownAsync(node, id, true, path);
  }

  /**
   * Method to check if value is expression node.
   * @param val - Value that will be checked.
   * @returns Boolean that indicates if value is expression node or not.
   */
  #isIntNode(val: unknown): boolean {
    if (val instanceof BlueprintInstance) val = val.rawValue;
    if (typeof val !== "string") return false;
    (val as string) = val.trim();
    return val[0] === "$" && val[1] !== "$" && val[1] !== "{";
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
