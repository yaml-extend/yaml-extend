'use strict';

var jsYaml = require('js-yaml');
var fs = require('fs');
var promises = require('fs/promises');
var path = require('path');
var crypto = require('crypto');

/**
 * Error object when yaml-extend resolve error is thrown.
 */
class WrapperYAMLException extends Error {
    /**
     * @param reason - Reason of the error.
     * @param filepath - Filesystem path of the YAML file where error is thrown.
     * @param name - Logical name of the YAML string where error is thrown.
     */
    constructor(reason, filepath, name) {
        // define additional data
        let additionalData = "";
        if (filepath && name)
            additionalData = `This error occured in file: ${name} at path: ${filepath}`;
        else {
            if (filepath)
                additionalData = `This error occured at path: ${filepath}`;
            if (name)
                additionalData = `This error occured in file: ${name}`;
        }
        // construct full message
        const message = reason + ". " + additionalData;
        // set message by passing it to super
        super(message);
        // set reason, name and filepath
        this.reason = reason !== null && reason !== void 0 ? reason : "";
        this.name = name !== null && name !== void 0 ? name : "";
        this.filepath = filepath !== null && filepath !== void 0 ? filepath : "";
    }
    /**
     * Method to convert Error object into string.
     * @param compact - Boolean to indicated if output error string should be compacted.
     * @returns Stringified error.
     */
    toString(compact) {
        if (compact)
            return JSON.stringify(this.message);
        else
            return JSON.stringify(this.message, null, 2);
    }
    /**
     * Method to reset additional data (filapath and name) of the error.
     * @param filepath - Filesystem path of the YAML file where error is thrown.
     * @param name - Logical name of the YAML string where error is thrown.
     */
    setAdditionalData(filepath, name) {
        // set name and filepath
        this.filepath = filepath !== null && filepath !== void 0 ? filepath : "";
        this.name = name !== null && name !== void 0 ? name : "";
        // construct additional data message
        let additionalData = "";
        if (filepath && name)
            additionalData = `This error occured in file: ${name} at path: ${filepath}`;
        else {
            if (filepath)
                additionalData = `This error occured at path: ${filepath}`;
            if (name)
                additionalData = `This error occured in file: ${name}`;
        }
        // construct full message
        const message = this.reason + ". " + additionalData;
        // set message by modifiying it directly
        this.message = message;
    }
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var _Type_tag;
/**
 * Type to handle tags and custom data types in YAML.
 */
class Type {
    /**
     * @param tag - Tag that will be used in YAML text.
     * @param opts - Configirations and options that defines how tag handle data.
     */
    constructor(tag, opts) {
        /** Tag name of the type. */
        _Type_tag.set(this, void 0);
        __classPrivateFieldSet(this, _Type_tag, tag, "f");
        this.kind = opts === null || opts === void 0 ? void 0 : opts.kind;
        this.resolve = opts === null || opts === void 0 ? void 0 : opts.resolve;
        this.construct = opts === null || opts === void 0 ? void 0 : opts.construct;
        this.instanceOf = opts === null || opts === void 0 ? void 0 : opts.instanceOf;
        this.predicate = opts === null || opts === void 0 ? void 0 : opts.predicate;
        this.represent = opts === null || opts === void 0 ? void 0 : opts.represent;
        this.representName = opts === null || opts === void 0 ? void 0 : opts.representName;
        this.defaultStyle = opts === null || opts === void 0 ? void 0 : opts.defaultStyle;
        this.multi = opts === null || opts === void 0 ? void 0 : opts.multi;
        this.styleAliases = opts === null || opts === void 0 ? void 0 : opts.styleAliases;
    }
    get tag() {
        return __classPrivateFieldGet(this, _Type_tag, "f");
    }
}
_Type_tag = new WeakMap();

var _Schema_instances, _Schema_types, _Schema_group, _Schema_addTypes;
/**
 * Schema that holds Types used for loading and dumping YAML string.
 */
class Schema {
    /**
     * @param definition - Either schema definition or types that will control how parser handle tags in YAML.
     * @param group - Optional built-in schema to use.
     */
    constructor(definition, group) {
        _Schema_instances.add(this);
        /** Array to hold types added to the schema. */
        _Schema_types.set(this, []);
        /** Var to hold group if special group is used. */
        _Schema_group.set(this, void 0);
        __classPrivateFieldGet(this, _Schema_instances, "m", _Schema_addTypes).call(this, definition);
        __classPrivateFieldSet(this, _Schema_group, group, "f");
    }
    /**
     * @param types - Either schema definition or types that will control how parser handle tags in YAML.
     * @returns Reference to the schema.
     */
    extend(types) {
        __classPrivateFieldGet(this, _Schema_instances, "m", _Schema_addTypes).call(this, types);
        return this;
    }
    get types() {
        return __classPrivateFieldGet(this, _Schema_types, "f");
    }
    get group() {
        return __classPrivateFieldGet(this, _Schema_group, "f");
    }
}
_Schema_types = new WeakMap(), _Schema_group = new WeakMap(), _Schema_instances = new WeakSet(), _Schema_addTypes = function _Schema_addTypes(types) {
    // if array convert it to object
    if (Array.isArray(types)) {
        for (const t of types)
            __classPrivateFieldGet(this, _Schema_types, "f").push(t);
        return;
    }
    // if single type add it directly
    if (types instanceof Type) {
        __classPrivateFieldGet(this, _Schema_types, "f").push(types);
        return;
    }
    // if implicit types add them
    if (types.implicit) {
        for (const t of types.implicit)
            __classPrivateFieldGet(this, _Schema_types, "f").push(t);
    }
    // if explicit types add them
    if (types.explicit) {
        for (const t of types.explicit)
            __classPrivateFieldGet(this, _Schema_types, "f").push(t);
    }
};

/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
const FAILSAFE_SCHEMA = new Schema([], "FAILSAFE");
/** only strings, arrays and plain objects: http://www.yaml.org/spec/1.2/spec.html#id2802346 */
const JSON_SCHEMA = new Schema([], "JSON");
/** same as JSON_SCHEMA: http://www.yaml.org/spec/1.2/spec.html#id2804923 */
const CORE_SCHEMA = new Schema([], "CORE");
/** all supported YAML types */
const DEFAULT_SCHEMA = new Schema([], "DEFAULT");

var _TagResolveInstance_func;
/**
 * Class that is returned by any Type construct function. it is used to store construct function along with it's params (data, type and params), so
 * when node tree is being resolved the constructor will be executed.
 */
class TagResolveInstance {
    /**
     * @param func - Constructor function used in the tag.
     * @param data - Data passed to the tag.
     * @param type - Type passed to the tag.
     * @param params - Params string passed to the tag.
     */
    constructor(func, data, type, params) {
        /** Constructor function passed to the type of the tag. */
        _TagResolveInstance_func.set(this, void 0);
        __classPrivateFieldSet(this, _TagResolveInstance_func, func, "f");
        this.data = data;
        this.type = type;
        this.params = params;
    }
    /** Method to execute the constructor function and get value from the tag. works sync. */
    resolve() {
        return __classPrivateFieldGet(this, _TagResolveInstance_func, "f").call(this, this.data, this.type, this.params);
    }
    /** Method to execute the constructor function and get value from the tag. works async. */
    async resolveAsync() {
        return await __classPrivateFieldGet(this, _TagResolveInstance_func, "f").call(this, this.data, this.type, this.params);
    }
}
_TagResolveInstance_func = new WeakMap();

// This file has all the regex used in the lib. regex is used to capture and validate YAML string passed.
/** Regex to capture and verify YAML files paths. */
const pathRegex = /^(?:[\/\\]|[A-Za-z]:[\/\\]|\.{1,2}[\/\\])?(?:[^\/\\\s]+[\/\\])*[^\/\\\s]+\.ya?ml$/;
/** Regex to capture directive end mark. */
const dirEndRegex = /\n---\s*\n/;
/** Regex to capture tags. */
const captureTagsRegex = /(?:^|\s)(!(?:[^\s\!]*!)?[^\s!\{\}\[\]]+)(?=\s|$)/g;
/** Regex to verify structure of the tag. */
const tagsStrucRegex = /^!(?:[A-Za-z0-9\/\\_\-#*\.@$]*!)?([A-Za-z0-9\/\\_\-#*\.@$]+)(?:\(([A-Za-z0-9\/\\_\-#*\.@$]+)\))?$/;
/** Regex to capture error when invalid character is used inside regex. */
const invalidTagCharRegex = /^!(?=[\s\S]*([^A-Za-z0-9\/\\_\-#*\.@$!()']))[\s\S]+$/;
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
 * @param resPath - Resolved path from concatinating current file path with imported file path. works sync.
 * @param currentPath - Path of the current module.
 * @returns Read value of the file in UTF-8 format.
 */
function readFile(resPath, currentPath) {
    const resCurrentPath = path.resolve(currentPath);
    if (!isInsideSandBox(resPath, resCurrentPath))
        throw new WrapperYAMLException(`Path used: ${resPath} is out of scope of base path: ${resCurrentPath}`);
    if (!isYamlFile(resPath))
        throw new WrapperYAMLException(`You can only load YAML files the loader.`);
    return fs.readFileSync(resPath, { encoding: "utf8" });
}
/**
 * Function to resolve paths by adding basepath (path of the current module) and path (path of the imported or read module) together making absolute path of them.
 * @param resPath - Resolved path from concatinating current file path with imported file path. works async.
 * @param currentPath - Path of the current module.
 * @returns Read value of the file in UTF-8 format.
 */
async function readFileAsync(resPath, currentPath) {
    const resCurrentPath = path.resolve(currentPath);
    if (!isInsideSandBox(resPath, resCurrentPath))
        throw new WrapperYAMLException(`Path used: ${resPath} is out of scope of base path: ${resCurrentPath}`);
    if (!isYamlFile(resPath))
        throw new WrapperYAMLException(`You can only load YAML files the loader. loaded file: ${resPath}`);
    return await promises.readFile(resPath, { encoding: "utf8" });
}
/**
 * Function to check if file reads are black boxed.
 * @param resPath - Resolved path from concatinating current file path with imported file path. works async.
 * @param basePath - Base path passed in opts of load function. used to black box the file reads.
 * @returns Boolean that indicates if resolved path actually lives inside base path.
 */
function isInsideSandBox(resPath, basePath) {
    // Resolve symlinks to avoid escaping via symlink tricks
    const realBase = fs.realpathSync(basePath);
    const realRes = fs.realpathSync(resPath);
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
 * Function to normalize then hash objects.
 * @param obj - Object that will be hashed.
 * @returns Stable hash of the object that will only change only if value or key inside object changed but not the order.
 */
function hashObj(obj) {
    // stringify object
    const strObj = stableStringify(obj);
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// String functions.
/**
 * Function to get number of times specific characters are repeated.
 * @param str - string that will be checked.
 * @param searchChar - Array of character for search. can only be single character.
 * @returns Number of times passed characters are repeated.
 */
function numChar(str, searchChar) {
    // gaurd from dev errors
    for (const c of searchChar)
        if (c.length > 1)
            throw new Error(`numChar function can only handle single characters.`);
    // handling
    let num = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        for (const c of searchChar)
            if (ch === c)
                num++;
    }
    return num;
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

var _TagsHandler_instances, _TagsHandler_buildType, _TagsHandler_handleTagName, _TagsHandler_hasHandle, _TagsHandler_handleMissingType, _TagsHandler_handleSyntaxErrorTag, _TagsHandler_getErrorMessage;
/**
 * Class that is used to handle tags present in YAML file. this handling is by generating types for any tag present along with it's params, so when passed to js-yaml loader it will
 * identify these types and execute them.
 */
class TagsHandler {
    constructor() {
        _TagsHandler_instances.add(this);
    }
    /**
     * Method to capture tags in YAML text using simple regex. NOTE that it can also capture tag like definitions in the comments and string blocks (as this is a wrapper only not a parser so
     * no way to capture real tags only), but they will be handled gracefully to prevent any errors in the cost of some performance overhead.
     * @param str - YAML string passed.
     * @returns Array of tags captures in the string.
     */
    captureTags(str) {
        // run regex to capture tags, if no match return
        const match = str.matchAll(captureTagsRegex);
        if (!match)
            return [];
        // convert regex into array
        return Array.from(match).map((m) => m[1]);
    }
    /**
     * Method to handle captured tags by converting them into wrapper types, it works be checking the tag structure, if it's invalid it will not throw directly (as it may be captured from comment
     * as we explianed earlier), instead it will create a three types of the three kinds with the same tag name and throw error inside there constructor, these types will be then be added to the
     * schema, so if js-yaml execute them (they are real tags) they will thow error, otherwise nothing happened.
     * If tag was valid it separates tag name from payload, fetch tag from passed schema (if was not present it will be handled in the same way as invalid tags which is types with thrown error in
     * the constructor) and modifies constructor function by returning special type (TagResolveInstance) that capture and save user defined construct function and passed data, type and params so it will
     * be lazely executed when raw load being resolved.
     * @param tags - Array of captured tags from YAML string.
     * @param tagsMap - Map that holds tags's handles and prefixes defined in directive.
     * @param schema - Schema passed by user.
     * @returns Array of dynamically generated types that handles tags present in this YAML string, or undefined if no schema was passed.
     */
    convertTagsToTypes(tags, tagsMap, schema) {
        // if no schema return directly
        if (!schema)
            return;
        /** Array to hold dynamically generated types. */
        let types = [];
        /** Array to hold already generated tags if the same tag is used multiple times. */
        let cache = [];
        // start looping through tags
        for (const tag of tags) {
            // if already in the cache skip, otherwise add it to cache
            if (cache.includes(tag))
                continue;
            cache.push(tag);
            // handle tag name passed to generated types (removing starting "!" or resolving handle and prefix)
            const fullTag = __classPrivateFieldGet(this, _TagsHandler_instances, "m", _TagsHandler_handleTagName).call(this, tag, tagsMap);
            // run structure regex on the tag, if no match pass it to syntax error handler and continue
            const match = tag.match(tagsStrucRegex);
            if (!match) {
                // generate types of the three kinds for this tag
                const synErrorTypes = __classPrivateFieldGet(this, _TagsHandler_instances, "m", _TagsHandler_handleSyntaxErrorTag).call(this, fullTag);
                // pass them to types array
                types.push(...synErrorTypes);
                continue;
            }
            // destructure match
            const [_, tagInSchema, params] = match;
            // get types from schema, if not present pass it to missing type handler and continue
            // can be multiple types as js-yaml allows defining the same tag to multiple kinds which is a good behavior
            const schemaTypes = schema.types.filter((t) => t.tag === "!" + tagInSchema);
            if (schemaTypes.length === 0) {
                // generate types of the three kinds for this tag
                const missingTypes = __classPrivateFieldGet(this, _TagsHandler_instances, "m", _TagsHandler_handleMissingType).call(this, fullTag, tagInSchema);
                // pass them to types array
                types.push(...missingTypes);
                continue;
            }
            // generate types
            for (const schemaType of schemaTypes) {
                // build new type
                const newType = __classPrivateFieldGet(this, _TagsHandler_instances, "m", _TagsHandler_buildType).call(this, fullTag, schemaType, params);
                // add type to the schema
                types.push(newType);
            }
        }
        // return generated types array
        return types;
    }
}
_TagsHandler_instances = new WeakSet(), _TagsHandler_buildType = function _TagsHandler_buildType(tag, schemaType, params) {
    console.debug("tag: ", tag);
    return new Type(tag, {
        kind: schemaType.kind,
        construct: (d, t, p) => {
            if (schemaType.construct)
                return new TagResolveInstance(schemaType.construct, d, t, params);
            else
                return d;
        },
        resolve: schemaType.resolve,
        instanceOf: schemaType.instanceOf,
        predicate: schemaType.predicate,
        represent: schemaType.represent,
        representName: schemaType.representName,
        defaultStyle: schemaType.defaultStyle,
        multi: schemaType.multi,
        styleAliases: schemaType.styleAliases,
    });
}, _TagsHandler_handleTagName = function _TagsHandler_handleTagName(tag, tagsMap) {
    // check if handle is preceeded by handle and handle prefix
    if (__classPrivateFieldGet(this, _TagsHandler_instances, "m", _TagsHandler_hasHandle).call(this, tag)) {
        // devide into parts
        const parts = tag.split("!").filter((v) => v);
        const handle = parts[0];
        const tagName = parts[1];
        // get prefix from map
        const prefix = tagsMap.get("!" + handle + "!");
        if (!prefix)
            return tag;
        return prefix + tagName;
    }
    return tag;
}, _TagsHandler_hasHandle = function _TagsHandler_hasHandle(tag) {
    let num = 0;
    for (let i = 0; i < tag.length; i++) {
        if (tag[i] === "!")
            num++;
        if (num > 1)
            return true;
    }
    return false;
}, _TagsHandler_handleMissingType = function _TagsHandler_handleMissingType(tag, tagName) {
    // get error object
    const error = new WrapperYAMLException(`Unkown tag: ${tagName}`);
    // generate types
    const scalarType = new Type(tag, {
        kind: "scalar",
        construct(data, type, params) {
            throw error;
        },
    });
    const mappingType = new Type(tag, {
        kind: "mapping",
        construct(data, type, params) {
            throw error;
        },
    });
    const sequenceType = new Type(tag, {
        kind: "sequence",
        construct(data, type, params) {
            throw error;
        },
    });
    // add types to the schema
    return [scalarType, mappingType, sequenceType];
}, _TagsHandler_handleSyntaxErrorTag = function _TagsHandler_handleSyntaxErrorTag(tag) {
    // get error message
    const errorMessage = __classPrivateFieldGet(this, _TagsHandler_instances, "m", _TagsHandler_getErrorMessage).call(this, tag);
    // create error object
    const error = new WrapperYAMLException(errorMessage);
    // generate types
    const scalarType = new Type(tag, {
        kind: "scalar",
        construct(data, type, params) {
            throw error;
        },
    });
    const mappingType = new Type(tag, {
        kind: "mapping",
        construct(data, type, params) {
            throw error;
        },
    });
    const sequenceType = new Type(tag, {
        kind: "sequence",
        construct(data, type, params) {
            throw error;
        },
    });
    // add types to the schema
    return [scalarType, mappingType, sequenceType];
}, _TagsHandler_getErrorMessage = function _TagsHandler_getErrorMessage(tag) {
    // check if error due to invalid char
    const invCharMatch = tag.match(invalidTagCharRegex);
    if (invCharMatch)
        return `Tag: ${invCharMatch[0]} contains a blacklisted characher: ${invCharMatch[1]}, allowed charachters are: A-Z a-z 0-9 "\\" "/" "(" ")" "'" "." "_" "-" "#" "$" and "@" only. `;
    // check if error due to more that 2 "!" used
    const numExc = numChar(tag, ["!"]);
    if (numExc > 2)
        return `Only two '!' marks are allowed in the tag. tag defined: ${tag}`;
    // check if error due to ivalid patenthesis
    const numPar = numChar(tag, ["(", ")"]);
    if (numPar > 2 || numPar === 1)
        return `One pair of parenthesis are allowed only in the end of the tag name to define params. tag defined: ${tag}`;
    if (!tag.endsWith(")"))
        return `Parenthesis should be at the end of the string. tag defined: ${tag}`;
    // return generic error message
    return `Invalid tag: ${tag}. tag should start with '!' and contain only only A-Z a-z 0-9 "\\" "/" "(" ")" "'" "." "_" "-" "#" "$" and "@" characters. with optional parenthesis with single quotes to define params string inside.`;
};

/**
 * Class to handle conversion of wrapper types into js-yaml types and wrapper schemas into js-yaml schemas.
 */
class BridgeHandler {
    /**
     * Convert types from wrapper types to js-yaml types.
     * @param types - Wrapper types that will be converted.
     * @returns js-yaml types ready to passed to js-yaml schema.
     */
    typesBridge(types) {
        if (!types)
            return; // if no types return
        /** Array to hold converted types */
        const convertedTypes = [];
        // loop through all wrapper types and convert them one by one
        for (const t of types) {
            const convertedT = new jsYaml.Type(t.tag, {
                kind: t.kind,
                construct: t.construct,
                resolve: t.resolve,
                instanceOf: t.instanceOf,
                predicate: t.predicate,
                represent: t.represent,
                representName: t.representName,
                defaultStyle: t.defaultStyle,
                multi: t.multi,
                styleAliases: t.styleAliases,
            });
            convertedTypes.push(convertedT);
        }
        // return converted types
        return convertedTypes;
    }
    /**
     * Convert schema from wrapper schema to js-yaml schema and add bridged js-yaml types to it.
     * @param schema - Wrapper schema that will be converted.
     * @returns js-yaml schema ready to passed to js-yaml load function.
     */
    schemaBridge(schema, types) {
        if (!schema)
            return; // if no schema return
        // create schema of the types and return it
        switch (schema.group) {
            case "CORE":
                return jsYaml.CORE_SCHEMA.extend(types !== null && types !== void 0 ? types : []);
            case "DEFAULT":
                return jsYaml.DEFAULT_SCHEMA.extend(types !== null && types !== void 0 ? types : []);
            case "FAILSAFE":
                return jsYaml.FAILSAFE_SCHEMA.extend(types !== null && types !== void 0 ? types : []);
            case "JSON":
                return jsYaml.JSON_SCHEMA.extend(types !== null && types !== void 0 ? types : []);
            default:
                return new jsYaml.Schema(types !== null && types !== void 0 ? types : []);
        }
    }
}
/**
 * Bridge handler class instance that is used to convert wrapper classes (schema and type) into js-yaml classes.
 */
const bridgeHandler = new BridgeHandler();

var _Tokenizer_instances, _Tokenizer_handleDirTag, _Tokenizer_handleDirPrivate, _Tokenizer_handleDirLocal, _Tokenizer_handleDirParam, _Tokenizer_handleDirFilename, _Tokenizer_handleDirImport, _Tokenizer_handleExprThis, _Tokenizer_handleExprImport, _Tokenizer_handleExprLocal, _Tokenizer_handleExprParam, _Tokenizer_divideDirective, _Tokenizer_divideExpression, _Tokenizer_divideNodepath, _Tokenizer_divideKeyValue, _Tokenizer_getDelimiterFunc, _Tokenizer_divideByDelimiter, _Tokenizer_removeEscChar, _Tokenizer_removeEscBlackSlash, _Tokenizer_handleEscapeBlock;
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
/** Regex to capture starting dot. */
const START_WITH_DOT = /^\./;
/**
 * Class to handle reading Directive declerations and expressions
 */
class Tokenizer {
    constructor() {
        _Tokenizer_instances.add(this);
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // External methods.
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Method to handle directive by returning it's type and deviding it into it's structural parts creating directive parts object.
     * @param dir - Directive that will be divided.
     * @returns Object that holds type along with structural parts of this directive. returns undefined if invalid directive is passed.
     */
    handleDirective(dir) {
        if (dir.startsWith("%TAG"))
            return { type: "TAG", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleDirTag).call(this, dir) };
        if (dir.startsWith("%FILENAME"))
            return { type: "FILENAME", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleDirFilename).call(this, dir) };
        if (dir.startsWith("%PARAM"))
            return { type: "PARAM", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleDirParam).call(this, dir) };
        if (dir.startsWith("%LOCAL"))
            return { type: "LOCAL", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleDirLocal).call(this, dir) };
        if (dir.startsWith("%IMPORT"))
            return { type: "IMPORT", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleDirImport).call(this, dir) };
        if (dir.startsWith("%PRIVATE"))
            return { type: "PRIVATE", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleDirPrivate).call(this, dir) };
    }
    handleExpression(expr) {
        if (expr.startsWith("$this"))
            return { type: "this", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleExprThis).call(this, expr) };
        if (expr.startsWith("$import"))
            return { type: "import", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleExprImport).call(this, expr) };
        if (expr.startsWith("$local"))
            return { type: "local", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleExprLocal).call(this, expr) };
        if (expr.startsWith("$param"))
            return { type: "param", parts: __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleExprParam).call(this, expr) };
    }
    divideNodepath(nodepath) {
        const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideByDelimiter).call(this, nodepath, ".");
        const handledParts = parts.map(__classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar));
        return handledParts;
    }
}
_Tokenizer_instances = new WeakSet(), _Tokenizer_handleDirTag = function _Tokenizer_handleDirTag(dir) {
    // remove statring %TAG and trim
    const data = dir.replace("%TAG", "").trim();
    // devide directive into parts
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideDirective).call(this, data, 2);
    const handle = parts[0];
    const prefix = parts[1];
    if (!handle || !prefix)
        throw new WrapperYAMLException("You should pass handle and prefix after '%TAG' directive, structure of TAG directive: %TAG <handle> <prefix>");
    return { alias: handle, metadata: prefix };
}, _Tokenizer_handleDirPrivate = function _Tokenizer_handleDirPrivate(dir) {
    // remove statring %PRIVATE and trim
    const data = dir.replace("%PRIVATE", "").trim();
    // divide directive into parts, all parts are <private-nodes>
    const privateNodes = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideDirective).call(this, data);
    // return private nodes
    return { arrMetadata: privateNodes };
}, _Tokenizer_handleDirLocal = function _Tokenizer_handleDirLocal(dir) {
    // remove statring %LOCAL and trim
    const data = dir.replace("%LOCAL", "").trim();
    // divide directive into parts, first part is <alias> and second is <def-value>
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideDirective).call(this, data, 2);
    const alias = parts[0];
    const defValue = parts[1];
    // verify that alais is present
    if (!alias)
        throw new WrapperYAMLException("You should pass alias after '%LOCAL' directive, structure of PARAM directive: %LOCAL <alias>");
    // remove wrapping escape char if present
    const handledAlias = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, alias);
    const handledDefValue = defValue && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, defValue);
    // return parts
    return { alias: handledAlias, defValue: handledDefValue };
}, _Tokenizer_handleDirParam = function _Tokenizer_handleDirParam(dir) {
    // remove statring %PARAM and trim
    const data = dir.replace("%PARAM", "").trim();
    // divide directive into parts, first part is <alias> and second is <def-value>
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideDirective).call(this, data, 2);
    const alias = parts[0];
    const defValue = parts[1];
    // verify that alais is present
    if (!alias)
        throw new WrapperYAMLException("You should pass alias after '%PARAM' directive, structure of PARAM directive: %PARAM <alias>");
    // remove wrapping escape char if present
    const handledAlias = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, alias);
    const handledDefValue = defValue && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, defValue);
    // return parts
    return { alias: handledAlias, defValue: handledDefValue };
}, _Tokenizer_handleDirFilename = function _Tokenizer_handleDirFilename(dir) {
    // remove statring %FILENAME and trim
    const data = dir.replace("%FILENAME", "").trim();
    // remove wrapping escape char if present
    const handledMetadata = data && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, data);
    // the filename is composed of only the <filename> so return directly
    return { metadata: handledMetadata };
}, _Tokenizer_handleDirImport = function _Tokenizer_handleDirImport(dir) {
    // remove statring %IMPORT and trim
    const data = dir.replace("%IMPORT", "").trim();
    // divide directive into parts, first part is <alias> and second is <path> and last part is [key=value ...]
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideDirective).call(this, data);
    const alias = parts[0];
    const path = parts[1];
    const keyValueParts = parts.slice(2);
    // verify that alais and path are present
    if (!alias || !path)
        throw new WrapperYAMLException("You should pass alias and path after '%IMPORT' directive, structure of IMPORT directive: %IMPORT <alias> <path> [key=value ...]");
    // remove wrapping escape char if present
    const handledAlias = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, alias);
    const handledPath = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, path);
    // handle conversion of keyValue parts into an object
    const keyValue = {};
    if (keyValueParts)
        for (const keyVal of keyValueParts) {
            const [key, value] = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideKeyValue).call(this, keyVal);
            // remove wrapping escape char if present
            const handledKey = key && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, key);
            const handledValue = value && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, value);
            // add to keyValue object
            keyValue[handledKey] = handledValue;
        }
    // return parts
    return { alias: handledAlias, metadata: handledPath, keyValue };
}, _Tokenizer_handleExprThis = function _Tokenizer_handleExprThis(expr) {
    var _a, _b;
    // only trim for now (as we want to get part with $this)
    const data = expr.trim();
    // divide expression into parts, first part is <nodepath> and second is [key-value ...]
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideExpression).call(this, data, 2);
    const nodepathStr = (_b = (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.replace("$this", "")) === null || _b === void 0 ? void 0 : _b.replace(START_WITH_DOT, "");
    const keyValueParts = parts.slice(1);
    // verify that nodepathStr is present ($this should have path)
    if (!nodepathStr)
        throw new WrapperYAMLException("You should pass node path after '$this' expression, structure of this expression: $this.<node-path> [key=value ...]");
    // handle division of nodepath string into parts
    const nodepath = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideNodepath).call(this, nodepathStr);
    const handledNodepath = nodepath.map(__classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar));
    // handle conversion of keyValue parts into an object
    const keyValue = {};
    if (keyValueParts)
        for (const keyVal of keyValueParts) {
            const [key, value] = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideKeyValue).call(this, keyVal);
            // remove wrapping escape char if present
            const handledKey = key && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, key);
            const handledValue = value && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, value);
            // add to keyValue object
            keyValue[handledKey] = handledValue;
        }
    // return parts
    return { nodepath: handledNodepath, keyValue };
}, _Tokenizer_handleExprImport = function _Tokenizer_handleExprImport(expr) {
    var _a, _b;
    // only trim for now (as we want to get part with $import)
    const data = expr.trim();
    // divide expression into parts, first part is <nodepath> and second is [key-value ...]
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideExpression).call(this, data, 2);
    const nodepathStr = (_b = (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.replace("$import", "")) === null || _b === void 0 ? void 0 : _b.replace(START_WITH_DOT, "");
    const keyValueParts = parts.slice(1);
    // handle division of nodepath string into parts
    const nodepath = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideNodepath).call(this, nodepathStr);
    const handledNodepath = nodepath.map(__classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar));
    // handle conversion of keyValue parts into an object
    const keyValue = {};
    if (keyValueParts)
        for (const keyVal of keyValueParts) {
            const [key, value] = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideKeyValue).call(this, keyVal);
            // remove wrapping escape char if present
            const handledKey = key && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, key);
            const handledValue = value && __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, value);
            // add to keyValue object
            keyValue[handledKey] = handledValue;
        }
    // return parts
    return { nodepath: handledNodepath, keyValue };
}, _Tokenizer_handleExprLocal = function _Tokenizer_handleExprLocal(expr) {
    // remove statring $local and trim, also remove dot if new string starts with a dot
    const data = expr.replace("$local", "").trim().replace(START_WITH_DOT, "");
    // get alias (first and only part)
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideExpression).call(this, data, 1);
    const alias = parts[0];
    if (!alias)
        throw new WrapperYAMLException("You should pass alias after '$local' expression, strcuture of local expression: $local.<alias>");
    const handledAlias = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, alias);
    return { alias: handledAlias };
}, _Tokenizer_handleExprParam = function _Tokenizer_handleExprParam(expr) {
    // remove statring $param and trim, also remove dot if new string starts with a dot
    const data = expr.replace("$param", "").trim().replace(START_WITH_DOT, "");
    // get alias (first and only part)
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideExpression).call(this, data, 1);
    const alias = parts[0];
    if (!alias)
        throw new WrapperYAMLException("You should pass alias after '$param' expression, structure of local expression: $local.<alias>");
    const handledAlias = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscChar).call(this, alias);
    return { alias: handledAlias };
}, _Tokenizer_divideDirective = function _Tokenizer_divideDirective(dir, maxParts) {
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideByDelimiter).call(this, dir, " ", maxParts);
    return parts;
}, _Tokenizer_divideExpression = function _Tokenizer_divideExpression(expr, maxParts) {
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideByDelimiter).call(this, expr, " ", maxParts);
    return parts;
}, _Tokenizer_divideNodepath = function _Tokenizer_divideNodepath(path) {
    if (!path)
        return [];
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideByDelimiter).call(this, path, ".");
    return parts;
}, _Tokenizer_divideKeyValue = function _Tokenizer_divideKeyValue(keyValue) {
    const parts = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_divideByDelimiter).call(this, keyValue, "=", 2);
    return [parts[0], parts[1]];
}, _Tokenizer_getDelimiterFunc = function _Tokenizer_getDelimiterFunc(delimiter) {
    if (delimiter === " ")
        return (ch) => WHITE_SPACE.test(ch);
    else
        return (ch) => ch === delimiter;
}, _Tokenizer_divideByDelimiter = function _Tokenizer_divideByDelimiter(str, delimiter, maxParts) {
    const delimiterFunc = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_getDelimiterFunc).call(this, delimiter);
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
            const endIdx = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_handleEscapeBlock).call(this, str, i, closeChar);
            i = endIdx;
            continue;
        }
        // if delimiter add to parts
        if (delimiterFunc(cur)) {
            const part = str.slice(start, i);
            const handledPart = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscBlackSlash).call(this, part);
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
        const handledPart = __classPrivateFieldGet(this, _Tokenizer_instances, "m", _Tokenizer_removeEscBlackSlash).call(this, lastPart);
        parts.push(handledPart);
    }
    return parts;
}, _Tokenizer_removeEscChar = function _Tokenizer_removeEscChar(str) {
    // if string is less that 2 return str directly
    if (str.length < 2)
        return str;
    // handle removal of leading and end escape char
    if (ESCAPE_CHAR.test(str[0]) && ESCAPE_CHAR.test(str[str.length - 1])) {
        str = str.slice(1, str.length - 1);
    }
    return str;
}, _Tokenizer_removeEscBlackSlash = function _Tokenizer_removeEscBlackSlash(str) {
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
}, _Tokenizer_handleEscapeBlock = function _Tokenizer_handleEscapeBlock(str, startIndex, closeChar) {
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
        throw new WrapperYAMLException(`Opened escape char without close`);
    return j;
};
const tokenizer = new Tokenizer();

var _DirectivesHandler_instances, _DirectivesHandler_handleFilename, _DirectivesHandler_handlePrivate, _DirectivesHandler_handleTags, _DirectivesHandler_handleLocals, _DirectivesHandler_handleParams, _DirectivesHandler_handleImports, _DirectivesHandler_isEmptyLine;
/**
 * Class to handle reading directives at the top of YAML string. it also strip them from the string and convert it back to normal YAML so it can be passed to js-yaml loader function.
 */
class DirectivesHandler {
    constructor() {
        _DirectivesHandler_instances.add(this);
    }
    /**
     * Method to read directives in YAML string, handle wrapper specific directives by converting them into directives object.
     * @param str - String passed in load function.
     * @returns Directives object which holds meta data about directives to be used in the resolver.
     */
    handle(str) {
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
        let filename = "";
        // split using regex to get directives if present
        const parts = str.split(dirEndRegex);
        // If no directive part return with empty data
        if (parts.length === 1)
            return {
                tagsMap,
                paramsMap,
                privateArr,
                localsMap,
                importsMap,
                filename,
            };
        // split directive part into lines
        const lines = parts[0]
            .split("\n")
            .filter((l) => !__classPrivateFieldGet(this, _DirectivesHandler_instances, "m", _DirectivesHandler_isEmptyLine).call(this, l))
            .map((l) => l.trim());
        // loop through lines to handle wrapper lines
        for (let i = 0; i < lines.length; i++) {
            // get line
            const line = lines[i];
            // get directive type and devide it into parts, if not wrapper related continue
            const dirData = tokenizer.handleDirective(line);
            if (!dirData)
                continue;
            // destructure directive data
            const { type, parts: directiveParts } = dirData;
            switch (type) {
                case "TAG":
                    __classPrivateFieldGet(this, _DirectivesHandler_instances, "m", _DirectivesHandler_handleTags).call(this, tagsMap, directiveParts);
                    break;
                case "PARAM":
                    __classPrivateFieldGet(this, _DirectivesHandler_instances, "m", _DirectivesHandler_handleParams).call(this, paramsMap, directiveParts);
                    break;
                case "PRIVATE":
                    __classPrivateFieldGet(this, _DirectivesHandler_instances, "m", _DirectivesHandler_handlePrivate).call(this, privateArr, directiveParts);
                    break;
                case "IMPORT":
                    __classPrivateFieldGet(this, _DirectivesHandler_instances, "m", _DirectivesHandler_handleImports).call(this, importsMap, directiveParts);
                    break;
                case "LOCAL":
                    __classPrivateFieldGet(this, _DirectivesHandler_instances, "m", _DirectivesHandler_handleLocals).call(this, localsMap, directiveParts);
                    break;
                case "FILENAME":
                    filename = __classPrivateFieldGet(this, _DirectivesHandler_instances, "m", _DirectivesHandler_handleFilename).call(this, directiveParts);
                    break;
            }
        }
        // replace directives with filtered directives
        return {
            tagsMap,
            privateArr,
            paramsMap,
            localsMap,
            importsMap,
            filename,
        };
    }
}
_DirectivesHandler_instances = new WeakSet(), _DirectivesHandler_handleFilename = function _DirectivesHandler_handleFilename(parts) {
    return parts.metadata;
}, _DirectivesHandler_handlePrivate = function _DirectivesHandler_handlePrivate(privateArr, parts) {
    const privateNodes = parts.arrMetadata;
    if (Array.isArray(privateNodes))
        for (const p of privateNodes)
            privateArr.push(p);
}, _DirectivesHandler_handleTags = function _DirectivesHandler_handleTags(tagsMap, parts) {
    const { alias, metadata } = parts;
    tagsMap.set(alias, metadata);
}, _DirectivesHandler_handleLocals = function _DirectivesHandler_handleLocals(localsMap, parts) {
    // get alias and defValue from parts
    const { alias, defValue } = parts;
    // add the alias with default value to the paramsMap
    localsMap.set(alias, defValue);
}, _DirectivesHandler_handleParams = function _DirectivesHandler_handleParams(paramsMap, parts) {
    // get alias and defValue from parts
    const { alias, defValue } = parts;
    // add the alias with default value to the paramsMap
    paramsMap.set(alias, defValue);
}, _DirectivesHandler_handleImports = function _DirectivesHandler_handleImports(importsMap, parts) {
    // get alias and path and params key value from parts
    const { alias, metadata: path, keyValue: paramsVal } = parts;
    // verify path
    const isYamlPath = pathRegex.test(path);
    if (!isYamlPath)
        throw new WrapperYAMLException(`This is not a valid YAML file path: ${path}.`);
    // add parts to the map
    importsMap.set(alias, { path, paramsVal });
}, _DirectivesHandler_isEmptyLine = function _DirectivesHandler_isEmptyLine(str) {
    return str.trim().length === 0;
};

var _BlueprintInstance_rawValue;
/**
 * Class that replaces any scalar or interpolation in the raw load. leaving only blueprint items and structure of YAML file. there blue print items are used as storing containers
 * for raw load and interpolations while also save history of resolving, which is needed to be able to dynamically resolve node tree, so with different locals or params values
 * the same raw load gives different final values.
 */
class BlueprintInstance {
    /**
     * @param rawValue - Value returned from js-yaml load directly before resolving.
     */
    constructor(rawValue) {
        /** Stored raw value from js-yaml load. */
        _BlueprintInstance_rawValue.set(this, void 0);
        this.resolved = false;
        __classPrivateFieldSet(this, _BlueprintInstance_rawValue, rawValue, "f");
    }
    /** Method to get raw value. deprecated. */
    get rawValue() {
        return __classPrivateFieldGet(this, _BlueprintInstance_rawValue, "f");
    }
}
_BlueprintInstance_rawValue = new WeakMap();

var _CircularDepHandler_instances, _CircularDepHandler_graphs, _CircularDepHandler_findPath;
/**
 * Class to handle circular dependency checks.
 */
class CircularDepHandler {
    constructor() {
        _CircularDepHandler_instances.add(this);
        /** adjacency list: node -> set of dependencies (edges node -> dep) */
        _CircularDepHandler_graphs.set(this, new Map());
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
        let graph = __classPrivateFieldGet(this, _CircularDepHandler_graphs, "f").get(loadId);
        if (!graph) {
            graph = new Map();
            __classPrivateFieldGet(this, _CircularDepHandler_graphs, "f").set(loadId, graph);
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
        const path = __classPrivateFieldGet(this, _CircularDepHandler_instances, "m", _CircularDepHandler_findPath).call(this, targetPath, modulePath, graph);
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
        const graph = __classPrivateFieldGet(this, _CircularDepHandler_graphs, "f").get(loadId);
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
        __classPrivateFieldGet(this, _CircularDepHandler_graphs, "f").delete(loadId);
    }
}
_CircularDepHandler_graphs = new WeakMap(), _CircularDepHandler_instances = new WeakSet(), _CircularDepHandler_findPath = function _CircularDepHandler_findPath(start, target, graph) {
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
};
/** Class to handle circular dependency check. */
const circularDepClass = new CircularDepHandler();

var _ImportHandler_instances, _ImportHandler_load, _ImportHandler_loadAsync, _ImportHandler_handlePath, _ImportHandler_removeFileName;
/** Class to handle importing another YAML files. */
class ImportHandler {
    /**
     * @param load - Reference to internalLoad function, so it can be used in $import interpolation. passed like this to avoid circular dependency.
     * @param loadAsync - Reference to internalLoadAsync function, so it can be used in $import interpolation. passed like this to avoid circular dependency.
     */
    constructor(load, loadAsync) {
        _ImportHandler_instances.add(this);
        /** Internal load function used to load imported YAML files. */
        _ImportHandler_load.set(this, void 0);
        /** Internal load async function used to load imported YAML files. */
        _ImportHandler_loadAsync.set(this, void 0);
        __classPrivateFieldSet(this, _ImportHandler_load, load, "f");
        __classPrivateFieldSet(this, _ImportHandler_loadAsync, loadAsync, "f");
    }
    /**
     * Method to import another YAML files synchronously.
     * @param modulePath - Path of the current YAML file.
     * @param targetPath - Path of the imported YAML file.
     * @param targetParams - Params value passed to imported YAML file.
     * @param loadOpts - Options object passed to load function and updated using imported module's filepath.
     * @param loadId - Load id generated for this load function execution.
     * @returns Final load of the imported file.
     */
    import(modulePath, targetPath, targetParams, loadOpts, loadId) {
        var _a;
        // remove file name from module path if present
        const dirModulePath = __classPrivateFieldGet(this, _ImportHandler_instances, "m", _ImportHandler_removeFileName).call(this, modulePath);
        // resolve path by adding targer path to module path
        const resPath = __classPrivateFieldGet(this, _ImportHandler_instances, "m", _ImportHandler_handlePath).call(this, (_a = loadOpts === null || loadOpts === void 0 ? void 0 : loadOpts.basePath) !== null && _a !== void 0 ? _a : process.cwd(), dirModulePath, targetPath, loadOpts, loadId);
        // read YAML file and get string
        const str = fs.readFileSync(resPath, { encoding: "utf8" });
        // load str
        const load = __classPrivateFieldGet(this, _ImportHandler_load, "f").call(this, str, {
            ...loadOpts,
            paramsVal: targetParams,
            filepath: resPath,
        }, loadId);
        // return load
        return load;
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
    async importAsync(modulePath, targetPath, targetParams, loadOpts, loadId) {
        var _a;
        // remove file name from module path if present
        const dirModulePath = __classPrivateFieldGet(this, _ImportHandler_instances, "m", _ImportHandler_removeFileName).call(this, modulePath);
        // resolve path by adding targer path to module path
        const resPath = __classPrivateFieldGet(this, _ImportHandler_instances, "m", _ImportHandler_handlePath).call(this, (_a = loadOpts === null || loadOpts === void 0 ? void 0 : loadOpts.basePath) !== null && _a !== void 0 ? _a : process.cwd(), dirModulePath, targetPath, loadOpts, loadId);
        // read YAML file and get string
        const str = await promises.readFile(resPath, { encoding: "utf8" });
        // load str
        const load = await __classPrivateFieldGet(this, _ImportHandler_loadAsync, "f").call(this, str, {
            ...loadOpts,
            paramsVal: targetParams,
            filepath: resPath,
        }, loadId);
        // return load
        return load;
    }
}
_ImportHandler_load = new WeakMap(), _ImportHandler_loadAsync = new WeakMap(), _ImportHandler_instances = new WeakSet(), _ImportHandler_handlePath = function _ImportHandler_handlePath(basePath, modulePath, targetPath, loadOpts, loadId) {
    // resolve path
    const resPath = path.resolve(modulePath, targetPath);
    // make sure it's inside sandbox
    const isSandboxed = isInsideSandBox(resPath, basePath);
    if (!isSandboxed && !loadOpts.unsafe)
        throw new WrapperYAMLException(`Path used: ${targetPath} is out of scope of base path: ${basePath}`);
    const isYaml = isYamlFile(resPath);
    if (!isYaml)
        throw new WrapperYAMLException(`You can only load YAML files the loader. loaded file: ${resPath}`);
    // detect circular dependency if present
    const circularDep = circularDepClass.addDep(modulePath, resPath, loadId);
    if (circularDep)
        throw new WrapperYAMLException(`Circular dependency detected: ${circularDep.join(" -> ")}`);
    // return path
    return resPath;
}, _ImportHandler_removeFileName = function _ImportHandler_removeFileName(path$1) {
    return isYamlFile(path$1) ? path.dirname(path$1) : path$1;
};

var _Expression_instances, _Expression_resolveCache, _Expression_resolveUnknown, _Expression_resolveUnknownAsync, _Expression_importHandler, _Expression_handleThisExpr, _Expression_handleThisExprAsync, _Expression_handleImpExpr, _Expression_handleImpExprAsync, _Expression_handleParamExpr, _Expression_handleLocalExpr, _Expression_traverseNodes, _Expression_traverseNodesAsync, _Expression_isIntNode, _Expression_isRecord;
/** Message that will be sent if an error occured during resolving that should not happen. */
const BUG_MESSAGE = `Error while resolving, contact us about this error as it's most propably a bug.`;
/**
 * Class to handle resolving and handling of interpolations in YAML text.
 */
class Expression {
    /**
     * @param resolveCache - Reference to resolve cache of parent resolveHandler class.
     * @param resolveUnknown - Reference to resolveUnknown method of parent resolveHandler class. passed like this to avoid circular dependency.
     * @param resolveUnknownAsync - Reference to resolveUnknownAsync method of parent resolveHandler class. passed like this to avoid circular dependency.
     * @param load - Reference to internalLoad function, so it can be used in $import expression. passed like this to avoid circular dependency.
     * @param loadAsync - Reference to internalLoadAsync function, so it can be used in $import expression. passed like this to avoid circular dependency.
     */
    constructor(resolveCache, resolveUnknown, resolveUnknownAsync, load, loadAsync) {
        _Expression_instances.add(this);
        /** Reference to resolve cache of parent resolveHandler class. */
        _Expression_resolveCache.set(this, void 0);
        /** Reference to resolveUnknown method of parent resolveHandler class. */
        _Expression_resolveUnknown.set(this, void 0);
        /** Reference to resolveUnknownAsync method of parent resolveHandler class. */
        _Expression_resolveUnknownAsync.set(this, void 0);
        /** Class to handle imports. */
        _Expression_importHandler.set(this, void 0);
        __classPrivateFieldSet(this, _Expression_importHandler, new ImportHandler(load, loadAsync), "f");
        __classPrivateFieldSet(this, _Expression_resolveCache, resolveCache, "f");
        __classPrivateFieldSet(this, _Expression_resolveUnknown, resolveUnknown, "f");
        __classPrivateFieldSet(this, _Expression_resolveUnknownAsync, resolveUnknownAsync, "f");
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Methods to handle expression check and resolve by calling resolving methods.
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Method to check if mapping (object) in raw load is actaully mapping expression. mapping interpolations are defined with this structure in YAML file: { $<int> }
     * which is pared by js-yaml to: { $<int>: null }. so it actally check if it's a one key object and the key is valid expression syntax with value null.
     * @param ent - Enteries of checked object.
     * @returns Boolean that indicate if it's an expression or not.
     */
    isExprMapping(ent) {
        return ent.length === 1 && __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_isIntNode).call(this, ent[0][0]) && ent[0][1] == null;
    }
    /**
     * Method to check if sequence (array) in raw load is actaully sequence expression. sequence interpolations are defined with this structure in YAML file: [ $<int> ]
     * which is pared by js-yaml to: [ $<int> ]. so it actally check if it's a one item array and the this item is valid expression syntax.
     * @param arr - Array that will be checked.
     * @returns Boolean that indicate if it's an expression or not.
     */
    isExprSequence(arr) {
        return arr.length === 1 && __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_isIntNode).call(this, arr[0]);
    }
    /**
     * Method to check if scalar (string) in raw load is actaully scalar expression. scalar interpolations are defined with this structure in YAML file: $<int>
     * which is pared by js-yaml to: $<int>. so it actally check if the string is valid expression syntax.
     * @param str - string that will be checked.
     * @returns Boolean that indicate if it's an expression or not.
     */
    isExprScalar(str) {
        return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_isIntNode).call(this, str);
    }
    /**
     * Method to handle mapping interpolations by resolving value if it was indeed mapping expression, if it wasn't udnefined is returned instead. works sync.
     * @param ent - Enteries of handled object.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Resolved value of mapping expression.
     */
    handleExprMapping(ent, id) {
        if (this.isExprMapping(ent)) {
            const val = this.resolve(ent[0][0], id);
            return val;
        }
    }
    /**
     * Method to handle nested mapping interpolations by resolving value if it was mapping expression, if it wasn't undefined is returned instead. works sync.
     * @param key - Key of the object.
     * @param val - Value of the object.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Resolved value of mapping expression.
     */
    handleNestedExprMapping(key, val, id) {
        if (val instanceof BlueprintInstance)
            val = val.rawValue;
        if (__classPrivateFieldGet(this, _Expression_instances, "m", _Expression_isIntNode).call(this, key) && val == null) {
            const value = this.resolve(key, id);
            return value;
        }
    }
    /**
     * Method to handle nested mapping interpolations by resolving value if it was mapping expression, if it wasn't undefined is returned instead. works async.
     * @param key - Key of the object.
     * @param val - Value of the object.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Resolved value of mapping expression.
     */
    async handleNestedExprMappingAsync(key, val, id) {
        if (val instanceof BlueprintInstance)
            val = val.rawValue;
        if (__classPrivateFieldGet(this, _Expression_instances, "m", _Expression_isIntNode).call(this, key) && val == null) {
            const value = await this.resolveAsync(key, id);
            return value;
        }
    }
    /**
     * Method to handle mapping interpolations by resolving value if it was indeed mapping expression, if it wasn't udnefined is returned instead. works async.
     * @param ent - Enteries of handled object.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Resolved value of mapping expression.
     */
    async handleExprMappingAsync(ent, id) {
        if (this.isExprMapping(ent)) {
            const val = await this.resolveAsync(ent[0][0], id);
            return val;
        }
    }
    /**
     * Method to handle sequence interpolations by resolving value if it was indeed sequence expression, if it wasn't udnefined is returned instead. works sync.
     * @param arr - Array that will be handled.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Resolved value of sequence expression.
     */
    handleExprSequence(arr, id) {
        if (this.isExprSequence(arr)) {
            const val = this.resolve(arr[0], id);
            return val;
        }
    }
    /**
     * Method to handle sequence interpolations by resolving value if it was indeed sequence expression, if it wasn't udnefined is returned instead. works async.
     * @param arr - Array that will be handled.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Resolved value of resolving expression.
     */
    async handleExprSequenceAsync(arr, id) {
        if (this.isExprSequence(arr)) {
            const val = await this.resolveAsync(arr[0], id);
            return val;
        }
    }
    /**
     * Method to handle scalar interpolations by resolving value if it was indeed scalar expression, if it wasn't udnefined is returned instead. works sync.
     * @param str - string that will be handled.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Resolved value of scalar expression.
     */
    handleExprScalar(str, id) {
        if (this.isExprScalar(str)) {
            const val = this.resolve(str, id);
            if (val && typeof val === "object")
                return JSON.stringify(val);
            else
                return val;
        }
    }
    /**
     * Method to handle scalar interpolations by resolving value if it was indeed scalar expression, if it wasn't udnefined is returned instead. works async.
     * @param str - string that will be handled.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Resolved value of scalar expression.
     */
    async handleExprScalarAsync(str, id) {
        if (this.isExprScalar(str)) {
            const val = await this.resolveAsync(str, id);
            if (val && typeof val === "object")
                return JSON.stringify(val);
            else
                return val;
        }
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Methods to handle expression resolve.
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Method to resolve interpolations. works sync.
     * @param expr - Expression that will be handled.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Value returned from expression resolve.
     */
    resolve(expr, id) {
        const exprData = tokenizer.handleExpression(expr);
        if (!exprData)
            throw new WrapperYAMLException(`Invalid type in expression: ${expr} defined types are: 'this' , 'import', 'param' and 'local'`);
        // destructure expression data
        const { type, parts } = exprData;
        // handle expression according to base
        switch (type) {
            case "this":
                return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_handleThisExpr).call(this, parts, id);
            case "import":
                return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_handleImpExpr).call(this, parts, id);
            case "param":
                return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_handleParamExpr).call(this, parts, id);
            case "local":
                return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_handleLocalExpr).call(this, parts, id);
        }
    }
    /**
     * Method to resolve interpolations. works async.
     * @param int - Interpolation that will be handled.
     * @param id - Unique id generated for this resolve executiion, used to access cache.
     * @returns Value returned from expression resolve.
     */
    async resolveAsync(expr, id) {
        // if expression is in interpolation syntax: ${expr} remove the wrapping {}
        if (expr.startsWith("${"))
            expr = "$" + expr.slice(2, expr.length - 1);
        const exprData = tokenizer.handleExpression(expr);
        if (!exprData)
            throw new WrapperYAMLException(`Invalid type in expression: ${expr} defined types are: 'this' , 'import', 'param' and 'local'`);
        // destructure expression data
        const { type, parts } = exprData;
        // handle expression according to base
        switch (type) {
            case "this":
                return await __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_handleThisExprAsync).call(this, parts, id);
            case "import":
                return await __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_handleImpExprAsync).call(this, parts, id);
            case "param":
                return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_handleParamExpr).call(this, parts, id);
            case "local":
                return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_handleLocalExpr).call(this, parts, id);
        }
    }
}
_Expression_resolveCache = new WeakMap(), _Expression_resolveUnknown = new WeakMap(), _Expression_resolveUnknownAsync = new WeakMap(), _Expression_importHandler = new WeakMap(), _Expression_instances = new WeakSet(), _Expression_handleThisExpr = function _Expression_handleThisExpr(parts, id) {
    // destrcture parts
    const { nodepath, keyValue: localsVal } = parts;
    // get cache
    const cache = __classPrivateFieldGet(this, _Expression_resolveCache, "f").get(id);
    if (!cache)
        throw new WrapperYAMLException(BUG_MESSAGE);
    // get needed cache data
    const { blueprint } = cache;
    // update local values
    cache.localsVal.push(localsVal);
    try {
        // read node and return value
        return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_traverseNodes).call(this, blueprint, nodepath, id);
    }
    finally {
        // remove added localVals
        cache.localsVal.pop();
    }
}, _Expression_handleThisExprAsync = 
/**
 * Method to handle 'this' expression. works async.
 * @param exprPath - Main metadata passed in the expression.
 * @param payload - Additional metadata passed after expression.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
async function _Expression_handleThisExprAsync(parts, id) {
    // destrcture parts
    const { nodepath, keyValue: localsVal } = parts;
    // get cache
    const cache = __classPrivateFieldGet(this, _Expression_resolveCache, "f").get(id);
    if (!cache)
        throw new WrapperYAMLException(BUG_MESSAGE);
    // get needed cache data
    const { blueprint } = cache;
    // update local values
    cache.localsVal.push(localsVal);
    try {
        // read node and return value
        return await __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_traverseNodesAsync).call(this, blueprint, nodepath, id);
    }
    finally {
        // remove added localVals
        cache.localsVal.pop();
    }
}, _Expression_handleImpExpr = function _Expression_handleImpExpr(parts, id) {
    // destrcture parts
    const { nodepath: aliasWithPath, keyValue: paramsVal } = parts;
    // get cache
    const cache = __classPrivateFieldGet(this, _Expression_resolveCache, "f").get(id);
    if (!cache)
        throw new WrapperYAMLException(BUG_MESSAGE);
    // get needed cache data
    const { importsMap, path, opts } = cache;
    // if no path supplied (which occurs only it the root load() by user) throw error that asks user to add filepath if he wants to use imports
    if (!path)
        throw new WrapperYAMLException(`You need to define filepath in options if you want to use imports.`);
    // get alias and node path from expr path
    const alias = aliasWithPath[0];
    const nodepath = aliasWithPath.slice(1);
    // use imports map to get path and defualt params of this import
    const impData = importsMap.get(alias);
    if (!impData)
        throw new WrapperYAMLException(`Alias used in import expression: '${aliasWithPath}' is not defined in directives.`);
    const { paramsVal: defParamsVal, path: targetPath } = impData;
    // merge default with defined params
    const finalParams = { ...defParamsVal, ...paramsVal };
    // import file
    const load = __classPrivateFieldGet(this, _Expression_importHandler, "f").import(path, targetPath, finalParams, opts, id.split("_")[0] // get loadId from id back
    );
    // traverse load using nodepath and return value
    return __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_traverseNodes).call(this, load, nodepath, id);
}, _Expression_handleImpExprAsync = 
/**
 * Method to handle 'import' expression. works async.
 * @param exprPath - Main metadata passed in the expression.
 * @param payload - Additional metadata passed after expression.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
async function _Expression_handleImpExprAsync(parts, id) {
    // destrcture parts
    const { nodepath: aliasWithPath, keyValue: paramsVal } = parts;
    // get cache
    const cache = __classPrivateFieldGet(this, _Expression_resolveCache, "f").get(id);
    if (!cache)
        throw new WrapperYAMLException(BUG_MESSAGE);
    // get needed cache data
    const { importsMap, path, opts } = cache;
    // if no path supplied (which occurs only it the root load() by user) throw error that asks user to add filepath if he wants to use imports
    if (!path)
        throw new WrapperYAMLException(`You need to define filepath in options if you want to use imports.`);
    // get alias and node path from expr path
    const alias = aliasWithPath[0];
    const nodepath = aliasWithPath.slice(1);
    // use imports map to get path and defualt params of this import
    const impData = importsMap.get(alias);
    if (!impData)
        throw new WrapperYAMLException(`Alias used in import expression: '${aliasWithPath}' is not defined in directives.`);
    const { paramsVal: defParamsVal, path: targetPath } = impData;
    // merge default with defined params
    const finalParams = { ...defParamsVal, ...paramsVal };
    // import file
    const load = await __classPrivateFieldGet(this, _Expression_importHandler, "f").importAsync(path, targetPath, finalParams, opts, id.split("_")[0] // get loadId from id back
    );
    // traverse load using nodepath and return value
    return await __classPrivateFieldGet(this, _Expression_instances, "m", _Expression_traverseNodesAsync).call(this, load, nodepath, id);
}, _Expression_handleParamExpr = function _Expression_handleParamExpr(parts, id) {
    var _a, _b;
    // destrcture parts
    const { alias } = parts;
    // get cache
    const cache = __classPrivateFieldGet(this, _Expression_resolveCache, "f").get(id);
    if (!cache)
        throw new WrapperYAMLException(BUG_MESSAGE);
    // get needed cache data
    const { paramsMap, paramsVal } = cache;
    // check if alias is defined in directives using paramsMap, if yes get def param value
    if (!paramsMap.has(alias))
        throw new WrapperYAMLException(`Alias used in params expression: '${alias}' is not defined in directives.`);
    const defParam = paramsMap.get(alias);
    // if value is passed for this alias use it otherwise use default value
    return (_b = (_a = paramsVal[alias]) !== null && _a !== void 0 ? _a : defParam) !== null && _b !== void 0 ? _b : null;
}, _Expression_handleLocalExpr = function _Expression_handleLocalExpr(parts, id) {
    var _a, _b;
    // destrcture parts
    const { alias } = parts;
    // get cache
    const cache = __classPrivateFieldGet(this, _Expression_resolveCache, "f").get(id);
    if (!cache)
        throw new WrapperYAMLException(BUG_MESSAGE);
    // get needed cache data
    const { localsMap, localsVal } = cache;
    // check if alias is defined in directives using localsMap
    if (!localsMap.has(alias))
        throw new WrapperYAMLException(`Alias used in local expression: '${alias}' is not defined in directives.`);
    const defLocal = localsMap.get(alias);
    // generate localsVal object from values passed after $this
    const handledLocalsVal = Object.fromEntries(localsVal
        .map((obj) => {
        return Object.entries(obj);
    })
        .flat(1));
    // if value is passed for this alias use it otherwise use default value
    return (_b = (_a = handledLocalsVal[alias]) !== null && _a !== void 0 ? _a : defLocal) !== null && _b !== void 0 ? _b : null;
}, _Expression_traverseNodes = function _Expression_traverseNodes(tree, path, id) {
    // start node from base of the tree
    let node = tree;
    // start traversing
    for (const p of path) {
        // if node is not record throw
        if (!__classPrivateFieldGet(this, _Expression_instances, "m", _Expression_isRecord).call(this, node) || node instanceof BlueprintInstance)
            throw new WrapperYAMLException(`Invalid path in expression: ${path.join(".")}`);
        // if item is present in node update it and continue
        if (p in node) {
            node = node[p];
            continue;
        }
        // only if node is an array then try matching using string value
        if (Array.isArray(node) && typeof p === "string") {
            // resolve array values to get strings from blueprint items
            const resolved = __classPrivateFieldGet(this, _Expression_resolveUnknown, "f").call(this, node, id, true, path);
            // if resolved is still an array check if item is present, if yes update node and continue
            if (Array.isArray(resolved)) {
                const idx = resolved.indexOf(p);
                if (idx !== -1) {
                    node = node[idx];
                    continue;
                }
            }
        }
        // throw error if no resolving happened until now
        throw new WrapperYAMLException(`Invalid path in expression: ${path.join(".")}`);
    }
    // return node
    return __classPrivateFieldGet(this, _Expression_resolveUnknown, "f").call(this, node, id, true, path);
}, _Expression_traverseNodesAsync = 
/**
 * Method to traverse through nodes tree. works async.
 * @param tree - Node tree that will be traversed.
 * @param path - Path of traversal.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value after traversal and retuning subnode.
 */
async function _Expression_traverseNodesAsync(tree, path, id) {
    // start node from base of the tree
    let node = tree;
    // start traversing
    for (const p of path) {
        // if node is not record throw
        if (!__classPrivateFieldGet(this, _Expression_instances, "m", _Expression_isRecord).call(this, node) || node instanceof BlueprintInstance)
            throw new WrapperYAMLException(`Invalid path in expression: ${path.join(".")}.`);
        // if item is present in node update it and continue
        if (p in node) {
            node = node[p];
            continue;
        }
        // only if node is an array then try matching using string value
        if (Array.isArray(node) && typeof p === "string") {
            // resolve array values to get strings from blueprint items
            const resolved = await __classPrivateFieldGet(this, _Expression_resolveUnknownAsync, "f").call(this, node, id, true, path);
            // if resolved is still an array check if item is present, if yes update node and continue
            if (Array.isArray(resolved)) {
                const idx = resolved.indexOf(p);
                if (idx !== -1) {
                    node = node[idx];
                    continue;
                }
            }
        }
        // throw error if no resolving happened until now
        throw new WrapperYAMLException(`Invalid path in expression: ${path.join(".")}.`);
    }
    // return node
    return await __classPrivateFieldGet(this, _Expression_resolveUnknownAsync, "f").call(this, node, id, true, path);
}, _Expression_isIntNode = function _Expression_isIntNode(val) {
    if (val instanceof BlueprintInstance)
        val = val.rawValue;
    if (typeof val !== "string")
        return false;
    val = val.trim();
    return val[0] === "$" && val[1] !== "$" && val[1] !== "{";
}, _Expression_isRecord = function _Expression_isRecord(val) {
    return typeof val === "object" && val !== null;
};

var _ResolveHandler_instances, _ResolveHandler_resolveCache, _ResolveHandler_exprHandler, _ResolveHandler_resolveUnknown, _ResolveHandler_resolveUnknownAsync, _ResolveHandler_resolveObject, _ResolveHandler_resolveObjectAsync, _ResolveHandler_resolveArray, _ResolveHandler_resolveArrayAsync, _ResolveHandler_resolveString, _ResolveHandler_resolveStringAsync, _ResolveHandler_resolveTag, _ResolveHandler_resolveTagAsync, _ResolveHandler_filterPrivate, _ResolveHandler_isRecord;
/**
 * Class that handles resolving raw load, so signle raw load can be resolved to multiple final loads based on module params value.
 */
class ResolveHandler {
    /**
     * @param load - Reference to internalLoad function, so it can be used in $import interpolation. passed like this to avoid circular dependency.
     * @param loadAsync - Reference to internalLoadAsync function, so it can be used in $import interpolation. passed like this to avoid circular dependency.
     */
    constructor(load, loadAsync) {
        _ResolveHandler_instances.add(this);
        /**
         * Cache that holds resolve data for each resolve execution. it's keyed by concatinating loadId and resolved path (or random id if resolved path not passed). so each cache is
         * unique.
         */
        _ResolveHandler_resolveCache.set(this, new Map());
        /** Class to handle interpolations resolving. */
        _ResolveHandler_exprHandler.set(this, void 0);
        // create interpolation class to handle interpolations while resolving.
        __classPrivateFieldSet(this, _ResolveHandler_exprHandler, new Expression(__classPrivateFieldGet(this, _ResolveHandler_resolveCache, "f"), __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknown).bind(this), __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknownAsync).bind(this), load, loadAsync), "f");
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Main methods.
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Method to create blueprint from raw load by looping through it and replacing any scalar or interpolation by BlueprintInstance class that store there value and return them when needed.
     * @param rawLoad - Raw load from js-yaml execution.
     * @returns Blueprint that can be resolved to final loads.
     */
    createBlueprint(rawLoad) {
        // if tag resolve item return it directly
        if (rawLoad instanceof TagResolveInstance)
            return rawLoad;
        // if array generate similar array and all values go through emptyCopy method as well
        if (Array.isArray(rawLoad)) {
            // check if it's syntaxt [$val]
            if (__classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").isExprSequence(rawLoad))
                return new BlueprintInstance(rawLoad);
            // otherwise handle as normal array
            const out = [];
            for (const v of rawLoad)
                out.push(this.createBlueprint(v));
            return out;
        }
        // if object generate object of similar keys and all values go through emptyCopy method as well
        if (rawLoad && typeof rawLoad === "object") {
            // convert to interies
            const enteries = Object.entries(rawLoad);
            // check if it's syntaxt {$val}
            if (__classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").isExprMapping(enteries))
                return new BlueprintInstance(rawLoad);
            // otherwise handle as normal object
            const out = {};
            for (const [k, v] of enteries) {
                out[k] = this.createBlueprint(v);
            }
            return out;
        }
        // otherwise return blueprint item
        return new BlueprintInstance(rawLoad);
    }
    /**
     * Method to resolve blueprint into final load returned to user. works sync meaning any YAML file read or tag construct function execution is executed synchronously.
     * @param path - Resolved path of the module.
     * @param blueprint - Blueprint of the module.
     * @param directivesObj - Directives object of the module.
     * @param paramsVal - Params value passed with this load function execution.
     * @param loadId - Load id generated to this load function execution.
     * @param opts - Options passed with this load function execution.
     * @returns Final load after resolving the blueprint, what is returned to the user after load functions finishes.
     */
    resolve(path, blueprint, directivesObj, paramsVal, loadId, opts) {
        // generate id by concatinating loadId with resolved path or random id to uniquely identify this resolve
        const id = `${loadId}_${path !== null && path !== void 0 ? path : generateId()}`;
        // add execution cache data
        __classPrivateFieldGet(this, _ResolveHandler_resolveCache, "f").set(id, {
            path,
            ...directivesObj,
            blueprint,
            paramsVal,
            localsVal: [],
            opts,
        });
        // start actual handling
        try {
            // resolve
            const resolved = __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknown).call(this, blueprint, id, false);
            // remove private and return value
            return __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_filterPrivate).call(this, resolved, id);
        }
        finally {
            __classPrivateFieldGet(this, _ResolveHandler_resolveCache, "f").delete(id);
        }
    }
    /**
     * Method to resolve blueprint into final load returned to user. works ssync meaning any YAML file read or tag construct function execution is executed asynchronously.
     * @param path - Resolved path of the module.
     * @param blueprint - Blueprint of the module.
     * @param directivesObj - Directives object of the module.
     * @param paramsVal - Params value passed with this load function execution.
     * @param loadId - Load id generated to this load function execution.
     * @param opts - Options passed with this load function execution.
     * @returns Final load after resolving the blueprint, what is returned to the user after load functions finishes.
     */
    async resolveAsync(path, blueprint, directivesObj, paramsVal, loadId, opts) {
        // generate id by concatinating loadId with resolved path or random id to uniquely identify this resolve
        const id = `${loadId}_${path !== null && path !== void 0 ? path : generateId()}`;
        // add execution cache data
        __classPrivateFieldGet(this, _ResolveHandler_resolveCache, "f").set(id, {
            path,
            ...directivesObj,
            blueprint,
            paramsVal,
            localsVal: [],
            opts,
        });
        // start actual handling
        try {
            // resolve
            const resolved = await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknownAsync).call(this, blueprint, id, false);
            // remove private and return value
            return __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_filterPrivate).call(this, resolved, id);
        }
        finally {
            __classPrivateFieldGet(this, _ResolveHandler_resolveCache, "f").delete(id);
        }
    }
}
_ResolveHandler_resolveCache = new WeakMap(), _ResolveHandler_exprHandler = new WeakMap(), _ResolveHandler_instances = new WeakSet(), _ResolveHandler_resolveUnknown = function _ResolveHandler_resolveUnknown(val, id, anchored, path) {
    /** Var to hold value. */
    let rawVal = val;
    // if val is BlueprintInstance handle it (get rawValue from it and check resolve)
    if (val instanceof BlueprintInstance) {
        // get raw value
        rawVal = val.rawValue;
        // if read is anchor and BlueprintInstance not resolved yet throw
        if (anchored && !val.resolved)
            throw new WrapperYAMLException(`Tried to access ${path ? path.join(".") : "value"} before intialization.`);
    }
    // handle raw value resolve at the end
    try {
        // handle value according to its type
        if (typeof rawVal === "string")
            return __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveString).call(this, rawVal, id);
        if (typeof rawVal !== "object" || rawVal == null)
            return rawVal;
        if (rawVal instanceof TagResolveInstance)
            return __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveTag).call(this, rawVal, id, anchored, path);
        if (Array.isArray(rawVal))
            return __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveArray).call(this, rawVal, id, anchored, path);
        return __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveObject).call(this, rawVal, id, anchored, path);
    }
    finally {
        if (val instanceof BlueprintInstance)
            val.resolved = true;
    }
}, _ResolveHandler_resolveUnknownAsync = 
/**
 * Method to resolve unkown value types by checking type and using appropriate specific resolver function. it's also the place where blueprintItem is resolved. works async.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
 * @returns Value of the specific resolve function based on type.
 */
async function _ResolveHandler_resolveUnknownAsync(val, id, anchored, path) {
    /** Var to hold value. */
    let rawVal = val;
    // if val is BlueprintInstance handle it (get rawValue from it and check resolve)
    if (val instanceof BlueprintInstance) {
        // get raw value
        rawVal = val.rawValue;
        // if read is anchor and BlueprintInstance not resolved yet throw
        if (anchored && !val.resolved)
            throw new WrapperYAMLException(`Tried to access ${path ? path.join(".") : "value"} before intialization.`);
    }
    // handle raw value resolve at the end
    try {
        // handle value according to its type
        if (typeof rawVal === "string")
            return await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveStringAsync).call(this, rawVal, id);
        if (typeof rawVal !== "object" || rawVal === null)
            return rawVal;
        if (rawVal instanceof TagResolveInstance)
            return await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveTagAsync).call(this, rawVal, id, anchored, path);
        if (Array.isArray(rawVal))
            return await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveArrayAsync).call(this, rawVal, id, anchored, path);
        return await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveObjectAsync).call(this, rawVal, id, anchored, path);
    }
    finally {
        if (val instanceof BlueprintInstance)
            val.resolved = true;
    }
}, _ResolveHandler_resolveObject = function _ResolveHandler_resolveObject(obj, id, anchored, path) {
    // resolve all the enteries of the original blue print
    const newObj = { ...obj };
    const enteries = Object.entries(newObj);
    // if empty return empty object
    if (enteries.length === 0)
        return {};
    // check if it's syntaxt {$val}
    const intMapping = __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").handleExprMapping(enteries, id);
    if (intMapping) {
        if (typeof intMapping !== "object" ||
            intMapping == null ||
            Array.isArray(intMapping))
            throw new WrapperYAMLException(`Interpolation: ${enteries[0][0]} is wrapped inside {} but it's value is not a mapping.`);
        return intMapping;
    }
    // loop enteries
    for (const [key, val] of enteries) {
        // prettier-ignore
        const exprMapping = __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").handleNestedExprMapping(key, val, id);
        if (exprMapping) {
            delete newObj[key];
            // prettier-ignore
            if (typeof exprMapping !== "object" || exprMapping == null || Array.isArray(exprMapping))
                throw new WrapperYAMLException(`Expression: ${key} is wrapped inside {} but it's value is not a mapping.`);
            for (const [key, val] of Object.entries(exprMapping))
                newObj[key] = val;
            continue;
        }
        newObj[key] = __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknown).call(this, val, id, anchored, path);
    }
    return newObj;
}, _ResolveHandler_resolveObjectAsync = 
/**
 * Method to resolve objects (mapping in YAML). works async.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
 * @returns Value of the resolved object (mapping in YAML).
 */
async function _ResolveHandler_resolveObjectAsync(obj, id, anchored, path) {
    // resolve all the enteries of the original blue print
    const newObj = { ...obj };
    const enteries = Object.entries(newObj);
    // if empty return empty object
    if (enteries.length === 0)
        return {};
    // check if it's syntaxt {$val}
    const exprMapping = await __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").handleExprMappingAsync(enteries, id);
    if (exprMapping) {
        if (typeof exprMapping !== "object" ||
            exprMapping == null ||
            Array.isArray(exprMapping))
            throw new WrapperYAMLException(`Expression: ${enteries[0][0]} is wrapped inside {} but it's value is not a mapping.`);
        return exprMapping;
    }
    // loop enteries
    for (const [key, val] of enteries) {
        // prettier-ignore
        const exprMapping = await __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").handleNestedExprMappingAsync(key, val, id);
        if (exprMapping) {
            delete newObj[key];
            // prettier-ignore
            if (typeof exprMapping !== "object" || exprMapping == null || Array.isArray(exprMapping))
                throw new WrapperYAMLException(`Expression: ${key} is wrapped inside {} but it's value is not a mapping.`);
            for (const [key, val] of Object.entries(exprMapping))
                newObj[key] = val;
            continue;
        }
        newObj[key] = await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknownAsync).call(this, val, id, anchored, path);
    }
    return newObj;
}, _ResolveHandler_resolveArray = function _ResolveHandler_resolveArray(arr, id, anchored, path) {
    // resolve all the items of the original blue print
    const newArr = [...arr];
    // check if it's syntaxt [$val]
    const intSequence = __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").handleExprSequence(newArr, id);
    if (intSequence)
        return Array.isArray(intSequence) ? intSequence : [intSequence];
    // handle all the values in the array
    for (let i = 0; i < newArr.length; i++)
        newArr[i] = __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknown).call(this, newArr[i], id, anchored, path);
    // return new array
    return newArr;
}, _ResolveHandler_resolveArrayAsync = 
/**
 * Method to resolve arrays (sequence in YAML). works async.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
 * @returns Value of the resolved arrays (sequence in YAML).
 */
async function _ResolveHandler_resolveArrayAsync(arr, id, anchored, path) {
    // resolve all the items of the original blue print
    const newArr = [...arr];
    // check if it's syntaxt [$val]
    const exprSequence = await __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").handleExprSequenceAsync(newArr, id);
    if (exprSequence)
        return Array.isArray(exprSequence) ? exprSequence : [exprSequence];
    // handle all the values in the array
    for (let i = 0; i < newArr.length; i++)
        newArr[i] = await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknownAsync).call(this, newArr[i], id, anchored, path);
    // return new array
    return newArr;
}, _ResolveHandler_resolveString = function _ResolveHandler_resolveString(str, id) {
    // check if it's syntaxt $val
    const intScaler = __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").handleExprScalar(str, id);
    if (intScaler)
        return intScaler;
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
                if (end === -1)
                    throw new WrapperYAMLException(`String interpolation used without closing '}' in: ${str}`);
                const val = __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").resolve(str.slice(i, end + 1), id);
                const stringifiedVal = typeof val === "string" ? val : JSON.stringify(val);
                out += stringifiedVal;
                i = end + 1;
                continue;
            }
        }
        // any other char just add it and increment index
        out += ch;
        i++;
    }
    // return out string
    return out;
}, _ResolveHandler_resolveStringAsync = 
/**
 * Method to resolve string (scalar in YAML). works async.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value of the resolved string (scalar in YAML).
 */
async function _ResolveHandler_resolveStringAsync(str, id) {
    // check if it's syntaxt $val
    const exprScaler = await __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").handleExprScalarAsync(str, id);
    if (exprScaler)
        return exprScaler;
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
                if (end === -1)
                    throw new WrapperYAMLException(`String interpolation used without closing '}' in: ${str}`);
                const val = await __classPrivateFieldGet(this, _ResolveHandler_exprHandler, "f").resolveAsync(str.slice(i, end + 1), id);
                const stringifiedVal = typeof val === "string" ? val : JSON.stringify(val);
                out += stringifiedVal;
                i = end + 1;
                continue;
            }
        }
        // any other char just add it and increment index
        out += ch;
        i++;
    }
    // return out string
    return out;
}, _ResolveHandler_resolveTag = function _ResolveHandler_resolveTag(resolveItem, id, anchored, path) {
    // handle data and params (data's type is unkown but params type is string)
    const resolvedData = __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknown).call(this, resolveItem.data, id, anchored, path);
    const resolvedParams = resolveItem.params && __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveString).call(this, resolveItem.params, id);
    // save resolved values in the tag resolve instance
    resolveItem.data = resolvedData;
    resolveItem.params = resolvedParams;
    // execute the constructor function
    const value = resolveItem.resolve();
    return value;
}, _ResolveHandler_resolveTagAsync = 
/**
 * Method to resolve tags. it uses resolveUnkown to resolve data passed to the tag and resolveString to resolve params passed and then execute construct function. works async.
 * @param val - Unknown value.
 * @param id - Unique id generated for this resolve executiion, used to access cache.
 * @param anchored - Boolean to indicate if the resolving is anchored (reference value in the node tree) or just part of main resolve loop. it controls how blueprint item is resolved.
 * @param path - Optional and needed only if anchored is tree. so error message will contain path of the node in the tree.
 * @returns Value of the resolved tag.
 */
async function _ResolveHandler_resolveTagAsync(resolveItem, id, anchored, path) {
    // handle data and params (data's type is unkown but params type is string)
    const resolvedData = await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveUnknownAsync).call(this, resolveItem.data, id, anchored, path);
    const resolvedParams = resolveItem.params &&
        (await __classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_resolveStringAsync).call(this, resolveItem.params, id));
    // save resolved values in the tag resolve instance
    resolveItem.data = resolvedData;
    resolveItem.params = resolvedParams;
    // execute the constructor function
    const value = await resolveItem.resolveAsync();
    return value;
}, _ResolveHandler_filterPrivate = function _ResolveHandler_filterPrivate(resolve, id) {
    var _a;
    // get private arr
    const privateArr = (_a = __classPrivateFieldGet(this, _ResolveHandler_resolveCache, "f").get(id)) === null || _a === void 0 ? void 0 : _a.privateArr;
    if (!privateArr)
        return resolve;
    // loop through private array to handle each path
    for (const priv of privateArr) {
        // get parts of the path
        const path = tokenizer.divideNodepath(priv);
        // var that holds the resolve to transverse through it
        let node = resolve;
        for (let i = 0; i < path.length; i++) {
            // get current part of the path
            const p = path[i];
            // if it's not a record then path is not true and just console a warning
            if (!__classPrivateFieldGet(this, _ResolveHandler_instances, "m", _ResolveHandler_isRecord).call(this, node))
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
}, _ResolveHandler_isRecord = function _ResolveHandler_isRecord(val) {
    return typeof val === "object" && val !== null;
};

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
 * @param blueprint - Output from execution of the YAML string.
 * @param dirObj - Object that holds metadata about the directives.
 */
function addModuleCache(loadId, str, filepath, blueprint, dirObj) {
    // resolve filepath
    const resPath = path.resolve(filepath);
    // hash string, params and path
    const hashedStr = hashStr(str);
    // get module cache
    let moduleCache = modulesCache.get(resPath);
    // if module cache is not present create new one
    if (moduleCache === undefined) {
        moduleCache = {
            str,
            resPath,
            hashedStr,
            dirObj,
            blueprint: undefined,
            loadCache: new Map(),
        };
        modulesCache.set(resPath, moduleCache);
    }
    // save blueprint
    moduleCache.blueprint = blueprint;
    // id -> paths
    let paths = loadIdsToModules.get(loadId);
    if (!paths) {
        paths = new Set();
        loadIdsToModules.set(loadId, paths);
    }
    paths.add(resPath);
    // path -> ids
    let ids = modulesToLoadIds.get(resPath);
    if (!ids) {
        ids = new Set();
        modulesToLoadIds.set(resPath, ids);
    }
    ids.add(loadId);
}
function addLoadCache(filepath, paramsVal, load) {
    // resolve filepath
    const resPath = path.resolve(filepath);
    // get module cache
    const moduleCache = modulesCache.get(resPath);
    if (moduleCache === undefined)
        return;
    // hash params
    const hashedParams = hashObj(paramsVal !== null && paramsVal !== void 0 ? paramsVal : {});
    // add load
    moduleCache.loadCache.set(hashedParams, { paramsVal, load });
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
        if (newStrHash !== moduleCache.hashedStr)
            return;
    }
    // return blue print
    return moduleCache;
}
/**
 * Function that checks if specific load with module params is cached.
 * @param modulePath - Url path of the module that will be deleted.
 * @param paramsVal - Value of module params in YAML sting.
 * @returns Object that stores load value and module params used to load it.
 */
function getLoadCache(modulePath, paramsVal) {
    // if no path supplied return
    if (!modulePath)
        return;
    // check if module cache is present (should be present but do this for ts)
    const moduleCache = modulesCache.get(modulePath);
    if (!moduleCache)
        return;
    // hash params
    const hashedParams = hashObj(paramsVal !== null && paramsVal !== void 0 ? paramsVal : {});
    // get cache of this load with params using hashed params
    const cache = moduleCache.loadCache.get(hashedParams);
    // return cache
    return cache;
}
/**
 * Function to reset blueprint and all loads of the module.
 * @param modulePath - Url path of the module that will be deleted.
 */
function resetModuleCache(modulePath) {
    const moduleCache = modulesCache.get(modulePath);
    if (moduleCache !== undefined) {
        moduleCache.blueprint = undefined;
        moduleCache.loadCache.clear();
    }
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper classes that are used to load and resolve YAML strings.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Directives handler class instance that is used to handle reading and normalizing directives back to normal YAML.
 */
const directivesHandler = new DirectivesHandler();
/**
 * Tags handler class instance that is used to handle initial read of str using regex to capture tags and conversion of these tags into wrapper composite type
 * class that is ready to be bridged into js-yaml type class.
 */
const tagsHandler = new TagsHandler();
/**
 * Resolve handler class that is used to resolve the raw node tree passed from js-yaml (handle tags and interpolation expressions).
 */
const resolveHandler = new ResolveHandler(internalLoad, internalLoadAsync);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main load functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Function to load YAML string into js value. works sync so all file system reads are sync, also all tag's construct functions executions will be treated as sync
 * functions and not awaited. If you are using imports or async tag construct functions use loadAsync instead.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control load behavior.
 * @returns Js value of loaded YAML string.
 */
function load(str, opts) {
    var _a;
    // if no str present throw an error
    if (str === undefined)
        throw new jsYaml.YAMLException(`You should pass either YAML string or url path of YAML file in str.`);
    // set new loadId
    const loadId = generateId();
    // handle options
    const handledOpts = handleOpts(opts);
    // check if string passed is actually a url, if yes read the file and update both str and filepath of opts
    const match = str.match(pathRegex);
    if (match) {
        handledOpts.filepath = path.resolve(handledOpts.basePath, str);
        str = rootFileRead(handledOpts);
    }
    // if no string present read file using options's filepath
    if (str === undefined)
        str = rootFileRead(handledOpts);
    try {
        // define vars that will hold blueprint and dirObj
        let blueprint;
        let dirObj;
        // get cache of the module
        const cachedModule = getModuleCache(handledOpts.filepath, str);
        // if module is cached get blue print and dir obj from it directly, if not execute string
        if (cachedModule && cachedModule.blueprint !== undefined) {
            blueprint = cachedModule.blueprint;
            dirObj = cachedModule.dirObj;
        }
        else {
            // execute string
            const val = handleNewModule(str, handledOpts, loadId);
            blueprint = val.blueprint;
            dirObj = val.dirObj;
        }
        // check if load with params is present in the cache
        const cachedLoad = getLoadCache(handledOpts.filepath, handledOpts.paramsVal);
        // if load is cached return it
        if (cachedLoad !== undefined)
            return cachedLoad.load;
        // resolve blueprint and return
        const load = resolveHandler.resolve(handledOpts.filepath, blueprint, dirObj, (_a = handledOpts.paramsVal) !== null && _a !== void 0 ? _a : {}, loadId, handledOpts);
        // add load to the cache if filepath is supplied
        if (handledOpts.filepath)
            addLoadCache(handledOpts.filepath, handledOpts.paramsVal, load);
        // return load
        return load;
    }
    catch (err) {
        // if error instance of WrapperYAMLException set additional data
        if (err instanceof WrapperYAMLException)
            err.setAdditionalData(handledOpts.filepath, handledOpts.filename);
        // rethrow
        throw err;
    }
    finally {
        deleteLoadIdFromCache(loadId);
        circularDepClass.deleteLoadId(loadId);
    }
}
/**
 * Function to load YAML string into js value. works async so all file system reads are async, also all tag's construct functions executions are awaited.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control load behavior.
 * @returns Js value of loaded YAML string.
 */
async function loadAsync(str, opts) {
    var _a;
    // if no str present throw an error
    if (str === undefined)
        throw new jsYaml.YAMLException(`You should pass either YAML string or url path of YAML file in str.`);
    // set new loadId
    const loadId = generateId();
    // handle options
    const handledOpts = handleOpts(opts);
    // check if string passed is actually a url, if yes read the file and update both str and filepath of opts
    const match = str.match(pathRegex);
    if (match) {
        handledOpts.filepath = path.resolve(handledOpts.basePath, str);
        str = await rootFileReadAsync(handledOpts);
    }
    try {
        // define vars that will hold blueprint and dirObj
        let blueprint;
        let dirObj;
        // get cache of the module
        const cachedModule = getModuleCache(handledOpts.filepath, str);
        // if module is cached get blue print and dir obj from it directly, if not execute string
        if (cachedModule && cachedModule.blueprint !== undefined) {
            blueprint = cachedModule.blueprint;
            dirObj = cachedModule.dirObj;
        }
        else {
            const val = await handleNewModuleAsync(str, handledOpts, loadId);
            blueprint = val.blueprint;
            dirObj = val.dirObj;
        }
        // check if load with params is present in the cache
        const cachedLoad = getLoadCache(handledOpts.filepath, handledOpts.paramsVal);
        // if load is cached return it
        if (cachedLoad !== undefined)
            return cachedLoad.load;
        // resolve blueprint and return
        const load = await resolveHandler.resolveAsync(handledOpts.filepath, blueprint, dirObj, (_a = handledOpts.paramsVal) !== null && _a !== void 0 ? _a : {}, loadId, handledOpts);
        // add load to the cache if filepath is supplied
        if (handledOpts.filepath)
            addLoadCache(handledOpts.filepath, handledOpts.paramsVal, load);
        // return load
        return load;
    }
    catch (err) {
        // if error instance of WrapperYAMLException set additional data
        if (err instanceof WrapperYAMLException)
            err.setAdditionalData(handledOpts.filepath, handledOpts.filename);
        // rethrow
        throw err;
    }
    finally {
        deleteLoadIdFromCache(loadId);
        circularDepClass.deleteLoadId(loadId);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Methods used by helper classes
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Just like load function but used in the code inside live loader and resolve handler. they execute the YAML string the same way load does but they don't create
 * new load id or handle clean-up and input validation. works sync.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returnsL Loaded YAML string into js object.
 */
function internalLoad(str, opts, loadId) {
    var _a;
    // handle options
    const handledOpts = handleOpts(opts);
    try {
        // define vars that will hold blueprint and dirObj
        let blueprint;
        let dirObj;
        // get cache of the module
        const cachedModule = getModuleCache(handledOpts.filepath, str);
        // if module is cached get blue print and dir obj from it directly, if not execute string
        if (cachedModule && cachedModule.blueprint !== undefined) {
            blueprint = cachedModule.blueprint;
            dirObj = cachedModule.dirObj;
        }
        else {
            const val = handleNewModule(str, handledOpts, loadId);
            blueprint = val.blueprint;
            dirObj = val.dirObj;
        }
        // check if load with params is present in the cache
        const cachedLoad = getLoadCache(handledOpts.filepath, handledOpts.paramsVal);
        // if load is cached return it
        if (cachedLoad !== undefined)
            return cachedLoad.load;
        // resolve blueprint and return
        const load = resolveHandler.resolve(handledOpts.filepath, blueprint, dirObj, (_a = handledOpts.paramsVal) !== null && _a !== void 0 ? _a : {}, loadId, handledOpts);
        // add load to the cache if filepath is supplied
        if (handledOpts.filepath)
            addLoadCache(handledOpts.filepath, handledOpts.paramsVal, load);
        // return load
        return load;
    }
    catch (err) {
        // if error instance of WrapperYAMLException set additional data
        if (err instanceof WrapperYAMLException)
            err.setAdditionalData(handledOpts.filepath, handledOpts.filename);
        // rethrow
        throw err;
    }
}
/**
 * Just like load function but used in the code inside live loader and resolve handler. they execute the YAML string the same way load does but they don't create
 * new load id or handle clean-up and input validation. works async.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returnsL Loaded YAML string into js object.
 */
async function internalLoadAsync(str, opts, loadId) {
    var _a;
    // handle options
    const handledOpts = handleOpts(opts);
    try {
        // define vars that will hold blueprint and dirObj
        let blueprint;
        let dirObj;
        // get cache of the module
        const cachedModule = getModuleCache(handledOpts.filepath, str);
        // if module is cached get blue print and dir obj from it directly, if not execute string
        if (cachedModule && cachedModule.blueprint !== undefined) {
            blueprint = cachedModule.blueprint;
            dirObj = cachedModule.dirObj;
        }
        else {
            const val = await handleNewModuleAsync(str, handledOpts, loadId);
            blueprint = val.blueprint;
            dirObj = val.dirObj;
        }
        // check if load with params is present in the cache
        const cachedLoad = getLoadCache(handledOpts.filepath, handledOpts.paramsVal);
        // if load is cached return it
        if (cachedLoad !== undefined)
            return cachedLoad.load;
        // resolve blueprint and return
        const load = await resolveHandler.resolveAsync(handledOpts.filepath, blueprint, dirObj, (_a = handledOpts.paramsVal) !== null && _a !== void 0 ? _a : {}, loadId, handledOpts);
        // add load to the cache if filepath is supplied
        if (handledOpts.filepath)
            addLoadCache(handledOpts.filepath, handledOpts.paramsVal, load);
        // return load
        return load;
    }
    catch (err) {
        // if error instance of WrapperYAMLException set additional data
        if (err instanceof WrapperYAMLException)
            err.setAdditionalData(handledOpts.filepath, handledOpts.filename);
        // rethrow
        throw err;
    }
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
    var _a;
    const basePath = (opts === null || opts === void 0 ? void 0 : opts.basePath)
        ? path.resolve(process.cwd(), opts.basePath)
        : process.cwd();
    const filepath = (opts === null || opts === void 0 ? void 0 : opts.filepath) && path.resolve(basePath, opts.filepath);
    const paramsVal = (_a = opts === null || opts === void 0 ? void 0 : opts.paramsVal) !== null && _a !== void 0 ? _a : {};
    return {
        ...opts,
        basePath,
        paramsVal,
        filepath,
    };
}
/**
 * Method to read file from file system directly if str passed to load function was a path url or filepath passed without str. works sync.
 * @param opts - Load options object.
 * @returns Read YAML string.
 */
function rootFileRead(opts) {
    // if no filepath present throw
    if (!opts || !opts.filepath)
        throw new WrapperYAMLException(`You should pass either a string to read or filepath of the YAML file.`);
    // resolve path
    const resPath = resolvePath(opts.filepath, opts.basePath);
    // read file
    return readFile(resPath, opts.basePath);
}
/**
 * Method to read file from file system directly if str passed to load function was a path url or filepath passed without str. works async.
 * @param opts - Load options object.
 * @returns Read YAML string.
 */
async function rootFileReadAsync(opts) {
    // if no filepath present throw
    if (!opts || !opts.filepath)
        throw new WrapperYAMLException(`You should pass either a string to read or filepath of the YAML file.`);
    // resolve path
    const resPath = resolvePath(opts.filepath, opts.basePath);
    // read file
    return await readFileAsync(resPath, opts.basePath);
}
/**
 * Function to handle new YAML file that hasn't been loaded before by creating module cache with blueprint for it. it also resolve the blueprint with empty params
 * value and save this load as it's the pure load of the module only. works sync.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returns Object that holds blue print and directive object which has meta data read from directive part of the YAML.
 */
function handleNewModule(str, opts, loadId) {
    // execute string
    const val = executeStr(str, opts, loadId);
    const blueprint = val.blueprint;
    const dirObj = val.dirObj;
    // resolve with undefined params and add load to the cache if filepath is supplied
    if (opts.filepath) {
        const load = resolveHandler.resolve(opts.filepath, blueprint, dirObj, {}, loadId, opts);
        addLoadCache(opts.filepath, opts.paramsVal, load);
    }
    // return blueprint and directives object
    return { blueprint, dirObj };
}
/**
 * Function to handle new YAML file that hasn't been loaded before by creating module cache with blueprint for it. it also resolve the blueprint with empty params
 * value and save this load as it's the pure load of the module only. works async.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returns Object that holds blue print and directive object which has meta data read from directive part of the YAML.
 */
async function handleNewModuleAsync(str, opts, loadId) {
    // execute string
    const val = await executeStrAsync(str, opts, loadId);
    const blueprint = val.blueprint;
    const dirObj = val.dirObj;
    // resolve with undefined params
    const load = await resolveHandler.resolveAsync(opts.filepath, blueprint, dirObj, {}, loadId, opts);
    // add load to the cache if filepath is supplied
    if (opts.filepath)
        addLoadCache(opts.filepath, opts.paramsVal, load);
    // return blueprint and directives object
    return { blueprint, dirObj };
}
/**
 * Method to start handling the str by converting it to js-yaml compatible string and converting wrapper classes into js-yaml classes. it also convert the raw load
 * from js-yaml to a blueprint that is used to resolve the load. works sync.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returns Object that holds blue print and directive object which has meta data read from directive part of the YAML.
 */
function executeStr(str, opts, loadId) {
    // read directives
    const dirObj = directivesHandler.handle(str);
    // overwrite filename if defined in directives
    if (dirObj.filename)
        opts.filename = dirObj.filename;
    // load all imports with there default params
    for (const imp of dirObj.importsMap.values()) {
        const paramsVal = imp.paramsVal;
        const path = imp.path;
        internalLoad(path, { ...opts, paramsVal }, loadId);
    }
    // handle tags by fetching them then converting them to wrapper types
    const tags = tagsHandler.captureTags(str);
    const types = tagsHandler.convertTagsToTypes(tags, dirObj.tagsMap, opts.schema);
    // bridge from wrapper types to js-yaml types
    const JTypes = bridgeHandler.typesBridge(types);
    const JSchema = bridgeHandler.schemaBridge(opts.schema, JTypes);
    // load using js-yaml
    const rawLoad = JSchema
        ? jsYaml.load(str, { ...opts, schema: JSchema })
        : jsYaml.load(str, { ...opts });
    // create blueprint
    const blueprint = resolveHandler.createBlueprint(rawLoad);
    // add blueprint along with other module's data to the cache
    if (opts.filepath)
        addModuleCache(loadId, str, opts.filepath, blueprint, dirObj);
    // return blueprint
    return { blueprint, dirObj };
}
/**
 * Method to start handling the str by converting it to js-yaml compatible string and converting wrapper classes into js-yaml classes. it also convert the raw load
 * from js-yaml to a blueprint that is used to resolve the load. works async.
 * @param str - YAML string or url path for YAML file.
 * @param opts - Options object passed to load function.
 * @param loadId - Load id of the load function or live loader that called it.
 * @returns Object that holds blue print and directive object which has meta data read from directive part of the YAML.
 */
async function executeStrAsync(str, opts, loadId) {
    // read directives
    const dirObj = directivesHandler.handle(str);
    // overwrite filename if defined in directives
    if (dirObj.filename)
        opts.filename = dirObj.filename;
    // load all imports with there default params
    for (const imp of dirObj.importsMap.values()) {
        const paramsVal = imp.paramsVal;
        const path = imp.path;
        await internalLoadAsync(path, { ...opts, paramsVal }, loadId);
    }
    // handle tags by fetching them then converting them to wrapper types
    const tags = tagsHandler.captureTags(str);
    const types = tagsHandler.convertTagsToTypes(tags, dirObj.tagsMap, opts.schema);
    // bridge from wrapper types to js-yaml types
    const JTypes = bridgeHandler.typesBridge(types);
    const JSchema = bridgeHandler.schemaBridge(opts.schema, JTypes);
    // load using js-yaml
    const rawLoad = JSchema
        ? jsYaml.load(str, { ...opts, schema: JSchema })
        : jsYaml.load(str, { ...opts });
    // create blueprint
    const blueprint = resolveHandler.createBlueprint(rawLoad);
    // add blueprint along with other module's data to the cache
    if (opts.filepath)
        addModuleCache(loadId, str, opts.filepath, blueprint, dirObj);
    // return blueprint
    return { blueprint, dirObj };
}

var _FileSystem_files, _FileSystem_watchers;
/**
 * Class to handle file system interactions in live loader.
 */
class FileSystem {
    constructor() {
        /** Array that holds paths of YAML files being handled */
        _FileSystem_files.set(this, []);
        /** Map that links each YAML file path with watcher that updates it. */
        _FileSystem_watchers.set(this, new Map());
    }
    /**
     * Method to check if YAML file is being watched.
     * @param path - Path of the YAML file.
     * @returns Boolean to indicate if YAML file is being watched.
     */
    hasFile(path) {
        return __classPrivateFieldGet(this, _FileSystem_files, "f").includes(path);
    }
    /**
     * Method to set watcher for YAML file changes.
     * @param path - Path of the YAML file.
     * @param callback - Callback that will be executed every time file is changed.
     */
    addFile(path, callback) {
        // if already watched return
        if (__classPrivateFieldGet(this, _FileSystem_files, "f").includes(path))
            return;
        // create and add watcher to watcher's array
        const watcher = fs.watch(path, callback);
        __classPrivateFieldGet(this, _FileSystem_watchers, "f").set(path, watcher);
        // add file to files array
        __classPrivateFieldGet(this, _FileSystem_files, "f").push(path);
    }
    /**
     * Method to delete watcher of YAML file changes.
     * @param path - Path of the YAML file.
     */
    deleteFile(path) {
        // delete file from file's array
        const idx = __classPrivateFieldGet(this, _FileSystem_files, "f").indexOf(path);
        if (idx !== -1)
            __classPrivateFieldGet(this, _FileSystem_files, "f").splice(idx, 1);
        // get watcher and delete it
        const watcher = __classPrivateFieldGet(this, _FileSystem_watchers, "f").get(path);
        if (!watcher)
            return;
        watcher.removeAllListeners();
        watcher.close();
        __classPrivateFieldGet(this, _FileSystem_watchers, "f").delete(path);
    }
    /** Files being watched. */
    get files() {
        return __classPrivateFieldGet(this, _FileSystem_files, "f");
    }
    /** Method to destroy class. */
    destroy() {
        __classPrivateFieldSet(this, _FileSystem_files, null, "f");
        for (const w of __classPrivateFieldGet(this, _FileSystem_watchers, "f").values()) {
            w.removeAllListeners();
            w.close();
        }
        __classPrivateFieldSet(this, _FileSystem_watchers, null, "f");
    }
}
_FileSystem_files = new WeakMap(), _FileSystem_watchers = new WeakMap();

var _Debouncer_instances, _Debouncer_isExecuting, _Debouncer_timeInterval, _Debouncer_nextFunc, _Debouncer_promises, _Debouncer_execute;
/**
 * Class that is used to debounce file reads in live loader.
 */
class Debouncer {
    /**
     * @param timeInterval - Time interval that will be used to debounce.
     */
    constructor(timeInterval = 200) {
        _Debouncer_instances.add(this);
        /** Boolean that indicate if debounce is currently looping and executing functions. */
        _Debouncer_isExecuting.set(this, false);
        /** Time interval that will be used to debounce. */
        _Debouncer_timeInterval.set(this, 200);
        /** Next function to execute. */
        _Debouncer_nextFunc.set(this, void 0);
        /** Array that hold resolvers of the promises awaiting. */
        _Debouncer_promises.set(this, []);
        __classPrivateFieldSet(this, _Debouncer_timeInterval, timeInterval, "f");
    }
    /**
     * Method to reset time interval.
     * @param ms - New time interval in seconds.
     */
    setInterval(ms) {
        __classPrivateFieldSet(this, _Debouncer_timeInterval, ms, "f");
    }
    /**
     * Method to queue and debounce a function.
     * @param func - Function that will be debounced.
     * @returns Value of debounced function.
     */
    async debounce(func) {
        if (typeof func !== "function") {
            return Promise.reject(new TypeError("debounce expects a function"));
        }
        // reset function
        __classPrivateFieldSet(this, _Debouncer_nextFunc, func, "f");
        // create promise and add it's resolvers to promises array
        const promise = new Promise((res, rej) => {
            __classPrivateFieldGet(this, _Debouncer_promises, "f").push({ res, rej });
        });
        // start execution
        __classPrivateFieldGet(this, _Debouncer_instances, "m", _Debouncer_execute).call(this);
        // await promise
        return await promise;
    }
    /** Method to destroy class. */
    destroy() {
        for (const { rej } of __classPrivateFieldGet(this, _Debouncer_promises, "f").values()) {
            rej(`Class is destroyed`);
        }
        __classPrivateFieldSet(this, _Debouncer_promises, null, "f");
        __classPrivateFieldSet(this, _Debouncer_nextFunc, null, "f");
    }
}
_Debouncer_isExecuting = new WeakMap(), _Debouncer_timeInterval = new WeakMap(), _Debouncer_nextFunc = new WeakMap(), _Debouncer_promises = new WeakMap(), _Debouncer_instances = new WeakSet(), _Debouncer_execute = 
/**
 * Main method for execution. it go into a loop that take nextFunction and execute it, while also resolving promises awaiting for next execution.
 */
async function _Debouncer_execute() {
    // if executing return, if not start execution
    if (__classPrivateFieldGet(this, _Debouncer_isExecuting, "f"))
        return;
    __classPrivateFieldSet(this, _Debouncer_isExecuting, true, "f");
    while (__classPrivateFieldGet(this, _Debouncer_promises, "f").length > 0) {
        // get next function
        const func = __classPrivateFieldGet(this, _Debouncer_nextFunc, "f");
        // get promises until now and reset array
        const promises = __classPrivateFieldGet(this, _Debouncer_promises, "f").slice();
        __classPrivateFieldSet(this, _Debouncer_promises, [], "f");
        if (typeof func !== "function") {
            const err = new TypeError("No function to execute");
            for (const p of promises)
                p.rej(err);
            continue;
        }
        // execute function and resolve or reject
        try {
            const val = await func();
            for (const p of promises)
                p.res(val);
        }
        catch (err) {
            for (const p of promises)
                p.rej(err);
        }
        // wait debounce interval before processing next queued call
        if (__classPrivateFieldGet(this, _Debouncer_promises, "f").length > 0) {
            await new Promise((r) => setTimeout(r, __classPrivateFieldGet(this, _Debouncer_timeInterval, "f")));
        }
    }
    // set executing to false
    __classPrivateFieldSet(this, _Debouncer_isExecuting, false, "f");
    // if new promises appeared during debounce interval re execute
    if (__classPrivateFieldGet(this, _Debouncer_promises, "f").length > 0)
        __classPrivateFieldGet(this, _Debouncer_instances, "m", _Debouncer_execute).call(this);
};

var _LiveLoader_instances, _LiveLoader_fileSystem, _LiveLoader_debouncer, _LiveLoader_liveLoaderOpts, _LiveLoader_liveLoaderId, _LiveLoader_watchCallbackFactory;
/**
 * Class that handles loading multiple YAML files at the same time while watching loaded files and update there loads as files change.
 */
class LiveLoader {
    /**
     * @param opts - Options object passed to control live loader behavior.
     */
    constructor(opts) {
        _LiveLoader_instances.add(this);
        /** Class to handle file system interactions in live loader. */
        _LiveLoader_fileSystem.set(this, new FileSystem());
        /** Class to debounce updates of live loader. */
        _LiveLoader_debouncer.set(this, new Debouncer(200));
        /** Options of the live loading. */
        _LiveLoader_liveLoaderOpts.set(this, { basePath: process.cwd() });
        /** Random id generated for live loader and used as loadId in load function. */
        _LiveLoader_liveLoaderId.set(this, generateId());
        if (opts)
            this.setOptions(opts);
    }
    /**
     * Method to set options of the class.
     * @param opts - Options object passed to control live loader behavior.
     */
    setOptions(opts) {
        __classPrivateFieldSet(this, _LiveLoader_liveLoaderOpts, { ...__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f"), ...opts }, "f");
        if (!__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath)
            __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath = process.cwd();
    }
    /**
     * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that
     * imported YAML files in the read YAML string are watched as well. works sync so all file watch, reads are sync and tags executions are handled
     * as sync functions and will not be awaited.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @param paramsVal - Object of module params aliases and there values to be used in this load. so it's almost always better to use addModuleAsync instead.
     * @returns Value of loaded YAML file.
     */
    addModule(path, paramsVal) {
        var _a;
        // get resolved path
        const resPath = resolvePath(path, __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath);
        // read str
        const str = readFile(resPath, __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath);
        try {
            // load str
            const load = internalLoad(str, { ...__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f"), paramsVal, filepath: resPath }, __classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
            // check cache using loadId to get paths utilized by the live loader
            const paths = loadIdsToModules.get(__classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
            // if no paths return load directly
            if (!paths)
                return load;
            // if paths watch all of them then return load
            for (const p of paths) {
                if (__classPrivateFieldGet(this, _LiveLoader_fileSystem, "f").hasFile(p))
                    continue;
                const callback = __classPrivateFieldGet(this, _LiveLoader_instances, "m", _LiveLoader_watchCallbackFactory).call(this, p, false);
                __classPrivateFieldGet(this, _LiveLoader_fileSystem, "f").addFile(p, callback);
            }
            return load;
        }
        catch (err) {
            if (__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").resetOnError)
                resetModuleCache(resPath);
            if (__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").warnOnError)
                (_a = __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").onWarning) === null || _a === void 0 ? void 0 : _a.call(null, err);
        }
    }
    /**
     * Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that imported
     * YAML files in the read YAML string are watched as well. works async so all file watch, reads are async and tags executions will be awaited.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @param paramsVal - Object of module params aliases and there values to be used in this load.
     * @returns Value of loaded YAML file.
     */
    async addModuleAsync(path, paramsVal) {
        var _a;
        // get resolved path
        const resPath = resolvePath(path, __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath);
        // read str
        const str = await readFileAsync(resPath, __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath);
        try {
            // load str
            const load = await internalLoadAsync(str, { ...__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f"), paramsVal, filepath: resPath }, __classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
            // check cache using loadId to get paths utilized by the live loader
            const paths = loadIdsToModules.get(__classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
            // if no paths return load directly
            if (!paths)
                return load;
            // if paths watch all of them then return load
            for (const p of paths) {
                if (__classPrivateFieldGet(this, _LiveLoader_fileSystem, "f").hasFile(p))
                    continue;
                const callback = __classPrivateFieldGet(this, _LiveLoader_instances, "m", _LiveLoader_watchCallbackFactory).call(this, p, true);
                __classPrivateFieldGet(this, _LiveLoader_fileSystem, "f").addFile(p, callback);
            }
            return load;
        }
        catch (err) {
            if (__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").resetOnError)
                resetModuleCache(resPath);
            if (__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").warnOnError)
                (_a = __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").onWarning) === null || _a === void 0 ? void 0 : _a.call(null, err);
        }
    }
    /**
     * Method to get cached value of loaded module or file. note that value retuned is module's resolve when paramsVal is undefined (default params value are used).
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @returns Cached value of YAML file with default modules params or undefined if file is not loaded.
     */
    getModule(path) {
        var _a;
        // get resolved path
        const resPath = resolvePath(path, __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath);
        return (_a = getLoadCache(resPath, undefined)) === null || _a === void 0 ? void 0 : _a.load;
    }
    /**
     * Method to get cached value of all loaded modules or files. note that values retuned are module's resolve when paramsVal is undefined (default params value are used).
     * @returns Object with keys resolved paths of loaded YAML files and values cached values of YAML files with default modules params.
     */
    getAllModules() {
        // check cache using loadId to get paths utilized by the live loader
        const paths = loadIdsToModules.get(__classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
        if (!paths)
            return {};
        let modules = {};
        for (const p of paths)
            modules[p] = this.getModule(p);
        return modules;
    }
    /**
     * Method to get all cached data about specific module. note that they are passed by reference and should never be mutated.
     * @param path - Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
     * @returns Module load cache object.
     */
    getCache(path) {
        // get resolved path
        const resPath = resolvePath(path, __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath);
        return getModuleCache(resPath);
    }
    /**
     * Method to get all cached data of all loaded module. note that they are passed by reference and should never be mutated.
     * @returns Object with keys resolved paths of loaded YAML files and values Module cache objects for these module.
     */
    getAllCache() {
        // check cache using loadId to get paths utilized by the live loader
        const paths = loadIdsToModules.get(__classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
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
        const resPath = resolvePath(path, __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").basePath);
        // delete module's cache
        deleteModuleCache(__classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"), resPath);
        // delete watcher
        __classPrivateFieldGet(this, _LiveLoader_fileSystem, "f").deleteFile(resPath);
        // delete circular dep
        circularDepClass.deleteDep(resPath, __classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
    }
    /**
     * Method to clear cache of live loader by deleting all modules or files from live loader.
     */
    deleteAllModules() {
        // check cache using loadId to get paths utilized by the live loader
        const paths = loadIdsToModules.get(__classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
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
        deleteLoadIdFromCache(__classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
        // delete circular dependencies
        circularDepClass.deleteLoadId(__classPrivateFieldGet(this, _LiveLoader_liveLoaderId, "f"));
        // destroy helper classes
        __classPrivateFieldGet(this, _LiveLoader_debouncer, "f").destroy();
        __classPrivateFieldGet(this, _LiveLoader_fileSystem, "f").destroy();
        // null helper classes
        __classPrivateFieldSet(this, _LiveLoader_debouncer, null, "f");
        __classPrivateFieldSet(this, _LiveLoader_fileSystem, null, "f");
    }
}
_LiveLoader_fileSystem = new WeakMap(), _LiveLoader_debouncer = new WeakMap(), _LiveLoader_liveLoaderOpts = new WeakMap(), _LiveLoader_liveLoaderId = new WeakMap(), _LiveLoader_instances = new WeakSet(), _LiveLoader_watchCallbackFactory = function _LiveLoader_watchCallbackFactory(path, isAsync) {
    return (e) => {
        var _a, _b, _c;
        try {
            __classPrivateFieldGet(this, _LiveLoader_debouncer, "f").debounce(async () => {
                var _a, _b, _c, _d;
                // if file is change reset it's cache then re-load it
                if (e === "change") {
                    // reset module cache so it will be re-evaluated
                    resetModuleCache(path);
                    // re-load
                    const newLoad = isAsync
                        ? await this.addModuleAsync(path)
                        : this.addModule(path);
                    // execute onUpdate
                    (_b = (_a = __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f")).onUpdate) === null || _b === void 0 ? void 0 : _b.call(_a, e, path, newLoad);
                }
                // if file is renamed delete it's cache as all future loads will use the new name
                if (e === "rename") {
                    // delete path
                    this.deleteModule(path);
                    // execute onUpdate
                    (_d = (_c = __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f")).onUpdate) === null || _d === void 0 ? void 0 : _d.call(_c, e, path, null);
                }
            });
        }
        catch (err) {
            if (__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").resetOnError)
                resetModuleCache(path);
            if (__classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").warnOnError)
                (_a = __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f").onWarning) === null || _a === void 0 ? void 0 : _a.call(null, err);
            (_c = (_b = __classPrivateFieldGet(this, _LiveLoader_liveLoaderOpts, "f")).onUpdate) === null || _c === void 0 ? void 0 : _c.call(_b, e, path, this.getModule(path));
        }
    };
};

/**
 * Function to dump js value into YAML string.
 * @param obj - Js object that will be converted to YAML string
 * @param opts - Options object passed to control dump behavior.
 * @returns YAML string of dumped js value.
 */
function dump(obj, opts) {
    // if schema is supplied bridge to js-yaml schema
    if ((opts === null || opts === void 0 ? void 0 : opts.schema) instanceof Schema) {
        const types = bridgeHandler.typesBridge(opts.schema.types);
        opts.schema = bridgeHandler.schemaBridge(opts.schema, types);
    }
    // dump and return
    return jsYaml.dump(obj, opts);
}

/**
 * Function to resolve tags and wrapper expressions (imports, params, locals and privates) to generate one resolved YAML string. short hand for calling load()
 * then dump(). useful to convert YAML modules into one YAML string that will be passed for configiration. works sync.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control resolve behavior.
 */
function resolve(str, opts) {
    // read file
    const loaded = load(str, opts);
    // dump file
    const dumped = dump(loaded);
    // if output path is supplied write file
    if (opts === null || opts === void 0 ? void 0 : opts.outputPath) {
        // resolve target path
        const resPath = handleTargetPath(opts.outputPath, opts.basePath);
        // make sure supplied path is yaml file
        const isYaml = isYamlFile(resPath);
        if (!isYaml)
            throw new WrapperYAMLException(`Target path supplied to resolve function is not YALM file.`);
        fs.writeFileSync(resPath, dumped, { encoding: "utf8" });
    }
    // return dumped value
    return dumped;
}
/**
 * Function to resolve tags and wrapper expressions (imports, params, locals and privates) to generate one resolved YAML string. short hand for calling load()
 * then dump(). useful to convert YAML modules into one YAML string that will be passed for configiration. works async.
 * @param str - YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved
 * using `opts.basePath` and it will overwite `opts.filepath` value.
 * @param opts - Options object passed to control resolve behavior.
 */
async function resolveAsync(str, opts) {
    // read file
    const loaded = await loadAsync(str, opts);
    // dump file
    const dumped = dump(loaded, opts);
    // if output path is supplied write file
    if (opts === null || opts === void 0 ? void 0 : opts.outputPath) {
        // resolve target path
        const resPath = handleTargetPath(opts.outputPath, opts.basePath);
        // make sure supplied path is yaml file
        const isYaml = isYamlFile(resPath);
        if (!isYaml)
            throw new WrapperYAMLException(`Target path supplied to resolve function is not YALM file.`);
        promises.writeFile(resPath, dumped, { encoding: "utf8" });
    }
    // return dumped value
    return dumped;
}
/**
 * Function to add base path to target path if supplied.
 * @param targetPath - Path of resolved file.
 * @param basePath - Base path supplied in options.
 * @returns Resolved path.
 */
function handleTargetPath(targetPath, basePath) {
    if (basePath)
        return path.resolve(basePath, targetPath);
    else
        return targetPath;
}

Object.defineProperty(exports, "YAMLException", {
    enumerable: true,
    get: function () { return jsYaml.YAMLException; }
});
exports.CORE_SCHEMA = CORE_SCHEMA;
exports.DEFAULT_SCHEMA = DEFAULT_SCHEMA;
exports.FAILSAFE_SCHEMA = FAILSAFE_SCHEMA;
exports.JSON_SCHEMA = JSON_SCHEMA;
exports.LiveLoader = LiveLoader;
exports.Schema = Schema;
exports.Type = Type;
exports.WrapperYAMLException = WrapperYAMLException;
exports.dump = dump;
exports.load = load;
exports.loadAsync = loadAsync;
exports.resolve = resolve;
exports.resolveAsync = resolveAsync;
//# sourceMappingURL=index.js.map
