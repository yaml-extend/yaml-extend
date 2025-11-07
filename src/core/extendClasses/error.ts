import {
  YAMLError as OrigYAMLError,
  ErrorCode as OrigErrorCode,
  YAMLParseError,
  YAMLWarning,
} from "yaml";

// Inject YAMLExprError into ErrorName
export type ErrorName = "YAMLParseError" | "YAMLWarning" | "YAMLExprError";

// Inject new ExprErrorCode into ErrorCode
export type ExprErrorCode = "";
export type ErrorCode = OrigErrorCode | ExprErrorCode;

// Base new ErrorName and ErrorCode into YAMLError class
export class YAMLError extends OrigYAMLError {
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

// Export old classes as well
export { YAMLParseError, YAMLWarning };
