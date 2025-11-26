/// <reference path="./yaml-augment.d.ts" />
export * from "yaml";

export { parseExtend } from "./core/parse/index.js";
export { YAMLExprError } from "./core/extendClasses/error.js";

export type { ExtendParseOptions, Options } from "./core/parse/parseTypes.js";
