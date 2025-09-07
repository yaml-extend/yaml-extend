import {
  Schema as JSchema,
  Type as JType,
  DEFAULT_SCHEMA,
  CORE_SCHEMA,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
} from "js-yaml";
import type { Schema } from "../wrapperClasses/schema.js";
import type { Type } from "../wrapperClasses/type.js";

/**
 * Class to handle conversion of wrapper types into js-yaml types and wrapper schemas into js-yaml schemas.
 */
class BridgeHandler {
  /**
   * Convert types from wrapper types to js-yaml types.
   * @param types - Wrapper types that will be converted.
   * @returns js-yaml types ready to passed to js-yaml schema.
   */
  typesBridge(types: Type[] | undefined): JType[] | undefined {
    if (!types) return; // if no types return

    /** Array to hold converted types */
    const convertedTypes: JType[] = [];

    // loop through all wrapper types and convert them one by one
    for (const t of types) {
      const convertedT = new JType(t.tag, {
        kind: t.kind,
        construct: t.construct,
        resolve: t.resolve,
        instanceOf: t.instanceOf,
        predicate: t.predicate,
        represent: t.represent,
        representName: t.representName,
        defaultStyle: t.defaultStyle,
        multi: t.multi,
        styleAliases: t.styleAliases,
      });
      convertedTypes.push(convertedT);
    }

    // return converted types
    return convertedTypes;
  }

  /**
   * Convert schema from wrapper schema to js-yaml schema and add bridged js-yaml types to it.
   * @param schema - Wrapper schema that will be converted.
   * @returns js-yaml schema ready to passed to js-yaml load function.
   */
  schemaBridge(
    schema: Schema | undefined,
    types: JType[] | undefined
  ): JSchema | undefined {
    if (!schema) return; // if no schema return

    // create schema of the types and return it
    switch (schema.group) {
      case "CORE":
        return CORE_SCHEMA.extend(types ?? []);
      case "DEFAULT":
        return DEFAULT_SCHEMA.extend(types ?? []);
      case "FAILSAFE":
        return FAILSAFE_SCHEMA.extend(types ?? []);
      case "JSON":
        return JSON_SCHEMA.extend(types ?? []);
      default:
        return new JSchema(types ?? []);
    }
  }
}

/**
 * Bridge handler class instance that is used to convert wrapper classes (schema and type) into js-yaml classes.
 */
export const bridgeHandler = new BridgeHandler();
