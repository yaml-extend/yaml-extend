/// <reference path="./yaml-augment.d.ts" />
export {
  Schema,
  CreateNodeOptions,
  DocumentOptions,
  ParseOptions,
  SchemaOptions,
  ToJSOptions,
  ToStringOptions,
  TagId,
  Tags,
  CollectionTag,
  ScalarTag,
} from "yaml";

export { parseExtend } from "./core/parse/index.js";
export * from "./core/extendClasses/error.js";

export type { ExtendParseOptions, Options } from "./core/parse/parseTypes.js";
