import { YAMLError as OrigYAMLError, ErrorCode as OrigErrorCode } from "yaml";
import { LinePos } from "../parse/tokenizer/tokenizerTypes.js";

// Inject YAMLExprError into ErrorName
export type ErrorName = "YAMLParseError" | "YAMLWarning" | "YAMLExprError";

// Inject new ExprErrorCode into ErrorCode
export type ExprErrorCode = "";
export type ErrorCode = OrigErrorCode | ExprErrorCode;

// Base new ErrorName and ErrorCode into YAMLError class
export class YAMLError extends OrigYAMLError {
  path: string = "";
  linePos!: [LinePos, LinePos] | undefined;
  filename: string = "";
  constructor(
    name: ErrorName,
    pos: [number, number],
    code: ErrorCode,
    message: string
  ) {
    // @ts-ignore
    super(name, pos, code, message);
  }
}

// New YAMLExprError class
export class YAMLExprError extends YAMLError {
  constructor(pos: [number, number], code: ErrorCode, message: string) {
    super("YAMLExprError", pos, code, message);
  }
}

export class YAMLParseError extends YAMLError {
  constructor(pos: [number, number], code: ErrorCode, message: string) {
    super("YAMLParseError", pos, code, message);
  }
}

export class YAMLWarning extends YAMLError {
  constructor(pos: [number, number], code: ErrorCode, message: string) {
    super("YAMLWarning", pos, code, message);
  }
}
