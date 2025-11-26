import { YAMLError as YAMLError$1, parseDocument, YAMLParseError as YAMLParseError$1, YAMLWarning as YAMLWarning$1, YAMLMap, Scalar, YAMLSeq, Alias, Schema } from 'yaml';
export { Schema } from 'yaml';
import { readFile } from 'fs/promises';
import { existsSync, realpathSync } from 'fs';
import { parse, relative, dirname, resolve as resolve$1 } from 'path';
import { createHash } from 'crypto';

// Base new ErrorName and ErrorCode into YAMLError class
class YAMLError extends YAMLError$1 {
    constructor(name, pos, code, message) {
        // @ts-ignore
        super(name, pos, code, message);
        this.path = "";
        this.extendLinePos = [];
        this.filename = "";
    }
}
// New YAMLExprError class
class YAMLExprError extends YAMLError {
    constructor(pos, code, message) {
        super("YAMLExprError", pos, code, message);
    }
}
class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
    }
}
class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
    }
}

// Path related helper functions.
/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param state - Path of the current module.
 * @returns Read value of the file in UTF-8 format.
 */
function verifyPath(path, tempState) {
    // get base path and resolved path
    const basePath = tempState.options.basePath;
    // handle sandbox check
    if (!isInsideSandBox(path, basePath) && !tempState.options.unsafe) {
        tempState.errors.push(new YAMLExprError([0, 99999], "", `Path used: ${path} is out of scope of base path: ${basePath}.`));
        return { status: false, error: "sandBox" };
    }
    // handle yaml file check
    if (!isYamlFile(path)) {
        tempState.errors.push(new YAMLExprError([0, 99999], "", `You can only parse YAML files that end with '.yaml' or '.yml' extension, path used: ${path}.`));
        return { status: false, error: "yamlFile" };
    }
    // make sure path is indeed present
    if (!existsSync(path)) {
        tempState.errors.push(new YAMLExprError([0, 99999], "", `Path used: ${path} is not present in filesystem.`));
        return { status: false, error: "exist" };
    }
    return { status: true };
}
/**
 * Method to handle relative paths by resolving & insuring that they live inside the sandbox and are actual YAML files, also detect circular dependency if present.
 * @param basePath - Base path defined by user in the options (or cwd if was omitted by user) that will contain and sandbox all imports.
 * @param modulePath - Path of the current YAML file.
 * @param targetPath - Path of the imported YAML file.
 * @param loadOpts - Options object passed to load function and updated using imported module's filepath.
 * @param loadId - Unique id that identifies this load.
 * @returns Resolved safe path that will be passed to fs readFile function.
 */
function mergePath(targetPath, state, tempState) {
    // get resolved path and base path
    const modulePath = dirname(tempState.resolvedPath);
    const resPath = resolve$1(modulePath, targetPath);
    // verify path
    const verified = verifyPath(resPath, tempState);
    if (!verified)
        return { status: false, value: undefined };
    // handle circular dependency check
    const circularDep = state.circularDep.addDep(modulePath, resPath);
    if (circularDep) {
        tempState.errors.push(new YAMLExprError([0, 99999], "", `Circular dependency detected: ${circularDep.join(" -> ")}.`));
        return { status: false, value: undefined };
    }
    // return path
    return { status: true, value: resPath };
}
/**
 * Function to check if file reads are black boxed.
 * @param resolvedPath - Resolved path from concatinating current file path with imported file path. works async.
 * @param basePath - Base path passed in opts of load function. used to black box the file reads.
 * @returns Boolean that indicates if resolved path actually lives inside base path.
 */
function isInsideSandBox(resolvedPath, basePath) {
    // Resolve symlinks to avoid escaping via symlink tricks
    const realBase = realpathSync(basePath);
    const realRes = realpathSync(resolvedPath);
    // Windows: different root/drive => definitely outside (compare case-insensitive)
    const baseRoot = parse(realBase).root.toLowerCase();
    const resRoot = parse(realRes).root.toLowerCase();
    if (baseRoot !== resRoot)
        return false;
    // Correct order: from base -> to res
    const rel = relative(realBase, realRes);
    // same path
    if (rel === "")
        return true;
    // if it starts with '..' it escapes the base
    return !rel.startsWith("..");
}
/**
 * Function to check if read files are YAML files only.
 * @param path - Url path of the file.
 * @returns Boolean to indicate if file path is YAML file path.
 */
function isYamlFile(path) {
    return path.endsWith(".yaml") || path.endsWith(".yml");
}

function getValueFromText(text) {
    // if empty string return null
    if (!text)
        return null;
    // try parse text and return it
    try {
        const parsed = JSON.parse(text);
        return parsed;
    }
    catch (err) { }
    // trim text and check for true, false, null and numbers
    const trim = text.trim();
    if (trim === "true")
        return true;
    if (trim === "false")
        return false;
    if (trim === "null")
        return null;
    if (!Number.isNaN(Number(trim)))
        return Number(trim);
    // return text as it is
    return text;
}
/**
 * Method to check if value is an array or object (record that can contains other primative values).
 * @param val - Value that will be checked.
 * @returns Boolean that indicates if value is a record or not.
 */
function isRecord(val) {
    return typeof val === "object" && val !== null;
}
// deep-clone the input so we don't mutate the original
function deepClone(value) {
    // prefer structuredClone if available (native deep clone)
    if (typeof globalThis.structuredClone === "function") {
        return globalThis.structuredClone(value);
    }
    // fallback recursive clone that respects records/arrays using isRecord
    const cloneRec = (v) => {
        if (!isRecord(v))
            return v;
        if (Array.isArray(v)) {
            const arr = [];
            for (let i = 0; i < v.length; i++) {
                arr[i] = cloneRec(v[i]);
            }
            return arr;
        }
        else {
            const out = {};
            for (const k in v) {
                if (Object.prototype.hasOwnProperty.call(v, k)) {
                    out[k] = cloneRec(v[k]);
                }
            }
            return out;
        }
    };
    return cloneRec(value);
}
function stringify(value, preserveNull) {
    if (typeof value === "string")
        return value;
    if (value == undefined) {
        if (preserveNull)
            return "undefined";
        else
            return "";
    }
    if (value == null) {
        if (preserveNull)
            return "null";
        else
            return "";
    }
    return JSON.stringify(value);
}
function getLineStarts(str) {
    const starts = [];
    let i = 0;
    while (i < str.length) {
        if (str[i] === "\n")
            starts.push(i);
        i++;
    }
    return starts;
}
/**
 * Find the rightmost element strictly less than `target` in a sorted ascending array.
 * @param arr Sorted ascending array of numbers.
 * @param target The number to compare against.
 * @returns { index, value } of the closest lower element, or null if none exists.
 */
function binarySearchLine(arr, target) {
    let low = 0;
    let high = arr.length - 1;
    let resultIndex = -1;
    while (low <= high) {
        const mid = low + ((high - low) >> 1);
        if (arr[mid] < target) {
            // arr[mid] is a candidate; move right to find a closer (larger) candidate
            resultIndex = mid;
            low = mid + 1;
        }
        else {
            // arr[mid] >= target, we need strictly smaller => search left half
            high = mid - 1;
        }
    }
    if (resultIndex === -1)
        return null;
    return { line: resultIndex + 1, absolutePos: arr[resultIndex] };
}
function getLinePosFromRange(str, lineStarts, range) {
    const start = range[0];
    const end = range[1];
    const search = binarySearchLine(lineStarts, start);
    if (!search)
        return [];
    let i = start;
    let line = search.line;
    let lineStart = start - search.absolutePos;
    let linePos = [];
    while (i < str.length && i <= end) {
        if (str[i] === "\n") {
            if (i >= start)
                linePos.push({ start: lineStart, end: i - lineStart, line: line });
            line += 1;
            lineStart = 0;
        }
        i++;
    }
    linePos.push({ start: lineStart, end: i - lineStart, line });
    return linePos;
}

/**
 * Function to stringify objects uniformly to generate stable hashed from them.
 * @param obj - Object that will be stringified.
 * @returns String that holds the stringified object.
 */
function stableStringify(obj) {
    if (obj === null || typeof obj !== "object")
        return JSON.stringify(obj);
    if (Array.isArray(obj))
        return `[${obj.map(stableStringify).join(",")}]`;
    const keys = Object.keys(obj).sort();
    return `{${keys
        .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
        .join(",")}}`;
}
/**
 * Function to normalize and hash params object.
 * @param params - Params object that will be hashed.
 * @returns Stable hash of params object that will only change if value or key inside object changed.
 */
function hashParams(params) {
    // stringify object
    const strObj = stableStringify(params);
    // hash and return
    return createHash("sha256").update(strObj).digest().toString("hex");
}
/**
 * Function to hash string.
 * @param str - String that will be hashed.
 * @returns Hash of the string.
 */
function hashStr(str) {
    return createHash("sha256").update(str).digest().toString("hex");
}

function verifyFilename(dir, directives) {
    var _a;
    // verify filename
    const filename = (_a = dir.filename) === null || _a === void 0 ? void 0 : _a.value;
    if (!filename) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "You should pass a scalar after %FILENAME directive.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // verify only one valid FILENAME directive is used
    if (directives.filename.some((d) => d.valid)) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "Only one FILENAME directive can be defined, first one defined will be used.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // type inforcement
    if (filename)
        dir.filename.value = stringify(filename);
}
function verifyImport(dir, directives, tempState) {
    var _a, _b;
    // make sure that alias is used
    const alias = (_a = dir.alias) === null || _a === void 0 ? void 0 : _a.value;
    if (!alias) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "You should pass alias to '%IMPORT' directive, structure of IMPORT directive: %IMPORT <alias> <path> [key=value ...].");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // make sure that alias is used only once
    if (directives.import.some((d) => d.alias.value === alias)) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "Alias for each IMPORT directive should be unique, this alias is used before.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // make sure that path is used
    const path = (_b = dir.path) === null || _b === void 0 ? void 0 : _b.value;
    if (!path) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "You should pass path to '%IMPORT' directive, structure of IMPORT directive: %IMPORT <alias> <path> [key=value ...].");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // verify path
    const validPath = verifyPath(tempState.resolvedPath, tempState);
    if (!validPath.status) {
        const message = validPath.error === "sandBox"
            ? "path is out of scope of sandbox"
            : validPath.error === "yamlFile"
                ? "path extension is not '.yaml' or '.yml'"
                : "path doesn't exist on filesystem";
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", `Invalid path, ${message}`);
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // type inforcement
    if (alias)
        dir.alias.value = stringify(alias);
    if (path)
        dir.path.value = stringify(path);
}
function verifyLocal(dir, directives) {
    var _a, _b;
    // make sure that alias is used
    const alias = (_a = dir.alias) === null || _a === void 0 ? void 0 : _a.value;
    if (!alias) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "You should pass alias to '%LOCAL' directive, structure of LOCAL directive: %LOCAL <alias> <type> <defValue>.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // make sure that alias is used only once
    if (directives.import.some((d) => { var _a; return ((_a = d.alias) === null || _a === void 0 ? void 0 : _a.value) === alias; })) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "Alias for each LOCAL directive should be unique, this alias is used before.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // only if type is present, verify that type is valid other wise set it to undefined and return an error
    const type = (_b = dir.yamlType) === null || _b === void 0 ? void 0 : _b.value;
    if (type &&
        (typeof type !== "string" ||
            (type !== "scalar" && type !== "map" && type !== "seq"))) {
        const error = new YAMLExprError([dir.yamlType.pos.start, dir.yamlType.pos.end], "", "Invalid type, type can only be 'scalar', 'map' or 'seq'.");
        dir.errors.push(error);
        directives.errors.push(error);
        dir.yamlType.value = undefined;
    }
    // type inforcement
    if (alias)
        dir.alias.value = stringify(alias);
}
function verifyParam(dir, directives) {
    var _a, _b;
    // make sure that alias is used
    const alias = (_a = dir.alias) === null || _a === void 0 ? void 0 : _a.value;
    if (!alias) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "You should pass alias to '%PARAM' directive, structure of PARAM directive: %PARAM <alias> <type> <defValue>.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // make sure that alias is used only once
    if (directives.param.some((d) => { var _a; return ((_a = d.alias) === null || _a === void 0 ? void 0 : _a.value) === alias; })) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "Alias for each PARAM directive should be unique, this alias is used before.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // only if type is present, verify that type is valid other wise set it to undefined and return an error
    const type = (_b = dir.yamlType) === null || _b === void 0 ? void 0 : _b.value;
    if (type &&
        (typeof type !== "string" ||
            (type !== "scalar" && type !== "map" && type !== "seq"))) {
        const error = new YAMLExprError([dir.yamlType.pos.start, dir.yamlType.pos.end], "", "Invalid type, type can only be 'scalar', 'map' or 'seq'.");
        dir.errors.push(error);
        directives.errors.push(error);
        dir.yamlType.value = undefined;
    }
    // type inforcement
    if (alias)
        dir.alias.value = stringify(alias);
}
function verifyPrivate(dir, directives) {
    // only type inforcement here for each path
    for (const path of dir.paths) {
        path.value = stringify(path.value);
    }
}
function verifyTag(dir, directives) {
    var _a, _b;
    // make sure that handle is used
    const handle = (_a = dir.handle) === null || _a === void 0 ? void 0 : _a.value;
    if (!handle) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "You should pass handle to '%TAG' directive, structure of TAG directive: %TAG <handle> <prefix>.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // make sure that handle is used only once
    if (directives.tag.some((d) => { var _a; return ((_a = d.handle) === null || _a === void 0 ? void 0 : _a.value) === handle; })) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "Handle for each TAG directive should be unique, this handle is used before.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // make sure that prefix is used
    const prefix = (_b = dir.prefix) === null || _b === void 0 ? void 0 : _b.value;
    if (!prefix) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "You should pass prefix to '%TAG' directive, structure of TAG directive: %TAG <handle> <prefix>.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // type inforcement
    if (handle)
        dir.handle.value = stringify(handle);
    if (prefix)
        dir.prefix.value = stringify(prefix);
}
function verifyVersion(dir, directives) {
    var _a;
    // make sure that version is used
    const version = (_a = dir.version) === null || _a === void 0 ? void 0 : _a.value;
    if (!version) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "You should pass version to '%YAML' directive, structure of YAML directive: %YAML <version>.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // verify only one valid FILENAME directive is used
    if (directives.version.some((d) => d.valid)) {
        const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "Only one YAML directive can be defined, first one defined will be used.");
        dir.errors.push(error);
        dir.valid = false;
        directives.errors.push(error);
    }
    // type inforcement along with verification that verion is valid (1.1) or (1.2)
    if (version) {
        const numVersion = Number(version);
        if (numVersion !== 1.1 && numVersion !== 1.2) {
            const error = new YAMLExprError([dir.pos.start, dir.pos.end], "", "Invalid version value, valid values are 1.1 or 1.2.");
            dir.errors.push(error);
            dir.valid = false;
            directives.errors.push(error);
        }
        dir.version.value = numVersion;
    }
}

/* ---------------------- Tokenizer for a single line (with spans) ---------------------- */
/**
 * Tokenize a single directive line (line must start with `%`).
 * Each token includes start/end indices in the original line.
 */
function tokenizeDirLine(line, lineNum, strIdx) {
    if (!line || !line.startsWith("%"))
        return [];
    const n = line.length;
    let i = 1; // skip leading '%'
    const tokens = [];
    const isWhitespace = (ch) => !ch ? false : ch === " " || ch === "\t" || ch === "\r" || ch === "\n";
    const pushTokenFromSlice = (start, end) => {
        if (start >= end)
            return;
        const raw = line.slice(start, end);
        const quoted = (raw[0] === '"' && raw[raw.length - 1] === '"') ||
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
    while (i < n && isWhitespace(line[i]))
        i++;
    const startDir = i;
    while (i < n && !isWhitespace(line[i]))
        i++;
    const endDir = i;
    if (startDir >= endDir)
        return [];
    pushTokenFromSlice(startDir, endDir);
    // parse rest tokens
    while (i < n) {
        // skip whitespace
        while (i < n && isWhitespace(line[i]))
            i++;
        if (i >= n)
            break;
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
            let braceDepth = 0, bracketDepth = 0, parenDepth = 0;
            const startCh = line[i];
            if (startCh === "{")
                braceDepth = 1;
            else if (startCh === "[")
                bracketDepth = 1;
            else if (startCh === "(")
                parenDepth = 1;
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
                        if (c2 === q)
                            break;
                    }
                    continue;
                }
                if (ch === "{")
                    braceDepth++;
                else if (ch === "}")
                    braceDepth--;
                else if (ch === "[")
                    bracketDepth++;
                else if (ch === "]")
                    bracketDepth--;
                else if (ch === "(")
                    parenDepth++;
                else if (ch === ")")
                    parenDepth--;
                i++;
            }
            const endTok = i;
            pushTokenFromSlice(startTok, endTok);
            continue;
        }
        // Otherwise read until next whitespace (but allow nested quoted / braces inside token)
        const startTok = i;
        let braceDepth = 0, bracketDepth = 0, parenDepth = 0;
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
                    if (c2 === q)
                        break;
                }
                continue;
            }
            if (ch === "{") {
                braceDepth++;
                i++;
                continue;
            }
            if (ch === "}") {
                if (braceDepth > 0)
                    braceDepth--;
                i++;
                continue;
            }
            if (ch === "[") {
                bracketDepth++;
                i++;
                continue;
            }
            if (ch === "]") {
                if (bracketDepth > 0)
                    bracketDepth--;
                i++;
                continue;
            }
            if (ch === "(") {
                parenDepth++;
                i++;
                continue;
            }
            if (ch === ")") {
                if (parenDepth > 0)
                    parenDepth--;
                i++;
                continue;
            }
            if (isWhitespace(ch) &&
                braceDepth === 0 &&
                bracketDepth === 0 &&
                parenDepth === 0) {
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
function upper(s) {
    return s ? s.toUpperCase() : s;
}
/**
 * Find the first '=' in `s` that is NOT inside single or double quotes and not escaped.
 * Returns -1 if none found.
 */
function findTopLevelEquals(s) {
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
function buildInnerRawToken(parentTok, absStart, absEnd) {
    const raw = parentTok.raw.slice(absStart - parentTok.pos.start, absEnd - parentTok.pos.start);
    let quoted = false;
    let text = raw;
    if (raw &&
        raw.length >= 2 &&
        ((raw[0] === '"' && raw[raw.length - 1] === '"') ||
            (raw[0] === "'" && raw[raw.length - 1] === "'"))) {
        quoted = true;
        const inner = raw.slice(1, -1);
        text = unescapeQuoted(inner, raw[0]);
    }
    const value = getValueFromText(text);
    const line = parentTok.linePos && parentTok.linePos.length > 0
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
function parseDirectiveFromTokens(tokens, rawLine, lineNum, strIdx) {
    var _a, _b;
    if (!tokens || tokens.length === 0)
        return null;
    // calc pos and linePos of the hole directive
    const linePos = [
        { start: 0, end: rawLine.length, line: lineNum },
    ];
    const pos = { start: strIdx, end: strIdx + rawLine.length };
    // handle baseTok
    const rawBaseTok = tokens[0];
    const baseTok = rawBaseTok;
    // get type from baseTok
    let type = baseTok.text; // get base text
    // if typeof base text is number return
    if (typeof type === "number")
        return null;
    else
        type = type ? upper(type) : type;
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
            const params = {};
            let paramsStart = null;
            let paramsEnd = null;
            for (let idx = 3; idx < tokens.length; idx++) {
                const tok = tokens[idx];
                if (paramsStart === null)
                    paramsStart = tok.pos.start;
                paramsEnd = tok.pos.end;
                const raw = tok.raw === null ? "" : tok.raw;
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
                }
                else {
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
            let resolvedParams = {};
            for (const [k, t] of Object.entries(params))
                resolvedParams[k] = (_a = t.value) === null || _a === void 0 ? void 0 : _a.value;
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
            const resolvedPaths = {};
            for (const tok of pathToks) {
                const text = tok.text;
                const paths = [];
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
                        if (i > text.length)
                            break;
                        const esc = text[i];
                        const map = {
                            n: "\n",
                            r: "\r",
                            t: "\t",
                            "'": "'",
                            '"': '"',
                            "\\": "\\",
                        };
                        out += (_b = map[esc]) !== null && _b !== void 0 ? _b : esc;
                        i++;
                        continue;
                    }
                    out += ch;
                    i++;
                }
                if (out)
                    paths.push(out);
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
    }
    catch (err) {
        return null;
    }
}
/* ---------------------- Main scanner over full text ---------------------- */
/**
 * Scan a multi-line YAML text and return all directives found with spans.
 * A directive is recognized only when '%' appears at the start of a line (column 0).
 */
function tokenizeDirectives(text, tempState) {
    const lines = text.split(/\r?\n/);
    let strIdx = 0; // var to hold idx inside the hole text not only one line
    const directives = {
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
                        verifyPrivate(dir);
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
function unescapeQuoted(inner, quoteChar) {
    return inner
        .replace(/\\(u[0-9a-fA-F]{4}|["'\\bfnrtv])/g, (_m, g1) => {
        if (g1 && g1.startsWith("u")) {
            try {
                return String.fromCharCode(parseInt(g1.slice(1), 16));
            }
            catch {
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

function getFilename(tokens, validCheck) {
    var _a;
    for (const tok of tokens) {
        if (!tok.valid && validCheck)
            continue;
        return (_a = tok.filename) === null || _a === void 0 ? void 0 : _a.value;
    }
}
function getPrivate(tokens, validCheck, getTokens) {
    let paths = {};
    for (const tok of tokens) {
        if (!tok.valid && validCheck)
            continue;
        for (const [k, { pathParts, token }] of Object.entries(tok.resolvedPaths))
            paths[k] = { pathParts, token, dirToken: tok };
    }
    return paths;
}
function getImport(tokens, alias, validCheck) {
    var _a, _b;
    for (const tok of tokens) {
        if (!tok.valid && validCheck)
            continue;
        if (((_a = tok.alias) === null || _a === void 0 ? void 0 : _a.value) === alias)
            return {
                path: (_b = tok.path) === null || _b === void 0 ? void 0 : _b.value,
                defaultParams: tok.resolvedParams,
            };
    }
}
function getAllImports(tokens, validCheck) {
    var _a, _b;
    const imports = [];
    for (const tok of tokens) {
        if (!tok.valid && validCheck)
            continue;
        imports.push({
            alias: (_a = tok.alias) === null || _a === void 0 ? void 0 : _a.text,
            path: (_b = tok.path) === null || _b === void 0 ? void 0 : _b.text,
            defaultParams: tok.resolvedParams,
        });
    }
    return imports;
}
function getParam(tokens, alias, validCheck) {
    var _a, _b, _c;
    for (const tok of tokens) {
        if (!tok.valid && validCheck)
            continue;
        if (((_a = tok.alias) === null || _a === void 0 ? void 0 : _a.value) === alias)
            return {
                defauleValue: (_b = tok.defValue) === null || _b === void 0 ? void 0 : _b.value,
                yamlType: (_c = tok.yamlType) === null || _c === void 0 ? void 0 : _c.value,
            };
    }
}
function getAllParams(tokens, validCheck) {
    var _a, _b, _c;
    const params = [];
    for (const tok of tokens) {
        if (!tok.valid && validCheck)
            ;
        params.push({
            alias: (_a = tok.alias) === null || _a === void 0 ? void 0 : _a.text,
            defauleValue: (_b = tok.defValue) === null || _b === void 0 ? void 0 : _b.value,
            yamlType: (_c = tok.yamlType) === null || _c === void 0 ? void 0 : _c.value,
        });
    }
    return params;
}
function getLocal(tokens, alias, validCheck) {
    var _a, _b, _c;
    for (const tok of tokens) {
        if (!tok.valid && validCheck)
            continue;
        if (((_a = tok.alias) === null || _a === void 0 ? void 0 : _a.value) === alias)
            return {
                defauleValue: (_b = tok.defValue) === null || _b === void 0 ? void 0 : _b.value,
                yamlType: (_c = tok.yamlType) === null || _c === void 0 ? void 0 : _c.value,
            };
    }
}
function getAllLocals(tokens, validCheck) {
    var _a, _b, _c;
    const locals = [];
    for (const tok of tokens) {
        if (!tok.valid && validCheck)
            ;
        locals.push({
            alias: (_a = tok.alias) === null || _a === void 0 ? void 0 : _a.text,
            defauleValue: (_b = tok.defValue) === null || _b === void 0 ? void 0 : _b.value,
            yamlType: (_c = tok.yamlType) === null || _c === void 0 ? void 0 : _c.value,
        });
    }
    return locals;
}

/**
 * Function to handle cache of YAML file, it initialize a dedicated module cache if not defined yet or if the file changed.
 * @param state - State object from first parse if this YAML file is imported.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 */
async function handleModuleCache(state, tempState) {
    var _a;
    // add path to parsedPaths
    state.parsedPaths.add(tempState.resolvedPath);
    // check if module is present in cache, if not init it and return
    const moduleCache = state.cache.get(tempState.resolvedPath);
    if (!moduleCache) {
        await initModuleCache(state, tempState);
        return;
    }
    // verify that text didn't change, if not init it and return
    const hashedSource = hashStr(tempState.source);
    if (hashedSource !== moduleCache.sourceHash) {
        await initModuleCache(state, tempState);
        return;
    }
    // add directive errors to tempState errors
    tempState.errors.push(...moduleCache.directives.errors);
    tempState.filename = (_a = getFilename(moduleCache.directives.filename, true)) !== null && _a !== void 0 ? _a : "";
}
/**
 * Helper method for handleModuleCache to initialize new module cache for specific YAML file.
 * @param state - State object from first parse if this YAML file is imported.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 */
async function initModuleCache(state, tempState) {
    var _a;
    // get cache data
    const sourceHash = hashStr(tempState.resolvedPath);
    const directives = tokenizeDirectives(tempState.source, tempState);
    const AST = handleAST(tempState);
    // generate new cache
    const cache = {
        loadByParamHash: new Map(),
        directives,
        resolvedPath: tempState.resolvedPath,
        sourceHash,
        scalarTokens: {},
        AST,
    };
    // save new cache in the state
    state.cache.set(tempState.resolvedPath, cache);
    //  add directive errors and filename to tempState
    tempState.errors.push(...cache.directives.errors);
    tempState.filename = (_a = getFilename(directives.filename, true)) !== null && _a !== void 0 ? _a : "";
}
function handleAST(tempState) {
    // pass source and options to yaml lib
    const AST = parseDocument(tempState.source, tempState.options);
    // add errors
    const errors = AST.errors;
    for (const e of errors) {
        let error;
        if (e instanceof YAMLParseError$1)
            error = new YAMLParseError(e.pos, e.code, e.message);
        if (e instanceof YAMLWarning$1)
            error = new YAMLWarning(e.pos, e.code, e.message);
        if (error) {
            error.cause = e.cause;
            error.linePos = e.linePos;
            error.name = e.name;
            error.stack = e.stack;
            tempState.errors.push(error);
        }
    }
    // return contents
    return AST.contents;
}
/**
 * Function to add parse entery to cache of specific YAML file.
 * @param state - State object from first parse if this YAML file is imported.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 * @param parseEntery - Entery that holds parse value and errors of specific YAML file.
 */
function setParseEntery(state, tempState, parseEntery) {
    var _a, _b;
    // get path and params
    const path = tempState.resolvedPath;
    const comParams = {
        ...((_a = tempState.options.universalParams) !== null && _a !== void 0 ? _a : {}),
        ...((_b = tempState.options.params) !== null && _b !== void 0 ? _b : {}),
    };
    // get moduleCache params
    const moduleCache = state.cache.get(path);
    if (!moduleCache)
        return;
    // hash params
    const hashedParams = hashParams(comParams);
    // set entery in cache
    moduleCache.loadByParamHash.set(hashedParams, parseEntery);
}
/**
 *
 * @param state - State object from first parse if this YAML file is imported.
 * @param filepath - Path of YAML file in filesystem.
 * @param params - Params object to defined values of params in the parsed YAML file, note that it only affect YAML file at passed filepath and not passed to imported files.
 * @param ignoreTags
 * @returns
 */
function getParseEntery(state, filepath, params) {
    const moduleCache = state.cache.get(filepath);
    if (!moduleCache)
        return;
    // hash params and get cache of this load with params
    const hashedParams = hashParams(params !== null && params !== void 0 ? params : {});
    return moduleCache.loadByParamHash.get(hashedParams);
}

// basic helpers
function current(state) {
    return state.input[state.pos];
}
function eof(state) {
    return state.pos >= state.len;
}
function advance(state, n = 1) {
    const steps = Math.min(n, state.len - state.pos); // safe guard from going beyond max length
    return state.pos + steps;
}
function peek(state, n = 1) {
    return state.input.substr(state.pos, n);
}
// Function to handle line position
function handleLinePos(state, start) {
    let linePos = [];
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
function mergeTokenPosition(tok, parentTok) {
    // add absolute start position of the parent
    const parentStart = parentTok.pos.start;
    tok.pos.start += parentStart;
    tok.pos.end += parentStart;
    // update line positions
    for (let i = 0; i < tok.linePos.length; i++) {
        const linePos = tok.linePos[i];
        const parentLinePos = parentTok.linePos[linePos.line];
        if (parentTok.linePos[0])
            linePos.line += parentTok.linePos[0].line;
        linePos.start += parentLinePos.start;
        linePos.end += parentLinePos.start;
    }
}
function mergeScalarPosition(tok, tempState) {
    const start = tempState.range[0];
    const end = tempState.range[1];
    if (end === 99999)
        return;
    // add absolute start positions
    tok.pos.start += start;
    tok.pos.end += start;
    // get line position of range
    const parentLinePositions = getLinePosFromRange(tempState.source, tempState.lineStarts, [start, end]);
    // update line positions
    for (let i = 0; i < tok.linePos.length; i++) {
        const linePos = tok.linePos[i];
        const parentLinePos = parentLinePositions[linePos.line];
        if (parentLinePositions[0])
            linePos.line += parentLinePositions[0].line;
        linePos.start += parentLinePos.start;
        linePos.end += parentLinePos.start;
    }
}
function readUntilClose(state, start, openChar, closeChar, ignoreTextTrim) {
    var _a;
    let out = "";
    let depth = 0;
    const checkOpen = openChar.length > 1
        ? () => peek(state, openChar.length) === openChar
        : (ch) => ch === openChar;
    const checkClose = closeChar.length > 1
        ? () => peek(state, closeChar.length) === closeChar
        : (ch) => ch === closeChar;
    while (!eof(state)) {
        const ch = current(state);
        if (ch === "\\") {
            state.pos = advance(state);
            if (eof(state))
                break;
            const esc = current(state);
            const map = {
                n: "\n",
                r: "\r",
                t: "\t",
                "'": "'",
                '"': '"',
                "\\": "\\",
            };
            out += (_a = map[esc]) !== null && _a !== void 0 ? _a : esc;
            state.pos = advance(state);
            continue;
        }
        if (checkOpen(ch))
            depth++;
        if (checkClose(ch)) {
            if (depth === 0)
                break;
            depth--;
        }
        out += ch;
        state.pos = advance(state);
    }
    const linePos = handleLinePos(state, start);
    const raw = state.input.slice(start, state.pos);
    const text = out.trim();
    return { linePos, raw, text };
}
function read(state, start, steps, ignoreTextTrim) {
    state.pos = advance(state, steps);
    const linePos = handleLinePos(state, start);
    const raw = state.input.slice(start, state.pos);
    const text = raw.trim();
    return { linePos, raw, text };
}
function readUntilChar(state, start, stopChar, ignoreTextTrim) {
    var _a;
    let out = "";
    const checkStop = stopChar instanceof RegExp
        ? (ch) => stopChar.test(ch)
        : Array.isArray(stopChar)
            ? (ch) => stopChar.includes(ch)
            : stopChar.length > 1
                ? () => peek(state, stopChar.length) === stopChar
                : (ch) => ch === stopChar;
    while (!eof(state)) {
        const ch = current(state);
        if (ch === "\\") {
            state.pos = advance(state);
            if (eof(state))
                break;
            const esc = current(state);
            const map = {
                n: "\n",
                r: "\r",
                t: "\t",
                "'": "'",
                '"': '"',
                "\\": "\\",
            };
            out += (_a = map[esc]) !== null && _a !== void 0 ? _a : esc;
            state.pos = advance(state);
            continue;
        }
        if (checkStop(ch))
            break;
        out += ch;
        state.pos = advance(state);
    }
    const linePos = handleLinePos(state, start);
    const raw = state.input.slice(start, state.pos);
    const text = ignoreTextTrim ? out : out.trim();
    return { linePos, raw, text };
}

/**
 * Token types from text step of scalar tokenizer
 */
var TextTokenType;
(function (TextTokenType) {
    TextTokenType["TEXT"] = "TEXT";
    TextTokenType["EXPR"] = "EXPR";
    TextTokenType["EOF"] = "EOF";
})(TextTokenType || (TextTokenType = {}));
/**
 * Token types from expression step of scalar tokenizer
 */
var ExprTokenType;
(function (ExprTokenType) {
    ExprTokenType["PATH"] = "PATH";
    ExprTokenType["DOT"] = "DOT";
    ExprTokenType["ARGS"] = "ARGS";
    ExprTokenType["WHITE_SPACE"] = "WHITE_SPACE";
    ExprTokenType["TYPE"] = "TYPE";
    ExprTokenType["EOF"] = "EOF";
})(ExprTokenType || (ExprTokenType = {}));
/**
 * Token types from arguments step of scalar tokenizer
 */
var ArgsTokenType;
(function (ArgsTokenType) {
    ArgsTokenType["KEY_VALUE"] = "KEY_VALUE";
    ArgsTokenType["COMMA"] = "COMMA";
    ArgsTokenType["EOF"] = "EOF";
})(ArgsTokenType || (ArgsTokenType = {}));
/**
 * Token types from keyValue step of scalar tokenizer
 */
var KeyValueTokenType;
(function (KeyValueTokenType) {
    KeyValueTokenType["EQUAL"] = "EQUAL";
    KeyValueTokenType["KEY"] = "KEY";
    KeyValueTokenType["VALUE"] = "VALUE";
    KeyValueTokenType["EOF"] = "EOF";
})(KeyValueTokenType || (KeyValueTokenType = {}));

// main function
function tokenizeKeyValue(input, argsTok, tokenizeTextFunc) {
    var _a;
    // handle tokens
    let tokens = [];
    let state = initArgsTokenState$1(input);
    while (true) {
        const toks = nextArgsToken$1(state);
        tokens.push(...toks);
        for (const t of toks)
            mergeTokenPosition(t, argsTok);
        if (((_a = tokens[tokens.length - 1]) === null || _a === void 0 ? void 0 : _a.type) === KeyValueTokenType.EOF)
            break;
    }
    // resolve any value tokens using text tokenizer
    for (const t of tokens)
        if (t.type === KeyValueTokenType.VALUE)
            t.valueToks = tokenizeTextFunc(t.raw ? t.raw.trim() : "", t);
    // return
    return tokens;
}
function nextArgsToken$1(state) {
    // get current character
    const ch = current(state);
    // tokens array
    let tokens = [];
    // if eof reutnr last token
    if (eof(state)) {
        const start = state.pos;
        const linePos = handleLinePos(state, start);
        const tok = {
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
        const tok = {
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
    }
    if (ch === '"' || ch === "'")
        return readQuoted(state);
    else
        return readUnQuoted(state);
}
function readQuoted(state) {
    let tokens = [];
    const start = state.pos;
    const { raw, text, linePos } = readUntilChar(state, start, current(state));
    if (!text)
        return tokens; // if only white space omit token
    const value = state.afterEqual ? getValueFromText(text) : text;
    const tok = {
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
function readUnQuoted(state) {
    let tokens = [];
    const start = state.pos;
    const { raw, text, linePos } = readUntilChar(state, start, ["=", ","]);
    if (!text)
        return tokens; // if only white space omit token
    const value = state.afterEqual ? getValueFromText(text) : text;
    const tok = {
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
function initArgsTokenState$1(input) {
    return {
        input,
        len: input.length,
        pos: 0,
        line: 0,
        absLineStart: 0,
        afterEqual: false,
    };
}

// main function
function tokenizeArgs(input, exprTok, tokenizeTextFunc) {
    // handle tokens
    let tokens = [];
    let state = initArgsTokenState(input);
    while (true) {
        const toks = nextArgsToken(state);
        tokens.push(...toks);
        for (const t of toks)
            mergeTokenPosition(t, exprTok);
        if (tokens[tokens.length - 1].type === ArgsTokenType.EOF)
            break;
    }
    // resolve any value tokens using text tokenizer
    for (const t of tokens)
        if (t.type === ArgsTokenType.KEY_VALUE)
            t.keyValueToks = tokenizeKeyValue(t.raw ? t.raw : "", t, tokenizeTextFunc);
    // return
    return tokens;
}
function nextArgsToken(state) {
    // get current character
    const ch = current(state);
    // tokens array
    let tokens = [];
    // if eof reutnr last token
    if (eof(state)) {
        const start = state.pos;
        const linePos = handleLinePos(state, start);
        const tok = {
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
        const tok = {
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
    const tok = {
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
function initArgsTokenState(input) {
    return {
        input,
        len: input.length,
        pos: 0,
        line: 0,
        absLineStart: 0,
    };
}

// main function
function tokenizeExpr(input, textTok, tokenizeTextFunc) {
    // handle tokens
    let tokens = [];
    let state = initExprTokenState(input);
    while (true) {
        const toks = nextExprToken(state);
        tokens.push(...toks);
        for (const t of toks)
            mergeTokenPosition(t, textTok);
        if (tokens[tokens.length - 1].type === ExprTokenType.EOF)
            break;
    }
    // tokenize args inside ARGS token
    for (const t of tokens)
        if (t.type === ExprTokenType.ARGS)
            t.argTokens = tokenizeArgs(t.raw ? t.raw : "", t, tokenizeTextFunc);
    // return
    return tokens;
}
function nextExprToken(state) {
    // get current character
    const ch = current(state);
    // tokens array
    let tokens = [];
    // if eof reutnr last token
    if (eof(state)) {
        const start = state.pos;
        const linePos = handleLinePos(state, start);
        const tok = {
            type: ExprTokenType.EOF,
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
    // if dot return dot token, not that it can only be used before any white spaces present
    if (ch === "." && !state.afterWhiteSpace) {
        const start = state.pos;
        const { raw, text, linePos } = read(state, start, 1);
        const tok = {
            type: ExprTokenType.DOT,
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
    // handle opening "("
    if (ch === "(" && !state.afterParen) {
        // skip "(" sign
        state.pos = advance(state);
        // loop until ")" mark
        const start = state.pos;
        const { raw, text, linePos } = readUntilClose(state, start, "(", ")");
        const value = text;
        const tok = {
            type: ExprTokenType.ARGS,
            raw,
            text,
            value,
            quoted: false,
            linePos,
            pos: { start, end: state.pos },
        };
        tokens.push(tok);
        // skip "(" sign
        state.pos = advance(state);
        state.afterParen = true;
        // return
        return tokens;
    }
    // if whitespace return white space token and every text after it will be type token
    if (/\s/.test(ch)) {
        // handle white space token
        let start = state.pos;
        const { raw: wRaw, text: wText, linePos: wLinePos, } = readUntilChar(state, start, /\s/, true);
        const wTok = {
            type: ExprTokenType.WHITE_SPACE,
            raw: wRaw,
            text: wText,
            value: wText,
            quoted: false,
            linePos: wLinePos,
            pos: { start, end: state.pos },
        };
        tokens.push(wTok);
        state.afterWhiteSpace = true;
        // handle type token
        start = state.pos;
        const { raw: tRaw, text: tText, linePos: tLinePos, } = read(state, start, Infinity);
        const exprTok = {
            type: ExprTokenType.TYPE,
            raw: tRaw,
            text: tText,
            value: tText,
            quoted: false,
            linePos: tLinePos,
            pos: { start, end: state.pos },
        };
        tokens.push(exprTok);
        return tokens;
    }
    if (ch === '"' || ch === "'")
        return readQuotedPath(state);
    else
        return readPath(state);
}
function readQuotedPath(state) {
    let tokens = [];
    const start = state.pos;
    const { raw, text, linePos } = readUntilChar(state, start, current(state));
    const value = text;
    const tok = {
        type: ExprTokenType.PATH,
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
function readPath(state) {
    var _a;
    let tokens = [];
    let out = "";
    const start = state.pos;
    // Manual loop here to add custom check
    while (!eof(state)) {
        const ch = current(state);
        if (ch === "." || (ch === "(" && !state.afterParen))
            break;
        if (ch === "\\") {
            state.pos = advance(state);
            if (eof(state))
                break;
            const esc = current(state);
            const map = {
                n: "\n",
                r: "\r",
                t: "\t",
                "'": "'",
                '"': '"',
                "\\": "\\",
            };
            out += (_a = map[esc]) !== null && _a !== void 0 ? _a : esc;
            state.pos = advance(state);
            continue;
        }
        out += ch;
        state.pos = advance(state);
    }
    const linePos = handleLinePos(state, start);
    const raw = state.input.slice(start, state.pos);
    const text = out.trim();
    const value = text;
    const tok = {
        type: ExprTokenType.PATH,
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
function initExprTokenState(input) {
    return {
        input,
        len: input.length,
        pos: 0,
        line: 0,
        absLineStart: 0,
        afterParen: false,
        afterWhiteSpace: false,
    };
}

// main function
function tokenizeText(input, keyValueTok, tempState) {
    // handle tokens
    let state = initTextTokenizerState(input);
    let tokens = [];
    while (true) {
        const toks = nextTextToken(state);
        tokens.push(...toks);
        if (tempState)
            for (const t of toks)
                mergeScalarPosition(t, tempState);
        if (keyValueTok)
            for (const t of toks)
                mergeTokenPosition(t, keyValueTok);
        if (tokens[tokens.length - 1].type === TextTokenType.EOF)
            break;
    }
    // tokenize expression inside EXPR tokens
    for (const t of tokens)
        if (t.type === TextTokenType.EXPR)
            t.exprTokens = tokenizeExpr(t.raw ? t.raw : "", t, tokenizeText);
    // return
    return tokens;
}
// function to get next token
function nextTextToken(state) {
    // get current character
    const ch = current(state);
    // tokens array
    let tokens = [];
    // if eof reutnr last token
    if (eof(state)) {
        const start = state.pos;
        const linePos = handleLinePos(state, start);
        const tok = {
            type: TextTokenType.EOF,
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
    // handle interpolation opening
    if (peek(state, 2) === "${") {
        // skip the "${" sign
        state.pos = advance(state, 2);
        // loop until "}" mark
        const start = state.pos;
        const { raw, text, linePos } = readUntilClose(state, start, "${", "}");
        const value = text;
        const tok = {
            type: TextTokenType.EXPR,
            raw,
            text,
            value,
            quoted: false,
            linePos: linePos,
            pos: { start, end: state.pos },
            freeExpr: false,
        };
        tokens.push(tok);
        // skip "}"
        state.pos = advance(state);
        return tokens;
    }
    // handle string starting with non escaped "$" sign
    if (state.pos === 0 && ch === "$") {
        // skip "$" mark
        state.pos = advance(state);
        // handle expr token (read until end of the input)
        const start = state.pos;
        const { raw, text, linePos } = read(state, start, Infinity);
        const value = text;
        const exprTok = {
            type: TextTokenType.EXPR,
            raw,
            text,
            value,
            quoted: false,
            linePos: linePos,
            pos: { start, end: state.pos },
            freeExpr: true,
        };
        tokens.push(exprTok);
        return tokens;
    }
    // read until first interpolation mark "${"
    const start = state.pos;
    const { raw, text, linePos } = readUntilChar(state, start, "${", true);
    const value = text;
    const textTok = {
        type: TextTokenType.TEXT,
        raw,
        text,
        value,
        quoted: false,
        linePos,
        pos: { start, end: state.pos },
    };
    tokens.push(textTok);
    return tokens;
}
// helper to init state
function initTextTokenizerState(input) {
    return {
        input,
        len: input.length,
        pos: 0,
        line: 0,
        absLineStart: 0,
    };
}

//////////////
// Tokenizer is split into five steps as follows:
//  - first step is text tokenizer which devide input into: either $<Expr> or <Text> ${<Expr>} <Text>
//  - second step is expression tokenizer which takes every <Expr> token from previous step and tokenize it into: $[Path ...](<Args>) as <Type>
//  - third step is args tokenizer which takes <Args> token from previous step and tokenize it into: [<KeyValuePair> ,,,]
//  - fourth step is keyValue tokenizer which takges <KeyValuePair> token from previous step and tokenize it into: <Key>=<Value>
//  - fifth and last step includes passing the <value> token again to the text tokenizer, making a loop until text is fully resolved
/////////////
// main functions
function tokenizeScalar(input, tempState) {
    return tokenizeText(input, undefined, tempState);
}

function verifyNodeType(node, type) {
    if (!type)
        return true;
    switch (type) {
        case "as map":
            return typeof node === "object" && !Array.isArray(node) && node != null;
        case "as seq":
            return Array.isArray(node);
        case "as scalar":
            return (typeof node === "string" ||
                typeof node === "number" ||
                typeof node === "boolean");
        default:
            return true;
    }
}
/**
 * Method to traverse through nodes tree. works sync.
 * @param tree - Node tree that will be traversed.
 * @param path - Path of traversal.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value after traversal and retuning subnode.
 */
async function traverseNodes(tree, paths, state, tempState, skipNum) {
    // start node from base of the tree
    let node = tree;
    let start = skipNum ? skipNum : 0;
    // start traversing
    for (let i = start; i < paths.length; i++) {
        // get path
        const p = paths[i];
        // get path and token
        const { path, tok } = p;
        // if path part is a number handle it accordingly
        const { node: childNode, resolved } = Number.isNaN(Number(path))
            ? await handleStrPath(node, path, state, tempState)
            : await handleNumPath(node, Number(path), state, tempState);
        // if node resolved add error and break
        if (!resolved) {
            const pathStr = paths.map((p) => p.path).join(".");
            tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", `Path: ${pathStr} is not present in target YAML tree.`));
            node = undefined;
            break;
        }
        // equal childNode with node
        node = childNode;
    }
    // return node
    return node;
}
async function handleStrPath(node, pathPart, state, tempState) {
    // if parent node is a YAMLMap, check all the keys
    if (node instanceof YAMLMap) {
        for (const pair of node.items) {
            let key;
            if (pair.key instanceof Scalar)
                key = pair.key.value;
            else
                key = pair.key;
            if (key === pathPart) {
                const resVal = await tempState.resolveFunc(pair.value, true, state, tempState);
                return { node: resVal, resolved: true };
            }
        }
    }
    // if node is a YAMLSeq, check all the items
    if (node instanceof YAMLSeq) {
        for (const item of node.items) {
            const resItem = await tempState.resolveFunc(item, true, state, tempState);
            if (typeof resItem === "string" && resItem === pathPart)
                return { node: resItem, resolved: true };
        }
    }
    // if node is a record, check keys for the path part, except if it's YAML's scalar or alias
    if (isRecord(node) && !(node instanceof Scalar) && !(node instanceof Alias))
        if (pathPart in node)
            return { node: node[pathPart], resolved: true };
    // default return if no match found
    return {
        node: undefined,
        resolved: false,
    };
}
async function handleNumPath(node, pathPart, state, tempState) {
    // if parent node is a YAMLMap, check all the keys for this number
    if (node instanceof YAMLMap) {
        for (const pair of node.items) {
            let key;
            if (pair.key instanceof Scalar)
                key = pair.key.value;
            else
                key = pair.key;
            if (key === `${pathPart}`) {
                const resVal = await tempState.resolveFunc(pair.value, true, state, tempState);
                return { node: resVal, resolved: true };
            }
        }
    }
    // if node is a YAMLSeq, get the index directly
    if (node instanceof YAMLSeq) {
        const length = node.items.length;
        if (pathPart < length) {
            const item = node.items[pathPart];
            const resItem = await tempState.resolveFunc(item, true, state, tempState);
            return { node: resItem, resolved: true };
        }
    }
    // if node is a scalar, get character at the index directly
    if (node instanceof Scalar) {
        const resScalar = await tempState.resolveFunc(node.value, true, state, tempState);
        if (typeof resScalar === "string") {
            const length = node.value.length;
            if (pathPart < length)
                return { node: node.value[pathPart], resolved: true };
        }
    }
    // if node is an Array or string get item at specific character directly
    if (Array.isArray(node) || typeof node === "string") {
        const length = node.length;
        if (pathPart < length)
            return { node: node[pathPart], resolved: true };
    }
    // default return if no match found
    return { node: undefined, resolved: false };
}

/**
 * Method to handle 'this' expression. works sync.
 * @param parts - Data parts.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
async function handleThis(ctx, state, tempState) {
    var _a, _b;
    // get needed state
    const paths = ctx.paths;
    const args = (_b = (_a = ctx.args) === null || _a === void 0 ? void 0 : _a.argsObj) !== null && _b !== void 0 ? _b : {};
    // get needed cache data
    const cache = state.cache.get(tempState.resolvedPath);
    if (!cache)
        return;
    // update local values
    tempState.locals.push(args);
    try {
        const node = await traverseNodes(cache.AST, paths, state, tempState, 1);
        if (ctx.type) {
            const verified = verifyNodeType(node, ctx.type.type);
            if (!verified) {
                tempState.errors.push(new YAMLExprError([ctx.textToken.pos.start, ctx.textToken.pos.end], "", `Type mis-match, value used is not of type: ${ctx.type.type}`));
                return null;
            }
        }
        return node;
    }
    finally {
        tempState.locals.pop();
    }
}

/**
 * Method to handle 'import' expression. works sync.
 * @param parts - Data parts.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
async function handleImport(ctx, state, tempState) {
    var _a, _b;
    // get needed state
    const paths = ctx.paths;
    const args = (_b = (_a = ctx.args) === null || _a === void 0 ? void 0 : _a.argsObj) !== null && _b !== void 0 ? _b : {};
    // get needed cache data
    const cache = state.cache.get(tempState.resolvedPath);
    if (!cache)
        return;
    const imp = getImport(cache.directives.import, paths[1].path, true);
    if (!imp)
        return;
    // merge default with defined params
    const finalParams = { ...imp.defaultParams, ...args };
    // import file
    const parse = await importModule(imp.path, finalParams, state, tempState);
    // traverse load using nodepath and verify node type if passed
    const node = await traverseNodes(parse, paths, state, tempState, 2);
    if (ctx.type) {
        const verified = verifyNodeType(node, ctx.type.type);
        if (!verified) {
            tempState.errors.push(new YAMLExprError([ctx.textToken.pos.start, ctx.textToken.pos.end], "", `Type mis-match, value used is not of type: ${ctx.type.type}.`));
            return null;
        }
    }
    // return node
    return node;
}
/**
 * Method to import another YAML files asynchronously.
 * @param modulePath - Path of the current YAML file.
 * @param targetPath - Path of the imported YAML file.
 * @param targetParams - Params value passed to imported YAML file.
 * @param loadOpts - Options object passed to load function and updated using imported module's filepath.
 * @param loadId - Load id generated for this load function execution.
 * @returns Final load of the imported file.
 */
async function importModule(targetPath, targetParams, state, tempState) {
    // merge paths
    const { status, value: resolvedPath } = mergePath(targetPath, state, tempState);
    if (!status)
        return;
    // deep clone options and update params
    const clonedOptions = deepClone(tempState.options);
    clonedOptions.params = targetParams;
    // load str
    const parseData = await tempState.parseFunc(resolvedPath, clonedOptions, state);
    // push any errors
    tempState.importedErrors.push(...parseData.errors);
    // return load
    return parseData.parse;
}

/**
 * Method to handle 'param' expression.
 * @param parts - Data parts.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
function handleParam(ctx, state, tempState) {
    var _a, _b, _c, _d, _e;
    // destrcture parts
    const alias = ctx.paths[1].path;
    // get needed cache data
    const cache = state.cache.get(tempState.resolvedPath);
    if (!cache)
        return;
    const param = getParam(cache.directives.param, alias, true);
    const defParam = param === null || param === void 0 ? void 0 : param.defauleValue;
    // if value is passed for this alias use it otherwise use default value
    const value = (_e = (_d = (_b = (_a = tempState.options.params) === null || _a === void 0 ? void 0 : _a[alias]) !== null && _b !== void 0 ? _b : (_c = tempState.options.universalParams) === null || _c === void 0 ? void 0 : _c[alias]) !== null && _d !== void 0 ? _d : defParam) !== null && _e !== void 0 ? _e : null;
    if (param === null || param === void 0 ? void 0 : param.yamlType) {
        const type = "as " + param.yamlType;
        const verified = verifyNodeType(value, type);
        if (!verified) {
            tempState.errors.push(new YAMLExprError([ctx.textToken.pos.start, ctx.textToken.pos.end], "", `Type mis-match, value used is not of type: ${param.yamlType}`));
            return null;
        }
    }
    return value;
}

/**
 * Method to handle 'local' expression.
 * @param parts - Data parts.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
function handleLocal(ctx, state, tempState) {
    var _a, _b;
    // destrcture parts
    const alias = ctx.paths[1].path;
    // get needed cache data
    const cache = state.cache.get(tempState.resolvedPath);
    if (!cache)
        return;
    const local = getLocal(cache.directives.local, alias, true);
    let defLocal = local === null || local === void 0 ? void 0 : local.defauleValue;
    // generate localsVal object from values passed after $this
    const handledLocalsVal = Object.fromEntries(tempState.locals
        .map((obj) => {
        return Object.entries(obj);
    })
        .flat(1));
    // if value is passed for this alias use it otherwise use default value
    const value = (_b = (_a = handledLocalsVal[alias]) !== null && _a !== void 0 ? _a : defLocal) !== null && _b !== void 0 ? _b : null;
    if (local === null || local === void 0 ? void 0 : local.yamlType) {
        const type = "as " + local.yamlType;
        const verified = verifyNodeType(value, type);
        if (!verified) {
            tempState.errors.push(new YAMLExprError([ctx.textToken.pos.start, ctx.textToken.pos.end], "", `Type mis-match, value used is not of type: ${local.yamlType}.`));
            return null;
        }
    }
    return value;
}

/**
 * Method to resolve interpolations. works sync.
 * @param expr - Expression that will be handled.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value returned from expression resolve.
 */
async function handleScalar(input, scalar, state, tempState) {
    // tokenize scalar
    const tokens = tokenizeScalar(input, tempState);
    // add tokens to cache
    const cache = state.cache.get(tempState.resolvedPath);
    if (cache) {
        if (cache.scalarTokens[input])
            cache.scalarTokens[input].scalars.push(scalar);
        else
            cache.scalarTokens[input] = { scalars: [scalar], tokens };
    }
    // handle tokens and return them
    return await handleTextTokens(tokens, state, tempState);
}
async function handleTextTokens(tokens, state, tempState) {
    if (!tokens)
        return undefined;
    // get first tokend and check if it's free expression or not
    const t1 = tokens[0];
    if (!t1)
        return undefined;
    const freeExpr = t1.freeExpr;
    // if free expression handle expression tokens directly
    if (freeExpr)
        return await handleExprTokens(tokens[0], tokens[0].exprTokens, state, tempState);
    // handle interpolated text
    let out = "";
    let i = 0;
    while (i < tokens.length) {
        const tok = tokens[i];
        if (tok.type === TextTokenType.TEXT)
            out += tok.text;
        if (tok.type === TextTokenType.EXPR) {
            const value = await handleExprTokens(tok, tok.exprTokens, state, tempState);
            const textValue = typeof value === "string" ? value : JSON.stringify(value);
            out += textValue;
        }
        i++;
    }
    return out;
}
async function handleExprTokens(textToken, tokens, state, tempState) {
    var _a;
    if (!tokens)
        return undefined;
    // expression state and error definition
    const ctx = {
        textToken,
        paths: [],
        args: undefined,
        type: undefined,
        prevTokenType: undefined,
        argsDefined: false,
        typeDefined: false,
        whiteSpaceDefined: false,
    };
    // loop tokens
    for (const tok of tokens) {
        // if path token handle it
        if (tok.type === ExprTokenType.PATH) {
            // make sure that no two path tokens are repeated
            if (ctx.prevTokenType === "path")
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Path tokens should be separated by dots."));
            ctx.prevTokenType = "path";
            // push path text
            ctx.paths.push({ path: tok.text, tok });
        }
        // if dot token handle it
        if (tok.type === ExprTokenType.DOT) {
            // make sure that no two dot tokens are repeated
            if (ctx.prevTokenType === "dot")
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Path should be present after each dot."));
            ctx.prevTokenType = "dot";
        }
        // if args token handle it
        if (tok.type === ExprTokenType.ARGS) {
            // make sure that args token is defined only once
            if (ctx.argsDefined) {
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Each expression can only contain one arguments parenthesis."));
                continue;
            }
            ctx.argsDefined = true;
            // handle args
            const args = await handleArgTokens(tok.argTokens, state, tempState);
            (_a = ctx.args) !== null && _a !== void 0 ? _a : (ctx.args = { argsObj: {}, tok });
            for (const [k, v] of Object.entries(args))
                ctx.args.argsObj[k] = v;
        }
        // if type token handle it
        if (tok.type === ExprTokenType.TYPE) {
            // make sure that type token is defined only once
            if (ctx.typeDefined) {
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Each expression can only contain one type definition."));
                continue;
            }
            ctx.typeDefined = true;
            // set type
            ctx.type = { type: tok.text.trim(), tok };
        }
        // if white space token handle it
        if (tok.type === ExprTokenType.WHITE_SPACE) ;
    }
    // get base (first path) and verify it
    const baseTok = ctx.paths[0];
    if (!verifyBase(baseTok.path)) {
        tempState.errors.push(new YAMLExprError([baseTok.tok.pos.start, baseTok.tok.pos.end], "", "Invalid base, allowed bases are either: 'this', 'import', 'param' or 'local'."));
        return undefined;
    }
    // get alias (second path) and verify it
    const aliasTok = ctx.paths[1];
    if (!aliasTok) {
        tempState.errors.push(new YAMLExprError([baseTok.tok.pos.end, baseTok.tok.pos.end + 1], "", "You have to pass an alias after expression base"));
        return undefined;
    }
    if (!verifyAlias(aliasTok.path, baseTok.path, state, tempState)) {
        tempState.errors.push(new YAMLExprError([aliasTok.tok.pos.start, aliasTok.tok.pos.end], "", "Alias used is not defined in directives"));
        return undefined;
    }
    // verify arguments if passed
    if (ctx.args && baseTok.path !== "this" && baseTok.path !== "import") {
        tempState.errors.push(new YAMLExprError([ctx.args.tok.pos.start, ctx.args.tok.pos.end], "", "Arguments will be ignored, they are used with 'this' or 'import' bases only."));
    }
    // verify type if passed
    if (ctx.type) {
        if (baseTok.path !== "this" && baseTok.path !== "import")
            tempState.errors.push(new YAMLExprError([ctx.type.tok.pos.start, ctx.type.tok.pos.end], "", "Type will be ignored, it's used with 'this' or 'import' bases only."));
        if (!verifyType(ctx.type.type)) {
            tempState.errors.push(new YAMLExprError([ctx.type.tok.pos.start, ctx.type.tok.pos.end], "", "Invalid type, allowed types are either: 'as scalar', 'as map' or 'as seq'."));
            ctx.type = undefined;
        }
    }
    // resolve
    switch (baseTok.path) {
        case "this":
            return handleThis(ctx, state, tempState);
        case "import":
            return handleImport(ctx, state, tempState);
        case "param":
            return handleParam(ctx, state, tempState);
        case "local":
            return handleLocal(ctx, state, tempState);
    }
}
function verifyBase(base) {
    switch (base) {
        case "import":
            return true;
        case "this":
            return true;
        case "local":
            return true;
        case "param":
            return true;
        default:
            return false;
    }
}
function verifyAlias(alias, base, state, tempState) {
    if (!alias)
        return false;
    const cache = state.cache.get(tempState.resolvedPath);
    if (!cache)
        return false;
    switch (base) {
        case "import":
            const imports = getAllImports(cache.directives.import, false);
            return imports.some((i) => i.alias === alias);
        case "local":
            const locals = getAllLocals(cache.directives.local, false);
            return locals.some((i) => i.alias === alias);
        case "param":
            const params = getAllParams(cache.directives.param, false);
            return params.some((i) => i.alias === alias);
        case "this":
            return !!alias;
    }
}
function verifyType(type) {
    switch (type) {
        case "as scalar":
            return true;
        case "as map":
            return true;
        case "as seq":
            return true;
        default:
            return false;
    }
}
async function handleArgTokens(tokens, state, tempState) {
    if (!tokens)
        return { args: {}, errors: [] };
    // var to hold args object
    let args = {};
    // loop args tokens
    let prevTokenType;
    for (const tok of tokens) {
        // if comma token handle itt
        if (tok.type === ArgsTokenType.COMMA) {
            // make sure that no two comma tokens are repeated
            if (prevTokenType === "comma")
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Key value pair should be present after each comma."));
            prevTokenType = "comma";
        }
        // if key value pair token handle it
        if (tok.type === ArgsTokenType.KEY_VALUE) {
            // make sure that no two key value tokens are repeated (should never happen)
            if (prevTokenType === "keyValue")
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Key value pairs should be separeted by comma."));
            // resolve key value token
            const { key, value } = await handleKeyValueTokens(tok.keyValueToks, state, tempState);
            // add key value pair or push error if no key was present
            if (!key) {
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Messing key from key value pair."));
                continue;
            }
            args[key] = value;
        }
    }
    return args;
}
async function handleKeyValueTokens(tokens, state, tempState) {
    if (!tokens)
        return { key: undefined, value: undefined };
    // key value parts
    let key;
    let value;
    // loop tokens
    let prevTokenType;
    for (const tok of tokens) {
        // if key token handle it
        if (tok.type === KeyValueTokenType.KEY) {
            // make sure that no two key tokens are repeated
            if (prevTokenType === "key")
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Only one key can be used in key=value pair."));
            // handle key
            prevTokenType = "key";
            key = tok.text;
        }
        // if value token handle it
        if (tok.type === KeyValueTokenType.VALUE) {
            // make sure that no two value tokens are repeated
            if (prevTokenType === "value")
                tempState.errors.push(new YAMLExprError([tok.pos.start, tok.pos.end], "", "Only one value can be used in key=value pair."));
            // handle value
            prevTokenType = "value";
            value = await handleTextTokens(tok.valueToks, state, tempState);
        }
    }
    return { key, value };
}

/**
 * Method to resolve blueprint into final load returned to user. works sync meaning any YAML file read or tag construct function execution is executed synchronously.
 * @param loadId - Load id generated to this load function execution.
 * @param opts - Options passed with this load function execution.
 * @returns Final load after resolving the blueprint, what is returned to the user after load functions finishes.
 */
async function resolve(state, tempState) {
    const cache = state.cache.get(tempState.resolvedPath);
    if (!cache)
        return { parse: undefined, privateParse: undefined }; // should never execute
    // resolve
    const parse = await resolveUnknown(cache.AST, false, state, tempState);
    // remove private nodes if set to do so only
    const ignorePrivate = tempState.options.ignorePrivate && state.depth === 1;
    if (!ignorePrivate)
        filterPrivate(parse, tempState, cache);
    //  and return value
    return parse;
}
/**
 * Method to resolve unkown value types by checking type and using appropriate specific resolver function. it's also the place where blueprintInstance is resolved. works sync.
 * @param item - Item of unkown type.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param allowExpr - Boolean to indicate if expressions should be resolved. used to block resolve of expressions inside node's keys.
 * @param ctx - Context object that holds data about this resolve.
 * @returns Value of the specific resolve function based on type.
 */
async function resolveUnknown(item, anchored, state, tempState) {
    if (item instanceof Alias)
        return resolveAlias(item, tempState);
    if (item instanceof YAMLSeq)
        return await resolveSeq(item, anchored, state, tempState);
    if (item instanceof YAMLMap)
        return await resolveMap(item, anchored, state, tempState);
    if (item instanceof Scalar)
        return await resolveScalar(item, anchored, state, tempState);
    return item;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper methods.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function resolveAlias(alias, tempState) {
    // update range
    if (alias.range)
        tempState.range = [alias.range[0], alias.range[1]];
    else
        tempState.range = [0, 99999];
    // var to hold out value
    let out;
    // check if it's saved in aliases
    const present = tempState.anchors.has(alias.source);
    // resolve anchor
    if (present)
        out = tempState.anchors.get(alias.source);
    else
        tempState.errors.push(new YAMLExprError(tempState.range, "", "No anchor is defined yet for this alias."));
    alias.resolvedValue = out;
    return out;
}
/**
 * Method to resolve string (scalar in YAML). works sync.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value of the resolved string (scalar in YAML).
 */
async function resolveScalar(scalar, anchored, state, tempState) {
    // update range
    if (scalar.range)
        tempState.range = [scalar.range[0], scalar.range[1]];
    else
        tempState.range = [0, 99999];
    // Detect circular dependency
    if (anchored && !scalar.resolved) {
        tempState.errors.push(new YAMLExprError(tempState.range, "", "Tried to access node before being defined."));
        return undefined;
    }
    // Handle value
    if (typeof scalar.value !== "string")
        return scalar.value;
    let out = await handleScalar(scalar.value, scalar, state, tempState);
    // handle tag if present
    if (scalar.tag)
        out = await resolveTag(scalar.value, scalar.tag, tempState);
    // handle anchor if present
    if (scalar.anchor)
        tempState.anchors.set(scalar.anchor, out);
    // mark it as resolved, save resolved value return it
    scalar.resolved = true;
    scalar.resolvedValue = out;
    return out;
}
/**
 * Method to resolve mappings. works sync.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
 * @returns Value of the resolved object (mapping in YAML).
 */
async function resolveMap(map, anchored, state, tempState) {
    // update range
    if (map.range)
        tempState.range = [map.range[0], map.range[1]];
    else
        tempState.range = [0, 99999];
    // var to hold out value
    if (anchored && !map.resolved) {
        tempState.errors.push(new YAMLExprError(tempState.range, "", "Tried to access node before being defined."));
        return undefined;
    }
    // handle value
    let res = {};
    for (const pair of map.items) {
        let hKey = await resolveUnknown(pair.key, anchored, state, tempState);
        let hVal = await resolveUnknown(pair.value, anchored, state, tempState);
        res[stringify(hKey, true)] = hVal;
    }
    let out = res; // just to avoid ts errors
    if (map.tag)
        out = await resolveTag(out, map.tag, tempState);
    if (map.anchor)
        tempState.anchors.set(map.anchor, out);
    map.resolved = true;
    map.resolvedValue = out;
    return out;
}
async function resolveSeq(seq, anchored, state, tempState) {
    // update range
    if (seq.range)
        tempState.range = [seq.range[0], seq.range[1]];
    else
        tempState.range = [0, 99999];
    // check resolve status
    if (anchored && !seq.resolved) {
        tempState.errors.push(new YAMLExprError(tempState.range, "", "Tried to access node before being defined."));
        return undefined;
    }
    let res = [];
    for (const item of seq.items)
        res.push(await resolveUnknown(item, anchored, state, tempState));
    let out = res; // just to avoid ts errors
    if (seq.tag)
        out = await resolveTag(out, seq.tag, tempState);
    if (seq.anchor)
        tempState.anchors.set(seq.anchor, out);
    seq.resolved = true;
    seq.resolvedValue = out;
    return out;
}
async function resolveTag(data, tag, tempState) {
    // get tag from schema
    const { options } = tempState;
    if (options.ignoreTags)
        return data;
    if (!(options.schema instanceof Schema)) {
        tempState.errors.push(new YAMLExprError(tempState.range, "", "No schema is defined to handle tags."));
        return data;
    }
    const tags = options.schema.tags;
    // get matching tag from tags
    const matchTag = tags.find((t) => t.tag === tag);
    if (!matchTag || !matchTag.resolve) {
        tempState.errors.push(new YAMLExprError(tempState.range, "", "This tag is not found in the schema."));
        return data;
    }
    // execute tag's resolve
    try {
        const resTag = matchTag.resolve(
        // @ts-ignore
        data, (err) => {
            tempState.errors.push(new YAMLExprError(tempState.range, "", `Error while resolving tag: ${err}.`));
        }, options);
        return resTag;
    }
    catch (err) {
        tempState.errors.push(new YAMLExprError(tempState.range, "", `Unkown error while resolving tag: ${err}.`));
        return data;
    }
}
/**
 * Method to filter private nodes from final load.
 * @param resolve - resolved value returned from resolve method.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Final value after removal or private items.
 */
function filterPrivate(parse, tempState, cache) {
    // get private array
    const privateObj = getPrivate(cache.directives.private, true);
    // loop through private array to handle each path
    for (const [pathStr, { pathParts, token, dirToken }] of Object.entries(privateObj)) {
        // var that holds the resolve to transverse through it
        let node = parse;
        for (let i = 0; i < pathParts.length; i++) {
            // get current part of the path
            const p = pathParts[i];
            // if it's not a record then path is not true
            if (!isRecord(node)) {
                // create error
                const error = new YAMLExprError([token.pos.start, token.pos.end], "", `Path: ${pathStr} is not present in target YAML tree.`);
                // push error into directive token, directives object and overall errors
                dirToken.errors.push(error);
                cache.directives.errors.push(error);
                tempState.errors.push(error);
                break;
            }
            // in last iteraion delete the child based on the parent type
            if (pathParts.length - 1 === i) {
                if (p in node) {
                    if (Array.isArray(node))
                        node.splice(Number(p), 1);
                    else
                        delete node[p];
                }
                if (Array.isArray(node) && typeof p === "string") {
                    const idx = node.indexOf(p);
                    if (idx !== -1)
                        node.splice(idx, 1);
                }
                continue;
            }
            // if item is present in node update it and continue
            if (p in node) {
                node = node[p];
                continue;
            }
            // only if node is an array then try matching using string value
            if (Array.isArray(node) && typeof p === "string") {
                const idx = node.indexOf(p);
                if (idx !== -1) {
                    node = node[idx];
                    continue;
                }
            }
        }
    }
}

/**
 * Class to handle circular dependency checks.
 */
class CircularDepHandler {
    constructor() {
        /** adjacency list: node -> set of dependencies (edges node -> dep) */
        this._graphs = new Map();
    }
    /**
     * Method to handle checking of the circular dependency.
     * @param modulePath - Path of the current module.
     * @param targetPath - Path of the imported module.
     * @returns - null if no circular dependency is present or array of paths or the circular dependency.
     */
    addDep(modulePath, targetPath) {
        // ensure nodes exist
        if (!this._graphs.has(modulePath))
            this._graphs.set(modulePath, new Set());
        // root/initial load — nothing to check
        if (!targetPath)
            return null;
        if (!this._graphs.has(targetPath))
            this._graphs.set(targetPath, new Set());
        // add the edge modulePath -> targetPath
        this._graphs.get(modulePath).add(targetPath);
        // Now check if there's a path from targetPath back to modulePath.
        // If so, we constructed a cycle.
        const path = this._findPath(targetPath, modulePath, this._graphs);
        if (path) {
            // path is [targetPath, ..., modulePath]
            // cycle: [modulePath, targetPath, ..., modulePath]
            return [modulePath, ...path];
        }
        return null;
    }
    /**
     * Method to delete dependency node (path of a module) from graph.
     * @param modulePath - Path that will be deleted.
     */
    deleteDep(modulePath) {
        // remove outgoing edges (delete node key)
        if (this._graphs.has(modulePath))
            this._graphs.delete(modulePath);
        // remove incoming edges from other nodes
        for (const [k, deps] of this._graphs.entries()) {
            deps.delete(modulePath);
        }
    }
    /** Method to find path of circular dependency. */
    _findPath(start, target, graph) {
        const visited = new Set();
        const path = [];
        const dfs = (node) => {
            if (visited.has(node))
                return false;
            visited.add(node);
            path.push(node);
            if (node === target)
                return true;
            const neighbors = graph.get(node);
            if (neighbors) {
                for (const n of neighbors) {
                    if (dfs(n))
                        return true;
                }
            }
            path.pop();
            return false;
        };
        return dfs(start) ? [...path] : null;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main load functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 *
 * @param filepath - Path of YAML file in filesystem.
 * @param options - Options object passed to control parser behavior.
 * @param state - For internal use don't pass any thing here.
 * @returns Object that hold parse value along with errors thrown in this YAML file and errors thrown in imported YAML files.
 */
async function parseExtend(filepath, options = {}, state) {
    // init state and temp state
    const s = initState(state);
    const ts = initTempState(filepath, options);
    try {
        // increment depth
        s.depth++;
        // verify path
        if (!verifyPath(ts.resolvedPath, ts))
            return {
                parse: undefined,
                errors: ts.errors,
                importedErrors: ts.importedErrors,
            };
        // read file and add source and lineStarts to tempState
        ts.source = await readFile(ts.resolvedPath, { encoding: "utf8" });
        ts.lineStarts = getLineStarts(ts.source);
        // get module cache
        await handleModuleCache(s, ts);
        // check if load with same passed params is present in the cache and return it if present
        const cachedParse = getParseEntery(s, ts.resolvedPath, ts.options.params);
        if (cachedParse !== undefined)
            return cachedParse;
        // load imports before preceeding in resolving this module
        await handleImports(s, ts);
        // resolve AST
        const resolved = await resolve(s, ts);
        // add filename, path and extendLinePos for this file's errors and update message by adding filename and path to it
        for (const e of ts.errors) {
            e.filename = ts.filename;
            e.path = ts.resolvedPath;
            e.extendLinePos = getLinePosFromRange(ts.source, ts.lineStarts, e.pos);
            e.message =
                e.message +
                    ` This error occured in file: ${e.filename ? e.filename : "Not defined"}, at path: ${e.path}`;
        }
        // generate parseEntery for this file
        const parseEntery = {
            parse: resolved,
            errors: ts.errors,
            importedErrors: ts.importedErrors,
        };
        // add parse entery to the cache
        setParseEntery(s, ts, parseEntery);
        return parseEntery;
    }
    finally {
        s.depth--;
    }
}
////////////////////////////////////////////////////////////////////////////////////
// Helper methdos
/**
 * Function to initialize parser state.
 * @param state - State object from first parse if this YAML file is imported.
 * @returns State object that holds data and cache needed to be presisted along parses of different YAML files.
 */
function initState(state) {
    if (state)
        return state;
    return {
        cache: new Map(),
        parsedPaths: new Set(),
        circularDep: new CircularDepHandler(),
        depth: 0,
    };
}
/**
 * Function to initialize temporary parser state.
 * @param filepath - Path of YAML file in filesystem.
 * @param options - Options object passed to control parser behavior.
 * @returns Temporary state object that holds data needed for parsing this YAML file only.
 */
function initTempState(filepath, options) {
    var _a;
    const basePath = (_a = options === null || options === void 0 ? void 0 : options.basePath) !== null && _a !== void 0 ? _a : process.cwd();
    return {
        source: "",
        lineStarts: [],
        options: {
            ...options,
            basePath: resolve$1(basePath),
        },
        errors: [],
        importedErrors: [],
        resolvedPath: resolve$1(basePath, filepath),
        filename: "",
        range: [0, 0],
        anchors: new Map(),
        locals: [],
        resolveFunc: resolveUnknown,
        parseFunc: parseExtend,
    };
}
/**
 * Function to handle importing YAML files defined in directives.
 * @param state - State object that holds data and cache needed to be presisted along parses of different YAML files.
 * @param tempState - Temporary state object that holds data needed for parsing this YAML file only.
 */
async function handleImports(state, tempState) {
    const cache = state.cache.get(tempState.resolvedPath);
    if (!cache)
        return; // should never fire
    const imports = getAllImports(cache.directives.import, true);
    for (const i of imports) {
        const params = i.defaultParams;
        const path = i.path;
        if (!path)
            continue;
        const copyOptions = deepClone(tempState.options);
        await parseExtend(path, { ...copyOptions, params }, state);
    }
}

export { YAMLError, YAMLExprError, YAMLParseError, YAMLWarning, parseExtend };
//# sourceMappingURL=index.js.map
