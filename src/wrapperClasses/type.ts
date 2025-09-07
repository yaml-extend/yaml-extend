import type { TypeConstructorOptions } from "../types.js";

export class Type {
  #tag: string;
  kind?: TypeConstructorOptions["kind"];
  resolve?: TypeConstructorOptions["resolve"];
  construct?: TypeConstructorOptions["construct"];
  instanceOf?: TypeConstructorOptions["instanceOf"];
  predicate?: TypeConstructorOptions["predicate"];
  represent?: TypeConstructorOptions["represent"];
  representName?: TypeConstructorOptions["representName"];
  defaultStyle?: TypeConstructorOptions["defaultStyle"];
  multi?: TypeConstructorOptions["multi"];
  styleAliases?: TypeConstructorOptions["styleAliases"];

  constructor(tag: string, opts?: TypeConstructorOptions) {
    this.#tag = tag;
    this.kind = opts?.kind;
    this.resolve = opts?.resolve;
    this.construct = opts?.construct;
    this.instanceOf = opts?.instanceOf;
    this.predicate = opts?.predicate;
    this.represent = opts?.represent;
    this.representName = opts?.representName;
    this.defaultStyle = opts?.defaultStyle;
    this.multi = opts?.multi;
    this.styleAliases = opts?.styleAliases;
  }

  get tag() {
    return this.#tag;
  }
}
