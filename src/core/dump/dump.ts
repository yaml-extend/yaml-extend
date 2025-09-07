import { DumpOptions } from "../../types.js";
import { Schema } from "../../wrapperClasses/schema.js";
import { dump as JDump, DumpOptions as JDumpOptions } from "js-yaml";
import { bridgeHandler } from "../bridge.js";

/**
 * Function to dump js value into YAML string.
 * @param obj - Js object that will be converted to YAML string
 * @param opts - Options object passed to control dump behavior.
 * @returns YAML string of dumped js value.
 */
export function dump(obj: any, opts?: DumpOptions | undefined): string {
  // if schema is supplied bridge to js-yaml schema
  if (opts?.schema instanceof Schema) {
    const types = bridgeHandler.typesBridge(opts.schema.types);
    opts.schema = bridgeHandler.schemaBridge(opts.schema, types) as Schema;
  }
  // dump and return
  return JDump(obj, opts as JDumpOptions);
}
