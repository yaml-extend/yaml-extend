import { TempParseState } from "../../parseTypes.js";
import { getLinePosFromPos } from "../../utils/random.js";
import { read, readUntilClose } from "../scalar/helpers.js";
import {
  DirectiveKeyValueToken,
  RawToken,
  Pos,
  LinePos,
  DirectiveKeyValueTokenizerState,
} from "../tokenizerTypes.js";
import { advance, current, eof } from "./helpers.js";

export function handleKeyValue(
  input: string,
  parentTok: DirectiveKeyValueToken,
  tempState: TempParseState
): {
  keyToken: DirectiveKeyValueToken["keyToken"] | undefined;
  equalToken: DirectiveKeyValueToken["equalToken"] | undefined;
  valueToken: DirectiveKeyValueToken["valueToken"] | undefined;
} {
  // make new state
  const state = initState(input);

  // define tokens
  let keyToken: DirectiveKeyValueToken["keyToken"];
  let equalToken: DirectiveKeyValueToken["equalToken"];
  let valueToken: DirectiveKeyValueToken["valueToken"];

  // define vars
  let start: number;
  let readValue: { raw: string; text: string; present: boolean };
  let value: string;
  let pos: Pos;
  let linePos: [LinePos, LinePos] | undefined;

  // define character and check
  const ch = current(state);

  // read until first equal
  if (ch === "=") {
    start = state.pos;
    readValue = read(state, start, 1);
    value = readValue.text;
    pos = [start, state.pos];
    linePos = getLinePosFromPos(tempState.lineStarts, pos);
    equalToken = {
      raw: readValue.raw,
      text: readValue.text,
      value,
      quoted: false,
      linePos,
      pos,
    };
    state.afterEqual = true;
  }

  return { keyToken, equalToken, valueToken };
}

function initState(input: string): DirectiveKeyValueTokenizerState {
  return {
    input,
    len: input.length,
    pos: 0,
    line: 0,
    afterEqual: false,
  };
}
