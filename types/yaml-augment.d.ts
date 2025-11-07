import "yaml";

type Reviver = (key: unknown, value: unknown) => unknown;

declare module "yaml" {
  // Augmenting by adding resolved
  interface Scalar<T = unknown> {
    resolved?: boolean;
  }
  interface YAMLMap<K = unknown, V = unknown> {
    resolved?: boolean;
  }
  interface YAMLSeq<T = unknown> {
    resolved?: boolean;
  }
}
