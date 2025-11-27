import { YAMLError, YAMLExprError } from "../../extendClasses/error.js";
import { TempParseState } from "../parseTypes.js";
export type { TokenizeTextFunc } from "./scalar/text.js";

////////////////////////////////////////////////////////////////////////////////////
////// General types used in both tokenizers

/**
 * Types of data in YAML
 */
export type YAMLDataTypes = "scalar" | "map" | "seq";

/**
 * Object that hold position of token inside single line.
 */
export type LinePos = {
  line: number;
  col: number;
};

/**
 * Array with start and end absolute positions.
 */
export type Pos = [number, number];

/**
 * Minimal data used in a single token.
 */
export type RawToken<T> = {
  /** Raw text. */
  raw: string;
  /** Text after escaping. */
  text: string;
  /** Value of the token (can be number, null or even objects) */
  value: T;
  /** Boolean to define if text was quoted or not. */
  quoted: boolean;
  /** Array of lines in which token spans along with it's position inside each line. */
  linePos: [LinePos, LinePos] | undefined;
  /** Absolute position of token in text */
  pos: Pos;
};

////////////////////////////////////////////////////////////////////////////////////
////// Directive tokenizer types

/**
 * Object that holds tokens of directives to be used in parsing.
 */
export type Directives = {
  filename: FilenameDirectiveToken[];
  tag: TagDirectiveToken[];
  private: PrivateDirectiveToken[];
  param: ParamDirectiveToken[];
  local: LocalDirectiveToken[];
  import: ImportDirectiveToken[];
  version: YamlDirectiveToken[];
  errors: YAMLError[];
};

/**
 * Minimal data used in a single directive token.
 */
type RawDirectiveToken = {
  type: "TAG" | "YAML" | "FILENAME" | "IMPORT" | "PARAM" | "LOCAL" | "PRIVATE";
  rawLine: string;
  linePos: [LinePos, LinePos] | undefined;
  pos: Pos;
  valid: boolean;
  errors: YAMLExprError[];
};

/**
 * TAG's directive token.
 */
export type TagDirectiveToken = RawDirectiveToken & {
  type: "TAG";
  base: RawToken<string>;
  handle: RawToken<string> | undefined;
  prefix: RawToken<string> | undefined;
};

/**
 * YAML's directive token.
 */
export type YamlDirectiveToken = RawDirectiveToken & {
  type: "YAML";
  base: RawToken<string>;
  version: RawToken<number> | undefined;
};

/**
 * FILENAME's directive token.
 */
export type FilenameDirectiveToken = RawDirectiveToken & {
  type: "FILENAME";
  base: RawToken<string>;
  filename: RawToken<string> | undefined;
};

/**
 * Data of key=value param pairs in import token
 */
export type ImportParamInfo = {
  raw: string;
  equal: RawToken<string> | undefined;
  key: RawToken<string> | undefined;
  value: RawToken<unknown> | undefined;
};

/**
 * IMPORT's directive token.
 */
export type ImportDirectiveToken = RawDirectiveToken & {
  type: "IMPORT";
  base: RawToken<string>;
  alias: RawToken<string> | undefined;
  path: RawToken<string> | undefined;
  params: Record<string, ImportParamInfo>;
  resolvedParams: Record<string, unknown>;
};

/**
 * LOCAL's directive token.
 */
export type LocalDirectiveToken = RawDirectiveToken & {
  type: "LOCAL";
  base: RawToken<string>;
  alias: RawToken<string> | undefined;
  yamlType: RawToken<string | undefined> | undefined;
  defValue: RawToken<unknown> | undefined;
};

/**
 * PARAM's directive token.
 */
export type ParamDirectiveToken = RawDirectiveToken & {
  type: "PARAM";
  base: RawToken<string>;
  alias: RawToken<string> | undefined;
  yamlType: RawToken<string | undefined> | undefined;
  defValue: RawToken<unknown> | undefined;
};

/**
 * PRIVATE's directive token.
 */
export type PrivateDirectiveToken = RawDirectiveToken & {
  type: "PRIVATE";
  base: RawToken<string>;
  paths: RawToken<string>[];
  resolvedPaths: Record<
    string,
    { pathParts: string[]; token: RawToken<string> }
  >;
};

/**
 * General type that holds all directive tokens.
 */
export type DirectiveToken =
  | TagDirectiveToken
  | YamlDirectiveToken
  | FilenameDirectiveToken
  | ImportDirectiveToken
  | LocalDirectiveToken
  | ParamDirectiveToken
  | PrivateDirectiveToken;

/**
 * Helper to get specific type of directive token from general type.
 */
export type DirectiveOf<T extends DirectiveToken["type"]> = Extract<
  DirectiveToken,
  { type: T }
>;

////////////////////////////////////////////////////////////////////////////////////
////// Scalar tokenizer types

/**
 * Minimal state used in scalar tokenizer step.
 */
export type BasicState = {
  input: string;
  len: number;
  pos: number;
  line: number;
  absLineStart: number;
};

/**
 * State of text step of scalar tokenizer
 */
export type TextTokenizerState = BasicState;

/**
 * State of expression step of scalar tokenizer
 */
export type ExprTokenizerState = BasicState & {
  afterParen: boolean;
  afterWhiteSpace: boolean;
};

/**
 * State of arguments step of scalar tokenizer
 */
export type ArgsTokenizerState = BasicState;

/**
 * State of keyValue step of scalar tokenizer
 */
export type KeyValueTokenizerState = BasicState & {
  afterEqual: boolean;
};

/**
 * Token types from text step of scalar tokenizer
 */
export enum TextTokenType {
  TEXT = "TEXT",
  EXPR = "EXPR",
  EOF = "EOF",
}

/**
 * Token types from expression step of scalar tokenizer
 */
export enum ExprTokenType {
  PATH = "PATH",
  DOT = "DOT",
  ARGS = "ARGS",
  WHITE_SPACE = "WHITE_SPACE",
  TYPE = "TYPE",
  EOF = "EOF",
}

/**
 * Token types from arguments step of scalar tokenizer
 */
export enum ArgsTokenType {
  KEY_VALUE = "KEY_VALUE",
  COMMA = "COMMA",
  EOF = "EOF",
}

/**
 * Token types from keyValue step of scalar tokenizer
 */
export enum KeyValueTokenType {
  EQUAL = "EQUAL",
  KEY = "KEY",
  VALUE = "VALUE",
  EOF = "EOF",
}

/**
 * Text token from text step of scalar tokenizer
 */
export type TextToken = RawToken<string> & {
  type: TextTokenType;
  depth: number;
  freeExpr: boolean;
  exprTokens?: ExprToken[];
  exprMarkOpen?: RawToken<string>;
  exprMarkClose?: RawToken<string>;
};

/**
 * Expression token from expression step of scalar tokenizer
 */
export type ExprToken = RawToken<string> & {
  type: ExprTokenType;
  argsTokens?: ArgsToken[];
  argsMarkOpen?: RawToken<string>;
  argsMarkClose?: RawToken<string>;
};

/**
 * Arguments token from arguments step of scalar tokenizer
 */
export type ArgsToken = RawToken<string> & {
  type: ArgsTokenType;
  keyValueToks?: KeyValueToken[];
};

/**
 * KeyValue token from KeyValue step of scalar tokenizer
 */
export type KeyValueToken = RawToken<unknown> & {
  type: KeyValueTokenType;
  valueToks?: TextToken[];
};
