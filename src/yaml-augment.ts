import "yaml";
import type {
  LinePos,
  Pos,
  TextToken,
} from "./core/parse/tokenizer/tokenizerTypes.js";

declare module "yaml" {
  interface Scalar<T = unknown> {
    resolved: boolean;
    resolvedValue: unknown;
    isKey: boolean;
    resolvedKeyValue: unknown;
    tokens: TextToken[];
    linePos: [LinePos, LinePos] | undefined;
    pos: Pos | undefined;
  }
  interface YAMLMap<K = unknown, V = unknown> {
    resolved: boolean;
    resolvedValue: unknown;
    linePos: [LinePos, LinePos] | undefined;
    pos: Pos | undefined;
  }
  interface YAMLSeq<T = unknown> {
    resolved: boolean;
    resolvedValue: unknown;
    linePos: [LinePos, LinePos] | undefined;
    pos: Pos | undefined;
  }
  interface Alias {
    resolvedValue: unknown;
    linePos: [LinePos, LinePos] | undefined;
    pos: Pos | undefined;
  }
}

// Make this file a module so TS will include it when imported
export {};
