import { WrapperYAMLException } from "../../../wrapperClasses/wrapperError.js";
import { Schema } from "../../../wrapperClasses/schema.js";
import { Type } from "../../../wrapperClasses/type.js";
import { TagResolveInstance } from "../lazyLoadClasses/tagResolveInstance.js";
import { numChar } from "../../helpers.js";

import {
  tagsStrucRegex,
  captureTagsRegex,
  invalidTagCharRegex,
} from "../regex.js";

/**
 * Class that is used to handle tags present in YAML file. this handling is by generating types for any tag present along with it's params, so when passed to js-yaml loader it will
 * identify these types and execute them.
 */
export class TagsHandler {
  /**
   * Method to capture tags in YAML text using simple regex. NOTE that it can also capture tag like definitions in the comments and string blocks (as this is a wrapper only not a parser so
   * no way to capture real tags only), but they will be handled gracefully to prevent any errors in the cost of some performance overhead.
   * @param str - YAML string passed.
   * @returns Array of tags captures in the string.
   */
  captureTags(str: string): string[] {
    // run regex to capture tags, if no match return
    const match = str.matchAll(captureTagsRegex);
    if (!match) return [];
    // convert regex into array
    return Array.from(match).map((m) => m[1]);
  }

  /**
   * Method to handle captured tags by converting them into wrapper types, it works be checking the tag structure, if it's invalid it will not throw directly (as it may be captured from comment
   * as we explianed earlier), instead it will create a three types of the three kinds with the same tag name and throw error inside there constructor, these types will be then be added to the
   * schema, so if js-yaml execute them (they are real tags) they will thow error, otherwise nothing happened.
   * If tag was valid it separates tag name from payload, fetch tag from passed schema (if was not present it will be handled in the same way as invalid tags which is types with thrown error in
   * the constructor) and modifies constructor function by returning special type (TagResolveInstance) that capture and save user defined construct function and passed data, type and params so it will
   * be lazely executed when raw load being resolved.
   * @param tags - Array of captured tags from YAML string.
   * @param tagsMap - Map that holds tags's handles and prefixes defined in directive.
   * @param schema - Schema passed by user.
   * @returns Array of dynamically generated types that handles tags present in this YAML string, or undefined if no schema was passed.
   */
  convertTagsToTypes(
    tags: string[],
    tagsMap: Map<string, string>,
    schema: Schema | undefined
  ): Type[] | undefined {
    // if no schema return directly
    if (!schema) return;

    /** Array to hold dynamically generated types. */
    let types: Type[] = [];
    /** Array to hold already generated tags if the same tag is used multiple times. */
    let cache: string[] = [];

    // start looping through tags
    for (const tag of tags) {
      // if already in the cache skip, otherwise add it to cache
      if (cache.includes(tag)) continue;
      cache.push(tag);

      // handle tag name passed to generated types (removing starting "!" or resolving handle and prefix)
      const fullTag = this._handleTagName(tag, tagsMap);

      // run structure regex on the tag, if no match pass it to syntax error handler and continue
      const match = tag.match(tagsStrucRegex);
      if (!match) {
        // generate types of the three kinds for this tag
        const synErrorTypes = this._handleSyntaxErrorTag(fullTag);
        // pass them to types array
        types.push(...synErrorTypes);
        continue;
      }

      // destructure match
      const [_, tagInSchema, params] = match;

      // get types from schema, if not present pass it to missing type handler and continue
      // can be multiple types as js-yaml allows defining the same tag to multiple kinds which is a good behavior
      const schemaTypes = schema.types.filter(
        (t) => t.tag === "!" + tagInSchema
      );
      if (schemaTypes.length === 0) {
        // generate types of the three kinds for this tag
        const missingTypes = this._handleMissingType(fullTag, tagInSchema);
        // pass them to types array
        types.push(...missingTypes);
        continue;
      }

      // generate types
      for (const schemaType of schemaTypes) {
        // build new type
        const newType = this._buildType(fullTag, schemaType, params);
        // add type to the schema
        types.push(newType);
      }
    }

    // return generated types array
    return types;
  }

  /**
   * Method to build wrapper type dynamically based of the full tag, also it modifies construct function so it returns TagResolveInstance that will lazely execute the construct function.
   * @param type - Type from schema.
   * @param tag - Full tag (tagName + params).
   * @param params - params string defined in tag.
   * @returns Type that will handle this tag and ready to be converted to js-yaml type.
   */
  private _buildType(
    tag: string,
    schemaType: Type,
    params: string | undefined
  ): Type {
    return new Type(tag, {
      kind: schemaType.kind,
      construct: (d, t?, p?) => {
        if (schemaType.construct)
          return new TagResolveInstance(schemaType.construct, d, t, params);
        else return d;
      },
      resolve: schemaType.resolve,
      instanceOf: schemaType.instanceOf,
      predicate: schemaType.predicate,
      represent: schemaType.represent,
      representName: schemaType.representName,
      defaultStyle: schemaType.defaultStyle,
      multi: schemaType.multi,
      styleAliases: schemaType.styleAliases,
    });
  }

  /**
   * Method to handle tag name of type that will be passed to js-yaml.
   * @param tag - Tag that will be handled.
   * @param tagsMap - Map that holds tags's handles and prefixes defined in directive.
   * @returns Tag name ready that will be passed to dynamically generated types.
   */
  private _handleTagName(tag: string, tagsMap: Map<string, string>): string {
    // check if handle is preceeded by handle and handle prefix
    if (this._hasHandle(tag)) {
      // devide into parts
      const parts = tag.split("!").filter((v) => v);
      const handle = parts[0];
      const tagName = parts[1];
      // get prefix from map
      const prefix = tagsMap.get("!" + handle + "!");
      if (!prefix) return tag;
      return prefix + tagName;
    }
    return tag;
  }

  /**
   * Simple method to check if tag has handle before it or not.
   * @param tag - Tag that will be checked.
   * @returns Boolean that indicates if tag is preceeded by handle.
   */
  private _hasHandle(tag: string): boolean {
    let num = 0;
    for (let i = 0; i < tag.length; i++) {
      if (tag[i] === "!") num++;
      if (num > 1) return true;
    }
    return false;
  }

  /**
   * Method to handle missing types from schema by returning three types of the three kinds for this tag. these type's construct function will throw when executed.
   * @param tag - Full tag (tagName + params).
   * @param tagName - Name of the tag only without params (tagName).
   * @returns Types to handle missing type from schema, so if tag is read specific error message if thrown.
   */
  private _handleMissingType(tag: string, tagName: string): Type[] {
    // get error object
    const error = new WrapperYAMLException(`Unkown tag: ${tagName}`);

    // generate types
    const scalarType = new Type(tag, {
      kind: "scalar",
      construct(data, type, params) {
        throw error;
      },
    });

    const mappingType = new Type(tag, {
      kind: "mapping",
      construct(data, type, params) {
        throw error;
      },
    });

    const sequenceType = new Type(tag, {
      kind: "sequence",
      construct(data, type, params) {
        throw error;
      },
    });

    // add types to the schema
    return [scalarType, mappingType, sequenceType];
  }

  /**
   * Method to handle invalid tag's syntax by returning three types of the three kinds for this tag. these type's construct function will throw when executed.
   * @param tag - Full tag (tagName + params).
   * @returns Types to handle invalid tag, so if tag is read specific error message if thrown.
   */
  private _handleSyntaxErrorTag(tag: string) {
    // get error message
    const errorMessage = this._getErrorMessage(tag);
    // create error object
    const error = new WrapperYAMLException(errorMessage);

    // generate types
    const scalarType = new Type(tag, {
      kind: "scalar",
      construct(data, type, params) {
        throw error;
      },
    });

    const mappingType = new Type(tag, {
      kind: "mapping",
      construct(data, type, params) {
        throw error;
      },
    });

    const sequenceType = new Type(tag, {
      kind: "sequence",
      construct(data, type, params) {
        throw error;
      },
    });

    // add types to the schema
    return [scalarType, mappingType, sequenceType];
  }

  /**
   * Method to ge get specific error message of the syntax error of the tag.
   * @param tag - Full tag (tagName + params).
   * @returns Specific error message describing error.
   */
  private _getErrorMessage(tag: string): string {
    // check if error due to invalid char
    const invCharMatch = tag.match(invalidTagCharRegex);
    if (invCharMatch)
      return `Tag: ${invCharMatch[0]} contains a blacklisted characher: ${invCharMatch[1]}, allowed charachters are: A-Z a-z 0-9 "\\" "/" "(" ")" "'" "." "_" "-" "#" "$" and "@" only. `;

    // check if error due to more that 2 "!" used
    const numExc = numChar(tag, ["!"]);
    if (numExc > 2)
      return `Only two '!' marks are allowed in the tag. tag defined: ${tag}`;

    // check if error due to ivalid patenthesis
    const numPar = numChar(tag, ["(", ")"]);
    if (numPar > 2 || numPar === 1)
      return `One pair of parenthesis are allowed only in the end of the tag name to define params. tag defined: ${tag}`;
    if (!tag.endsWith(")"))
      return `Parenthesis should be at the end of the string. tag defined: ${tag}`;

    // return generic error message
    return `Invalid tag: ${tag}. tag should start with '!' and contain only only A-Z a-z 0-9 "\\" "/" "(" ")" "'" "." "_" "-" "#" "$" and "@" characters. with optional parenthesis with single quotes to define params string inside.`;
  }
}
