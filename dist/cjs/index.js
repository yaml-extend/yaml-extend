'use strict';

var yaml = require('yaml');
var path = require('path');
var fs = require('fs');
var promises = require('fs/promises');
var crypto = require('crypto');

/** Regex to capture if a path has .yaml or .yml in it or not. */
const fileNameRegex = /.ya?ml$/;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This file contains Helper functions that are not related to our core work directly.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Path related helper functions.
/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param targetPath - Path of the imported module.
 * @param currentPath - Path of the current module.
 * @returns Resolve of the two paths.
 */
function resolvePath(targetPath, currentPath) {
    return path.resolve(currentPath, targetPath);
}
/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param resolvedPath - Resolved path from concatinating current file path with imported file path. works sync.
 * @param currentPath - Path of the current module.
 * @returns Read value of the file in UTF-8 format.
 */
async function readFile(resolvedPath, currentPath, loadOpts) {
    const resCurrentPath = path.resolve(currentPath);
    if (!isInsideSandBox(resolvedPath, resCurrentPath) && !loadOpts.unsafe)
        throw new Error(`Path used: ${resolvedPath} is out of scope of base path: ${resCurrentPath}`);
    if (!isYamlFile(resolvedPath))
        throw new Error(`You can only load YAML files the loader. loaded file: ${resolvedPath}`);
    return await promises.readFile(resolvedPath, { encoding: "utf8" });
}
/**
 * Function to check if file reads are black boxed.
 * @param resolvedPath - Resolved path from concatinating current file path with imported file path. works async.
 * @param basePath - Base path passed in opts of load function. used to black box the file reads.
 * @returns Boolean that indicates if resolved path actually lives inside base path.
 */
function isInsideSandBox(resolvedPath, basePath) {
    // Resolve symlinks to avoid escaping via symlink tricks
    const realBase = fs.realpathSync(basePath);
    const realRes = fs.realpathSync(resolvedPath);
    // Windows: different root/drive => definitely outside (compare case-insensitive)
    const baseRoot = path.parse(realBase).root.toLowerCase();
    const resRoot = path.parse(realRes).root.toLowerCase();
    if (baseRoot !== resRoot)
        return false;
    // Correct order: from base -> to res
    const rel = path.relative(realBase, realRes);
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
    return fileNameRegex.test(path);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ID and hash related helper functions.
/**
 * Function to generate random id.
 */
function generateId() {
    return crypto.randomBytes(12).toString("hex");
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
    return crypto.createHash("sha256").update(strObj).digest().toString("hex");
}
/**
 * Function to hash string.
 * @param str - String that will be hashed.
 * @returns Hash of the string.
 */
function hashStr(str) {
    return crypto.createHash("sha256").update(str).digest().toString("hex");
}
/**
 * Function to ge first closing character at the same depth.
 * @param str - Sting that will be looped through.
 * @param openCh - Character used to open the expression (e.g. '{' or '[').
 * @param closeCh - Character used to close the expression (e.g. '}' or ']').
 * @param startIdx - Index to start searching from in the string.
 * @returns Number at which closest closing character at the same depth is present, or -1 if it's not closed.
 */
function getClosingChar(str, openCh, closeCh, startIdx) {
    /** Var to hold depth of the opening and closing characters. */
    let depth = 0;
    /** Var to hold index of the looping. */
    let i = startIdx !== null && startIdx !== void 0 ? startIdx : 0;
    // start loop string
    while (i < str.length) {
        // get character
        const ch = str[i];
        // if char is closing char and depth already zero return index other whise decrease depth by one
        if (ch === closeCh && str[i - 1] !== "\\")
            if (depth === 0)
                return i;
            else
                depth--;
        // if char is opening char increment depth by one
        if (ch === openCh && str[i - 1] !== "\\")
            depth++;
        // increment loop index
        i++;
    }
    // if no closing at depth zero return -1
    return -1;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Random helpers.
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
/**
 * Function to allow ignore private load on specific module.
 * @param load - Load after removing private loads.
 * @param privateLoad - Load with private nodes still present.
 * @param opts - Options object passed to the loader.
 * @returns Either load or privateLoad if file defined to ignore private nodes.
 */
function handlePrivateLoad(load, privateLoad, filename, ignorePrivate) {
    // if ignore private not defined return privateLoad directly
    if (ignorePrivate === undefined)
        return load;
    // if all modules defined to ignore private return fullLoad directly
    if (ignorePrivate === "all")
        return privateLoad;
    // return fullLoad only if filename matches the name of ignores files
    if (filename && ignorePrivate.includes(filename))
        return privateLoad;
    // return privateLoad as default
    return load;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This file contains all the stores (cache) used in the library (for load and LiveLoader) along with functions to interact with these stores.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main cache stores.
/**
 * Map of all loads, which is keyed by loadId and each load id stores the important input and output of load function.
 */
const modulesCache = new Map();
/**
 *  Map that links load ids to modules they utilize.
 */
const loadIdsToModules = new Map();
/**
 * Map that links modules to load ids that calls them.
 */
const modulesToLoadIds = new Map();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Cache interaction functions.
/**
 * Function to add module (str) data under existing loadId. while updating links between loadIds and modules as well.
 * @param loadId - Unique id that identifies this load.
 * @param str - YAML String passed.
 * @param filepath - Path of the readed YAML file.
 * @param AST - AST tree from yaml parse.
 * @param directives - Object that holds metadata about the directives.
 * @returns Reference to the created cache.
 */
function addModuleCache(loadId, filepath, str, AST, directives) {
    // resolve filepath
    const resolvedPath = path.resolve(filepath);
    // hash string, params and path
    const hashedStr = hashStr(str);
    // create new empty cache entery
    const moduleCache = {
        sourceHash: hashedStr,
        resolvedPath,
        loadByParamHash: new Map(),
        directives,
        AST,
        pureLoad: {
            load: undefined,
            privateLoad: undefined,
            errors: [],
        },
    };
    // save it to the cache
    modulesCache.set(resolvedPath, moduleCache);
    // id -> paths
    let paths = loadIdsToModules.get(loadId);
    if (!paths) {
        paths = new Set();
        loadIdsToModules.set(loadId, paths);
    }
    paths.add(resolvedPath);
    // path -> ids
    let ids = modulesToLoadIds.get(resolvedPath);
    if (!ids) {
        ids = new Set();
        modulesToLoadIds.set(resolvedPath, ids);
    }
    ids.add(loadId);
    // return reference to the created cache
    return moduleCache;
}
function addResolveCache(filepath, params, load, privateLoad, errors) {
    // create the entry object
    const paramLoadEntry = { load, privateLoad, errors: errors };
    // resolve filepath
    const resolvedPath = path.resolve(filepath);
    // get module cache
    const moduleCache = modulesCache.get(resolvedPath);
    if (moduleCache === undefined)
        return;
    // if no params passed save it as pureLoad and privatePureLoad
    if (!params) {
        moduleCache.pureLoad = paramLoadEntry;
        return paramLoadEntry;
    }
    // hash params
    const hashedParams = hashParams(params);
    // add load
    moduleCache.loadByParamHash.set(hashedParams, paramLoadEntry);
    // return
    return paramLoadEntry;
}
/**
 * Function that checks if module's data are cached and return them, if not it returns undefined.
 * @param modulePath - Url path of the module that will be deleted.
 * @param str - Optional String passed to load function so it can verify if it has changed or not.
 * @returns Module's cache data or undefined if not present.
 */
function getModuleCache(modulePath, str) {
    // if no path supplied return
    if (!modulePath)
        return;
    // check if module cache is present
    const moduleCache = modulesCache.get(modulePath);
    if (moduleCache === undefined)
        return;
    // 2nd step verification by comparing old and new hashed str
    if (str) {
        const newStrHash = hashStr(str);
        if (newStrHash !== moduleCache.sourceHash)
            return;
    }
    // return blue print
    return moduleCache;
}
/**
 * Function that checks if specific load with module params is cached.
 * @param modulePath - Url path of the module that will be deleted.
 * @param params - Value of module params in YAML sting.
 * @returns Object that stores load value and module params used to load it.
 */
function getResolveCache(modulePath, params) {
    // if no path supplied return
    if (!modulePath)
        return;
    // check if module cache is present (should be present but do this for ts)
    const moduleCache = modulesCache.get(modulePath);
    if (!moduleCache)
        return;
    // if no params passed return pure load
    if (!params)
        return moduleCache.pureLoad;
    // hash params
    const hashedParams = hashParams(params);
    // get cache of this load with params using hashed params
    const cache = moduleCache.loadByParamHash.get(hashedParams);
    // return cache
    return cache;
}
/**
 * Function to delete a module from load id, using in live loader.
 * @param loadId - Unique id that identifies this load.
 * @param modulePath - Url path of the module that will be deleted.
 */
function deleteModuleCache(loadId, modulePath) {
    var _a, _b, _c;
    // delete link between loadId (live loader id) and the path or module
    (_a = loadIdsToModules.get(loadId)) === null || _a === void 0 ? void 0 : _a.delete(modulePath);
    (_b = modulesToLoadIds.get(modulePath)) === null || _b === void 0 ? void 0 : _b.delete(loadId);
    if (((_c = modulesToLoadIds.get(modulePath)) === null || _c === void 0 ? void 0 : _c.size) === 0)
        modulesCache.delete(modulePath);
}
/**
 * Function to delete load id along with all its links and modules cache if it was the only one utilizing them.
 * @param loadId - Unique id that identifies this load.
 */
function deleteLoadIdFromCache(loadId) {
    // get modules of this loadId, if not present just return
    const modules = loadIdsToModules.get(loadId);
    // for each modules remove the loadId from it, and if it became empty delete the modulesCache
    if (modules)
        for (const m of modules) {
            const ids = modulesToLoadIds.get(m);
            if (!ids)
                continue;
            ids.delete(loadId);
            if (ids.size === 0)
                modulesCache.delete(m);
        }
    // finally remove the entry for loadId
    loadIdsToModules.delete(loadId);
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
     * @param loadId - Unique id that identifies this load.
     * @returns - null if no circular dependency is present or array of paths or the circular dependency.
     */
    addDep(modulePath, targetPath, loadId) {
        // get graph for this loadId
        let graph = this._graphs.get(loadId);
        if (!graph) {
            graph = new Map();
            this._graphs.set(loadId, graph);
        }
        // ensure nodes exist
        if (!graph.has(modulePath))
            graph.set(modulePath, new Set());
        // root/initial load — nothing to check
        if (!targetPath)
            return null;
        if (!graph.has(targetPath))
            graph.set(targetPath, new Set());
        // add the edge modulePath -> targetPath
        graph.get(modulePath).add(targetPath);
        // Now check if there's a path from targetPath back to modulePath.
        // If so, we constructed a cycle.
        const path = this._findPath(targetPath, modulePath, graph);
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
     * @param loadId - Unique id that identifies this load.
     */
    deleteDep(modulePath, loadId) {
        // get graph for this loadId
        const graph = this._graphs.get(loadId);
        if (!graph)
            return;
        // remove outgoing edges (delete node key)
        if (graph.has(modulePath))
            graph.delete(modulePath);
        // remove incoming edges from other nodes
        for (const [k, deps] of graph.entries()) {
            deps.delete(modulePath);
        }
    }
    /**
     * Method to delete all dependency nodes (path of a module) of specific loadId from graphs.
     * @param loadId - Unique id that identifies this load.
     */
    deleteLoadId(loadId) {
        this._graphs.delete(loadId);
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
/** Class to handle circular dependency check. */
const circularDepClass = new CircularDepHandler();

// Base new ErrorName and ErrorCode into YAMLError class
class YAMLError extends yaml.YAMLError {
    constructor(name, pos, code, message) {
        // @ts-ignore
        super(name, pos, code, message);
    }
}
// New YAMLExprError class
class YAMLExprError extends YAMLError {
    constructor(pos, code, message) {
        super("YAMLExprError", pos, code, message);
    }
}

/** Regex that holds escape characters. */
const ESCAPE_CHAR = /\"|\[/;
/** Map that maps each escape character with it's closing character. */
const ESCAPE_CLOSE_MAP = {
    '"': '"',
    "[": "]",
};
/** Delimiters used in the directives and expressions. */
const DELIMITERS = /\s|\.|\=/;
/** Regex to handle white spaces. */
const WHITE_SPACE = /\s/;
function divideNodepath(nodepath, pos) {
    const parts = divideByDelimiter(nodepath, ".", pos);
    const handledParts = parts.map(removeEscChar);
    return handledParts;
}
/**
 * Method to divide directive into parts by dividing at non-escaped white spaces.
 * @param dir - Directive string that will be divided.
 * @param maxParts - Max number of parts as different directives accept x number of parts.
 * @returns Array of divided parts.
 */
function divideDirective(dir, pos, maxParts) {
    const parts = divideByDelimiter(dir, " ", pos, maxParts);
    return parts;
}
function divideExpression(expr, pos, maxParts) {
    const parts = divideByDelimiter(expr, " ", pos, maxParts);
    return parts;
}
/**
 * Method to divide <key=value> string into key value pair (entery).
 * @param keyValue - <key=value> string that will be divided.
 * @returns Entery of key and value.
 */
function divideKeyValue(keyValue, pos) {
    const parts = divideByDelimiter(keyValue, "=", pos, 2);
    return [parts[0], parts[1]];
}
function removeEscChar(str) {
    // if string is less that 2 return str directly
    if (str.length < 2)
        return str;
    // handle removal of leading and end escape char
    if (ESCAPE_CHAR.test(str[0]) && ESCAPE_CHAR.test(str[str.length - 1])) {
        str = str.slice(1, str.length - 1);
    }
    return str;
}
function removeEscBlackSlash(str) {
    var _a;
    // handle removal of escape "\"
    let out = "";
    let i = 0;
    while (i < str.length) {
        if (str[i] === "\\")
            i++;
        out += (_a = str[i]) !== null && _a !== void 0 ? _a : "";
        i++;
    }
    return out;
}
/**
 * Method to divide string based on single delimiter.
 * @param str - String that will be divided.
 * @param delimiter - Delimiter used to divide string.
 * @param maxParts - Max parts before ommiting the remaining string.
 * @returns Array that holds divided parts.
 */
function divideByDelimiter(str, delimiter, pos, maxParts) {
    const delimiterFunc = getDelimiterFunc(delimiter);
    const parts = [];
    const len = str.length;
    let start = 0;
    let i = 0;
    while (i < len) {
        // get current char
        const cur = str[i];
        // if escape char skip until close
        if (ESCAPE_CHAR.test(cur) && (i === 0 || DELIMITERS.test(str[i - 1]))) {
            const closeChar = ESCAPE_CLOSE_MAP[cur];
            const endIdx = handleEscapeBlock(str, i, closeChar, pos);
            i = endIdx;
            continue;
        }
        // if delimiter add to parts
        if (delimiterFunc(cur)) {
            const part = str.slice(start, i);
            const handledPart = removeEscBlackSlash(part);
            parts.push(handledPart);
            if (maxParts && parts.length === maxParts)
                return parts;
            i++;
            while (i < len && WHITE_SPACE.test(str[i]))
                i++;
            start = i;
            continue;
        }
        i++;
    }
    if (start < len) {
        const lastPart = str.slice(start);
        const handledPart = removeEscBlackSlash(lastPart);
        parts.push(handledPart);
    }
    return parts;
}
/**
 * Helper method to retun function that will be used to check delimiter.
 * @param delimiter - Delimiter used to divide string.
 * @returns Function that accept single charachter and decide if it matches delimiter used or not.
 */
function getDelimiterFunc(delimiter) {
    if (delimiter === " ")
        return (ch) => WHITE_SPACE.test(ch);
    else
        return (ch) => ch === delimiter;
}
/**
 * Method to handle escape blocks by reading string until closing character and returning end index.
 * @param str - String that will be checked.
 * @param startIndex - Index at which scan will start.
 * @param closeChar - Character that closes escape block.
 * @returns end index.
 */
function handleEscapeBlock(str, startIndex, closeChar, pos) {
    const len = str.length;
    let j = startIndex + 1;
    let isClosed = false;
    while (j < len) {
        const cur = str[j];
        if (cur === "\\") {
            // handle escaped char (e.g. \" or \\)
            if (j + 1 < len) {
                j += 2;
                continue;
            }
            else {
                // trailing backslash — include it
                j++;
                continue;
            }
        }
        if (cur === closeChar) {
            isClosed = true;
            j++; // move index to char after closing
            break;
        }
        j++;
    }
    if (!isClosed)
        throw new YAMLExprError(pos, "", `Opened escape char without close`);
    return j;
}

/**
 * Method to handle directive by returning it's type and deviding it into it's structural parts creating directive parts object.
 * @param dir - Directive that will be divided.
 * @returns Object that holds type along with structural parts of this directive. returns undefined if invalid directive is passed.
 */
function handleDirective(dir, pos, errors) {
    // handle TAG directive
    if (dir.startsWith("%TAG")) {
        const parts = handleDirTag(dir, pos, errors);
        if (parts)
            return { type: "TAG", parts };
    }
    // handle FILENAME directive
    if (dir.startsWith("%FILENAME")) {
        const parts = handleDirFilename(dir, pos, errors);
        if (parts)
            return { type: "FILENAME", parts };
    }
    // handle PARAM directive
    if (dir.startsWith("%PARAM")) {
        const parts = handleDirParam(dir, pos, errors);
        if (parts)
            return { type: "PARAM", parts };
    }
    // handle LOCAL directive
    if (dir.startsWith("%LOCAL")) {
        const parts = handleDirLocal(dir, pos, errors);
        if (parts)
            return { type: "LOCAL", parts };
    }
    // handle IMPORT directive
    if (dir.startsWith("%IMPORT")) {
        const parts = handleDirImport(dir, pos, errors);
        if (parts)
            return { type: "IMPORT", parts };
    }
    // handle PRIVATE directive
    if (dir.startsWith("%PRIVATE"))
        return { type: "PRIVATE", parts: handleDirPrivate(dir, pos) };
}
/** Method to handle tag directive deviding into it's structure parts. */
function handleDirTag(dir, pos, errors) {
    // remove statring %TAG and trim
    const data = dir.replace("%TAG", "").trim();
    // devide directive into parts
    const parts = divideDirective(data, pos, 2);
    const handle = parts[0];
    const prefix = parts[1];
    if (!handle || !prefix) {
        errors.push(new YAMLExprError(pos, "", "You should pass handle and prefix after '%TAG' directive, structure of TAG directive: %TAG <handle> <prefix>"));
        return;
    }
    return { alias: handle, metadata: prefix };
}
/** Method to handle private directive deviding into it's structure parts. */
function handleDirPrivate(dir, pos, errors) {
    // remove statring %PRIVATE and trim
    const data = dir.replace("%PRIVATE", "").trim();
    // divide directive into parts, all parts are <private-nodes>
    const privateNodes = divideDirective(data, pos);
    // return private nodes
    return { arrMetadata: privateNodes };
}
/** Method to handle local directive deviding into it's structure parts. */
function handleDirLocal(dir, pos, errors) {
    // remove statring %LOCAL and trim
    const data = dir.replace("%LOCAL", "").trim();
    // divide directive into parts, first part is <alias> and second is <def-value>
    const parts = divideDirective(data, pos, 2);
    const alias = parts[0];
    const defValue = parts[1];
    // verify that alais is present
    if (!alias) {
        errors.push(new YAMLExprError(pos, "", "You should pass alias after '%LOCAL' directive, structure of PARAM directive: %LOCAL <alias>"));
        return;
    }
    // remove wrapping escape char if present
    const handledAlias = removeEscChar(alias);
    const handledDefValue = defValue && removeEscChar(defValue);
    // return parts
    return { alias: handledAlias, defValue: handledDefValue };
}
/** Method to handle param directive deviding into it's structure parts. */
function handleDirParam(dir, pos, errors) {
    // remove statring %PARAM and trim
    const data = dir.replace("%PARAM", "").trim();
    // divide directive into parts, first part is <alias> and second is <def-value>
    const parts = divideDirective(data, pos, 2);
    const alias = parts[0];
    const defValue = parts[1];
    // verify that alais is present
    if (!alias) {
        errors.push(new YAMLExprError(pos, "", "You should pass alias after '%PARAM' directive, structure of PARAM directive: %PARAM <alias>"));
        return;
    }
    // remove wrapping escape char if present
    const handledAlias = removeEscChar(alias);
    const handledDefValue = defValue && removeEscChar(defValue);
    // return parts
    return { alias: handledAlias, defValue: handledDefValue };
}
/** Method to handle filename directive deviding into it's structure parts. */
function handleDirFilename(dir, pos, errors) {
    // remove statring %FILENAME and trim
    const data = dir.replace("%FILENAME", "").trim();
    // remove wrapping escape char if present
    const handledMetadata = data && removeEscChar(data);
    // return error if empty filename was used
    if (!handledMetadata) {
        errors.push(new YAMLExprError(pos, "", "You should pass a scalar after %FILENAME directive."));
        return;
    }
    // the filename is composed of only the <filename> so return directly
    return { metadata: handledMetadata };
}
/** Method to handle import directive deviding into it's structure parts. */
function handleDirImport(dir, pos, errors) {
    // remove statring %IMPORT and trim
    const data = dir.replace("%IMPORT", "").trim();
    // divide directive into parts, first part is <alias> and second is <path> and last part is [key=value ...]
    const parts = divideDirective(data, pos);
    const alias = parts[0];
    const path = parts[1];
    const keyValueParts = parts.slice(2);
    // verify that alais and path are present
    if (!alias || !path) {
        errors.push(new YAMLExprError(pos, "", "You should pass alias and path after '%IMPORT' directive, structure of IMPORT directive: %IMPORT <alias> <path> [key=value ...]"));
        return;
    }
    // remove wrapping escape char if present
    const handledAlias = removeEscChar(alias);
    const handledPath = removeEscChar(path);
    // handle conversion of keyValue parts into an object
    const keyValue = {};
    if (keyValueParts)
        for (const keyVal of keyValueParts) {
            const [key, value] = divideKeyValue(keyVal, pos);
            // remove wrapping escape char if present
            const handledKey = key && removeEscChar(key);
            const handledValue = value && removeEscChar(value);
            // add to keyValue object
            keyValue[handledKey] = handledValue;
        }
    // return parts
    return { alias: handledAlias, metadata: handledPath, keyValue };
}
function getDirectives(str) {
    /** Array to hold defined directives. */
    const dirs = [];
    /** Number to track position in the loop of the hole str. */
    let i = 0;
    // Start looping the string
    while (i < str.length) {
        /** Var to hold start if first char in the new line is "%", otherwise will be undefined. */
        let start;
        // if current char is a "%" that mark start of a directive
        if (str[i] === "%")
            start = i;
        // skip to the next new line
        while (i < str.length)
            if (str[i] !== "\n")
                i++;
            else {
                i++;
                break;
            }
        // if start is defined (is dir) then add the directive
        if (start !== undefined) {
            const dir = str.slice(start, i);
            dirs.push({ dir, pos: [start, i] });
        }
    }
    // return directives
    return dirs;
}

/**
 * Method to add to tags map where key is handle for the tag and value is prefix.
 * @param tagsMap - Reference to the map that holds tags's handles and prefixes and will be passed to directives object.
 * @param parts - Parts of the line.
 */
function handleTags(tagsMap, parts) {
    const { alias, metadata } = parts;
    tagsMap.set(alias, metadata);
}

/**
 * Method to add to params map where key is alias for the param and value is the default value.
 * @param paramsMap - Reference to the map that holds params's aliases and default values and will be passed to directives object.
 * @param parts - Parts of the line.
 */
function handleParams(paramsMap, parts) {
    // get alias and defValue from parts
    const { alias, defValue } = parts;
    // add the alias with default value to the paramsMap
    paramsMap.set(alias, defValue);
}

/**
 * Method to push private nodes to the private array of directives object.
 * @param privateArr - Reference to the array that holds private nodes and will be passed to directives object.
 * @param parts - Directive parts object with metadata being private nodes.
 */
function handlePrivate(privateArr, parts) {
    const privateNodes = parts.arrMetadata;
    if (Array.isArray(privateNodes))
        for (const p of privateNodes)
            privateArr.push(p);
}

/** Method to verify imports structure (<alias> <path>) and add them to the map. */
/**
 * Method to add to imports map where key is alias for the import and value is the path and default params values passed to this import.
 * @param importsMap - Reference to the map that holds imports's aliases and path with default params values and will be passed to directives object.
 * @param parts - Parts of the line.
 */
function handleImports(importsMap, parts) {
    // get alias and path and params key value from parts
    const { alias, metadata: path, keyValue: params } = parts;
    // add parts to the map
    importsMap.set(alias, { path, params });
}

/**
 * Method to add to locals map where key is alias for the local and value is the default value.
 * @param localsMap - Reference to the map that holds local's aliases and default values and will be passed to directives object.
 * @param parts - Parts of the line.
 */
function handleLocals(localsMap, parts) {
    // get alias and defValue from parts
    const { alias, defValue } = parts;
    // add the alias with default value to the paramsMap
    localsMap.set(alias, defValue);
}

/**
 * Method to return filename. Only method here that returns value as filename is a string and can't be referenced.
 * @param parts - Directive parts object with metadata filename.
 * @returns filename.
 */
function handleFilename(parts) {
    return parts.metadata;
}

/**
 * Method to read directives in YAML string, handle wrapper specific directives by converting them into directives object.
 * @param str - String passed in load function.
 * @returns Directives object which holds meta data about directives to be used in the resolver.
 */
function handleDir(str) {
    // array to hold errors
    const errors = [];
    // define main arrays and maps to hold directives data
    /** Holds list of private node's definition. */
    const privateArr = [];
    /** Holds list of tag handles and prefix values used in the module. */
    const tagsMap = new Map();
    /** Holds list of param's aliases and default values used in the module. */
    const paramsMap = new Map();
    /** Holds list of local's aliases and default values used in the module. */
    const localsMap = new Map();
    /** Map of aliases for imports and import data as path and modules params. */
    const importsMap = new Map();
    /** Filename defined in directives. */
    let filename = "";
    // get dirs from str
    const dirs = getDirectives(str);
    for (const dir of dirs) {
        const { dir: dirStr, pos } = dir;
        const trimmedDir = dirStr.trim();
        const dirData = handleDirective(trimmedDir, pos, errors);
        if (!dirData)
            continue;
        // destructure directive data
        const { type, parts: directiveParts } = dirData;
        switch (type) {
            case "TAG":
                handleTags(tagsMap, directiveParts);
                break;
            case "PARAM":
                handleParams(paramsMap, directiveParts);
                break;
            case "PRIVATE":
                handlePrivate(privateArr, directiveParts);
                break;
            case "IMPORT":
                handleImports(importsMap, directiveParts);
                break;
            case "LOCAL":
                handleLocals(localsMap, directiveParts);
                break;
            case "FILENAME":
                filename = handleFilename(directiveParts);
                break;
        }
    }
    return {
        tagsMap,
        privateArr,
        paramsMap,
        localsMap,
        importsMap,
        filename,
        errors,
        directives: dirs,
    };
}

/**
 * Method to check if mapping (object) in raw load is actaully mapping expression. mapping interpolations are defined with this structure in YAML file: { $<int> }
 * which is pared by js-yaml to: { $<int>: null }. so it actally check if it's a one key object and the key is valid expression syntax with value null.
 * @param map - Mapping that will be checked.
 * @returns Boolean that indicate if it's an expression or not.
 */
function isMapExpr(map) {
    if (!map.flow)
        return { isExpr: false, expr: "" }; // make sure it's a flow syntax
    if (map.items.length !== 1)
        return { isExpr: false, expr: "" }; // make sure it's a single key
    if (!(map.items[0].key instanceof yaml.Scalar))
        return { isExpr: false, expr: "" }; // make sure key is scalar
    if (map.items[0].value !== null)
        return { isExpr: false, expr: "" }; // make sure value is null
    const key = map.items[0].key.value; // get value of the scalar
    if (typeof key !== "string")
        return { isExpr: false, expr: "" }; // make sure value of the Scalar instance is a string
    const tStr = key.trim(); // trim string
    const isExpr = tStr[0] === "$" && tStr[1] !== "$" && tStr[1] !== "{"; // make sure it's valid syntax
    return { isExpr, expr: tStr }; // make sure it's valid syntax
}
/**
 * Method to check if sequence (array) in raw load is actaully sequence expression. sequence interpolations are defined with this structure in YAML file: [ $<int> ]
 * which is pared by js-yaml to: [ $<int> ]. so it actally check if it's a one item array and the this item is valid expression syntax.
 * @param seq - Sequence that will be checked.
 * @returns Boolean that indicate if it's an expression or not.
 */
function isSeqExpr(seq) {
    if (!seq.flow)
        return { isExpr: false, expr: "" }; // make sure it's a flow syntax
    if (seq.items.length !== 1)
        return { isExpr: false, expr: "" }; // make sure it's a single item
    if (!(seq.items[0] instanceof yaml.Scalar))
        return { isExpr: false, expr: "" }; // make sure item is scalar
    const item = seq.items[0].value; // get value of the scalar
    if (typeof item !== "string")
        return { isExpr: false, expr: "" }; // make sure value of the Scalar instance is a string
    const tStr = item.trim(); // trim string
    const isExpr = tStr[0] === "$" && tStr[1] !== "$" && tStr[1] !== "{"; // make sure it's valid syntax
    return { isExpr, expr: tStr };
}
/**
 * Method to check if scalar (string) in raw load is actaully scalar expression. scalar interpolations are defined with this structure in YAML file: $<int>
 * which is pared by js-yaml to: $<int>. so it actally check if the string is valid expression syntax.
 * @param scalar - Scalar that will be checked.
 * @returns Boolean that indicate if it's an expression or not.
 */
function isScalarExpr(scalar) {
    const str = scalar.value; // get value of the scalar
    if (typeof str !== "string")
        return { isExpr: false, expr: "" }; // make sure value of the Scalar instance is a string
    const tStr = str.trim(); // trim string
    const isExpr = tStr[0] === "$" && tStr[1] !== "$" && tStr[1] !== "{"; // make sure it's valid syntax
    return { isExpr, expr: tStr };
}
function isStringExpr(str) {
    const tStr = str.trim(); // trim string
    const isExpr = tStr[0] === "$" && tStr[1] !== "$" && tStr[1] !== "{"; // make sure it's valid syntax
    return { isExpr, expr: tStr };
}

/** Regex to capture starting dot. */
const START_WITH_DOT = /^\./;
function handleExpression(expr, ctx) {
    if (expr.startsWith("$this"))
        return { type: "this", parts: handleExprThis(expr, ctx) };
    if (expr.startsWith("$import"))
        return { type: "import", parts: handleExprImport(expr, ctx) };
    if (expr.startsWith("$local"))
        return { type: "local", parts: handleExprLocal(expr, ctx) };
    if (expr.startsWith("$param"))
        return { type: "param", parts: handleExprParam(expr, ctx) };
}
function handleExprThis(expr, ctx) {
    var _a, _b;
    // get current position (used in error messages)
    const pos = ctx.range ? ctx.range : [0, 99999];
    // only trim for now (as we want to get part with $this)
    const data = expr.trim();
    // divide expression into parts, first part is <nodepath> and second is [key-value ...]
    const parts = divideExpression(data, pos, 2);
    const nodepathStr = (_b = (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.replace("$this", "")) === null || _b === void 0 ? void 0 : _b.replace(START_WITH_DOT, "");
    const keyValueParts = parts.slice(1);
    // verify that nodepathStr is present ($this should have path)
    if (!nodepathStr)
        throw new YAMLExprError(pos, "", "You should pass node path after '$this' expression, structure of this expression: $this.<node-path> [key=value ...]");
    // handle division of nodepath string into parts
    const nodepath = divideNodepath(nodepathStr, pos);
    const handledNodepath = nodepath.map(removeEscChar);
    // handle conversion of keyValue parts into an object
    const keyValue = {};
    if (keyValueParts)
        for (const keyVal of keyValueParts) {
            const [key, value] = divideKeyValue(keyVal, pos);
            // remove wrapping escape char if present
            const handledKey = key && removeEscChar(key);
            const handledValue = value && removeEscChar(value);
            // add to keyValue object
            keyValue[handledKey] = handledValue;
        }
    // return parts
    return { nodepath: handledNodepath, keyValue };
}
function handleExprImport(expr, ctx) {
    var _a, _b;
    // get current position (used in error messages)
    const pos = ctx.range ? ctx.range : [0, 99999];
    // only trim for now (as we want to get part with $import)
    const data = expr.trim();
    // divide expression into parts, first part is <nodepath> and second is [key-value ...]
    const parts = divideExpression(data, pos, 2);
    const nodepathStr = (_b = (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.replace("$import", "")) === null || _b === void 0 ? void 0 : _b.replace(START_WITH_DOT, "");
    const keyValueParts = parts.slice(1);
    // handle division of nodepath string into parts
    const nodepath = divideNodepath(nodepathStr, pos);
    const handledNodepath = nodepath.map(removeEscChar);
    // handle conversion of keyValue parts into an object
    const keyValue = {};
    if (keyValueParts)
        for (const keyVal of keyValueParts) {
            const [key, value] = divideKeyValue(keyVal, pos);
            // remove wrapping escape char if present
            const handledKey = key && removeEscChar(key);
            const handledValue = value && removeEscChar(value);
            // add to keyValue object
            keyValue[handledKey] = handledValue;
        }
    // return parts
    return { nodepath: handledNodepath, keyValue };
}
function handleExprLocal(expr, ctx) {
    // get current position (used in error messages)
    const pos = ctx.range ? ctx.range : [0, 99999];
    // remove statring $local and trim, also remove dot if new string starts with a dot
    const data = expr.replace("$local", "").trim().replace(START_WITH_DOT, "");
    // get alias (first and only part)
    const parts = divideExpression(data, pos, 1);
    const alias = parts[0];
    if (!alias)
        throw new YAMLExprError(pos, "", "You should pass alias after '$local' expression, strcuture of local expression: $local.<alias>");
    const handledAlias = removeEscChar(alias);
    return { alias: handledAlias };
}
function handleExprParam(expr, ctx) {
    // get current position (used in error messages)
    const pos = ctx.range ? ctx.range : [0, 99999];
    // remove statring $param and trim, also remove dot if new string starts with a dot
    const data = expr.replace("$param", "").trim().replace(START_WITH_DOT, "");
    // get alias (first and only part)
    const parts = divideExpression(data, pos, 1);
    const alias = parts[0];
    if (!alias)
        throw new YAMLExprError(pos, "", "You should pass alias after '$param' expression, structure of local expression: $local.<alias>");
    const handledAlias = removeEscChar(alias);
    return { alias: handledAlias };
}

/**
 * Method to traverse through nodes tree. works sync.
 * @param tree - Node tree that will be traversed.
 * @param path - Path of traversal.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value after traversal and retuning subnode.
 */
async function traverseNodes(tree, path, ctx) {
    // start node from base of the tree
    let node = tree;
    // start traversing
    for (const p of path) {
        // if path part is a number handle it accordingly
        const { node: childNode, resolved } = Number.isNaN(Number(p))
            ? await handleStrPath(node, p, ctx)
            : await handleNumPath(node, Number(p), ctx);
        // if node resolved add error and break
        if (!resolved) {
            ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Invalid path in expression: ${path.join(".")}`));
            node = undefined;
            break;
        }
        // equal childNode with node
        node = childNode;
    }
    // return node
    return node;
}
async function handleStrPath(node, pathPart, ctx) {
    // if parent node is a YAMLMap, check all the keys
    if (node instanceof yaml.YAMLMap) {
        for (const pair of node.items) {
            let key;
            if (pair.key instanceof yaml.Scalar)
                key = pair.key.value;
            else
                key = pair.key;
            if (key === pathPart) {
                const resVal = await ctx.resolveFunc(pair.value, true, true, ctx);
                return { node: resVal, resolved: true };
            }
        }
    }
    // if node is a YAMLSeq, check all the items
    if (node instanceof yaml.YAMLSeq) {
        for (const item of node.items) {
            const resItem = await ctx.resolveFunc(item, true, true, ctx);
            if (typeof resItem === "string" && resItem === pathPart)
                return { node: resItem, resolved: true };
        }
    }
    // if node is a record, check keys for the path part, except if it's YAML's scalar or alias
    if (isRecord(node) && !(node instanceof yaml.Scalar) && !(node instanceof yaml.Alias))
        if (pathPart in node)
            return { node: node[pathPart], resolved: true };
    // default return if no match found
    return {
        node: undefined,
        resolved: false,
    };
}
async function handleNumPath(node, pathPart, ctx) {
    // if parent node is a YAMLMap, check all the keys for this number
    if (node instanceof yaml.YAMLMap) {
        for (const pair of node.items) {
            let key;
            if (pair.key instanceof yaml.Scalar)
                key = pair.key.value;
            else
                key = pair.key;
            if (key === `${pathPart}`) {
                const resVal = await ctx.resolveFunc(pair.value, true, true, ctx);
                return { node: resVal, resolved: true };
            }
        }
    }
    // if node is a YAMLSeq, get the index directly
    if (node instanceof yaml.YAMLSeq) {
        const length = node.items.length;
        if (pathPart < length) {
            const item = node.items[pathPart];
            const resItem = await ctx.resolveFunc(item, true, true, ctx);
            return { node: resItem, resolved: true };
        }
    }
    // if node is a scalar, get character at the index directly
    if (node instanceof yaml.Scalar) {
        const resScalar = await ctx.resolveFunc(node.value, true, true, ctx);
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
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
async function handleThis(parts, ctx) {
    // destrcture parts
    const { nodepath, keyValue: localsVal } = parts;
    // get needed cache data
    const { moduleCache, locals } = ctx;
    const { AST } = moduleCache;
    // update local values
    locals.push(localsVal);
    try {
        return await traverseNodes(AST, nodepath, ctx);
    }
    finally {
        locals.pop();
    }
}

/**
 * Method to handle 'param' expression.
 * @param parts - Data parts.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
function handleParam(parts, ctx) {
    var _a, _b, _c;
    // destrcture parts
    const { alias } = parts;
    const { moduleCache, options } = ctx;
    const { directives } = moduleCache;
    const { paramsMap } = directives;
    // check if alias is defined in directives using paramsMap, if yes get def param value
    if (!paramsMap.has(alias)) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Alias used in params expression: '${alias}' is not defined in directives.`));
        return undefined;
    }
    const defParam = paramsMap.get(alias);
    // if value is passed for this alias use it otherwise use default value
    return (_c = (_b = (_a = options.params) === null || _a === void 0 ? void 0 : _a[alias]) !== null && _b !== void 0 ? _b : defParam) !== null && _c !== void 0 ? _c : null;
}

/**
 * Method to handle 'local' expression.
 * @param parts - Data parts.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
function handleLocal(parts, ctx) {
    var _a, _b;
    // destrcture parts
    const { alias } = parts;
    const { moduleCache, locals } = ctx;
    const { directives } = moduleCache;
    const { localsMap } = directives;
    // check if alias is defined in directives using localsMap
    if (!localsMap.has(alias)) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Alias used in local expression: '${alias}' is not defined in directives.`));
        return undefined;
    }
    const defLocal = localsMap.get(alias);
    // generate localsVal object from values passed after $this
    const handledLocalsVal = Object.fromEntries(locals
        .map((obj) => {
        return Object.entries(obj);
    })
        .flat(1));
    // if value is passed for this alias use it otherwise use default value
    return (_b = (_a = handledLocalsVal[alias]) !== null && _a !== void 0 ? _a : defLocal) !== null && _b !== void 0 ? _b : null;
}

/**
 * Method to handle 'import' expression. works sync.
 * @param parts - Data parts.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
async function handleImp(parts, ctx) {
    // destrcture parts
    const { nodepath: aliasWithPath, keyValue: params } = parts;
    // get data from context
    const { moduleCache, options, loadId } = ctx;
    // get directives object along with resolved path from cache
    const { directives, resolvedPath } = moduleCache;
    // get importsMap from directives object
    const { importsMap } = directives;
    // get alias and node path from expr path
    const alias = aliasWithPath[0];
    const nodepath = aliasWithPath.slice(1);
    // use imports map to get path and defualt params of this import
    const impData = importsMap.get(alias);
    // if no import data return error
    if (!impData) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Alias used in import expression: '${aliasWithPath}' is not defined in directives.`));
        return undefined;
    }
    const { params: defParamsVal, path: targetPath } = impData;
    // merge default with defined params
    const finalParams = { ...defParamsVal, ...params };
    // import file
    try {
        const { parse, errors } = await importMod(resolvedPath, targetPath, finalParams, ctx);
        // add errors if present
        ctx.errors.push(...errors);
        // traverse load using nodepath and return value
        return await traverseNodes(parse, nodepath, ctx);
    }
    catch (err) {
        if (err instanceof YAMLError)
            ctx.errors.push(err);
        else
            ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", err));
        return undefined;
    }
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
async function importMod(modulePath, targetPath, targetParams, ctx) {
    var _a;
    const { options, loadId, parseFunc } = ctx;
    // remove file name from module path if present
    const dirModulePath = removeFileName(modulePath);
    // resolve path by adding targer path to module path
    const resolvedPath = handlePath((_a = options === null || options === void 0 ? void 0 : options.basePath) !== null && _a !== void 0 ? _a : process.cwd(), dirModulePath, targetPath, ctx);
    // if error while resolving path return empty errors and undefined load
    if (!resolvedPath)
        return { errors: [], parse: undefined };
    // load str
    const parseData = await parseFunc(resolvedPath, {
        ...options,
        params: targetParams,
        filename: undefined, // remove the prev filename
    }, loadId);
    // return load
    return parseData;
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
function handlePath(basePath, modulePath, targetPath, ctx) {
    const { options, loadId } = ctx;
    // resolve path
    const resolvedPath = path.resolve(modulePath, targetPath);
    // make sure it's inside sandbox
    const isSandboxed = isInsideSandBox(resolvedPath, basePath);
    if (!isSandboxed && !options.unsafe)
        throw new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Path used: ${targetPath} is out of scope of base path: ${basePath}`);
    const isYaml = isYamlFile(resolvedPath);
    if (!isYaml)
        throw new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `You can only load YAML files the loader. loaded file: ${resolvedPath}`);
    // detect circular dependency if present
    const circularDep = circularDepClass.addDep(modulePath, resolvedPath, loadId);
    if (circularDep)
        throw new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Circular dependency detected: ${circularDep.join(" -> ")}`);
    // return path
    return resolvedPath;
}
/**
 * Method to remove file name from path and just keep path until last directory.
 * @param path - Path that will be handled.
 * @returns Path after file name removal.
 */
function removeFileName(path$1) {
    return isYamlFile(path$1) ? path.dirname(path$1) : path$1;
}

/**
 * Method to resolve interpolations. works sync.
 * @param expr - Expression that will be handled.
 * @param ctx - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value returned from expression resolve.
 */
async function handleExpr(expr, ctx) {
    const exprData = handleExpression(expr, ctx);
    if (!exprData) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Invalid type in expression: ${expr} defined types are: 'this' , 'import', 'param' and 'local'`));
        return expr;
    }
    // destructure expression data
    const { type, parts } = exprData;
    // handle expression according to base
    switch (type) {
        case "this":
            return await handleThis(parts, ctx);
        case "import":
            return await handleImp(parts, ctx);
        case "param":
            return handleParam(parts, ctx);
        case "local":
            return handleLocal(parts, ctx);
    }
}

/**
 * Method to resolve blueprint into final load returned to user. works sync meaning any YAML file read or tag construct function execution is executed synchronously.
 * @param loadId - Load id generated to this load function execution.
 * @param opts - Options passed with this load function execution.
 * @returns Final load after resolving the blueprint, what is returned to the user after load functions finishes.
 */
async function resolve(loadId, errors, moduleCache, opts, parseFunc) {
    // generate id specific for this load
    const resolveId = generateId();
    // create anchors map and locals array
    const anchors = new Map();
    const locals = [];
    // create context for this resolve
    const ctx = {
        options: opts,
        loadId,
        resolveId,
        moduleCache,
        errors,
        anchors,
        locals,
        range: [0, 0],
        resolveFunc: resolveUnknown,
        parseFunc,
    };
    // resolve
    const privateParse = await resolveUnknown(moduleCache.AST, false, true, ctx);
    // remove private nodes
    const clonedLoad = deepClone(privateParse);
    const parse = filterPrivate(clonedLoad, ctx);
    //  and return value
    return { parse, privateParse, errors: ctx.errors };
}
/**
 * Method to resolve unkown value types by checking type and using appropriate specific resolver function. it's also the place where blueprintInstance is resolved. works sync.
 * @param item - Item of unkown type.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param allowExpr - Boolean to indicate if expressions should be resolved. used to block resolve of expressions inside node's keys.
 * @param ctx - Context object that holds data about this resolve.
 * @returns Value of the specific resolve function based on type.
 */
async function resolveUnknown(item, anchored, allowExpr, ctx) {
    if (item instanceof yaml.Alias)
        return resolveAlias(item, ctx);
    if (item instanceof yaml.YAMLSeq)
        return await resolveSeq(item, anchored, ctx);
    if (item instanceof yaml.YAMLMap)
        return await resolveMap(item, anchored, ctx);
    if (item instanceof yaml.Scalar)
        return await resolveScalar(item, anchored, allowExpr, ctx);
    if (typeof item === "string")
        return await resolveString(item, ctx);
    return item;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper methods.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function resolveString(str, ctx) {
    let out = str;
    const { isExpr, expr } = isStringExpr(str);
    if (isExpr)
        out = await handleStringExp(expr, false, ctx);
    return out;
}
function resolveAlias(alias, ctx) {
    // update range
    if (alias.range)
        ctx.range = [alias.range[0], alias.range[1]];
    else
        ctx.range = undefined;
    // var to hold out value
    let out;
    // check if it's saved in aliases
    const present = ctx.anchors.has(alias.source);
    // resolve anchor
    if (present)
        out = ctx.anchors.get(alias.source);
    else
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", ""));
    alias.resolvedValue = out;
    return out;
}
/**
 * Method to resolve string (scalar in YAML). works sync.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value of the resolved string (scalar in YAML).
 */
async function resolveScalar(scalar, anchored, allowExpr, ctx) {
    // update range
    if (scalar.range)
        ctx.range = [scalar.range[0], scalar.range[1]];
    else
        ctx.range = undefined;
    // var to hold out value
    let out;
    // Detect circular dep
    if (anchored && !scalar.resolved) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", ""));
        return undefined;
    }
    // Handle value
    const { isExpr, expr } = isScalarExpr(scalar);
    if (isExpr && allowExpr)
        out = await handleStringExp(expr, true, ctx);
    else
        out = await handleString(scalar.value, ctx);
    // handle tag if present
    if (scalar.tag)
        out = await resolveTag(scalar.value, scalar.tag, ctx);
    // handle anchor if present
    if (scalar.anchor)
        ctx.anchors.set(scalar.anchor, out);
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
async function resolveMap(map, anchored, ctx) {
    // update range
    if (map.range)
        ctx.range = [map.range[0], map.range[1]];
    else
        ctx.range = undefined;
    // var to hold out value
    let out;
    if (anchored && !map.resolved) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", ""));
        return undefined;
    }
    const { isExpr, expr } = isMapExpr(map);
    if (isExpr) {
        const val = await handleExpr(expr, ctx);
        if (val && typeof val === "object" && !Array.isArray(val))
            out = val;
        else {
            ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Expression: ${expr} is wrapped inside {} but it's value is not a mapping.`));
            out = undefined;
        }
    }
    else {
        const res = {};
        for (const pair of map.items) {
            let hKey = await resolveUnknown(pair.key, anchored, false, ctx);
            let hVal = await resolveUnknown(pair.value, anchored, true, ctx);
            if (typeof hKey === "string")
                res[hKey] = hVal;
            else
                res[JSON.stringify(hKey)] = hVal;
        }
        out = res;
    }
    if (map.tag)
        out = await resolveTag(out, map.tag, ctx);
    if (map.anchor)
        ctx.anchors.set(map.anchor, out);
    map.resolved = true;
    map.resolvedValue = out;
    return out;
}
async function resolveSeq(seq, anchored, ctx) {
    // update range
    if (seq.range)
        ctx.range = [seq.range[0], seq.range[1]];
    else
        ctx.range = undefined;
    // var to hold out value
    let out;
    if (anchored && !seq.resolved) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", ""));
        return undefined;
    }
    const { isExpr, expr } = isSeqExpr(seq);
    if (isExpr) {
        const val = await handleExpr(expr, ctx);
        if (Array.isArray(val))
            out = val;
        else {
            ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `Expression: ${expr} is wrapped inside [] but it's value is not a sequence.`));
            out = undefined;
        }
        out = seq.items;
    }
    else {
        let res = [];
        for (const item of seq.items) {
            const val = await resolveUnknown(item, anchored, true, ctx);
            res.push(val);
        }
        out = res;
    }
    if (seq.tag)
        out = await resolveTag(out, seq.tag, ctx);
    if (seq.anchor)
        ctx.anchors.set(seq.anchor, out);
    seq.resolved = true;
    seq.resolvedValue = out;
    return out;
}
async function resolveTag(data, tag, ctx) {
    // get tag from schema
    const { options } = ctx;
    if (options.ignoreTags)
        return data;
    if (!(options.schema instanceof yaml.Schema)) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", ""));
        return data;
    }
    const tags = options.schema.tags;
    // get matching tag from tags
    const matchTag = tags.find((t) => t.tag === tag);
    if (!matchTag || !matchTag.resolve) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", ""));
        return data;
    }
    // execute tag's resolve
    try {
        const resTag = matchTag.resolve(
        // @ts-ignore
        data, (err) => {
            ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", ""));
        }, options);
        return resTag;
    }
    catch (err) {
        ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", ""));
        return data;
    }
}
async function handleString(str, ctx) {
    // if type is not string (e.g. number) return directly
    if (typeof str !== "string")
        return str;
    /** Var to hold out string. */
    let out = "";
    /** Var to hold loop index. */
    let i = 0;
    // start loop
    while (i < str.length) {
        // get character
        const ch = str[i];
        // if charachter is $ handle it
        if (ch === "$") {
            // escaped -> $${}
            if (str[i + 1] === "$" && str[i + 2] === "{") {
                out += "${"; // ad only one "$" to the out string
                i += 3; // skip the reset of the expression
                continue;
            }
            // non escaped -> ${}
            if (str[i + 1] === "{") {
                const end = getClosingChar(str, "{", "}", i + 2);
                if (end === -1) {
                    ctx.errors.push(new YAMLExprError(ctx.range ? [...ctx.range] : [0, 99999], "", `String interpolation used without closing '}' in: ${str}`));
                    return undefined;
                }
                let val = await handleExpr(str.slice(i, end + 1), ctx);
                if (typeof val !== "string")
                    val = JSON.stringify(val);
                out += val;
                i = end + 1;
                continue;
            }
        }
        // any other char just add it and increment index
        out += ch;
        i++;
    }
    return out;
}
async function handleStringExp(str, stringify, ctx) {
    let val = await handleExpr(str, ctx);
    if (val && typeof val === "object" && stringify)
        val = JSON.stringify(val);
    return val;
}
/**
 * Method to filter private nodes from final load.
 * @param resolve - resolved value returned from resolve method.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Final value after removal or private items.
 */
function filterPrivate(resolve, ctx) {
    // get private array
    const privateArr = ctx.moduleCache.directives.privateArr;
    // loop through private array to handle each path
    for (const priv of privateArr) {
        // get parts of the path
        const path = divideNodepath(priv, ctx.range ? ctx.range : [0, 99999]);
        // var that holds the resolve to transverse through it
        let node = resolve;
        for (let i = 0; i < path.length; i++) {
            // get current part of the path
            const p = path[i];
            // if it's not a record then path is not true and just console a warning
            if (!isRecord(node))
                break;
            // in last iteraion delete the child based on the parent type
            if (path.length - 1 === i) {
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
    return resolve;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main load functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function parseExtend(filepath, options) {
    // set new loadId
    const loadId = generateId();
    // set array that will hold errors
    const errors = [];
    try {
        // handle options
        const handledOpts = handleOpts(options);
        // resolve path
        const resolvedPath = resolvePath(filepath, handledOpts.basePath);
        // read file
        const src = await readFile(resolvedPath, handledOpts.basePath, handledOpts);
        // get cache of the module
        let moduleCache = getModuleCache(handledOpts.filename, src);
        // if cache of the module is not present, get directives and AST from src directly to create module cache, also save pureLoad and privatePureLoad
        if (!moduleCache) {
            const directives = handleDir(src);
            const parsedDoc = yaml.parseDocument(src, handledOpts);
            const AST = parsedDoc.contents;
            const pureParseErrors = [];
            moduleCache = addModuleCache(loadId, resolvedPath, src, AST, directives);
            const { parse, privateParse } = await resolve(loadId, pureParseErrors, moduleCache, {
                ...handledOpts,
                params: undefined,
            }, internalParseExtend);
            addResolveCache(resolvedPath, undefined, parse, privateParse, [
                ...pureParseErrors,
                ...directives.errors,
            ]);
        }
        // check if load with params is present in the cache and return it if present
        const cachedResolve = getResolveCache(resolvedPath, handledOpts.params);
        if (cachedResolve !== undefined) {
            const privateReturn = handlePrivateLoad(cachedResolve.load, cachedResolve.privateLoad, handledOpts.filename, handledOpts.ignorePrivate);
            return { parse: privateReturn, errors: cachedResolve.errors };
        }
        // overwrite filename if defined in directives
        if (moduleCache.directives.filename)
            handledOpts.filename = moduleCache.directives.filename;
        // load imports before preceeding in resolving this module
        for (const imp of moduleCache.directives.importsMap.values()) {
            const params = imp.params;
            const path = imp.path;
            await internalParseExtend(path, { ...handledOpts, params }, loadId);
        }
        // resolve AST
        const { parse, privateParse } = await resolve(loadId, errors, moduleCache, handledOpts, internalParseExtend);
        // Var to hold both resolve errors and directive errors
        const comErrors = [...errors, ...moduleCache.directives.errors];
        // add load to the cache
        addResolveCache(resolvedPath, handledOpts.params, parse, privateParse, comErrors);
        // handle private nodes and return
        const privateReturn = handlePrivateLoad(parse, privateParse, handledOpts.filename, handledOpts.ignorePrivate);
        return { parse: privateReturn, errors: comErrors };
    }
    finally {
        deleteLoadId(loadId);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Methods used by helper classes
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Just like load function but used in the code inside live loader and resolve handler. they execute the YAML string the same way load does but they don't create
 * new load id or handle clean-up and input validation. works sync.
 * @param filepath - YAML string or url path for YAML file.
 * @param options - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returnsL Loaded YAML string into js object.
 */
async function internalParseExtend(filepath, options, loadId) {
    // set array that will hold errors
    const errors = [];
    // handle options
    const handledOpts = handleOpts(options);
    // resolve path
    const resolvedPath = resolvePath(filepath, handledOpts.basePath);
    // read file
    const src = await readFile(resolvedPath, handledOpts.basePath, handledOpts);
    // get cache of the module
    let moduleCache = getModuleCache(handledOpts.filename, src);
    // if cache of the module is not present, get directives and AST from src directly to create module cache, also save pureLoad and privatePureLoad
    if (!moduleCache) {
        const directives = handleDir(src);
        const AST = yaml.parse(src, handledOpts);
        const pureParseErrors = [];
        moduleCache = addModuleCache(loadId, resolvedPath, src, AST, directives);
        const { parse, privateParse } = await resolve(loadId, pureParseErrors, moduleCache, {
            ...handledOpts,
            params: undefined,
        }, internalParseExtend);
        addResolveCache(resolvedPath, undefined, parse, privateParse, [
            ...pureParseErrors,
            ...directives.errors,
        ]);
    }
    // check if load with params is present in the cache and return it if present
    const cachedResolve = getResolveCache(resolvedPath, handledOpts.params);
    if (cachedResolve !== undefined) {
        const privateReturn = handlePrivateLoad(cachedResolve.load, cachedResolve.privateLoad, handledOpts.filename, handledOpts.ignorePrivate);
        return { parse: privateReturn, errors: cachedResolve.errors };
    }
    // overwrite filename if defined in directives
    if (moduleCache.directives.filename)
        handledOpts.filename = moduleCache.directives.filename;
    // load imports before preceeding in resolving this module
    for (const imp of moduleCache.directives.importsMap.values()) {
        const params = imp.params;
        const path = imp.path;
        await internalParseExtend(path, { ...handledOpts, params }, loadId);
    }
    // resolve AST
    const { parse, privateParse } = await resolve(loadId, errors, moduleCache, handledOpts, internalParseExtend);
    // Var to hold both resolve errors and directive errors
    const comErrors = [...errors, ...moduleCache.directives.errors];
    // add load to the cache
    addResolveCache(resolvedPath, handledOpts.params, parse, privateParse, comErrors);
    // handle private nodes and return
    const privateReturn = handlePrivateLoad(parse, privateParse, handledOpts.filename, handledOpts.ignorePrivate);
    return { parse: privateReturn, errors: comErrors };
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper methdos
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Method to handle options by adding default needed values (basePath) if they weren't passed by user.
 * @param opts - Load options object.
 * @returns Options object with needed values.
 */
function handleOpts(opts) {
    var _a, _b;
    const basePath = (opts === null || opts === void 0 ? void 0 : opts.basePath)
        ? path.resolve(process.cwd(), opts.basePath)
        : process.cwd();
    const params = (_a = opts === null || opts === void 0 ? void 0 : opts.params) !== null && _a !== void 0 ? _a : {};
    const ignorePrivate = (opts === null || opts === void 0 ? void 0 : opts.ignorePrivate)
        ? opts.ignorePrivate === "current"
            ? [(_b = opts.filename) !== null && _b !== void 0 ? _b : ""]
            : opts.ignorePrivate
        : [];
    return {
        ...opts,
        basePath,
        params,
        ignorePrivate,
    };
}
function deleteLoadId(loadId) {
    deleteLoadIdFromCache(loadId);
    circularDepClass.deleteLoadId(loadId);
}

/**
 * Class that handles loading multiple YAML files at the same time while watching loaded files and update there loads as files change.
 */
class LiveLoader {
    /**
     * @param opts - Options object passed to control live loader behavior. Note that these options will be default for all load functions, so it's not advised to define "filename" and
     * per module options here.
     */
    constructor(opts) {
        /** @internal - implementation detail, not part of public API */
        /** Random id generated for live loader and used as loadId in load function. */
        this._loadId = generateId();
        /** @internal - implementation detail, not part of public API */
        /** Options of the live loading. */
        this._opts = { basePath: process.cwd() };
        if (opts)
            this.setOptions(opts);
    }
    /**
     * Method to set options of the class.
     * @param opts - Options object passed to control live loader behavior. Note that these options will be default for all load functions, so it's not advised to define "filename" and
     * per module options here.
     */
    setOptions(opts) {
        this._opts = { ...this._opts, ...opts };
        if (!this._opts.basePath)
            this._opts.basePath = process.cwd();
    }
    /**
     * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that
     * imported YAML files in the read YAML string are watched as well. works sync so all file watch, reads are sync and tags executions are handled
     * as sync functions and will not be awaited.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @param opts - Options object passed to control live loader behavior. overwrites default options defined for loader.
     * @returns Value of loaded YAML file.
     */
    async addModule(filepath, options) {
        // get resolved path
        const resolvedPath = resolvePath(filepath, this._opts.basePath);
        // parse str
        const parse = await internalParseExtend(resolvedPath, { ...options, ...this._opts }, this._loadId);
        // return load
        return parse;
    }
    /**
     * Method to get cached value of loaded module or file. note that value retuned is module's resolve when params is undefined (default params value are used).
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @param ignorePrivate - Boolean to indicate if private nodes should be ignored in the cached load. overwrites value defined in "LiveLoaderOptions.ignorePrivate" for this module.
     * @returns Cached value of YAML file with default modules params or undefined if file is not loaded.
     */
    getModule(filepath, ignorePrivate) {
        var _a;
        // get resolved path
        const resolvedPath = resolvePath(filepath, this._opts.basePath);
        // get filename
        const cache = getModuleCache(resolvedPath);
        const filename = (_a = cache === null || cache === void 0 ? void 0 : cache.directives) === null || _a === void 0 ? void 0 : _a.filename;
        // get cached loads
        const cachedLoads = getResolveCache(resolvedPath, undefined);
        if (!cachedLoads)
            return undefined;
        // if ignorePrivate is defined, handle return load based on it
        if (ignorePrivate !== undefined) {
            const finalParse = ignorePrivate
                ? cachedLoads.privateLoad
                : cachedLoads.errors;
            return { parse: finalParse, errors: cachedLoads.errors };
        }
        // Execute privateLoad to define which load to return
        const privateParse = handlePrivateLoad(cachedLoads.load, cachedLoads.privateLoad, filename, this._opts.ignorePrivate);
        return { parse: privateParse, errors: cachedLoads.errors };
    }
    /**
     * Method to get cached value of all loaded modules or files. note that values retuned are module's resolve when params is undefined (default params value are used).
     * @param ignorePrivate - Boolean to indicate if private nodes should be ignored in the cached load. overwrites value defined in "LiveLoaderOptions.ignorePrivate" for all modules.
     * @returns Object with keys resolved paths of loaded YAML files and values cached values of YAML files with default modules params.
     */
    getAllModules(ignorePrivate) {
        // check cache using loadId to get paths utilized by the live loader
        const paths = loadIdsToModules.get(this._loadId);
        if (!paths)
            return {};
        let modules = {};
        for (const p of paths)
            modules[p] = this.getModule(p, ignorePrivate);
        return modules;
    }
    /**
     * Method to get all cached data about specific module. note that they are passed by reference and should never be mutated.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @returns Module load cache object.
     */
    getCache(path) {
        // get resolved path
        const resolvedPath = resolvePath(path, this._opts.basePath);
        return getModuleCache(resolvedPath);
    }
    /**
     * Method to get all cached data of all loaded module. note that they are passed by reference and should never be mutated.
     * @returns Object with keys resolved paths of loaded YAML files and values Module cache objects for these module.
     */
    getAllCache() {
        // check cache using loadId to get paths utilized by the live loader
        const paths = loadIdsToModules.get(this._loadId);
        if (!paths)
            return {};
        let caches = {};
        for (const p of paths)
            caches[p] = this.getCache(p);
        return caches;
    }
    /**
     * Method to delete module or file from live loader.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     */
    deleteModule(path) {
        // get resolved path
        const resolvedPath = resolvePath(path, this._opts.basePath);
        // delete module's cache
        deleteModuleCache(this._loadId, resolvedPath);
        // delete circular dep
        circularDepClass.deleteDep(resolvedPath, this._loadId);
    }
    /**
     * Method to clear cache of live loader by deleting all modules or files from live loader.
     */
    deleteAllModules() {
        // check cache using loadId to get paths utilized by the live loader
        const paths = loadIdsToModules.get(this._loadId);
        if (!paths)
            return;
        // if paths delete all of them
        for (const p of paths)
            this.deleteModule(p);
    }
    /**
     * Method to clear live loader along with all of its watchers and cache from memory.
     */
    destroy() {
        // delete all modules
        this.deleteAllModules();
        // delete loadId
        deleteLoadId(this._loadId);
    }
}

Object.defineProperty(exports, "YAMLParseError", {
    enumerable: true,
    get: function () { return yaml.YAMLParseError; }
});
Object.defineProperty(exports, "YAMLWarning", {
    enumerable: true,
    get: function () { return yaml.YAMLWarning; }
});
exports.LiveLoader = LiveLoader;
exports.YAMLError = YAMLError;
exports.YAMLExprError = YAMLExprError;
exports.hashParams = hashParams;
exports.parseExtend = parseExtend;
Object.keys(yaml).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return yaml[k]; }
    });
});
//# sourceMappingURL=index.js.map
