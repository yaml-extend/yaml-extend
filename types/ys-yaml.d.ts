declare module "js-yaml" {
  export class YAMLException extends Error {
    name: string;
    reason?: string;
    mark?: any;
    constructor(reason?: string, mark?: Mark);
    toString(compact?: boolean): string;
  }

  /**
   * Mark for YAMLException that defines error's details.
   */
  export interface Mark {
    /** The original input text (or the relevant buffer slice) used to produce the error. */
    buffer: string;

    /** Zero-based column number (character offset from lineStart) where the error occurred. */
    column: number;

    /** Zero-based line number where the problem was detected. */
    line: number;

    /** The logical name for YAML string (filename). */
    name: string;

    /** Absolute character index in `buffer` for the error location. */
    position: number;

    /** short excerpt from the input surrounding the error. */
    snippet: string;
  }
}
