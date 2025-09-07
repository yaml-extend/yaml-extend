import type { SchemaDefinition } from "../types.js";
import { Type } from "./type.js";

export class Schema {
  /** Array to hold types added to the schema. */
  #types: Type[] = [];

  /** Var to hold group if special group is used. */
  #group: "FAILSAFE" | "JSON" | "CORE" | "DEFAULT" | undefined;

  /**
   * @param definition - Types definition. can be single Type, array of Types or SchemaDefinition object.
   * @param group - Optional special group for this schema.
   */
  constructor(
    definition: SchemaDefinition | Type | Type[],
    group?: "FAILSAFE" | "JSON" | "CORE" | "DEFAULT" | undefined
  ) {
    this.#addTypes(definition);
    this.#group = group;
  }

  /**
   * Method to extend schema with additional types.
   * @param types - Types that will be added.
   * @returns Reference to the same schema.
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
