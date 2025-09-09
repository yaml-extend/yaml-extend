import type { SchemaDefinition } from "../types.js";
import { Type } from "./type.js";

/**
 * Schema that holds Types used for loading and dumping YAML string.
 */
export class Schema {
  /** @internal - implementation detail, not part of public API */
  /** Array to hold types added to the schema. */
  private _types: Type[] = [];

  /** @internal - implementation detail, not part of public API */
  /** Var to hold group if special group is used. */
  private _group: "FAILSAFE" | "JSON" | "CORE" | "DEFAULT" | undefined;

  /**
   * @param definition - Either schema definition or types that will control how parser handle tags in YAML.
   * @param group - Optional built-in schema to use.
   */
  constructor(
    definition: SchemaDefinition | Type | Type[],
    group?: "FAILSAFE" | "JSON" | "CORE" | "DEFAULT" | undefined
  ) {
    this._addTypes(definition);
    this._group = group;
  }

  /**
   * @param types - Either schema definition or types that will control how parser handle tags in YAML.
   * @returns Reference to the schema.
   */
  extend(types: SchemaDefinition | Type[] | Type): Schema {
    this._addTypes(types);
    return this;
  }

  /** @internal - implementation detail, not part of public API */
  /**
   * Method to add types through constructor or extend functions.
   * @param types - Types that will be added.
   */
  private _addTypes(types: SchemaDefinition | Type | Type[]): void {
    // if array convert it to object
    if (Array.isArray(types)) {
      for (const t of types) this._types.push(t);
      return;
    }
    // if single type add it directly
    if (types instanceof Type) {
      this._types.push(types);
      return;
    }
    // if implicit types add them
    if (types.implicit) {
      for (const t of types.implicit) this._types.push(t);
    }
    // if explicit types add them
    if (types.explicit) {
      for (const t of types.explicit) this._types.push(t);
    }
  }

  get types() {
    return this._types;
  }

  get group() {
    return this._group;
  }
}
