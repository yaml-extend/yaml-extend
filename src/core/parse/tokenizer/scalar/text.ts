import {
  current,
  eof,
  advance,
  peek,
  mergeTokenPosition,
  mergeScalarPosition,
  readUntilClose,
  read,
  readUntilChar,
} from "./helpers.js";
import { tokenizeExpr } from "./expression.js";
import {
  type TextToken,
  TextTokenType,
  type TextTokenizerState,
  type KeyValueToken,
  Pos,
} from "../tokenizerTypes.js";
import { TempParseState } from "../../parseTypes.js";
import { getLinePosFromRange } from "../../utils/random.js";

// main function
export function tokenizeText(
  input: string,
  keyValueTok: KeyValueToken | undefined,
  tempState: TempParseState,
  depth: number = 0
): TextToken[] {
  // handle tokens
  let state = initTextTokenizerState(input);
  let tokens: TextToken[] = [];
  while (true) {
    const toks = nextTextToken(state, tempState, keyValueTok, depth);
    tokens.push(...toks);
    if (tokens[tokens.length - 1].type === TextTokenType.EOF) break;
  }

  // increment depth
  depth++;

  // tokenize expression inside EXPR tokens
  for (const t of tokens)
    if (t.type === TextTokenType.EXPR)
      t.exprTokens = tokenizeExpr(
        t.raw ? t.raw : "",
        t,
        tempState,
        depth,
        tokenizeText
      );

  // return
  return tokens;
}

export type TokenizeTextFunc = typeof tokenizeText;

// function to get next token
function nextTextToken(
  state: TextTokenizerState,
  tempState: TempParseState,
  parentTok: KeyValueToken | undefined,
  depth: number
): TextToken[] {
  // get current character
  const ch = current(state);

  // tokens array
  let tokens: TextToken[] = [];

  // if eof reutnr last token
  if (eof(state)) {
    const start = state.pos;
    const pos: Pos = [start, state.pos];
    if (depth === 0) mergeScalarPosition(pos, tempState);
    if (parentTok) mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: TextToken = {
      type: TextTokenType.EOF,
      raw: "",
      text: "",
      value: "",
      quoted: false,
      linePos,
      pos,
      freeExpr: false,
      depth,
    };
    tokens.push(tok);
    return tokens;
  }

  // handle interpolation opening
  if (peek(state, 2) === "${") {
    // skip the "${" sign
    state.pos = advance(state, 2);
    // loop until "}" mark
    const start = state.pos;
    const { raw, text } = readUntilClose(state, start, "${", "}");
    const value = text;
    const pos: Pos = [start, state.pos];
    if (depth === 0) mergeScalarPosition(pos, tempState);
    if (parentTok) mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: TextToken = {
      type: TextTokenType.EXPR,
      raw,
      text,
      value,
      quoted: false,
      linePos,
      pos,
      freeExpr: false,
      depth,
    };
    tokens.push(tok);
    // skip "}"
    state.pos = advance(state);
    return tokens;
  }

  // handle string starting with non escaped "$" sign
  if (state.pos === 0 && ch === "$") {
    // skip "$" mark
    state.pos = advance(state);
    // handle expr token (read until end of the input)
    const start = state.pos;
    const { raw, text } = read(state, start, Infinity);
    const value = text;
    const pos: Pos = [start, state.pos];
    if (depth === 0) mergeScalarPosition(pos, tempState);
    if (parentTok) mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const exprTok: TextToken = {
      type: TextTokenType.EXPR,
      raw,
      text,
      value,
      quoted: false,
      linePos,
      pos,
      freeExpr: true,
      depth,
    };
    tokens.push(exprTok);
    return tokens;
  }

  // read until first interpolation mark "${"
  const start = state.pos;
  const { raw, text } = readUntilChar(state, start, "${", true);
  const value = text;
  const pos: Pos = [start, state.pos];
  if (depth === 0) mergeScalarPosition(pos, tempState);
  if (parentTok) mergeTokenPosition(pos, parentTok);
  const linePos = getLinePosFromRange(tempState.lineStarts, pos);
  const textTok: TextToken = {
    type: TextTokenType.TEXT,
    raw,
    text,
    value,
    quoted: false,
    linePos,
    pos,
    freeExpr: false,
    depth,
  };
  tokens.push(textTok);
  return tokens;
}

// helper to init state
function initTextTokenizerState(input: string): TextTokenizerState {
  return {
    input,
    len: input.length,
    pos: 0,
    line: 0,
    absLineStart: 0,
  };
}
