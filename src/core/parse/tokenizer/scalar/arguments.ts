import {
  current,
  eof,
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
  Pos,
  type TokenizeTextFunc,
} from "../tokenizerTypes.js";
import { TempParseState } from "../../parseTypes.js";
import { getLinePosFromRange } from "../../utils/random.js";

// main function
export function tokenizeArgs(
  input: string,
  exprTok: ExprToken,
  tempState: TempParseState,
  depth: number,
  tokenizeTextFunc: TokenizeTextFunc
): ArgsToken[] {
  // handle tokens
  let tokens: ArgsToken[] = [];
  let state: ArgsTokenizerState = initArgsTokenState(input);
  while (true) {
    const toks = nextArgsToken(state, tempState, exprTok);
    tokens.push(...toks);
    if (tokens[tokens.length - 1].type === ArgsTokenType.EOF) break;
  }

  // resolve any value tokens using text tokenizer
  for (const t of tokens)
    if (t.type === ArgsTokenType.KEY_VALUE)
      t.keyValueToks = tokenizeKeyValue(
        t.raw ? t.raw : "",
        t,
        tempState,
        depth,
        tokenizeTextFunc
      );

  // return
  return tokens;
}

function nextArgsToken(
  state: ArgsTokenizerState,
  tempState: TempParseState,
  parentTok: ExprToken
): ArgsToken[] {
  // get current character
  const ch = current(state);

  // tokens array
  let tokens: ArgsToken[] = [];

  // if eof reutnr last token
  if (eof(state)) {
    const start = state.pos;
    const pos: Pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: ArgsToken = {
      type: ArgsTokenType.EOF,
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

  if (ch === ",") {
    const start = state.pos;
    const { raw, text } = read(state, start, 1);
    const value = text;
    const pos: Pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    const linePos = getLinePosFromRange(tempState.lineStarts, pos);
    const tok: ArgsToken = {
      type: ArgsTokenType.COMMA,
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

  // handle KeyValue pair token
  const start = state.pos;
  const { raw, text } = readUntilChar(state, start, ",");
  const value = text;
  const pos: Pos = [start, state.pos];
  mergeTokenPosition(pos, parentTok);
  const linePos = getLinePosFromRange(tempState.lineStarts, pos);
  const tok: ArgsToken = {
    type: ArgsTokenType.KEY_VALUE,
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

function initArgsTokenState(input: string): ArgsTokenizerState {
  return {
    input,
    len: input.length,
    pos: 0,
    line: 0,
    absLineStart: 0,
  };
}
