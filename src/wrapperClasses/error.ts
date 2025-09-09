import { Mark } from "../types";
import { YAMLException as JYAMLException } from "js-yaml";

/** Error object when `js-yaml` parse error it thrown. */
export class YAMLException extends Error {
  /** @internal - implementation detail, not part of public API */
  private _inner: JYAMLException;

  /** Logical name of the YAML string where error is thrown. */
  name: string;

  /** Reason of the error. */
  reason?: string;

  /** Mark for YAMLException that defines error's details. */
  mark?: any;

  /**
   * @param reason - Reason of the error.
   * @param mark - Mark for YAMLException that defines error's details.
   */
  constructor(reason?: string, mark?: Mark) {
    // create YAMLException
    const err = new JYAMLException(reason, mark);

    // pass super
    super(err.message, { cause: err.cause });

    // preserve original stack
    if (err.stack) this.stack = err.stack;

    // update external props
    this.name = err.name;
    this.reason = err.reason;
    this.mark = err.mark;

    // save YAMLException
    this._inner = err;

    // fix prototype chain for some transpiled targets
    Object.setPrototypeOf(this, YAMLException.prototype);
  }

  /**
   * Method to convert Error object into string.
   * @param compact - Boolean to indicated if output error string should be compacted.
   * @returns Stringified error.
   */
  toString(compact?: boolean): string {
    return this._inner.toString(compact);
  }
}
