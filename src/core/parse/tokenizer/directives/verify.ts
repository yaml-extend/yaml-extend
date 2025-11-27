import {
  FilenameDirectiveToken,
  ImportDirectiveToken,
  LocalDirectiveToken,
  ParamDirectiveToken,
  PrivateDirectiveToken,
  TagDirectiveToken,
  YamlDirectiveToken,
  Directives,
} from "../tokenizerTypes.js";
import { YAMLExprError } from "../../../extendClasses/error.js";
import { verifyPath } from "../../utils/path.js";
import { stringify } from "../../utils/random.js";
import { TempParseState } from "../../parseTypes.js";

export function verifyFilename(
  dir: FilenameDirectiveToken,
  directives: Directives
): void {
  // verify filename
  const filename = dir.filename?.value;
  if (!filename) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "You should pass a scalar after %FILENAME directive."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // verify only one valid FILENAME directive is used
  if (directives.filename.some((d) => d.valid)) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "Only one FILENAME directive can be defined, first one defined will be used."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // type inforcement
  if (filename) dir.filename!.value = stringify(filename);
}

export function verifyImport(
  dir: ImportDirectiveToken,
  directives: Directives,
  tempState: TempParseState
): void {
  // make sure that alias is used
  const alias = dir.alias?.value;
  if (!alias) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "You should pass alias to '%IMPORT' directive, structure of IMPORT directive: %IMPORT <alias> <path> [key=value ...]."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // make sure that alias is used only once
  if (directives.import.some((d) => d.alias!.value === alias)) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "Alias for each IMPORT directive should be unique, this alias is used before."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // make sure that path is used
  const path = dir.path?.value;
  if (!path) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "You should pass path to '%IMPORT' directive, structure of IMPORT directive: %IMPORT <alias> <path> [key=value ...]."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // verify path
  const validPath = verifyPath(tempState.resolvedPath, tempState);
  if (!validPath.status) {
    const message =
      validPath.error === "sandBox"
        ? "path is out of scope of sandbox"
        : validPath.error === "yamlFile"
        ? "path extension is not '.yaml' or '.yml'"
        : "path doesn't exist on filesystem";
    const error = new YAMLExprError(dir.pos, "", `Invalid path, ${message}`);
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // type inforcement
  if (alias) dir.alias!.value = stringify(alias);
  if (path) dir.path!.value = stringify(path);
}

export function verifyLocal(
  dir: LocalDirectiveToken,
  directives: Directives
): void {
  // make sure that alias is used
  const alias = dir.alias?.value;
  if (!alias) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "You should pass alias to '%LOCAL' directive, structure of LOCAL directive: %LOCAL <alias> <type> <defValue>."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // make sure that alias is used only once
  if (directives.import.some((d) => d.alias?.value === alias)) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "Alias for each LOCAL directive should be unique, this alias is used before."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // only if type is present, verify that type is valid other wise set it to undefined and return an error
  const type = dir.yamlType?.value;
  if (
    type &&
    (typeof type !== "string" ||
      (type !== "scalar" && type !== "map" && type !== "seq"))
  ) {
    const error = new YAMLExprError(
      dir.yamlType!.pos,
      "",
      "Invalid type, type can only be 'scalar', 'map' or 'seq'."
    );
    dir.errors.push(error);
    directives.errors.push(error);
    dir.yamlType!.value = undefined;
  }

  // type inforcement
  if (alias) dir.alias!.value = stringify(alias);
}

export function verifyParam(
  dir: ParamDirectiveToken,
  directives: Directives
): void {
  // make sure that alias is used
  const alias = dir.alias?.value;
  if (!alias) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "You should pass alias to '%PARAM' directive, structure of PARAM directive: %PARAM <alias> <type> <defValue>."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // make sure that alias is used only once
  if (directives.param.some((d) => d.alias?.value === alias)) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "Alias for each PARAM directive should be unique, this alias is used before."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // only if type is present, verify that type is valid other wise set it to undefined and return an error
  const type = dir.yamlType?.value;
  if (
    type &&
    (typeof type !== "string" ||
      (type !== "scalar" && type !== "map" && type !== "seq"))
  ) {
    const error = new YAMLExprError(
      dir.yamlType!.pos,
      "",
      "Invalid type, type can only be 'scalar', 'map' or 'seq'."
    );
    dir.errors.push(error);
    directives.errors.push(error);
    dir.yamlType!.value = undefined;
  }

  // type inforcement
  if (alias) dir.alias!.value = stringify(alias);
}

export function verifyPrivate(
  dir: PrivateDirectiveToken,
  directives: Directives
): void {
  // only type inforcement here for each path
  for (const path of dir.paths) {
    path.value = stringify(path.value);
  }
}

export function verifyTag(
  dir: TagDirectiveToken,
  directives: Directives
): void {
  // make sure that handle is used
  const handle = dir.handle?.value;
  if (!handle) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "You should pass handle to '%TAG' directive, structure of TAG directive: %TAG <handle> <prefix>."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // make sure that handle is used only once
  if (directives.tag.some((d) => d.handle?.value === handle)) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "Handle for each TAG directive should be unique, this handle is used before."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // make sure that prefix is used
  const prefix = dir.prefix?.value;
  if (!prefix) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "You should pass prefix to '%TAG' directive, structure of TAG directive: %TAG <handle> <prefix>."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // type inforcement
  if (handle) dir.handle!.value = stringify(handle);
  if (prefix) dir.prefix!.value = stringify(prefix);
}

export function verifyVersion(
  dir: YamlDirectiveToken,
  directives: Directives
): void {
  // make sure that version is used
  const version = dir.version?.value;
  if (!version) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "You should pass version to '%YAML' directive, structure of YAML directive: %YAML <version>."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // verify only one valid FILENAME directive is used
  if (directives.version.some((d) => d.valid)) {
    const error = new YAMLExprError(
      dir.pos,
      "",
      "Only one YAML directive can be defined, first one defined will be used."
    );
    dir.errors.push(error);
    dir.valid = false;
    directives.errors.push(error);
  }

  // type inforcement along with verification that verion is valid (1.1) or (1.2)
  if (version) {
    const numVersion = Number(version);

    if (numVersion !== 1.1 && numVersion !== 1.2) {
      const error = new YAMLExprError(
        dir.pos,
        "",
        "Invalid version value, valid values are 1.1 or 1.2."
      );
      dir.errors.push(error);
      dir.valid = false;
      directives.errors.push(error);
    }

    dir.version!.value = numVersion;
  }
}
