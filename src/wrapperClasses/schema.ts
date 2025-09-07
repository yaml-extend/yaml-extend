import type { SchemaDefinition } from "../types.js";
import { Type } from "./type.js";

/**
 * Schema that holds Types used for loading and dumping YAML string.
 */
export class Schema {
  /** Array to hold types added to the schema. */
  #types: Type[] = [];

  /** Var to hold group if special group is used. */
  #group: "FAILSAFE" | "JSON" | "CORE" | "DEFAULT" | undefined;

  /**
   * @param definition - Either schema definition or types that will control how parser handle tags in YAML.
   * @param group - Optional built-in schema to use.
   */
  constructor(
    definition: SchemaDefinition | Type | Type[],
    group?: "FAILSAFE" | "JSON" | "CORE" | "DEFAULT" | undefined
  ) {
    this.#addTypes(definition);
    this.#group = group;
  }

  /**
   * @param types - Either schema definition or types that will control how parser handle tags in YAML.
   * @returns Reference to the schema.
   */
  extend(types: SchemaDefinition | Type[] | Type): Schema {
    this.#addTypes(types);
    return this;
  }

  /**
   * Method to add types through constructor or extend functions.
   * @param types - Types that will be added.
   */
  #addTypes(types: SchemaDefinition | Type | Type[]): void {
    // if array convert it to object
    if (Array.isArray(types)) {
      for (const t of types) this.#types.push(t);
      return;
    }
    // if single type add it directly
    if (types instanceof Type) {
      this.#types.push(types);
      return;
    }
    // if implicit types add them
    if (types.implicit) {
      for (const t of types.implicit) this.#types.push(t);
    }
    // if explicit types add them
    if (types.explicit) {
      for (const t of types.explicit) this.#types.push(t);
    }
  }

  get types() {
    return this.#types;
  }

  get group() {
    return this.#group;
  }
}
