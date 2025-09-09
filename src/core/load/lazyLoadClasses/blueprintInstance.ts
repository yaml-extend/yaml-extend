/**
 * Class that replace and store primitives, expression strings or TagResolveInstances in raw-load from js-yaml which enable lazy resolving based on different $param or %local values.
 * It also record resolve state to insure left-to-right evaluation order.
 */
export class BlueprintInstance {
  /** Boolean, initially false. Set to true after the instance is fully resolved. */
  resolved: boolean;

  /** @internal - implementation detail, not part of public API */
  /** The original raw value from js-yaml (primitive, expression string or TagResolveInstance). */
  private _rawValue: unknown;

  /**
   * @param rawValue - The original raw value from js-yaml (primitive, expression string or TagResolveInstance).
   */
  constructor(rawValue: unknown) {
    this.resolved = false;
    this._rawValue = rawValue;
  }

  /** Read only, The original raw value from js-yaml (primitive, expression string or TagResolveInstance). */
  get rawValue(): unknown {
    return this._rawValue;
  }
}
