import { WrapperYAMLException } from "../../../wrapperClasses/wrapperError.js";
import { dirEndRegex, pathRegex } from "../regex.js";
import type {
  DirectivesObj,
  ParamDirParts,
  LocalDirParts,
  PrivateDirParts,
  FilenameDirParts,
  ImportDirParts,
  TagDirParts,
} from "../../../types.js";
import { tokenizer } from "../tokenizer.js";

/**
 * Class to handle reading directives at the top of YAML string. it also strip them from the string and convert it back to normal YAML so it can be passed to js-yaml loader function.
 */
export class DirectivesHandler {
  /**
   * Method to read directives in YAML string, handle wrapper specific directives by converting them into directives object.
   * @param str - String passed in load function.
   * @returns Directives object which holds meta data about directives to be used in the resolver.
   */
  handle(str: string): DirectivesObj {
    // define main arrays and maps to hold directives data
    /** Holds list of private node's definition. */
    const privateArr: string[] = [];
    /** Holds list of tag handles and prefix values used in the module. */
    const tagsMap: Map<string, string> = new Map();
    /** Holds list of param's aliases and default values used in the module. */
    const paramsMap: Map<string, string> = new Map();
    /** Holds list of local's aliases and default values used in the module. */
    const localsMap: Map<string, string> = new Map();
    /** Map of aliases for imports and import data as path and modules params. */
    const importsMap: Map<
      string,
      { path: string; params: Record<string, string> }
    > = new Map();
    let filename: string = "";

    // split using regex to get directives if present
    const parts = str.split(dirEndRegex);

    // If no directive part return with empty data
    if (parts.length === 1)
      return {
        tagsMap,
        paramsMap,
        privateArr,
        localsMap,
        importsMap,
        filename,
      };

    // split directive part into lines
    const lines = parts[0]
      .split("\n")
      .filter((l) => !this._isEmptyLine(l))
      .map((l) => l.trim());

    // loop through lines to handle wrapper lines
    for (let i = 0; i < lines.length; i++) {
      // get line
      const line = lines[i];

      // get directive type and devide it into parts, if not wrapper related continue
      const dirData = tokenizer.handleDirective(line);
      if (!dirData) continue;

      // destructure directive data
      const { type, parts: directiveParts } = dirData;

      switch (type) {
        case "TAG":
          this._handleTags(tagsMap, directiveParts as TagDirParts);
          break;
        case "PARAM":
          this._handleParams(paramsMap, directiveParts as ParamDirParts);
          break;
        case "PRIVATE":
          this._handlePrivate(privateArr, directiveParts as PrivateDirParts);
          break;
        case "IMPORT":
          this._handleImports(importsMap, directiveParts as ImportDirParts);
          break;
        case "LOCAL":
          this._handleLocals(localsMap, directiveParts as LocalDirParts);
          break;
        case "FILENAME":
          filename = this._handleFilename(directiveParts as FilenameDirParts);
          break;
      }
    }

    // replace directives with filtered directives

    return {
      tagsMap,
      privateArr,
      paramsMap,
      localsMap,
      importsMap,
      filename,
    };
  }

  /**
   * Method to return filename. Only method here that returns value as filename is a string and can't be referenced.
   * @param parts - Directive parts object with metadata filename.
   * @returns filename.
   */
  private _handleFilename(parts: FilenameDirParts): string {
    return parts.metadata;
  }

  /**
   * Method to push private nodes to the private array of directives object.
   * @param privateArr - Reference to the array that holds private nodes and will be passed to directives object.
   * @param parts - Directive parts object with metadata being private nodes.
   */
  private _handlePrivate(privateArr: string[], parts: PrivateDirParts): void {
    const privateNodes = parts.arrMetadata;
    if (Array.isArray(privateNodes))
      for (const p of privateNodes) privateArr.push(p);
  }

  /**
   * Method to add to tags map where key is handle for the tag and value is prefix.
   * @param tagsMap - Reference to the map that holds tags's handles and prefixes and will be passed to directives object.
   * @param parts - Parts of the line.
   */
  private _handleTags(tagsMap: Map<string, string>, parts: TagDirParts): void {
    const { alias, metadata } = parts;
    tagsMap.set(alias, metadata);
  }

  /**
   * Method to add to locals map where key is alias for the local and value is the default value.
   * @param localsMap - Reference to the map that holds local's aliases and default values and will be passed to directives object.
   * @param parts - Parts of the line.
   */
  private _handleLocals(
    localsMap: Map<string, string>,
    parts: LocalDirParts
  ): void {
    // get alias and defValue from parts
    const { alias, defValue } = parts;
    // add the alias with default value to the paramsMap
    localsMap.set(alias, defValue);
  }

  /**
   * Method to add to params map where key is alias for the param and value is the default value.
   * @param paramsMap - Reference to the map that holds params's aliases and default values and will be passed to directives object.
   * @param parts - Parts of the line.
   */
  private _handleParams(paramsMap: Map<string, string>, parts: ParamDirParts) {
    // get alias and defValue from parts
    const { alias, defValue } = parts;
    // add the alias with default value to the paramsMap
    paramsMap.set(alias, defValue);
  }

  /** Method to verify imports structure (<alias> <path>) and add them to the map. */
  /**
   * Method to add to imports map where key is alias for the import and value is the path and default params values passed to this import.
   * @param importsMap - Reference to the map that holds imports's aliases and path with default params values and will be passed to directives object.
   * @param parts - Parts of the line.
   */
  private _handleImports(
    importsMap: Map<string, { path: string; params: Record<string, string> }>,
    parts: ImportDirParts
  ): void {
    // get alias and path and params key value from parts
    const { alias, metadata: path, keyValue: params } = parts;
    // verify path
    const isYamlPath = pathRegex.test(path);
    if (!isYamlPath)
      throw new WrapperYAMLException(
        `This is not a valid YAML file path: ${path}.`
      );
    // add parts to the map
    importsMap.set(alias, { path, params });
  }

  /**
   * Helper method to check if line is empty (no chars or just "\s").
   * @param str - string which will be checked.
   * @returns boolean that indicates if line is empty or not.
   */
  private _isEmptyLine(str: string): boolean {
    return str.trim().length === 0;
  }
}
