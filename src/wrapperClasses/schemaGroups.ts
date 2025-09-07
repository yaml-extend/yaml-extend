import { Schema } from "./schema.js";

/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
export const FAILSAFE_SCHEMA = new Schema([], "FAILSAFE");

/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
export const JSON_SCHEMA = new Schema([], "JSON");

/** same as JSON_SCHEMA: http://www.yaml.org/spec/1.2/spec.html#id2804923 */
export const CORE_SCHEMA = new Schema([], "CORE");

/** all supported YAML types */
export const DEFAULT_SCHEMA = new Schema([], "DEFAULT");
