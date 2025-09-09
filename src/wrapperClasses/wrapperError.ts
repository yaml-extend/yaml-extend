/**
 * Error object when yaml-extend resolve error is thrown.
 */
export class WrapperYAMLException extends Error {
  /** Logical name of the YAML string where error is thrown. */
  name: string;

  /** Filesystem path of the YAML file where error is thrown. */
  filepath: string;

  /** Reason of the error. */
  reason: string;

  /**
   * @param reason - Reason of the error.
   * @param filepath - Filesystem path of the YAML file where error is thrown.
   * @param name - Logical name of the YAML string where error is thrown.
   */
  constructor(reason?: string, filepath?: string, name?: string) {
    // define additional data
    let additionalData = "";
    if (filepath && name)
      additionalData = `This error occured in file: ${name} at path: ${filepath}`;
    else {
      if (filepath) additionalData = `This error occured at path: ${filepath}`;
      if (name) additionalData = `This error occured in file: ${name}`;
    }
    // construct full message
    const message = reason + ". " + additionalData;
    // set message by passing it to super
    super(message);
    // set reason, name and filepath
    this.reason = reason ?? "";
    this.name = name ?? "";
    this.filepath = filepath ?? "";
  }

  /**
   * Method to convert Error object into string.
   * @param compact - Boolean to indicated if output error string should be compacted.
   * @returns Stringified error.
   */
  toString(compact?: boolean) {
    if (compact) return JSON.stringify(this.message);
    else return JSON.stringify(this.message, null, 2);
  }

  /**
   * Method to reset additional data (filapath and name) of the error.
   * @param filepath - Filesystem path of the YAML file where error is thrown.
   * @param name - Logical name of the YAML string where error is thrown.
   */
  setAdditionalData(
    filepath: string | undefined,
    name: string | undefined
  ): void {
    // set name and filepath
    this.filepath = filepath ?? "";
    this.name = name ?? "";
    // construct additional data message
    let additionalData = "";
    if (filepath && name)
      additionalData = `This error occured in file: ${name} at path: ${filepath}`;
    else {
      if (filepath) additionalData = `This error occured at path: ${filepath}`;
      if (name) additionalData = `This error occured in file: ${name}`;
    }
    // construct full message
    const message = this.reason + ". " + additionalData;
    // set message by modifiying it directly
    this.message = message;
  }
}
