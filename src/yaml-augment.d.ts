import "yaml";

declare module "yaml" {
  // Augmenting by adding resolved
  interface Scalar<T = unknown> {
    resolved: boolean;
    resolvedValue: unknown;
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
