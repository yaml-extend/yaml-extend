import type { BasicState, ExtendLinePos, RawToken } from "../tokenizerTypes.js";
import { TempParseState } from "../../parseTypes.js";
import { getLinePosFromRange } from "../../utils/random.js";

// basic helpers
export function current<S extends BasicState>(state: S): string {
  return state.input[state.pos];
}
export function eof<S extends BasicState>(state: S): boolean {
  return state.pos >= state.len;
}
export function advance<S extends BasicState>(state: S, n = 1): number {
  const steps = Math.min(n, state.len - state.pos); // safe guard from going beyond max length
  return state.pos + steps;
}
export function peek<S extends BasicState>(state: S, n = 1): string {
  return state.input.substr(state.pos, n);
}

// Function to handle line position
export function handleLinePos<S extends BasicState>(
  state: S,
  start: number
): ExtendLinePos[] {
  let linePos: ExtendLinePos[] = [];
  let relLineStart = start - state.absLineStart;
  let i = start;
  while (i < state.pos) {
    if (state.input[i] === "\n") {
      linePos.push({
        line: state.line,
        start: relLineStart,
        end: i - state.absLineStart,
      });
      relLineStart = 0;
      state.line++;
      state.absLineStart = i + 1;
    }
    i++;
  }
  linePos.push({
    line: state.line,
    start: relLineStart,
    end: i - state.absLineStart,
  });
  return linePos;
}

export function mergeTokenPosition<
  T extends RawToken<any>,
  PT extends RawToken<any>
>(tok: T, parentTok: PT) {
  // add absolute start position of the parent
  const parentStart = parentTok.pos.start;
  tok.pos.start += parentStart;
  tok.pos.end += parentStart;
  // update line positions
  for (let i = 0; i < tok.linePos.length; i++) {
    const linePos = tok.linePos[i];
    const parentLinePos = parentTok.linePos[linePos.line];
    if (parentTok.linePos[0]) linePos.line += parentTok.linePos[0].line;
    linePos.start += parentLinePos.start;
    linePos.end += parentLinePos.start;
  }
}

export function mergeScalarPosition<T extends RawToken<any>>(
  tok: T,
  tempState: TempParseState
) {
  const start = tempState.range[0];
  const end = tempState.range[1];
  if (end === 99999) return;

  // add absolute start positions
  tok.pos.start += start;
  tok.pos.end += start;
  // get line position of range
  const parentLinePositions = getLinePosFromRange(
    tempState.source,
    tempState.lineStarts,
    [start, end]
  );
  // update line positions
  for (let i = 0; i < tok.linePos.length; i++) {
    const linePos = tok.linePos[i];
    const parentLinePos = parentLinePositions[linePos.line];
    if (parentLinePositions[0]) linePos.line += parentLinePositions[0].line;
    linePos.start += parentLinePos.start;
    linePos.end += parentLinePos.start;
  }
}

export function readUntilClose<S extends BasicState>(
  state: S,
  start: number,
  openChar: string,
  closeChar: string,
  ignoreTextTrim?: boolean
): { linePos: ExtendLinePos[]; raw: string; text: string } {
  let out = "";
  let depth = 0;
  const checkOpen =
    openChar.length > 1
      ? () => peek(state, openChar.length) === openChar
      : (ch: string) => ch === openChar;
  const checkClose =
    closeChar.length > 1
      ? () => peek(state, closeChar.length) === closeChar
      : (ch: string) => ch === closeChar;

  while (!eof(state)) {
    const ch = current(state);

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

    if (checkOpen(ch)) depth++;

    if (checkClose(ch)) {
      if (depth === 0) break;
      depth--;
    }

    out += ch;
    state.pos = advance(state);
  }

  const linePos = handleLinePos(state, start);
  const raw = state.input.slice(start, state.pos);
  const text = ignoreTextTrim ? out : out.trim();

  return { linePos, raw, text };
}

export function read<S extends BasicState>(
  state: S,
  start: number,
  steps: number,
  ignoreTextTrim?: boolean
): { linePos: ExtendLinePos[]; raw: string; text: string } {
  state.pos = advance(state, steps);
  const linePos = handleLinePos(state, start);
  const raw = state.input.slice(start, state.pos);
  const text = ignoreTextTrim ? raw : raw.trim();
  return { linePos, raw, text };
}

export function readUntilChar<S extends BasicState>(
  state: S,
  start: number,
  stopChar: string | string[] | RegExp,
  ignoreTextTrim?: boolean
): { linePos: ExtendLinePos[]; raw: string; text: string } {
  let out = "";
  const checkStop =
    stopChar instanceof RegExp
      ? (ch: string) => stopChar.test(ch)
      : Array.isArray(stopChar)
      ? (ch: string) => stopChar.includes(ch)
      : stopChar.length > 1
      ? () => peek(state, stopChar.length) === stopChar
      : (ch: string) => ch === stopChar;

  while (!eof(state)) {
    const ch = current(state);

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

    if (checkStop(ch)) break;

    out += ch;
    state.pos = advance(state);
  }

  const linePos = handleLinePos(state, start);
  const raw = state.input.slice(start, state.pos);
  const text = ignoreTextTrim ? out : out.trim();

  return { linePos, raw, text };
}
