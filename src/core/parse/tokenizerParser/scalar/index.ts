import { YAMLExprError } from "../../../extendClasses/error.js";
import { tokenizeScalar } from "../../tokenizer/scalar/index.js";
import {
  TextTokenType,
  type TextToken,
  ExprTokenType,
  type ExprToken,
  ArgsTokenType,
  type ArgsToken,
  KeyValueTokenType,
  type KeyValueToken,
} from "../../tokenizer/tokenizerTypes.js";
import { handleThis } from "./this.js";
import { handleImport } from "./import.js";
import { handleParam } from "./param.js";
import { handleLocal } from "./local.js";
import { ParseState, TempParseState } from "../../parseTypes.js";
import {
  getAllImports,
  getAllLocals,
  getAllParams,
} from "../directives/index.js";
import { Scalar } from "yaml";

export type Context = {
  textToken: TextToken;
  paths: { path: string; tok: ExprToken }[];
  args: { argsObj: Record<string, unknown>; tok: ExprToken } | undefined;
  type: { type: "as scalar" | "as map" | "as seq"; tok: ExprToken } | undefined;
  prevTokenType: "path" | "dot" | undefined;
  argsDefined: boolean;
  typeDefined: boolean;
  whiteSpaceDefined: boolean;
};

/**
 * Method to resolve interpolations. works sync.
 * @param expr - Expression that will be handled.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value returned from expression resolve.
 */
export async function handleScalar(
  input: string,
  scalar: Scalar,
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  // tokenize scalar
  const tokens = tokenizeScalar(input, tempState);
  // add tokens to cache
  const cache = state.cache.get(tempState.resolvedPath);
  if (cache) {
    if (cache.scalarTokens[input])
      cache.scalarTokens[input].scalars.push(scalar);
    else cache.scalarTokens[input] = { scalars: [scalar], tokens };
  }
  // handle tokens and return them
  return await handleTextTokens(tokens, state, tempState);
}

async function handleTextTokens(
  tokens: TextToken[] | undefined,
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  if (!tokens) return undefined;
  // get first tokend and check if it's free expression or not
  const t1 = tokens[0];
  if (!t1) return undefined;
  const freeExpr = t1.freeExpr;
  // if free expression handle expression tokens directly
  if (freeExpr)
    return await handleExprTokens(
      tokens[0],
      tokens[0].exprTokens,
      state,
      tempState
    );
  // handle interpolated text
  let out: string = "";
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === TextTokenType.TEXT) out += tok.text;
    if (tok.type === TextTokenType.EXPR) {
      const value = await handleExprTokens(
        tok,
        tok.exprTokens,
        state,
        tempState
      );
      const textValue =
        typeof value === "string" ? value : JSON.stringify(value);
      out += textValue;
    }
    i++;
  }
  return out;
}

async function handleExprTokens(
  textToken: TextToken,
  tokens: ExprToken[] | undefined,
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  if (!tokens) return undefined;
  // expression state and error definition
  const ctx: Context = {
    textToken,
    paths: [],
    args: undefined,
    type: undefined,
    prevTokenType: undefined,
    argsDefined: false,
    typeDefined: false,
    whiteSpaceDefined: false,
  };
  // loop tokens
  for (const tok of tokens) {
    // if path token handle it
    if (tok.type === ExprTokenType.PATH) {
      // make sure that no two path tokens are repeated
      if (ctx.prevTokenType === "path")
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Path tokens should be separated by dots."
          )
        );
      ctx.prevTokenType = "path";
      // push path text
      ctx.paths.push({ path: tok.text as string, tok });
    }

    // if dot token handle it
    if (tok.type === ExprTokenType.DOT) {
      // make sure that no two dot tokens are repeated
      if (ctx.prevTokenType === "dot")
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Path should be present after each dot."
          )
        );
      ctx.prevTokenType = "dot";
    }

    // if args token handle it
    if (tok.type === ExprTokenType.ARGS) {
      // make sure that args token is defined only once
      if (ctx.argsDefined) {
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Each expression can only contain one arguments parenthesis."
          )
        );
        continue;
      }
      ctx.argsDefined = true;
      // handle args
      const args = await handleArgTokens(tok.argTokens, state, tempState);
      ctx.args ??= { argsObj: {}, tok };
      for (const [k, v] of Object.entries(args)) ctx.args.argsObj[k] = v;
    }

    // if type token handle it
    if (tok.type === ExprTokenType.TYPE) {
      // make sure that type token is defined only once
      if (ctx.typeDefined) {
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Each expression can only contain one type definition."
          )
        );
        continue;
      }
      ctx.typeDefined = true;
      // set type
      ctx.type = { type: tok.text.trim() as "as scalar", tok };
    }

    // if white space token handle it
    if (tok.type === ExprTokenType.WHITE_SPACE) {
      // make sure that white space token is defined only once
      if (ctx.whiteSpaceDefined) {
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            `Each expression can only contain one white space before type definition, if it's a part of a path wrap it inside "" or ''.`
          )
        );
        continue;
      }
    }
  }

  // get base (first path) and verify it
  const baseTok = ctx.paths[0];
  if (!verifyBase(baseTok.path)) {
    tempState.errors.push(
      new YAMLExprError(
        [baseTok.tok.pos.start, baseTok.tok.pos.end],
        "",
        "Invalid base, allowed bases are either: 'this', 'import', 'param' or 'local'."
      )
    );
    return undefined;
  }

  // get alias (second path) and verify it
  const aliasTok = ctx.paths[1];
  if (!aliasTok) {
    tempState.errors.push(
      new YAMLExprError(
        [baseTok.tok.pos.end, baseTok.tok.pos.end + 1],
        "",
        "You have to pass an alias after expression base"
      )
    );
    return undefined;
  }
  if (!verifyAlias(aliasTok.path, baseTok.path as "import", state, tempState)) {
    tempState.errors.push(
      new YAMLExprError(
        [aliasTok.tok.pos.start, aliasTok.tok.pos.end],
        "",
        "Alias used is not defined in directives"
      )
    );
    return undefined;
  }

  // verify arguments if passed
  if (ctx.args && baseTok.path !== "this" && baseTok.path !== "import") {
    tempState.errors.push(
      new YAMLExprError(
        [ctx.args.tok.pos.start, ctx.args.tok.pos.end],
        "",
        "Arguments will be ignored, they are used with 'this' or 'import' bases only."
      )
    );
  }

  // verify type if passed
  if (ctx.type) {
    if (baseTok.path !== "this" && baseTok.path !== "import")
      tempState.errors.push(
        new YAMLExprError(
          [ctx.type.tok.pos.start, ctx.type.tok.pos.end],
          "",
          "Type will be ignored, it's used with 'this' or 'import' bases only."
        )
      );
    if (!verifyType(ctx.type.type)) {
      tempState.errors.push(
        new YAMLExprError(
          [ctx.type.tok.pos.start, ctx.type.tok.pos.end],
          "",
          "Invalid type, allowed types are either: 'as scalar', 'as map' or 'as seq'."
        )
      );
      ctx.type = undefined;
    }
  }

  // resolve
  switch (baseTok.path) {
    case "this":
      return handleThis(ctx, state, tempState);
    case "import":
      return handleImport(ctx, state, tempState);
    case "param":
      return handleParam(ctx, state, tempState);
    case "local":
      return handleLocal(ctx, state, tempState);
  }
}

function verifyBase(base: string | undefined): boolean {
  switch (base) {
    case "import":
      return true;
    case "this":
      return true;
    case "local":
      return true;
    case "param":
      return true;
    default:
      return false;
  }
}

function verifyAlias(
  alias: string | undefined,
  base: "import" | "this" | "local" | "param",
  state: ParseState,
  tempState: TempParseState
): boolean {
  if (!alias) return false;
  const cache = state.cache.get(tempState.resolvedPath);
  if (!cache) return false;
  switch (base) {
    case "import":
      const imports = getAllImports(cache.directives.import, false);
      return imports.some((i) => i.alias === alias);
    case "local":
      const locals = getAllLocals(cache.directives.local, false);
      return locals.some((i) => i.alias === alias);
    case "param":
      const params = getAllParams(cache.directives.param, false);
      return params.some((i) => i.alias === alias);
    case "this":
      return !!alias;
  }
}

function verifyType(type: string): boolean {
  switch (type) {
    case "as scalar":
      return true;
    case "as map":
      return true;
    case "as seq":
      return true;
    default:
      return false;
  }
}

async function handleArgTokens(
  tokens: ArgsToken[] | undefined,
  state: ParseState,
  tempState: TempParseState
): Promise<Record<string, unknown>> {
  if (!tokens) return { args: {}, errors: [] };
  // var to hold args object
  let args: Record<string, unknown> = {};
  // loop args tokens
  let prevTokenType: "keyValue" | "comma" | undefined;
  for (const tok of tokens) {
    // if comma token handle itt
    if (tok.type === ArgsTokenType.COMMA) {
      // make sure that no two comma tokens are repeated
      if (prevTokenType === "comma")
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Key value pair should be present after each comma."
          )
        );
      prevTokenType = "comma";
    }
    // if key value pair token handle it
    if (tok.type === ArgsTokenType.KEY_VALUE) {
      // make sure that no two key value tokens are repeated (should never happen)
      if (prevTokenType === "keyValue")
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Key value pairs should be separeted by comma."
          )
        );
      prevTokenType === "keyValue";
      // resolve key value token
      const { key, value } = await handleKeyValueTokens(
        tok.keyValueToks,
        state,
        tempState
      );
      // add key value pair or push error if no key was present
      if (!key) {
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Messing key from key value pair."
          )
        );
        continue;
      }
      args[key] = value;
    }
  }
  return args;
}

async function handleKeyValueTokens(
  tokens: KeyValueToken[] | undefined,
  state: ParseState,
  tempState: TempParseState
): Promise<{
  key: string | undefined;
  value: unknown;
}> {
  if (!tokens) return { key: undefined, value: undefined };
  // key value parts
  let key: string | undefined;
  let value: unknown;
  // loop tokens
  let prevTokenType: "key" | "value" | undefined;
  for (const tok of tokens) {
    // if key token handle it
    if (tok.type === KeyValueTokenType.KEY) {
      // make sure that no two key tokens are repeated
      if (prevTokenType === "key")
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Only one key can be used in key=value pair."
          )
        );

      // handle key
      prevTokenType = "key";
      key = tok.text as string;
    }
    // if value token handle it
    if (tok.type === KeyValueTokenType.VALUE) {
      // make sure that no two value tokens are repeated
      if (prevTokenType === "value")
        tempState.errors.push(
          new YAMLExprError(
            [tok.pos.start, tok.pos.end],
            "",
            "Only one value can be used in key=value pair."
          )
        );
      // handle value
      prevTokenType = "value";
      value = await handleTextTokens(tok.valueToks, state, tempState);
    }
  }
  return { key, value };
}
