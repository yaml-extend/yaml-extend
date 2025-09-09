import type { TypeConstructorOptions } from "../types.js";

/**
 * Type to handle tags and custom data types in YAML.
 */
export class Type {
  /** @internal - implementation detail, not part of public API */
  /** Tag name of the type. */
  private _tag: string;

  /** YAML data type that will be handled by this Tag/Type. */
  kind?: TypeConstructorOptions["kind"];

  /**
   * Runtime type guard used when parsing YAML to decide whether a raw node (scalar, mapping or sequence) should be treated as this custom type.
   * Return true when the incoming data matches this type.
   * @param data - Raw node's value.
   * @returns Boolean to indicate if raw value should be handled using this type.
   */
  resolve?: TypeConstructorOptions["resolve"];

  /**
   * Function that will be executed on raw node to return custom type in the load.
   * @param data - Raw node's value.
   * @param type - Type of the tag.
   * @param param - Param passed along with the tag which is single scalar value.
   * @returns Value that will replace node's raw value in the load.
   */
  construct?: TypeConstructorOptions["construct"];

  /**
   * Used when dumping (serializing) JS objects to YAML. If a value is an instance of the provided constructor (or matches the object prototype),
   * the dumper can choose this type to represent it.
   */
  instanceOf?: TypeConstructorOptions["instanceOf"];

  /**
   *  Alternative to instanceOf for dump-time detection. If predicate returns true for a JS value, the dumper can select this type to represent that object.
   * Useful when instanceof is not possible (plain objects, duck-typing).
   */
  predicate?: TypeConstructorOptions["predicate"];

  /**
   * Controls how a JS value is converted into a YAML node when serializing (dumping). Return either a primitive, array or mapping representation suitable for YAML.
   * When provided as an object, each property maps a style name to a function that produces the representation for that style.
   */
  represent?: TypeConstructorOptions["represent"];

  /**
   * When represent is given as a map of styles, representName chooses which style to use for a particular value at dump time. It should return the
   * style key (e.g., "canonical" or "short").
   */
  representName?: TypeConstructorOptions["representName"];

  /** The fallback style name to use when represent provides multiple styles and representName is not present (or does not return a valid style). */
  defaultStyle?: TypeConstructorOptions["defaultStyle"];

  /**
   * Indicates whether this tag/type can be used for multiple YAML tags (i.e., it is not strictly tied to a single tag). This affects how the
   * parser/dumper treats tag resolution and may allow more flexible matching.
   */
  multi?: TypeConstructorOptions["multi"];

  /**
   * Map alias style names to canonical style identifiers. This lets users refer to styles by alternate names; the dumper normalizes them to the canonical style
   * before selecting a represent function.
   */
  styleAliases?: TypeConstructorOptions["styleAliases"];

  /**
   * @param tag - Tag that will be used in YAML text.
   * @param opts - Configirations and options that defines how tag handle data.
   */
  constructor(tag: string, opts?: TypeConstructorOptions) {
    this._tag = tag;
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

  /** Read only, Tag name of the type. */
  get tag() {
    return this._tag;
  }
}
