import {
  current,
  eof,
  peek,
  mergeTokenPosition,
  mergeScalarPosition,
  readUntilClose,
  read,
  readUntilChar,
  advance,
} from "../helpers.js";
import { tokenizeExpr } from "./expression.js";
import {
  type TextToken,
  TextTokenType,
  type TextTokenizerState,
  type KeyValueToken,
  Pos,
  RawToken,
  LinePos,
} from "../tokenizerTypes.js";
import { TempParseState } from "../../parseTypes.js";
import { getLinePosFromPos } from "../../utils/random.js";

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
  while (!eof(state) && /\s/.test(current(state))) advance(state); // skip white space at the start
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
        t.raw ?? "",
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

  // define tokens
  let eofToken: TextToken | undefined;
  let exprToken: TextToken | undefined;
  let textToken: TextToken | undefined;
  let omToken: RawToken<string> | undefined;
  let cmToken: RawToken<string> | undefined;

  // define vars
  let start: number;
  let readValue: { raw: string; text: string; present: boolean };
  let value: string;
  let pos: Pos;
  let linePos: [LinePos, LinePos] | undefined;

  // if eof reutnr last token
  if (eof(state)) {
    start = state.pos;
    pos = [start, state.pos];
    if (depth === 0) mergeScalarPosition(pos, tempState);
    if (parentTok) mergeTokenPosition(pos, parentTok);
    linePos = getLinePosFromPos(tempState.lineStarts, pos);
    eofToken = {
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
    tokens.push(eofToken);
    return tokens;
  }

  // handle interpolation opening
  if (peek(state, 2) === "${") {
    // make open mark token
    start = state.pos;
    readValue = read(state, start, 2);
    value = readValue.text;
    pos = [start, state.pos];
    if (depth === 0) mergeScalarPosition(pos, tempState);
    if (parentTok) mergeTokenPosition(pos, parentTok);
    linePos = getLinePosFromPos(tempState.lineStarts, pos);
    omToken = {
      raw: readValue.raw,
      text: readValue.text,
      value,
      quoted: false,
      linePos,
      pos,
    };

    // read expression until "}" mark
    start = state.pos;
    readValue = readUntilClose(state, start, "${", "}");
    value = readValue.text;
    pos = [start, state.pos];
    if (depth === 0) mergeScalarPosition(pos, tempState);
    if (parentTok) mergeTokenPosition(pos, parentTok);
    linePos = getLinePosFromPos(tempState.lineStarts, pos);
    exprToken = {
      type: TextTokenType.EXPR,
      raw: readValue.raw,
      text: readValue.text,
      value,
      quoted: false,
      linePos,
      pos,
      freeExpr: false,
      depth,
    };
    // make close mark token
    start = state.pos;
    readValue = read(state, start, 1);
    if (readValue.present) {
      value = readValue.text;
      pos = [start, state.pos];
      if (depth === 0) mergeScalarPosition(pos, tempState);
      if (parentTok) mergeTokenPosition(pos, parentTok);
      linePos = getLinePosFromPos(tempState.lineStarts, pos);
      cmToken = {
        raw: readValue.raw,
        text: readValue.text,
        value,
        quoted: false,
        linePos,
        pos,
      };
    }
    // if main token (expression token) is present push it
    exprToken.exprMarkOpen = omToken;
    exprToken.exprMarkClose = cmToken;
    tokens.push(exprToken);

    return tokens;
  }

  // handle string starting with non escaped "$" sign
  if (state.pos === 0 && ch === "$") {
    // make "$" mark token
    start = state.pos;
    readValue = read(state, start, 1);
    value = readValue.text;
    pos = [start, state.pos];
    if (depth === 0) mergeScalarPosition(pos, tempState);
    if (parentTok) mergeTokenPosition(pos, parentTok);
    linePos = getLinePosFromPos(tempState.lineStarts, pos);
    omToken = {
      raw: readValue.raw,
      text: readValue.text,
      value,
      quoted: false,
      linePos,
      pos,
    };
    // handle expr token (read until end of the input)
    start = state.pos;
    readValue = read(state, start, Infinity);
    value = readValue.text;
    pos = [start, state.pos];
    if (depth === 0) mergeScalarPosition(pos, tempState);
    if (parentTok) mergeTokenPosition(pos, parentTok);
    linePos = getLinePosFromPos(tempState.lineStarts, pos);
    exprToken = {
      type: TextTokenType.EXPR,
      raw: readValue.raw,
      text: readValue.text,
      value,
      quoted: false,
      linePos,
      pos,
      freeExpr: true,
      depth,
    };
    // if main token (expression token) is present push it
    exprToken.exprMarkOpen = omToken;
    tokens.push(exprToken);

    return tokens;
  }

  // read until first interpolation mark "${"
  start = state.pos;
  readValue = readUntilChar(state, start, "${", true);
  value = readValue.text;
  pos = [start, state.pos];
  if (depth === 0) mergeScalarPosition(pos, tempState);
  if (parentTok) mergeTokenPosition(pos, parentTok);
  linePos = getLinePosFromPos(tempState.lineStarts, pos);
  textToken = {
    type: TextTokenType.TEXT,
    raw: readValue.raw,
    text: readValue.text,
    value,
    quoted: false,
    linePos,
    pos,
    freeExpr: false,
    depth,
  };
  tokens.push(textToken);

  return tokens;
}

// helper to init state
function initTextTokenizerState(input: string): TextTokenizerState {
  return {
    input,
    len: input.length,
    pos: 0,
    line: 0,
  };
}
