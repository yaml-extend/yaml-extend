import {
  current,
  eof,
  mergeTokenPosition,
  read,
  readUntilChar,
} from "./helpers.js";
import {
  type KeyValueToken,
  KeyValueTokenType,
  type KeyValueTokenizerState,
  type ArgsToken,
  type TokenizeTextFunc,
  Pos,
} from "../tokenizerTypes.js";
import { getLinePosFromRange, getValueFromText } from "../../utils/random.js";
import { TempParseState } from "../../parseTypes.js";

// main function
export function tokenizeKeyValue(
  input: string,
  argsTok: ArgsToken,
  tempState: TempParseState,
  depth: number,
  tokenizeTextFunc: TokenizeTextFunc
): KeyValueToken[] {
  // handle tokens
  let tokens: KeyValueToken[] = [];
  let state: KeyValueTokenizerState = initArgsTokenState(input);
  while (true) {
    const toks = nextArgsToken(state, tempState, argsTok);
    tokens.push(...toks);
    if (tokens[tokens.length - 1]?.type === KeyValueTokenType.EOF) break;
  }

  // resolve any value tokens using text tokenizer
  for (const t of tokens)
    if (t.type === KeyValueTokenType.VALUE)
      t.valueToks = tokenizeTextFunc(
        t.raw ? t.raw.trim() : "",
        t,
        tempState,
        depth
      );

  // return
  return tokens;
}

function nextArgsToken(
  state: KeyValueTokenizerState,
  tempState: TempParseState,
  parentTok: ArgsToken
): KeyValueToken[] {
  // get current character
  const ch = current(state);

  // tokens array
  let tokens: KeyValueToken[] = [];

  // if eof reutnr last token
  if (eof(state)) {
    const start = state.pos;
    const pos: Pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: KeyValueToken = {
      type: KeyValueTokenType.EOF,
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

  if (ch === "=") {
    const start = state.pos;
    const { raw, text } = read(state, start, 1);
    const value = text;
    const pos: Pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: KeyValueToken = {
      type: KeyValueTokenType.EQUAL,
      raw,
      text,
      value,
      quoted: false,
      linePos,
      pos,
    };
    tokens.push(tok);
    state.afterEqual = true;
    tokens;
  }

  if (ch === '"' || ch === "'") return readQuoted(state, tempState, parentTok);
  else return readUnQuoted(state, tempState, parentTok);
}

function readQuoted(
  state: KeyValueTokenizerState,
  tempState: TempParseState,
  parentTok: ArgsToken
): KeyValueToken[] {
  let tokens: KeyValueToken[] = [];
  const start = state.pos;
  const { raw, text } = readUntilChar(state, start, current(state));
  if (!text) return tokens; // if only white space omit token
  const value = state.afterEqual ? getValueFromText(text) : text;
  const pos: Pos = [start, state.pos];
  mergeTokenPosition(pos, parentTok);
  const linePos = getLinePosFromRange(tempState.lineStarts, pos);
  const tok: KeyValueToken = {
    type: state.afterEqual ? KeyValueTokenType.VALUE : KeyValueTokenType.KEY,
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

function readUnQuoted(
  state: KeyValueTokenizerState,
  tempState: TempParseState,
  parentTok: ArgsToken
): KeyValueToken[] {
  let tokens: KeyValueToken[] = [];
  const start = state.pos;
  const { raw, text } = readUntilChar(state, start, ["=", ","]);
  if (!text) return tokens; // if only white space omit token
  const value = state.afterEqual ? getValueFromText(text) : text;
  const pos: Pos = [start, state.pos];
  mergeTokenPosition(pos, parentTok);
  const linePos = getLinePosFromRange(tempState.lineStarts, pos);
  const tok: KeyValueToken = {
    type: state.afterEqual ? KeyValueTokenType.VALUE : KeyValueTokenType.KEY,
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

function initArgsTokenState(input: string): KeyValueTokenizerState {
  return {
    input,
    len: input.length,
    pos: 0,
    line: 0,
    absLineStart: 0,
    afterEqual: false,
  };
}
