import {
  current,
  eof,
  handleLinePos,
  mergeTokenPosition,
  read,
  readUntilChar,
} from "./helpers.js";
import { tokenizeKeyValue } from "./keyValue.js";
import {
  type ArgsToken,
  ArgsTokenType,
  type ArgsTokenizerState,
  type ExprToken,
  type TokenizeTextFunc,
} from "../tokenizerTypes.js";

// main function
export function tokenizeArgs(
  input: string,
  exprTok: ExprToken,
  tokenizeTextFunc: TokenizeTextFunc
): ArgsToken[] {
  // handle tokens
  let tokens: ArgsToken[] = [];
  let state: ArgsTokenizerState = initArgsTokenState(input);
  while (true) {
    const toks = nextArgsToken(state);
    tokens.push(...toks);
    for (const t of toks) mergeTokenPosition(t, exprTok);
    if (tokens[tokens.length - 1].type === ArgsTokenType.EOF) break;
  }

  // resolve any value tokens using text tokenizer
  for (const t of tokens)
    if (t.type === ArgsTokenType.KEY_VALUE)
      t.keyValueToks = tokenizeKeyValue(
        t.raw ? t.raw : "",
        t,
        tokenizeTextFunc
      );

  // return
  return tokens;
}

function nextArgsToken(state: ArgsTokenizerState): ArgsToken[] {
  // get current character
  const ch = current(state);

  // tokens array
  let tokens: ArgsToken[] = [];

  // if eof reutnr last token
  if (eof(state)) {
    const start = state.pos;
    const linePos = handleLinePos(state, start);
    const tok: ArgsToken = {
      type: ArgsTokenType.EOF,
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

  if (ch === ",") {
    const start = state.pos;
    const { raw, text, linePos } = read(state, start, 1);
    const tok: ArgsToken = {
      type: ArgsTokenType.COMMA,
      raw,
      text,
      value: text,
      quoted: false,
      linePos,
      pos: { start, end: state.pos },
    };
    tokens.push(tok);
    return tokens;
  }

  // handle KeyValue pair token
  const start = state.pos;
  const { raw, text, linePos } = readUntilChar(state, start, ",");
  const value = text;
  const tok: ArgsToken = {
    type: ArgsTokenType.KEY_VALUE,
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

function initArgsTokenState(input: string): ArgsTokenizerState {
  return {
    input,
    len: input.length,
    pos: 0,
    line: 0,
    absLineStart: 0,
  };
}
