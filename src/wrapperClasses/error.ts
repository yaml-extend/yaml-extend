export class WrapperYAMLException extends Error {
  name: string;
  filepath: string;
  reason: string;

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

  toString(compact?: boolean) {
    if (compact) return JSON.stringify(this.message);
    else return JSON.stringify(this.message, null, 2);
  }

  setAdditionalData(filepath: string | undefined, name: string | undefined) {
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
