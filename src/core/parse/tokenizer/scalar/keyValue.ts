import {
  current,
  eof,
  handleLinePos,
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
} from "../tokenizerTypes.js";
import { getValueFromText } from "../../utils/random.js";

// main function
export function tokenizeKeyValue(
  input: string,
  argsTok: ArgsToken,
  tokenizeTextFunc: TokenizeTextFunc
): KeyValueToken[] {
  // handle tokens
  let tokens: KeyValueToken[] = [];
  let state: KeyValueTokenizerState = initArgsTokenState(input);
  while (true) {
    const toks = nextArgsToken(state);
    tokens.push(...toks);
    for (const t of toks) mergeTokenPosition(t, argsTok);
    if (tokens[tokens.length - 1]?.type === KeyValueTokenType.EOF) break;
  }

  // resolve any value tokens using text tokenizer
  for (const t of tokens)
    if (t.type === KeyValueTokenType.VALUE)
      t.valueToks = tokenizeTextFunc(t.raw ? t.raw.trim() : "", t);

  // return
  return tokens;
}

function nextArgsToken(state: KeyValueTokenizerState): KeyValueToken[] {
  // get current character
  const ch = current(state);

  // tokens array
  let tokens: KeyValueToken[] = [];

  // if eof reutnr last token
  if (eof(state)) {
    const start = state.pos;
    const linePos = handleLinePos(state, start);
    const tok: KeyValueToken = {
      type: KeyValueTokenType.EOF,
      raw: "",
      text: "",
      value: "",
      quoted: false,
      linePos,
      pos: { start, end: state.pos },
    };
    tokens.push(tok);
    return tokens;
  }

  if (ch === "=") {
    const start = state.pos;
    const { raw, text, linePos } = read(state, start, 1);
    const tok: KeyValueToken = {
      type: KeyValueTokenType.EQUAL,
      raw,
      text,
      value: text,
      quoted: false,
      linePos,
      pos: { start, end: state.pos },
    };
    tokens.push(tok);
    state.afterEqual = true;
    tokens;
  }

  if (ch === '"' || ch === "'") return readQuoted(state);
  else return readUnQuoted(state);
}

function readQuoted(state: KeyValueTokenizerState): KeyValueToken[] {
  let tokens: KeyValueToken[] = [];
  const start = state.pos;
  const { raw, text, linePos } = readUntilChar(state, start, current(state));
  if (!text) return tokens; // if only white space omit token
  const value = state.afterEqual ? getValueFromText(text) : text;
  const tok: KeyValueToken = {
    type: state.afterEqual ? KeyValueTokenType.VALUE : KeyValueTokenType.KEY,
    raw,
    text,
    value,
    quoted: true,
    linePos,
    pos: { start, end: state.pos },
  };
  tokens.push(tok);

  return tokens;
}

function readUnQuoted(state: KeyValueTokenizerState): KeyValueToken[] {
  let tokens: KeyValueToken[] = [];
  const start = state.pos;
  const { raw, text, linePos } = readUntilChar(state, start, ["=", ","]);
  if (!text) return tokens; // if only white space omit token
  const value = state.afterEqual ? getValueFromText(text) : text;
  const tok: KeyValueToken = {
    type: state.afterEqual ? KeyValueTokenType.VALUE : KeyValueTokenType.KEY,
    raw,
    text,
    value,
    quoted: false,
    linePos,
    pos: { start, end: state.pos },
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
