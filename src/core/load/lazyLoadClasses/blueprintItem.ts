import { WrapperYAMLException } from "../../../wrapperClasses/error.js";
import {} from "../tokenizer.js";

/**
 * Class that replaces any scalar or interpolation in the raw load. leaving only blueprint items and structure of YAML file. there blue print items are used as storing containers
 * for raw load and interpolations while also save history of resolving, which is needed to be able to dynamically resolve node tree, so with different locals or params values
 * the same raw load gives different final values.
 */
export class BlueprintInstance {
  /** Boolean that indicates if blueprint item has been resolved at least once or not, important to prevent referencing nodes in the YAML text that have not been resolved yet. */
  resolved: boolean;

  /** Stored raw value from js-yaml load. */
  #rawValue: unknown;

  /**
   * @param rawValue - Value returned from js-yaml load directly before resolving.
   */
  constructor(rawValue: unknown) {
    this.resolved = false;
    this.#rawValue = rawValue;
  }

  /** Method to get raw value. deprecated. */
  get rawValue(): unknown {
    return this.#rawValue;
  }
}
