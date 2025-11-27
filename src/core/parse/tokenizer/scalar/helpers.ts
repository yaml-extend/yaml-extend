import type { BasicState, RawToken } from "../tokenizerTypes.js";
import { TempParseState } from "../../parseTypes.js";

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

export function mergeTokenPosition<PT extends RawToken<any>>(
  pos: [number, number],
  parentTok: PT
) {
  pos[0] += parentTok.pos[0];
  pos[1] += parentTok.pos[0];
}

export function mergeScalarPosition(
  pos: [number, number],
  tempState: TempParseState
) {
  pos[0] += tempState.range[0];
  pos[1] += tempState.range[0];
}

export function readUntilClose<S extends BasicState>(
  state: S,
  start: number,
  openChar: string,
  closeChar: string,
  ignoreTextTrim?: boolean
): { raw: string; text: string } {
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

  const raw = state.input.slice(start, state.pos);
  const text = ignoreTextTrim ? out : out.trim();

  return { raw, text };
}

export function read<S extends BasicState>(
  state: S,
  start: number,
  steps: number,
  ignoreTextTrim?: boolean
): { raw: string; text: string } {
  state.pos = advance(state, steps);
  const raw = state.input.slice(start, state.pos);
  const text = ignoreTextTrim ? raw : raw.trim();
  return { raw, text };
}

export function readUntilChar<S extends BasicState>(
  state: S,
  start: number,
  stopChar: string | string[] | RegExp,
  ignoreTextTrim?: boolean
): { raw: string; text: string } {
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

  const raw = state.input.slice(start, state.pos);
  const text = ignoreTextTrim ? out : out.trim();

  return { raw, text };
}
