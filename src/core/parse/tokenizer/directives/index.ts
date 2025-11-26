// directives-scanner-with-spans.ts
import {
  DirectiveToken,
  RawToken,
  ImportParamInfo,
  LinePos,
  Pos,
  Directives,
} from "../tokenizerTypes.js";
import {
  verifyFilename,
  verifyImport,
  verifyLocal,
  verifyParam,
  verifyPrivate,
  verifyTag,
  verifyVersion,
} from "./verify.js";
import { getValueFromText } from "../../utils/random.js";
import { TempParseState } from "../../parseTypes.js";

/* ---------------------- Tokenizer for a single line (with spans) ---------------------- */
/**
 * Tokenize a single directive line (line must start with `%`).
 * Each token includes start/end indices in the original line.
 */
export function tokenizeDirLine(
  line: string,
  lineNum: number,
  strIdx: number
): RawToken<any>[] {
  if (!line || !line.startsWith("%")) return [];

  const n = line.length;
  let i = 1; // skip leading '%'
  const tokens: RawToken<any>[] = [];

  const isWhitespace = (ch: string | undefined) =>
    !ch ? false : ch === " " || ch === "\t" || ch === "\r" || ch === "\n";

  const pushTokenFromSlice = (start: number, end: number) => {
    if (start >= end) return;
    const raw = line.slice(start, end);
    const quoted =
      (raw[0] === '"' && raw[raw.length - 1] === '"') ||
      (raw[0] === "'" && raw[raw.length - 1] === "'");
    let text = raw;
    if (quoted) {
      const quoteChar = raw[0];
      const inner = raw.slice(1, -1);
      text = unescapeQuoted(inner, quoteChar);
    }
    const value = getValueFromText(text);
    tokens.push({
      raw,
      text,
      quoted,
      value,
      linePos: [{ start, end, line: lineNum }],
      pos: {
        start: strIdx + start,
        end: strIdx + end,
      },
    });
  };

  // read directive name (skip whitespace then read until whitespace)
  while (i < n && isWhitespace(line[i])) i++;
  const startDir = i;
  while (i < n && !isWhitespace(line[i])) i++;
  const endDir = i;
  if (startDir >= endDir) return [];
  pushTokenFromSlice(startDir, endDir);

  // parse rest tokens
  while (i < n) {
    // skip whitespace
    while (i < n && isWhitespace(line[i])) i++;
    if (i >= n) break;

    // If starts with quote -> quoted token
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      const startTok = i;
      i++; // consume opening quote
      let escape = false;
      while (i < n) {
        const ch = line[i];
        if (escape) {
          escape = false;
          i++;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          i++;
          continue;
        }
        if (ch === q) {
          i++; // consume closing
          break;
        }
        i++;
      }
      const endTok = i; // after closing quote (or EOF)
      pushTokenFromSlice(startTok, endTok);
      continue;
    }

    // If starts with { or [ or ( -> capture until balanced (including nested and quoted)
    if (line[i] === "{" || line[i] === "[" || line[i] === "(") {
      const startTok = i;
      let braceDepth = 0,
        bracketDepth = 0,
        parenDepth = 0;
      const startCh = line[i];
      if (startCh === "{") braceDepth = 1;
      else if (startCh === "[") bracketDepth = 1;
      else if (startCh === "(") parenDepth = 1;
      i++; // consume opening
      while (i < n && (braceDepth > 0 || bracketDepth > 0 || parenDepth > 0)) {
        const ch = line[i];
        if (ch === '"' || ch === "'") {
          // capture quoted inside
          const q = ch;
          i++;
          while (i < n) {
            const c2 = line[i];
            if (c2 === "\\") {
              i += 2; // skip escaped char if possible
              continue;
            }
            i++;
            if (c2 === q) break;
          }
          continue;
        }

        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
        else if (ch === "[") bracketDepth++;
        else if (ch === "]") bracketDepth--;
        else if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth--;

        i++;
      }
      const endTok = i;
      pushTokenFromSlice(startTok, endTok);
      continue;
    }

    // Otherwise read until next whitespace (but allow nested quoted / braces inside token)
    const startTok = i;
    let braceDepth = 0,
      bracketDepth = 0,
      parenDepth = 0;
    while (i < n) {
      const ch = line[i];
      if (ch === '"' || ch === "'") {
        // include quoted part in token
        const q = ch;
        i++;
        while (i < n) {
          const c2 = line[i];
          if (c2 === "\\") {
            i += 2; // include escape and char
            continue;
          }
          i++;
          if (c2 === q) break;
        }
        continue;
      }
      if (ch === "{") {
        braceDepth++;
        i++;
        continue;
      }
      if (ch === "}") {
        if (braceDepth > 0) braceDepth--;
        i++;
        continue;
      }
      if (ch === "[") {
        bracketDepth++;
        i++;
        continue;
      }
      if (ch === "]") {
        if (bracketDepth > 0) bracketDepth--;
        i++;
        continue;
      }
      if (ch === "(") {
        parenDepth++;
        i++;
        continue;
      }
      if (ch === ")") {
        if (parenDepth > 0) parenDepth--;
        i++;
        continue;
      }

      if (
        isWhitespace(ch) &&
        braceDepth === 0 &&
        bracketDepth === 0 &&
        parenDepth === 0
      ) {
        break; // stop before whitespace
      }
      i++;
    }
    const endTok = i;
    pushTokenFromSlice(startTok, endTok);
    // loop will skip whitespace at top
  }

  return tokens;
}

/* ---------------------- Directive parser (single line -> structured with spans) ---------------------- */
function upper(s: string) {
  return s ? s.toUpperCase() : s;
}

/**
 * Find the first '=' in `s` that is NOT inside single or double quotes and not escaped.
 * Returns -1 if none found.
 */
function findTopLevelEquals(s: string): number {
  let inSingle = false;
  let inDouble = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === "=" && !inSingle && !inDouble) {
      return i;
    }
  }
  return -1;
}

/**
 * Helper: build a RawToken for a slice inside an existing token (preserves line number).
 */
function buildInnerRawToken(
  parentTok: RawToken<any>,
  absStart: number,
  absEnd: number
): RawToken<any> {
  const raw = parentTok.raw.slice(
    absStart - parentTok.pos.start,
    absEnd - parentTok.pos.start
  );
  let quoted = false;
  let text = raw;
  if (
    raw &&
    raw.length >= 2 &&
    ((raw[0] === '"' && raw[raw.length - 1] === '"') ||
      (raw[0] === "'" && raw[raw.length - 1] === "'"))
  ) {
    quoted = true;
    const inner = raw.slice(1, -1);
    text = unescapeQuoted(inner, raw[0]);
  }
  const value = getValueFromText(text);
  const line =
    parentTok.linePos && parentTok.linePos.length > 0
      ? parentTok.linePos[0].line
      : 0;
  return {
    raw,
    text,
    value,
    quoted,
    linePos: [{ start: absStart, end: absEnd, line }],
    pos: {
      start: absStart,
      end: absEnd,
    },
  };
}

/**
 * Parse tokens for one directive line into a Directive object with positional spans.
 * Returns null if tokens are invalid/unknown directive.
 */
export function parseDirectiveFromTokens(
  tokens: RawToken<any>[],
  rawLine: string,
  lineNum: number,
  strIdx: number
): DirectiveToken | null {
  if (!tokens || tokens.length === 0) return null;

  // calc pos and linePos of the hole directive
  const linePos: LinePos[] = [{ start: 0, end: rawLine.length, line: lineNum }];
  const pos: Pos = { start: strIdx, end: strIdx + rawLine.length };

  // handle baseTok
  const rawBaseTok = tokens[0];
  const baseTok = rawBaseTok;
  // get type from baseTok
  let type = baseTok.text; // get base text
  // if typeof base text is number return
  if (typeof type === "number") return null;
  else type = type ? upper(type) : type;

  try {
    if (type === "TAG") {
      const hTok = tokens[1];
      const prefixTok = tokens[2];
      return {
        type: "TAG",
        rawLine,
        linePos,
        pos,
        valid: true,
        errors: [],
        base: baseTok,
        handle: hTok,
        prefix: prefixTok,
      };
    }

    if (type === "YAML") {
      const versionTok = tokens[1];
      return {
        type: "YAML",
        rawLine,
        linePos,
        pos,
        valid: true,
        errors: [],
        base: baseTok,
        version: versionTok,
      };
    }

    if (type === "FILENAME") {
      const filenameTok = tokens[1];
      return {
        type: "FILENAME",
        rawLine,
        linePos,
        pos,
        valid: true,
        errors: [],
        base: baseTok,
        filename: filenameTok,
      };
    }

    if (type === "IMPORT") {
      // expected: %IMPORT <alias> <path> [key=value ...]
      const aliasTok = tokens[1];
      const pathTok = tokens[2];

      const params: Record<string, ImportParamInfo> = {};
      let paramsStart: number | null = null;
      let paramsEnd: number | null = null;
      for (let idx = 3; idx < tokens.length; idx++) {
        const tok = tokens[idx];
        if (paramsStart === null) paramsStart = tok.pos.start;
        paramsEnd = tok.pos.end;
        const raw = tok.raw === null ? "" : (tok.raw as string);

        const eqIndex = findTopLevelEquals(raw);
        if (eqIndex === -1) {
          // key only -> build a RawToken for the key (it's the whole token)
          const keyTok = buildInnerRawToken(tok, tok.pos.start, tok.pos.end);
          let keyText = keyTok.text;

          params[keyText] = {
            raw: raw,
            key: keyTok,
            equal: undefined,
            value: undefined,
          };
        } else {
          // key/value split where '=' is not inside quotes
          const keyRawSlice = raw.slice(0, eqIndex);
          const valRawSlice = raw.slice(eqIndex + 1);
          const keyStart = tok.pos.start;
          const keyEnd = tok.pos.start + eqIndex;
          const valueStart = tok.pos.start + eqIndex + 1;
          const valueEnd = tok.pos.end;

          const keyTok = buildInnerRawToken(tok, keyStart, keyEnd);
          const eqTok = buildInnerRawToken(tok, keyEnd, valueStart);
          const valueTok = buildInnerRawToken(tok, valueStart, valueEnd);
          const keyText = keyTok.text;

          params[keyText] = {
            raw: raw,
            key: keyTok,
            equal: eqTok,
            value: valueTok,
          };
        }
      }

      let resolvedParams: Record<string, unknown> = {};
      for (const [k, t] of Object.entries(params))
        resolvedParams[k] = t.value?.value;

      return {
        type: "IMPORT",
        rawLine,
        linePos,
        pos,
        valid: true,
        errors: [],
        base: baseTok,
        alias: aliasTok,
        path: pathTok,
        params,
        resolvedParams,
      };
    }

    if (type === "LOCAL") {
      // %LOCAL <alias> <type> <defValue>
      const aliasTok = tokens[1];
      const typeTok = tokens[2];
      const defTok = tokens[3];

      return {
        type: "LOCAL",
        rawLine,
        linePos,
        pos,
        valid: true,
        errors: [],
        base: baseTok,
        alias: aliasTok,
        yamlType: typeTok,
        defValue: defTok,
      };
    }

    if (type === "PARAM") {
      // %PARAM <alias> <type> <defValue>
      const aliasTok = tokens[1];
      const typeTok = tokens[2];
      const defTok = tokens[3];

      return {
        type: "PARAM",
        rawLine,
        linePos,
        pos,
        valid: true,
        errors: [],
        base: baseTok,
        alias: aliasTok,
        yamlType: typeTok,
        defValue: defTok,
      };
    }

    if (type === "PRIVATE") {
      // %PRIVATE <path> [<path> ...]
      const pathToks = tokens.slice(1).map((t) => t);
      const resolvedPaths: Record<
        string,
        { pathParts: string[]; token: RawToken<string> }
      > = {};
      for (const tok of pathToks) {
        const text = tok.text;
        const paths: string[] = [];
        let i = 0;
        let startIdx = 0;
        let out = "";
        while (i < text.length) {
          const ch = text[i];
          if (ch === ".") {
            paths.push(out);
            out = "";
            startIdx = i;
          }
          if (ch === "\\") {
            i++;
            if (i > text.length) break;
            const esc = text[i];
            const map: Record<string, string> = {
              n: "\n",
              r: "\r",
              t: "\t",
              "'": "'",
              '"': '"',
              "\\": "\\",
            };
            out += map[esc] ?? esc;
            i++;
            continue;
          }
          out += ch;
          i++;
        }
        if (out) paths.push(out);
        resolvedPaths[text] = { pathParts: paths, token: tok };
      }
      return {
        type: "PRIVATE",
        rawLine,
        linePos,
        pos,
        valid: true,
        errors: [],
        base: baseTok,
        paths: pathToks,
        resolvedPaths,
      };
    }

    return null;
  } catch (err) {
    return null;
  }
}

/* ---------------------- Main scanner over full text ---------------------- */
/**
 * Scan a multi-line YAML text and return all directives found with spans.
 * A directive is recognized only when '%' appears at the start of a line (column 0).
 */
export function tokenizeDirectives(
  text: string,
  tempState: TempParseState
): Directives {
  const lines = text.split(/\r?\n/);
  let strIdx: number = 0; // var to hold idx inside the hole text not only one line
  const directives: Directives = {
    filename: [],
    tag: [],
    private: [],
    param: [],
    local: [],
    import: [],
    version: [],
    errors: [],
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    if (rawLine.startsWith("%")) {
      const tokens = tokenizeDirLine(rawLine, idx, strIdx);
      let dir = parseDirectiveFromTokens(tokens, rawLine, idx, strIdx);
      if (dir) {
        switch (dir.type) {
          case "FILENAME":
            verifyFilename(dir, directives);
            directives.filename.push(dir);
            break;

          case "IMPORT":
            verifyImport(dir, directives, tempState);
            directives.import.push(dir);
            break;

          case "LOCAL":
            verifyLocal(dir, directives);
            directives.local.push(dir);
            break;

          case "PARAM":
            verifyParam(dir, directives);
            directives.param.push(dir);
            break;

          case "PRIVATE":
            verifyPrivate(dir, directives);
            directives.private.push(dir);
            break;

          case "TAG":
            verifyTag(dir, directives);
            directives.tag.push(dir);
            break;

          case "YAML":
            verifyVersion(dir, directives);
            directives.version.push(dir);
            break;
        }
      }
    }
    strIdx += rawLine.length + 1; // add raw length + 1 to compensate for deleted "\n" by split
  }

  return directives;
}

/* ---------------------- small helper to unescape quoted content ---------------------- */
function unescapeQuoted(inner: string, quoteChar: string) {
  return inner
    .replace(/\\(u[0-9a-fA-F]{4}|["'\\bfnrtv])/g, (_m, g1) => {
      if (g1 && g1.startsWith("u")) {
        try {
          return String.fromCharCode(parseInt(g1.slice(1), 16));
        } catch {
          return g1;
        }
      }
      switch (g1) {
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "v":
          return "\v";
        case "'":
          return "'";
        case '"':
          return '"';
        case "\\":
          return "\\";
        default:
          return g1;
      }
    })
    .replace(new RegExp("\\\\" + quoteChar, "g"), quoteChar);
}
