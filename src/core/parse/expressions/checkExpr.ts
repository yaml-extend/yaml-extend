import { Scalar, YAMLMap, YAMLSeq } from "yaml";

/**
 * Method to check if mapping (object) in raw load is actaully mapping expression. mapping interpolations are defined with this structure in YAML file: { $<int> }
 * which is pared by js-yaml to: { $<int>: null }. so it actally check if it's a one key object and the key is valid expression syntax with value null.
 * @param map - Mapping that will be checked.
 * @returns Boolean that indicate if it's an expression or not.
 */
export function isMapExpr(map: YAMLMap): { isExpr: boolean; expr: string } {
  if (!map.flow) return { isExpr: false, expr: "" }; // make sure it's a flow syntax
  if (map.items.length !== 1) return { isExpr: false, expr: "" }; // make sure it's a single key
  if (!(map.items[0].key instanceof Scalar)) return { isExpr: false, expr: "" }; // make sure key is scalar
  if (map.items[0].value !== null) return { isExpr: false, expr: "" }; // make sure value is null
  const key = map.items[0].key.value; // get value of the scalar
  if (typeof key !== "string") return { isExpr: false, expr: "" }; // make sure value of the Scalar instance is a string
  const tStr = key.trim(); // trim string
  const isExpr = tStr[0] === "$" && tStr[1] !== "$" && tStr[1] !== "{"; // make sure it's valid syntax
  return { isExpr, expr: tStr }; // make sure it's valid syntax
}

/**
 * Method to check if sequence (array) in raw load is actaully sequence expression. sequence interpolations are defined with this structure in YAML file: [ $<int> ]
 * which is pared by js-yaml to: [ $<int> ]. so it actally check if it's a one item array and the this item is valid expression syntax.
 * @param seq - Sequence that will be checked.
 * @returns Boolean that indicate if it's an expression or not.
 */
export function isSeqExpr(seq: YAMLSeq): { isExpr: boolean; expr: string } {
  if (!seq.flow) return { isExpr: false, expr: "" }; // make sure it's a flow syntax
  if (seq.items.length !== 1) return { isExpr: false, expr: "" }; // make sure it's a single item
  if (!(seq.items[0] instanceof Scalar)) return { isExpr: false, expr: "" }; // make sure item is scalar
  const item = seq.items[0].value; // get value of the scalar
  if (typeof item !== "string") return { isExpr: false, expr: "" }; // make sure value of the Scalar instance is a string
  const tStr = item.trim(); // trim string
  const isExpr = tStr[0] === "$" && tStr[1] !== "$" && tStr[1] !== "{"; // make sure it's valid syntax
  return { isExpr, expr: tStr };
}

/**
 * Method to check if scalar (string) in raw load is actaully scalar expression. scalar interpolations are defined with this structure in YAML file: $<int>
 * which is pared by js-yaml to: $<int>. so it actally check if the string is valid expression syntax.
 * @param scalar - Scalar that will be checked.
 * @returns Boolean that indicate if it's an expression or not.
 */
export function isScalarExpr(scalar: Scalar): {
  isExpr: boolean;
  expr: string;
} {
  const str = scalar.value; // get value of the scalar
  if (typeof str !== "string") return { isExpr: false, expr: "" }; // make sure value of the Scalar instance is a string
  const tStr = str.trim(); // trim string
  const isExpr = tStr[0] === "$" && tStr[1] !== "$" && tStr[1] !== "{"; // make sure it's valid syntax
  return { isExpr, expr: tStr };
}

export function isStringExpr(str: string): { isExpr: boolean; expr: string } {
  const tStr = str.trim(); // trim string
  const isExpr = tStr[0] === "$" && tStr[1] !== "$" && tStr[1] !== "{"; // make sure it's valid syntax
  return { isExpr, expr: tStr };
}
