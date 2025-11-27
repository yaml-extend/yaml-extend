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
  LinePos,
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
        t.raw ? t.raw.trim() : "",
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

  // define tokens
  let eofToken: ArgsToken | undefined;
  let commaToken: ArgsToken | undefined;
  let keyValueToken: ArgsToken | undefined;

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
    linePos = getLinePosFromRange(tempState.lineStarts, pos);
    eofToken = {
      type: ArgsTokenType.EOF,
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

  if (ch === ",") {
    start = state.pos;
    readValue = read(state, start, 1);
    if (readValue) {
      value = readValue.text;
      pos = [start, state.pos];
      mergeTokenPosition(pos, parentTok);
      linePos = getLinePosFromRange(tempState.lineStarts, pos);
      commaToken = {
        type: ArgsTokenType.COMMA,
        raw: readValue.raw,
        text: readValue.text,
        value,
        quoted: false,
        linePos,
        pos,
      };
      tokens.push(commaToken);
    }
    return tokens;
  }

  // handle KeyValue pair token
  start = state.pos;
  readValue = readUntilChar(state, start, ",");
  if (readValue) {
    value = readValue.text;
    pos = [start, state.pos];
    mergeTokenPosition(pos, parentTok);
    linePos = getLinePosFromRange(tempState.lineStarts, pos);
    keyValueToken = {
      type: ArgsTokenType.KEY_VALUE,
      raw: readValue.raw,
      text: readValue.text,
      value,
      quoted: false,
      linePos,
      pos,
    };
    tokens.push(keyValueToken);
  }

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
