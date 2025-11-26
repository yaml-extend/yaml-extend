import {
  FilenameDirectiveToken,
  ImportDirectiveToken,
  LocalDirectiveToken,
  ParamDirectiveToken,
  PrivateDirectiveToken,
  RawToken,
  YAMLDataTypes,
} from "../../tokenizer/tokenizerTypes.js";

export function getFilename(
  tokens: FilenameDirectiveToken[],
  validCheck: boolean
): string | undefined {
  for (const tok of tokens) {
    if (!tok.valid && validCheck) continue;
    return tok.filename?.value;
  }
}
export function getPrivate(
  tokens: PrivateDirectiveToken[],
  validCheck: boolean,
  getTokens: true
): Record<
  string,
  {
    pathParts: string[];
    token: RawToken<string>;
    dirToken: PrivateDirectiveToken;
  }
>;
export function getPrivate(
  tokens: PrivateDirectiveToken[],
  validCheck: boolean,
  getTokens: false
): Record<string, string[]>;
export function getPrivate(
  tokens: PrivateDirectiveToken[],
  validCheck: boolean,
  getTokens: boolean
): Record<
  string,
  | string[]
  | {
      pathParts: string[];
      token: RawToken<string>;
      dirToken: PrivateDirectiveToken;
    }
> {
  let paths: Record<
    string,
    | string[]
    | {
        pathParts: string[];
        token: RawToken<string>;
        dirToken: PrivateDirectiveToken;
      }
  > = {};
  for (const tok of tokens) {
    if (!tok.valid && validCheck) continue;
    for (const [k, { pathParts, token }] of Object.entries(tok.resolvedPaths))
      if (getTokens) paths[k] = { pathParts, token, dirToken: tok };
      else paths[k] = pathParts;
  }
  return paths;
}

export function getImport(
  tokens: ImportDirectiveToken[],
  alias: string,
  validCheck: true
): { path: string; defaultParams: Record<string, unknown> } | undefined;
export function getImport(
  tokens: ImportDirectiveToken[],
  alias: string,
  validCheck: false
):
  | { path: string | undefined; defaultParams: Record<string, unknown> }
  | undefined;
export function getImport(
  tokens: ImportDirectiveToken[],
  alias: string,
  validCheck: boolean
): { path: string; defaultParams: Record<string, unknown> } | undefined {
  for (const tok of tokens) {
    if (!tok.valid && validCheck) continue;
    if (tok.alias?.value === alias)
      return {
        path: tok.path?.value as string,
        defaultParams: tok.resolvedParams,
      };
  }
}

export function getAllImports(
  tokens: ImportDirectiveToken[],
  validCheck: true
): {
  alias: string;
  path: string;
  defaultParams: Record<string, unknown>;
}[];
export function getAllImports(
  tokens: ImportDirectiveToken[],
  validCheck: false
): {
  alias: string | undefined;
  path: string | undefined;
  defaultParams: Record<string, unknown>;
}[];
export function getAllImports(
  tokens: ImportDirectiveToken[],
  validCheck: boolean
): {
  alias: string | undefined;
  path: string | undefined;
  defaultParams: Record<string, unknown>;
}[] {
  const imports: {
    alias: string | undefined;
    path: string | undefined;
    defaultParams: Record<string, unknown>;
  }[] = [];
  for (const tok of tokens) {
    if (!tok.valid && validCheck) continue;
    imports.push({
      alias: tok.alias?.text,
      path: tok.path?.text,
      defaultParams: tok.resolvedParams,
    });
  }
  return imports;
}

export function getParam(
  tokens: ParamDirectiveToken[],
  alias: string,
  validCheck: boolean
): { defauleValue: unknown; yamlType: YAMLDataTypes | undefined } | undefined {
  for (const tok of tokens) {
    if (!tok.valid && validCheck) continue;
    if (tok.alias?.value === alias)
      return {
        defauleValue: tok.defValue?.value,
        yamlType: tok.yamlType?.value as YAMLDataTypes,
      };
  }
}

export function getAllParams(
  tokens: ParamDirectiveToken[],
  validCheck: true
): {
  alias: string;
  defauleValue: unknown;
  yamlType: YAMLDataTypes | undefined;
}[];
export function getAllParams(
  tokens: ParamDirectiveToken[],
  validCheck: false
): {
  alias: string | undefined;
  defauleValue: unknown;
  yamlType: YAMLDataTypes | undefined;
}[];
export function getAllParams(
  tokens: ParamDirectiveToken[],
  validCheck: boolean
): {
  alias: string | undefined;
  defauleValue: unknown;
  yamlType: YAMLDataTypes | undefined;
}[] {
  const params: {
    alias: string | undefined;
    defauleValue: unknown;
    yamlType: YAMLDataTypes | undefined;
  }[] = [];
  for (const tok of tokens) {
    if (!tok.valid && validCheck) continue;
    params.push({
      alias: tok.alias?.text,
      defauleValue: tok.defValue?.value,
      yamlType: tok.yamlType?.value as YAMLDataTypes,
    });
  }
  return params;
}

export function getLocal(
  tokens: LocalDirectiveToken[],
  alias: string,
  validCheck: boolean
): { defauleValue: unknown; yamlType: YAMLDataTypes | undefined } | undefined {
  for (const tok of tokens) {
    if (!tok.valid && validCheck) continue;
    if (tok.alias?.value === alias)
      return {
        defauleValue: tok.defValue?.value,
        yamlType: tok.yamlType?.value as YAMLDataTypes,
      };
  }
}

export function getAllLocals(
  tokens: LocalDirectiveToken[],
  validCheck: true
): {
  alias: string;
  defauleValue: unknown;
  yamlType: YAMLDataTypes | undefined;
}[];
export function getAllLocals(
  tokens: LocalDirectiveToken[],
  validCheck: false
): {
  alias: string | undefined;
  defauleValue: unknown;
  yamlType: YAMLDataTypes | undefined;
}[];
export function getAllLocals(
  tokens: LocalDirectiveToken[],
  validCheck: boolean
): {
  alias: string | undefined;
  defauleValue: unknown;
  yamlType: YAMLDataTypes | undefined;
}[] {
  const locals: {
    alias: string | undefined;
    defauleValue: unknown;
    yamlType: YAMLDataTypes | undefined;
  }[] = [];
  for (const tok of tokens) {
    if (!tok.valid && validCheck) continue;
    locals.push({
      alias: tok.alias?.text,
      defauleValue: tok.defValue?.value,
      yamlType: tok.yamlType?.value as YAMLDataTypes,
    });
  }
  return locals;
}
