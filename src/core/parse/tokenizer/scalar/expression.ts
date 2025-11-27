import {
  current,
  eof,
  advance,
  mergeTokenPosition,
  readUntilClose,
  read,
  readUntilChar,
} from "./helpers.js";
import { tokenizeArgs } from "./arguments.js";
import {
  type ExprToken,
  ExprTokenType,
  type ExprTokenizerState,
  Pos,
  type TextToken,
  type TokenizeTextFunc,
} from "../tokenizerTypes.js";
import { TempParseState } from "../../parseTypes.js";
import { getLinePosFromRange } from "../../utils/random.js";

// main function
export function tokenizeExpr(
  input: string,
  textTok: TextToken,
  tempState: TempParseState,
  depth: number,
  tokenizeTextFunc: TokenizeTextFunc
): ExprToken[] {
  // handle tokens
  let tokens: ExprToken[] = [];
  let state = initExprTokenState(input);
  while (true) {
    const toks = nextExprToken(state, tempState, textTok);
    tokens.push(...toks);
    if (tokens[tokens.length - 1].type === ExprTokenType.EOF) break;
  }

  // tokenize args inside ARGS token
  for (const t of tokens)
    if (t.type === ExprTokenType.ARGS)
      t.argTokens = tokenizeArgs(
        t.raw ? t.raw : "",
        t,
        tempState,
        depth,
        tokenizeTextFunc
      );

  // return
  return tokens;
}

function nextExprToken(
  state: ExprTokenizerState,
  tempState: TempParseState,
  parentTok: TextToken
): ExprToken[] {
  // get current character
  const ch = current(state);

  // tokens array
  let tokens: ExprToken[] = [];

  // if eof reutnr last token
  if (eof(state)) {
    const start = state.pos;
    const pos: Pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: ExprToken = {
      type: ExprTokenType.EOF,
      raw: "",
      text: "",
      value: "",
      quoted: false,
      linePos,
      pos,
    };
    tokens.push(tok);
    return tokens;
  }

  // if dot return dot token, not that it can only be used before any white spaces present
  if (ch === "." && !state.afterWhiteSpace) {
    const start = state.pos;
    const { raw, text } = read(state, start, 1);
    const pos: Pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: ExprToken = {
      type: ExprTokenType.DOT,
      raw,
      text,
      value: text,
      quoted: false,
      linePos,
      pos,
    };
    tokens.push(tok);
    return tokens;
  }

  // handle opening "("
  if (ch === "(" && !state.afterParen) {
    // skip "(" sign
    state.pos = advance(state);
    // loop until ")" mark
    const start = state.pos;
    const { raw, text } = readUntilClose(state, start, "(", ")");
    const value = text;
    const pos: Pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: ExprToken = {
      type: ExprTokenType.ARGS,
      raw,
      text,
      value,
      quoted: false,
      linePos,
      pos,
    };
    tokens.push(tok);
    // skip "(" sign
    state.pos = advance(state);
    state.afterParen = true;
    // return
    return tokens;
  }

  // if whitespace return white space token and every text after it will be type token
  if (/\s/.test(ch)) {
    // handle white space token
    let start = state.pos;
    const { raw: wRaw, text: wText } = readUntilChar(state, start, /\s/, true);
    const wPos: Pos = [start, state.pos];
    mergeTokenPosition(wPos, parentTok);
    const wLinePos = getLinePosFromRange(tempState.lineStarts, wPos);
    const wTok: ExprToken = {
      type: ExprTokenType.WHITE_SPACE,
      raw: wRaw,
      text: wText,
      value: wText,
      quoted: false,
      linePos: wLinePos,
      pos: wPos,
    };
    tokens.push(wTok);
    state.afterWhiteSpace = true;
    // handle type token
    start = state.pos;
    const { raw: tRaw, text: tText } = read(state, start, Infinity);
    const tPos: Pos = [start, state.pos];
    mergeTokenPosition(tPos, parentTok);
    const tLnePos = getLinePosFromRange(tempState.lineStarts, tPos);
    const exprTok: ExprToken = {
      type: ExprTokenType.TYPE,
      raw: tRaw,
      text: tText,
      value: tText,
      quoted: false,
      linePos: tLnePos,
      pos: tPos,
    };
    tokens.push(exprTok);
    return tokens;
  }

  if (ch === '"' || ch === "'")
    return readQuotedPath(state, tempState, parentTok);
  else return readPath(state, tempState, parentTok);
}

function readQuotedPath(
  state: ExprTokenizerState,
  tempState: TempParseState,
  parentTok: TextToken
): ExprToken[] {
  let tokens: ExprToken[] = [];
  const start = state.pos;
  const { raw, text } = readUntilChar(state, start, current(state));
  const value = text;
  const pos: Pos = [start, state.pos];
  mergeTokenPosition(pos, parentTok);
  const linePos = getLinePosFromRange(tempState.lineStarts, pos);
  const tok: ExprToken = {
    type: ExprTokenType.PATH,
    raw,
    text,
    value,
    quoted: true,
    linePos,
    pos,
  };
  tokens.push(tok);
  return tokens;
}

function readPath(
  state: ExprTokenizerState,
  tempState: TempParseState,
  parentTok: TextToken
): ExprToken[] {
  let tokens: ExprToken[] = [];
  let out = "";
  const start = state.pos;

  // Manual loop here to add custom check
  while (!eof(state)) {
    const ch = current(state);

    if (ch === "." || (ch === "(" && !state.afterParen)) break;

    if (ch === "\\") {
      state.pos = advance(state);
      if (eof(state)) break;
      const esc = current(state);
      const map: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        "'": "'",
        '"': '"',
        "\\": "\\",
      };
      out += map[esc] ?? esc;
      state.pos = advance(state);
      continue;
    }

    out += ch;
    state.pos = advance(state);
  }

  const raw = state.input.slice(start, state.pos);
  const text = out.trim();
  const value = text;
  const pos: Pos = [start, state.pos];
  mergeTokenPosition(pos, parentTok);
  const linePos = getLinePosFromRange(tempState.lineStarts, pos);
  const tok: ExprToken = {
    type: ExprTokenType.PATH,
    raw,
    text,
    value,
    quoted: false,
    linePos,
    pos,
  };
  tokens.push(tok);
  return tokens;
}

function initExprTokenState(input: string): ExprTokenizerState {
  return {
    input,
    len: input.length,
    pos: 0,
    line: 0,
    absLineStart: 0,
    afterParen: false,
    afterWhiteSpace: false,
  };
}
