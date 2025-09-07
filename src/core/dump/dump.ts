import { DumpOptions } from "../../types.js";
import { Schema } from "../../wrapperClasses/schema.js";
import { dump as JDump, DumpOptions as JDumpOptions } from "js-yaml";
import { bridgeHandler } from "../bridge.js";

/**
 * Function to dump js value into YAML string.
 * @param obj - Object that will be dumped.
 * @param opts - Options object that controls dump behavior.
 * @returns Dumped string.
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
