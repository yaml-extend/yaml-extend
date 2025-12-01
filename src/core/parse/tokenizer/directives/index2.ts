import { TempParseState } from "../../parseTypes.js";
import { read, readUntilClose, advance, current, eof } from "../helpers.js";
import {
  DirectiveTokenizerState,
  DirectiveKeyValueToken,
  DirectiveStringToken,
  Pos,
  LinePos,
  DirectiveMainToken,
} from "../tokenizerTypes.js";

export function tokenizeDirectives(
  input: string,
  tempState: TempParseState
): DirectiveMainToken[] {
  // init state
  const state = initState(input);
  // array to hold directives defined
  const dirTokens: DirectiveMainToken[] = [];
  // loop input
}

function handleDirectiveLine(
  state: DirectiveTokenizerState,
  tempState: TempParseState
): (DirectiveKeyValueToken | DirectiveStringToken)[] {
  const tokens: (DirectiveKeyValueToken | DirectiveStringToken)[] = [];

  // loop until end of input or new line
  while (!eof(state) && current(state) !== "\n") {
    // get char
    const ch = current(state);

    // skip white space
    if (/\s/.test(ch)) {
      advance(state);
      continue;
    }
  }

  return tokens;
}
