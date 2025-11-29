import "yaml";
import type { TextToken } from "./core/parse/tokenizer/tokenizerTypes.js";

declare module "yaml" {
  interface Scalar<T = unknown> {
    resolved: boolean;
    resolvedValue: unknown;
    isKey: boolean;
    resolvedKeyValue: unknown;
    tokens: TextToken[];
  }
  interface YAMLMap<K = unknown, V = unknown> {
    resolved: boolean;
    resolvedValue: unknown;
  }
  interface YAMLSeq<T = unknown> {
    resolved: boolean;
    resolvedValue: unknown;
  }
  interface Alias {
    resolvedValue: unknown;
  }
}

// Make this file a module so TS will include it when imported
export {};
