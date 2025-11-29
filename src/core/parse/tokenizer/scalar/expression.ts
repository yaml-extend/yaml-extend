import {
  current,
  eof,
  advance,
  mergeTokenPosition,
  readUntilClose,
  read,
  readUntilChar,
  readUntilCharInclusive,
} from "./helpers.js";
import { tokenizeArgs } from "./arguments.js";
import {
  type ExprToken,
  ExprTokenType,
  type ExprTokenizerState,
  LinePos,
  Pos,
  RawToken,
  type TextToken,
  type TokenizeTextFunc,
} from "../tokenizerTypes.js";
import { TempParseState } from "../../parseTypes.js";
import { getLinePosFromPos } from "../../utils/random.js";

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
  while (!eof(state) && /\s/.test(current(state))) state.pos = advance(state); // skip white space at the start
  while (true) {
    const toks = nextExprToken(state, tempState, textTok);
    tokens.push(...toks);
    if (tokens[tokens.length - 1].type === ExprTokenType.EOF) break;
  }

  // tokenize args inside ARGS token
  for (const t of tokens)
    if (t.type === ExprTokenType.ARGS)
      t.argsTokens = tokenizeArgs(
        t.raw ?? "",
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

  // define tokens
  let eofToken: ExprToken | undefined;
  let dotToken: ExprToken | undefined;
  let argsToken: ExprToken | undefined;
  let omToken: RawToken<string> | undefined;
  let cmToken: RawToken<string> | undefined;
  let wsToken: ExprToken | undefined;
  let typeToken: ExprToken | undefined;

  // define vars
  let start: number;
  let readValue: { raw: string; text: string } | undefined;
  let value: string;
  let pos: Pos;
  let linePos: [LinePos, LinePos] | undefined;

  // if eof reutnr last token
  if (eof(state)) {
    start = state.pos;
    pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    linePos = getLinePosFromPos(tempState.lineStarts, pos);
    eofToken = {
      type: ExprTokenType.EOF,
      raw: "",
      text: "",
      value: "",
      quoted: false,
      linePos,
      pos,
    };
    tokens.push(eofToken);
    return tokens;
  }

  // if dot return dot token, not that it can only be used before any white spaces present
  if (ch === "." && !state.afterWhiteSpace) {
    start = state.pos;
    readValue = read(state, start, 1);
    if (readValue) {
      value = readValue.text;
      pos = [start, state.pos];
      mergeTokenPosition(pos, parentTok);
      linePos = getLinePosFromPos(tempState.lineStarts, pos);
      dotToken = {
        type: ExprTokenType.DOT,
        raw: readValue.raw,
        text: readValue.text,
        value,
        quoted: false,
        linePos,
        pos,
      };
    }
    if (dotToken) {
      tokens.push(dotToken);
    }
    return tokens;
  }

  // handle opening "("
  if (ch === "(" && !state.afterParen) {
    // make open mark token
    start = state.pos;
    readValue = read(state, start, 1);
    if (readValue) {
      value = readValue.text;
      pos = [start, state.pos];
      mergeTokenPosition(pos, parentTok);
      linePos = getLinePosFromPos(tempState.lineStarts, pos);
      omToken = {
        raw: readValue.raw,
        text: readValue.text,
        value,
        quoted: false,
        linePos,
        pos,
      };
    }
    // read arguments until ")" mark
    start = state.pos;
    readValue = readUntilClose(state, start, "(", ")");
    if (readValue) {
      value = readValue.text;
      pos = [start, state.pos];
      mergeTokenPosition(pos, parentTok);
      linePos = getLinePosFromPos(tempState.lineStarts, pos);
      argsToken = {
        type: ExprTokenType.ARGS,
        raw: readValue.raw,
        text: readValue.text,
        value,
        quoted: false,
        linePos,
        pos,
      };
    }
    // make close mark token
    start = state.pos;
    readValue = read(state, start, 1);
    if (readValue) {
      value = readValue.text;
      pos = [start, state.pos];
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
    // if main token (arguments token) is present push it
    if (argsToken) {
      argsToken.argsMarkOpen = omToken;
      argsToken.argsMarkClose = cmToken;
      tokens.push(argsToken);
      // set after paren to true to prevent identifying other arguments block in the expression
      state.afterParen = true;
    }
    return tokens;
  }

  // if whitespace return white space token and every text after it will be type token
  if (/\s/.test(ch)) {
    // handle white space token
    start = state.pos;
    readValue = readUntilChar(state, start, /\S/, true);
    if (readValue) {
      value = readValue.text;
      pos = [start, state.pos];
      mergeTokenPosition(pos, parentTok);
      linePos = getLinePosFromPos(tempState.lineStarts, pos);
      wsToken = {
        type: ExprTokenType.WHITE_SPACE,
        raw: readValue.raw,
        text: readValue.text,
        value,
        quoted: false,
        linePos,
        pos,
      };
      tokens.push(wsToken);
      // set white space to true to prevent identifying other white spaces in expression
      state.afterWhiteSpace = true;
    }

    // handle type token
    start = state.pos;
    readValue = read(state, start, Infinity);
    if (readValue) {
      value = readValue.text;
      pos = [start, state.pos];
      mergeTokenPosition(pos, parentTok);
      linePos = getLinePosFromPos(tempState.lineStarts, pos);
      typeToken = {
        type: ExprTokenType.TYPE,
        raw: readValue.raw,
        text: readValue.text,
        value,
        quoted: false,
        linePos,
        pos,
      };
      tokens.push(typeToken);
    }
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
  const readValue = readUntilCharInclusive(state, start, current(state));
  if (!readValue) return [];
  const value = readValue.text;
  const pos: Pos = [start, state.pos];
  mergeTokenPosition(pos, parentTok);
  const linePos = getLinePosFromPos(tempState.lineStarts, pos);
  const tok: ExprToken = {
    type: state.baseDefined ? ExprTokenType.PATH : ExprTokenType.BASE,
    raw: readValue.raw,
    text: readValue.text,
    value,
    quoted: true,
    linePos,
    pos,
  };
  tokens.push(tok);
  state.baseDefined = true; // set baseDefined to true so only first path is defined as base
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

    if (ch === "." || (ch === "(" && !state.afterParen) || /\s/.test(ch)) break;

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
  const linePos = getLinePosFromPos(tempState.lineStarts, pos);
  const tok: ExprToken = {
    type: state.baseDefined ? ExprTokenType.PATH : ExprTokenType.BASE,
    raw,
    text,
    value,
    quoted: false,
    linePos,
    pos,
  };
  tokens.push(tok);
  state.baseDefined = true; // set baseDefined to true so only first path is defined as base
  return tokens;
}

function initExprTokenState(input: string): ExprTokenizerState {
  return {
    input,
    len: input.length,
    pos: 0,
    line: 0,
    absLineStart: 0,
    baseDefined: false,
    afterParen: false,
    afterWhiteSpace: false,
  };
}
