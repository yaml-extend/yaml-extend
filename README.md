# yaml-extend

**`yaml-extend`** — a wrapper around [`js-yaml`] that adds focused, deterministic templating features to YAML: imports, per-module params, locals, private fields, typed expressions and small tag payloads — with caching and a file-watching `LiveLoader`.

---

## Table of contents

- [Why yaml-extend](#why-yaml-extend)
- [Install](#install)
- [Quickstart](#quickstart)
- [Extended YAML features overview](#extended-yaml-features-overview)
- [Directives](#directives)
- [Expressions](#expressions)
- [Escape delimiters in Directives and Expressions](#escape-delimiters-in-directives-and-expressions)
- [Tags](#tags)
- [Evaluation order & semantics](#evaluation-order--semantics)
- [Imports, Security & sandboxing](#imports-security--sandboxing)
- [Architecture and Design](#architecture-and-design)
- [API reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Why yaml-extend

`yaml-extend` gives you the small, practical features that can greatly extend YAML language while keeping it's simplicity and favourable syntax. you can:

- Import other YAML files with module level parameter declirations.
- Declare intra-module locals.
- Mark evaluation-only nodes that are removed from output.
- Reference nodes directly without need to declare anchors and aliases, reference also allows defining locals value.
- Small tag payloads (single-scalar payloads for tags like `!switch(...)`)
- Built-in caching and a `LiveLoader` for watch+reload workflows

All of this with Deterministic left-to-right evaluation and immediate circular-import detection of course.

`Design goal`: keep YAML familiar and simple while enabling safe, deterministic configuration templating.

This library is intended only for complex development workflows. For simple cases or performance-sensitive parsing, we recommend using `js-yaml`. If you need to extend YAML, build them with `yaml-extend`, call `resolve` or `resolveAsync` once, and then perform all subsequent parsing with `js-yaml`.

---

## Install

```bash
# npm
npm install yaml-extend

# yarn
yarn add yaml-extend
```

## Quickstart

Being a wrapper around `js-yaml` library the api is almost identical, all you need to use the wrapper is to change the imports from `js-yaml` to `yaml-extend`

```js
- import { load } from "js-yaml";
+ import { load } from "yaml-extend";

const str = "node: value";
const loaded = load(str);
```

Wrapper accept file system paths for yaml files directly in the place of YAML string, it only accept files that end with .yml or .yaml

```js
import { load } from "yaml-extend";

const loaded = load("./path/file.yaml");
```

Also make in mind that in order for some features like import to work you need to add some extra configurations. so don't forget to check API reference.

## Extended YAML features overview

I like YAML: it's simple and very readable compared with other serialization formats. That’s why I used it to write the schema for a backend API I was building.

But as the schema grew, YAML’s simplicity revealed some limitations: `no native imports, no parameterization, and limited reuse without anchors/aliases`. People sometimes bend YAML tags to compensate, but tags are meant for type transformation; using them for imports introduces complexity and inconsistent behavior across tools.

When designing `yaml-extend` my primary goal was: `keep the document node tree clean and close to normal YAML`, while adding a small set of features that make large schemas maintainable and developer-friendly. To do this to main concepts are used:

`Directives` — top-of-file declarations (separated from the node tree)

`Expressions` — compact inline references inside the node tree

### Key Ideas

`Directives` live at the top of the file. They declare imports, module parameters, or locals.

`Node tree (the document) stays clean`: you use short inline expressions to reference directive data.

`Expressions` are compact scalars like $import.alias.path.to.node that resolve to the value.

### Example: the problem (tag-based import)

To give you an example of usage let's imagine we have endpoints file where we defines all endpoints for our APIs.

**`endpoints.yaml`**

```yaml
user:
  signIn: "/api/user/signIn"
  singUp: "api/user/singUp"
```

Here’s a typical approach using a custom tag for a single import. This is verbose when you need many imports:

#### Tag approach

**`userApis.yaml`**

```yaml
singUp:
  endpoint: !import
    path: `./path/endpoints.yaml`
    node: user.signUp
  auth: "JWT"
  headers: headers
  body: body
```

To import a single value you must create a mapping with a tag — and if you import a lot, the file becomes noisy.

#### Yaml-extend approach — directives + expressions

Define all imports at the top, then reference them compactly in the node tree.

**`userApis.yaml`**

```yaml
%IMPORT endpoints ./path/endpoints.yaml
---
signUp:
  endpoint: $import.endpoints.user.signUp
  auth: "JWT"
  headers: headers
  body: body
```

- The %IMPORT directive declares: alias endpoints → ./path/endpoints.yaml. it can also declare module params but to keep things simple for now we just defined alias and path.
- --- separates directives from the document.
- Inside the document, $import.endpoints.user.signUp is a compact expression that resolves to the imported value /api/user/signUp.

This style keeps the YAML node tree minimal and easy to scan — you can see at a glance which values are imported (they start with $import) and where they came from (alias endpoints).

## Directives

`yaml-extend` currently supports the following directive declarations: `FILENAME`, `PARAM`, `LOCAL`, `IMPORT` and `PRIVATE`. These are defined at the top of the YAML file, before the `---` document separator (the same YAML directive block used for version and tag aliases). Directives can be extended in the future only if needed.

### Summary of directives

`FILENAME` — Define logical name for the file to be used in YAMLException and WrapperYAMLException.

`PARAM` — Define module-level parameters (scalars only) with defaults that can be overridden when importing or loading the module.

`LOCAL` — Define file-local variables (scalars only) used within the same YAML document; useful for inline templates.

`IMPORT` — Import another YAML file and provide default module parameters for that import.

`PRIVATE` — Marks a node in the current YAML as internal; it will be removed from the final output.

### FILENAME

#### Structure

General structure is: `%FILENAME <filename>`

`filename` — Logical name for the file to be used in YAMLException and WrapperYAMLException. overwrites filename of options. wrap the filename inside [escape-character]

#### Example

**`api.yaml`**

```yaml
%FILENAME apis
```

### PARAM

#### Structure

General structure is: `%PARAM <alias> [<default-value>]?`

- `alias` — A unique name used to reference this parameter (e.g. endpoint). If an alias is reused, the last declaration wins.
- `default-value` — The default scalar value used when the parameter is not supplied by the importer. If omitted, the default is `null`.

`Note`: PARAM values are intentionally limited to scalars (strings, numbers, booleans, null). Mapping or sequence values are not allowed because they greatly increase complexity and defeat the core simplicity of YAML.

#### Purpose

`PARAM` lets you create reusable modules that accept simple scalar configuration values from outside the file. This reduces repetition for common structures.

#### Example: module template

See the below YAML example:

**`apis.yaml`**

```yaml
createUser:
  endpoint: "/api/users/create"
  method: POST
  auth: "JWT"
  headers:
    Content-Type: "application/json"
  rateLimit: 100

updateUser:
  endpoint: "/api/users/update"
  method: PUT
  auth: "JWT"
  headers:
    Content-Type: "application/json"
  rateLimit: 100

getUser:
  endpoint: "/api/users/get"
  method: GET
  auth: "JWT"
  headers:
    Content-Type: "application/json"
  rateLimit: 200
```

Notice how method, auth, headers, and much of the structure repeat. If you had dozens of endpoints you’d repeat this pattern a lot. One solution for this is putting the reusable structure in a separate module file and refer to params inside it.

**`api-template.yaml`**

```yaml
%PARAM endpoint ./def/endpoint
%PARAM method GET
%PARAM auth JWT
%PARAM rateLimit 100
---
module:
  endpoint: $param.endpoint
  method: $param.method
  auth: $param.auth
  headers:
    Content-Type: "application/json"
  rateLimit: $param.rateLimit
```

**`apis.yaml`**

```yaml
%IMPORT apiTemplate ./path/api-template.yaml
---
createUser:
  {
    $import.apiTemplate.module endpoint=/api/users/create method=POST auth=JWT rateLimit=100,
  }

updateUser:
  {
    $import.apiTemplate.module endpoint=/api/users/update method=PUT auth=JWT rateLimit=100,
  }

getUser:
  {
    $import.apiTemplate.module endpoint=/api/users/get method=GET auth=JWT rateLimit=200,
  }
```

`Note: `One of the downsides is that only scalar values are allowed. so if we added a mapping value in our Apis, for example bodySchema. the structure will look like this as we can't define it's value through module params:

**`apis.yaml`**

```yaml
%IMPORT apiTemplate ./path/api-template.yaml
---
createUser:
  <<:
    {
      $import.apiTemplate.module endpoint=/api/users/create method=POST auth=JWT rateLimit=100,
    }
  bodySchema: {} #mock for mapping

updateUser:
  <<:
    {
      $import.apiTemplate.module endpoint=/api/users/update method=PUT auth=JWT rateLimit=100,
    }
  bodySchema: {} #mock for mapping

getUser:
  <<:
    {
      $import.apiTemplate.module endpoint=/api/users/get method=GET auth=JWT rateLimit=200,
    }
  bodySchema: {} #mock for mapping
```

#### Tag example using PARAM

`%PARAM` is great for environment switches, short configuration values, or tokens used by custom tags. In this example tag `!switch` with kind mapping. it checks value of PARAM inside Tag's argument and return matching key of the mapping.

**`types/swtich.js`**

```js
import { Type } from "yaml-extend";

/** Simple switch type. */
const switchType = new Type("!switch", {
  kind: "mapping",
  resolve: (data) => data && typeof data === "objec" && !Array.isArray(data),
  construct: (data, type, arg) => {
    if (!arg) return null;
    return data[arg] ?? null;
  },
});
```

**`endpoints.yaml`**

```yaml
%PARAM env dev
---
endpoint: !switch($param.env)
  dev: ./path/dev
  prod: ./path/pro
```

And you can import it and choose which env to pass:

**`api.yaml`**

```yaml
%IMPORT endpoint ./path/endpoints.yaml
---
devApi:
  endpoint: $import.endpoint env=dev

prodApi:
  endpoint: $import.endpoint env=prod
```

### LOCAL

#### Structure

General structure is: `%LOCAL <alias> [<default-value>]?`

- `alias` — A unique name used to reference the local value within the same YAML document. If an alias is reused, the last declaration wins.
- `default-value` — Default scalar used when a $this reference does not override it. If omitted, the default is null.

`Note`: LOCAL values are intentionally limited to scalars (strings, numbers, booleans, null). Mapping or sequence values are not allowed because they greatly increase complexity and defeat the core simplicity of YAML.

#### Purpose

LOCAL lets you create reusable, file-scoped values and templates inside the same YAML file. Use it when you want everything in one file rather than splitting templates into separate modules.

#### Example: inline template with LOCAL

Same as earlier, but now all the data lives in the same YAML file.

**`apis.yaml`**

```yaml
%LOCAL endpoint ./def/endpoint
%LOCAL method GET
%LOCAL auth JWT
%LOCAL rateLimit 100
%PRIVATE template
---
template:
  endpoint: $local.endpoint
  method: $local.method
  auth: $local.auth
  headers:
    Content-Type: "application/json"
  rateLimit: $local.rateLimit

createUser:
  {
    $this.template.module endpoint=/api/users/create method=POST auth=JWT rateLimit=100,
  }

updateUser:
  {
    $this.template.module endpoint=/api/users/update method=PUT auth=JWT rateLimit=100,
  }

getUser:
  {
    $this.template.module endpoint=/api/users/get method=GET auth=JWT rateLimit=200,
  }
```

### When to prefer LOCAL vs PARAM

- Use `PARAM` when creating separate module files meant to be imported and reused across documents.
- Use `LOCAL` when the template or helper should remain inside the same YAML file.

### IMPORT

#### Structure

General structure is: `%IMPORT <alias> <path> [<key>=<value> ...]?`

- `alias` — A unique name used to reference the imported file (e.g. apiTemplate). If an alias is reused, the last declaration wins.
- `path` — Filesystem path (or module path) to the YAML file being imported.
- `key=value` — Optional default module parameter assignments used for this import. These can be overridden inline when referencing the imported module.

#### Purpose

`IMPORT` loads another YAML file into the current document under an alias. You can define default PARAMs for that import in the directive itself, and you can override or provide values when you reference nodes from the import.

#### Accessing imported data

- Use `$import.<alias>[.<dot-path>]?` to reference nodes inside the imported file.
- When the imported file defines PARAMs, you can supply param values inline while referencing, for example:

```yaml
node: $import.apiTemplate.module endpoint=/api/users/create method=POST
```

- Any defaults provided in the %IMPORT directive are used unless overridden inline.

#### Example

Same as earlier.

**`api-template.yaml`**

```yaml
%PARAM endpoint ./def/endpoint
%PARAM method GET
%PARAM auth JWT
%PARAM rateLimit 100
---
module:
  endpoint: $param.endpoint
  method: $param.method
  auth: $param.auth
  headers:
    Content-Type: "application/json"
  rateLimit: $param.rateLimit
```

Import with defaults:

**`apis.yaml`**

```yaml
%IMPORT apiTemplate ./path/api-template.yaml method=POST rateLimit=50
---
# uses the import defaults unless overridden inline
createUser: { $import.apiTemplate.module }
```

Inline override:

**`apis.yaml`**

```yaml
%IMPORT apiTemplate ./path/api-template.yaml method=POST rateLimit=50
---
# uses the import defaults unless overridden inline
createUser:
  {
    $import.apiTemplate.module endpoint=/api/users/get method=GET rateLimit=200,
  }
```

### PRIVATE

#### Structure

General structure is: `%PRIVATE [<dot-path> ...]?`

- `dot-path` — Path to a node in the current YAML document that should be treated as internal. nodes in the path are separated by dots (`.`) .

#### Purpose

PRIVATE marks nodes (typically templates or helper objects) that are used during document processing but should be removed from the final output. This is useful for keeping templates, examples, or internal data inside your YAML code while preventing them from appearing in the exported/consumed YAML.

#### Rules & behavior

- The PRIVATE directive signals the processor to strip the named node from the final output after all references are resolved.

- PRIVATE nodes can reference and use $local and $param values.

- If you need multiple private nodes, you can either declare each with its own %PRIVATE directive or pass them all to one directive separated by spaces.

#### Example

**`example.yaml`**

```yaml
%PRIVATE auth.JWT # single node path
%PRIVATE auth.DeviceBinding api1 # multiple node paths (auth.deviceBinding and api1)
---
auth:
  - JWT
  - DeviceBinding
  - SessionToken

api1:
  auth: $this.auth.JWT

api2:
  auth: $this.auth.DeviceBinding

api3:
  auth: $this.auth.SessionToken
```

In this example we declared all auth options in our app in single auth sequence then referenced them in our APIs (single source of truth). when YAML file is loaded the references are resolved but auth sequence (which is now not needed) is deleted from final output.

## Expressions

`yaml-extend` recognizes four expression types: `this`, `import`, `param`, and `local`. Expressions are only allowed in `node values` or `tag argument` (not in `node keys`, `directives`, or `nested inside other expressions`). Additional expression types may be added in the future if needed.

### Summary of Expressions

- `this` — Access nodes inside the same YAML document (the current file).

- `import` — Access nodes from an imported YAML document (by alias).

- `param` — Access module parameters defined with %PARAM.

- `local` — Access local values defined with %LOCAL.

### Expression: $this

#### Structure

General structure is: `$this.<dot-path> [<key>=<value> ...]?`

- `dot-path` — Dot-separated path to a node within the current YAML document `(e.g. users.admin.info)`.

- `key=value` — Optional local aliases that temporarily override values (see examples). Multiple pairs are allowed and space-separated.

#### Important notes

- Evaluation is left-to-right; a node must be defined before it is referenced.
- Referencing the entire document (no dot path) can create recursion/infinite-loops — will throw.

#### Example

**`users.yaml`**

```yaml
%LOCAL usaname ziad
---
userdata:
  name: $local.username
  hobby: shared hobby
  work: shared work

user1: { $this.userdata } # -> {name: "ziad", hobby: "shared hobby", work: "shared work"}
user2: { $this.userdata username=jhon } # -> {name: "jhon", hobby: "shared hobby", work: "shared work"}
```

In user2, the username=jhon alias overrides %LOCAL username for that specific expression.

### Expression: $import

#### Structure

General structure is: `$import.<alias>[.<dot-path>]? [<key>=<value> ...]?`

- `alias` — Name assigned to an imported file with the %IMPORT directive.

- `dot-path` — Optional path inside the imported document.

- `key=value` — Optional parameter overrides for that expression (space-separated pairs).

#### Important notes

- Imported documents are fully loaded before they are accessible. Circular imports throw an error.
- If `<dot-path>` is omitted, you reference the imported file's root value.

#### Example

**`userdata.yaml`**

```yaml
%PARAM username ahmed
---
userdata:
  name: $param.username
  hobby: shared hobby
  work: shared work
```

**`users.yaml`**

```yaml
%IMPORT userdata ./path/userdata.yaml username=ziad
---
user1: { $this.userdata } # -> {name: "ziad", hobby: "shared hobby", work: "shared work"}
user2: { $this.userdata username=jhon } # -> {name: "jhon", hobby: "shared hobby", work: "shared work"}
```

The %IMPORT directive loads userdata.yaml with username=ziad as the module param. Individual $import expressions may override that param.

### Expression: $param

#### Structure

General structure is: `$param.<alias>`

- `alias` — Name declared with `%PARAM` at the top of a module.

#### Important notes

Use `$param` to reference module-level parameters (scalars).

#### Example

See [Import example](#example-4)

### Expression: $local

#### Structure

General structure is: `$local.<alias>`

- `alias` — Name declared with `%LOCAL` at the top of the document.

#### Important notes

%LOCAL provides local, document-scoped values (scalars) that expressions can read.

#### Example

See [Import example](#example-3)

### YAML data types and expressions

Because `$this` and `$import` can return any YAML type (scalar, mapping, sequence), `yaml-extend` requires you to explicitly wrap non-scalar results when you want them to be treated as a native mapping or sequence in the final document.

#### Rules

- If an expression should produce a `mapping`, wrap it with `{ }` (flow mapping style).
- If an expression should produce a `sequence`, wrap it with `[ ]` (flow sequence style).
- If you omit wrapping and the expression returns non-scalar data, the value will be converted to a `string` using `JSON.stringify()`.
- If you wrap an expression with `{}` but the result isn't a mapping, an error is thrown. sequence has different behavior that will be explain later.

```yaml
scalarNode: value
mappingNode:
subNode1: value
subNode2: value
sequenceNode:
  - value1
  - value2

# Correct usage:
node1: $this.scalarNode # scalar
node2: { $this.mappingNode } # mapping (explicit)
node3: [$this.sequenceNode] # sequence (explicit)

# Without wrapping, non-scalar values are stringified:
node4: $this.mappingNode # -> '{"subNode1":"value","subNode2":"value"}'

# Wrong wrapping triggers an error:
# node5: { $this.scalarNode } # Error: value is not a mapping

# Wrong wrapping but allowed to cover specific edge cases:
# node6: [ $this.mappingNode ] # Allowed, but semantically misleading; prefer flow list items instead
```

`Convention`: If you want a sequence whose single item is an expression that returns a scalar or mapping, prefer the block/flow list format using - rather than [...] to improve clarity.

```yaml
# Preferred for a single item that is a scalar or mapping:
node:
  - $this.scalarNode
```

### Escaping expressions

To write a scalar that starts with a literal `$`, prefix it with `$$`. Example:

```yaml
node: $$escaped # -> "$escaped"
```

`Quoting a scalar (single or double quotes) does not reliably disable expression processing; use $$ to escape.`

### Scalar interpolation

You can interpolate expressions inside scalar strings using `${...}`.

```yaml
username: ziad
message: Hello ${this.username} # -> "Hello ziad"
```

To escape interpolation, use `double dollar`:

```yaml
message1: "Hello $${escaped text}" # -> "Hello ${escaped text}"
message2: "Hello $${this.username}" # -> "Hello ${this.username}"
```

## Escape delimiters in Directives and Expressions

Some tokens (like file names, aliases, keys, values, or dot-path segments) may contain whitespace or delimiter characters (`=`, `.`). To include such characters you must escape the token using either:

- `Double quotes "..."`

- `Square brackets [ ... ]` (JavaScript-like array style)

`Single quotes '...' are not supported for escaping in directives/expressions.`

### Examples

-`Filename`

```yaml
%FILENAME name with space # invalid — only the first token is used as filename
%FILENAME "name with space" # filename: name with space
%FILENAME [name with space] # filename: name with space
```

- `Key=Value pairs`

```yaml
%IMPORT alias path.yaml key with space=value wi=th space # wrong and ambiguous
%IMPORT alias path.yaml "key with space"="value wi=th space" # correct
%IMPORT alias path.yaml [key with space]=[value wi=th space] # correct
```

- `Dot-path segments`

```yaml
$this.node with space.subNode key=value # wrong and ambiguous
$this."node with space".subNode key=value # correct (double quotes)
$this.[node with space].subNode key=value # correct (square brackets)
```

## Tags

`yaml-extend` supports custom YAML tags; tags are lazily evaluated by the `yaml-extend` wrapper (not by `js-yaml` directly). This allows tag constructors to be asynchronous.

### Async tag constructors

If you want to use async behavior inside a tag's construct, `yaml-extend` will handle it as long as you load with the async API (`loadAsync`, `resolveAsync`, or `LiveLoader.addModuleAsync`).

```js
import { Type } from "yaml-extend";

const asyncType = new Type("!async", {
  kind: "mapping",
  resolve: (data) => data && typeof data === "object" && !Array.isArray(data),
  construct: async (data, type, params) => {
    const value = await someAsyncOperation();
    data.async = value;
    return data;
  },
});
```

`Note`: Tag data and the tag argument are fully resolved before being passed into construct.

### Tags with arguments

Tags may accept `one` optional argument. That argument can be either:

- a scalar value (single token), or
- a single scalar expression (e.g. $param.foo).

Tags cannot accept multiple comma-separated arguments or complex YAML structures inside the parentheses. If your tag needs complex configuration, prefer passing a mapping as the node value and keep the tag argument simple.

#### Syntax

**`example.yaml`**

```yaml
node1: !tag value
node2: !tag(arg) value
```

#### Examples

- Example of using Tags with module params: [example](#tag-example-using-param)

- Example of encoding multiple simple arguments in tag's string. In this example we encoded three numbers using a `_` as delimiter

**`example.js`**

```js
import { Type } from "yaml-extend";

/** Type to create a numeric sequence. */
const rangeType = new Type("!range", {
  kind: "scalar",
  resolve: () => true,
  construct: (data, type, arg) => {
    // if no arg passed throw
    if (!arg) throw new Error("You need to pass arg to !range");

    // split using our "_" delimiter, if parts not three throw
    const parts = arg.split("_");
    if (parts.length !== 3)
      throw new Error(
        "range tag arg should have structure: <start>_<end>_<step> ."
      );

    // convert to numbers and destructure
    const numParts = parts.map(Number);
    const [start, end, step] = numParts;

    // verify that all numbers are finite
    if (!isFinite(start) || !isFinite(end) || !isFinite(step))
      throw new Error("range tag args should all be finite numbers");

    // generate range and return it
    const range: number[] = [];
    for (let i = start; i <= end; i += step) if (i <= end) range.push(i);
    return range;
  },
});
```

**`example.yaml`**

```yaml
node: !range(0_10_2) # -> [0, 2, 4, 6, 8, 10]
```

`Guideline`: Keep tag arguments simple and human-readable. If you need many arguments or complex data, use a mapping node instead.

## Evaluation order & semantics

- `yaml-extend` is built so nodes are resolved from left-to-right, Example order:

```yaml
users1:
  ziad:
    fullname: ziad taha
    hobby: read
  jhon:
    fullname: jhon wick
    hobby: kill

users2:
  ahmed:
    fullname: ahmed ali
    hobby: read
```

here resolve order will be: `users1` -> `ziad` -> `fullname` -> `hobby` -> `jhon` -> `fullname` -> `hobby` -> `users2` -> `ahmed` -> `fullname` -> `hobby`.

- Tag data and tag arguments are resolved before construct is called.

- Left-to-right resolution is intended to make outcomes predictable and to avoid surprising late-binding behaviors.

## Imports, Security & sandboxing

### Basepath

- `What it is` — basePath is the root directory used to resolve imports and to enforce an import sandbox. By default it is `process.cwd()`.
- `How to set it` — Pass basePath in the loader options e.g. load(text, { basePath: "/project/config" }).
- `What it controls`
  - If YAML file path is passed in load function e.g. load("/apis/users.yaml") or load(text, {filepath: "/apis/users.yaml"}) it will be resolved against basePath.
  - When a path starts with the special token `@base`, the remainder is resolved against basePath.
  - The loader prevents imports that would resolve outside the `basePath` tree. Any attempt to import a file whose resolved absolute path is not inside basePath will throw a sandbox error.
- `Why this exists` — basePath provides a safe, predictable root for multi-file projects and prevents accidental or malicious reads from arbitrary locations on disk.

### Path of %IMPORT directive

- All relative import paths are resolved against either:

- the importing file’s directory (normal behavior), or
- when a path starts with the special token `@base`, the remainder is resolved against basePath.

- Only files with extensions `.yaml` or `.yml` may be imported. Attempts to import other extensions are rejected.

## Architecture and Design

yaml-extend processes modules in three main phases:

### 1. Pre-load

- Parse directives (%IMPORT, %PARAM, %LOCAL, etc.) into an internal directives object used later during resolution.

- Begin loading imported modules (synchronous or asynchronous) with default module params defined in directive.

- Scan tags and register tag types (including variants with arguments). Tag construct functions are wrapped so they produce `TagResolveInstance` objects that are resolved later.

`Note`: Tags are lazily resolved — their construct logic runs during the Resolve phase, not during js-yaml parsing.

### 2. Load

- Use `js-yaml` to parse the YAML text into a raw JS structure. At this point expressions are plain scalars (strings) and tag instances are `TagResolveInstance` placeholders.

### 3. Post-load ( Resolve )

- After `js-yaml` parses the YAML file you get a `raw load`: a plain JavaScript structure where expression strings (like $this.foo) are still literal scalars and any tagged node is represented by a `TagResolveInstance` placeholder.

- The raw load is converted into a `blueprint`. The `blueprint` mirrors the document structure, but every item that requires later evaluation is wrapped in a `BlueprintInstance`. A `BlueprintInstance` contains:

  - `raw value` — the original raw value from js-yaml (primitive, expression string, TagResolveInstance, mapping, or sequence).
  - `resolved` — boolean, initially false. Set to true after the instance is fully resolved.

  This uniform wrapper lets the resolver track state, detect cycles, and emit precise errors.

- Resolution happens with a left-to-right walker, See [Evaluation order & semantics](#evaluation-order--semantics). For each `BlueprintInstance` the walker follows this algorithm:

  - If `resolved` is true, resolve `raw value`.
  - If the instance is referenced while `resolved` is false, descriptive error is thrown: `Tried to access <path> before initialization`.
  - `raw value` resolve depends on kind:
    - `Primitive` (number, boolean, null): returned as they are.
    - `String`: if it is an expression (e.g. starts with `$`) or contains interpolation `${...}`, parse and evaluate the expression; otherwise treat as a plain string.
    - `Sequence / Mapping`: recursively resolve each child item and assemble the final array/object;
    - `TagResolveInstance`: resolve the tag's argument and data; then call the tag's construct(resolvedData, type, resolvedArg). If construct returns a Promise, the resolver will await it in async mode only.

- Expression evaluation happens inside this same walker so expressions that target other blueprint nodes trigger resolution of those targets first (preserving left-to-right determinism). Local overrides (like key=value on $this) are applied to a shallow copy or evaluation context while resolving that expression.

### Caching (concise)

- Cache entries are keyed by file path and parameter signature. Each file-level entry stores and object called `ModuleLoadCache` with this structure:

  - `source` (YAML text),
  - `sourceHash` (str hash),
  - `blueprint` (generated blueprint),
  - `directives` (object that holds data from directives).
  - `resolvedPath` (resolved path of YAML file).
  - `loadByParamHash` (Map of all loads from different module params).

- Because the same file can be loaded with different `%PARAM` values, the cache includes param-level entries keyed by `hash(params)` so resolved outputs are reusable per parameter set.

- Invalidation rules:

  - If the file content hash changes → invalidate file entry and all param entries for that file.
  - load/loadAsync, resolve/resolveAsync function finish.
  - LiveLoader.deleteAllModules() and LiveLoader.deleteModule().

## API reference

These are all the imports from `yaml-extend` library

```js
import {
  load,
  loadAsync,
  resolve,
  resolveAsync,
  LiveLoader,
  dump,
  Type,
  Schema,
  DEFAULT_SCHEMA,
  CORE_SCHEMA,
  JSON_SCHEMA,
  FAILSAFE_SCHEMA,
  YAMLException,
  WrapperYAMLException,
} from "yaml-extend";
```

From the first look you can notice that they are the same imports of `js-yaml` but with some extra functions/classes which are `loadAsync`, `resolve`, `resolveAsync`, `LiveLoader` and `WrapperYAMLException`.  
Also we can notice the new async functions which are introduced to manage imports and YAML file reads without blocking the JS main thread.

### Functions

#### load(str: string, opts?: LoadOptions) => unknown

Function to load YAML string into js value. works sync so all file system reads are sync, also all tag's construct functions executions will be treated as sync functions and not awaited. If you are using imports or async tag construct functions use loadAsync instead.

- `str` — YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved using `opts.basePath` and it will overwite `opts.filepath` value.

- `opts` — see [LoadOptions](#loadoptions).

- `returns` — Js value of loaded YAML string.

#### loadAsync(str: string, opts?: LoadOptions) => unknown

Function to load YAML string into js value. works async so all file system reads are async, also all tag's construct functions executions are awaited.

- `str` — YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved using `opts.basePath` and it will overwite `opts.filepath` value.

- `opts` — see [LoadOptions](#loadoptions).

- `returns` — Js value of loaded YAML string.

#### dump(obj: any, opts?: DumpOptions) => string

Function to dump js value into YAML string.

- `obj` — Js object that will be converted to YAML string

- `DumpOptions` — see [DumpOptions](#dumpoptions)

- `returns` — YAML string of dumped js value.

#### resolve(str: string, opts?: ResolveOptions) => string

Function to resolve tags and wrapper expressions (imports, params, locals and privates) to generate one resolved YAML string. short hand for calling load() then dump(). useful to convert YAML modules into one YAML string that will be passed for configiration. works sync.

- `str` — YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved using `opts.basePath` and it will overwite `opts.filepath` value.

- `opts` — see [ResolveOptions](#resolveoptions).

- `returns` — Resolved YAML string.

#### resolveAsync(str: string, opts?: ResolveOptions) => string

Function to resolve tags and wrapper expressions (imports, params, locals and privates) to generate one resolved YAML string. short hand for calling load() then dump(). useful to convert YAML modules into one YAML string that will be passed for configiration. works async.

- `str` — YAML string or filesystem path for the YAML file. The loader uses a regex to detect path-like strings; when a path is used it will be resolved using `opts.basePath` and it will overwite `opts.filepath` value.

- `opts` — see [ResolveOptions](#resolveoptions).

- `returns` — Resolved YAML string.

#### hashParams(params: Record<string, string>) => string

Same hash function used inside `yaml-extend` to hash params. Can be used to interact with `ModuleLoadCache.loadByParamsHash` map if needed.

- `params` — Mapping of module param aliases to string values that will be used to resolve $param expressions in the module. Loader-supplied params should override any defaults declared with %PARAM.

- `returns` — Hash of params object.

### Classes

#### Type

Type to handle tags and custom data types in YAML. The only difference between `js-yaml` and `yaml-extend` inside Type class is construct function. as due to lazy evaluation of tags value in the wrapper async functions are allowed and awaited. also new params flag is present

- `constructor:(tag: string, opts?: TypeConstructorOptions)` — See [`TypeConstructorOptions`](#typeconstructoroptions)
  Type class constructor.
  `Tag`: Tag that will be used in YAML text.
  `TypeConstructorOptions`: Configirations and options that defines how tag handle data.

- `kind: Kind | null` — See [`Kind`](#kind)
  YAML data type that will be handled by this Tag/Type.

- `resolve: (data: any) => boolean`
  Runtime type guard used when parsing YAML to decide whether a raw node (scalar, mapping or sequence) should be treated as this custom type. Return true when the incoming data matches this type.
  `data`: Raw node's value.
  `returns`: Boolean to indicate if raw value should be handled using this type.

- `construct: (data: any, type?: string, arg?: string) => any | Promise<any>`
  Function that will be executed on raw node to return custom data type in the load.
  `data`: Raw node's value.
  `type`: Type of the tag.
  `arg`: Argument passed along with the tag which is single scalar value.
  `returns`: Value that will replace node's raw value in the load.

- `instanceOf: object | null`
  Used when dumping (serializing) JS objects to YAML. If a value is an instance of the provided constructor (or matches the object prototype), the dumper can choose this type to represent it.

- `predicate: ((data: object) => boolean) | null`
  Alternative to instanceOf for dump-time detection. If predicate returns true for a JS value, the dumper can select this type to represent that object. Useful when instanceof is not possible (plain objects, duck-typing).

- `represent: ((data: object) => any) | { [x: string]: (data: object) => any } | null`
  Controls how a JS value is converted into a YAML node when serializing (dumping). Return either a primitive, array or mapping representation suitable for YAML. When provided as an object, each property maps a style name to a function that produces the representation for that style.

- `representName: ((data: object) => any) | null`
  When represent is given as a map of styles, representName chooses which style to use for a particular value at dump time. It should return the style key (e.g., "canonical" or "short").

- `defaultStyle: string | null`
  The fallback style name to use when represent provides multiple styles and representName is not present (or does not return a valid style).

- `multi: boolean`
  Indicates whether this tag/type can be used for multiple YAML tags (i.e., it is not strictly tied to a single tag). This affects how the parser/dumper treats tag resolution and may allow more flexible matching.

- `styleAliases: { [x: string]: any }`
  Map alias style names to canonical style identifiers. This lets users refer to styles by alternate names; the dumper normalizes them to the canonical style before selecting a represent function.

#### Schema

Schema that holds Types used for loading and dumping YAML string. The only difference between `js-yaml` and `yaml-extend` inside Schema class is additional optional group argument in Schema construct, group argument defines which built-in schema is used.

- `constructor(definition: SchemaDefinition | Type[] | Type, group?: Group)` — See [`SchemaDefinition`](#schemadefinition) / [`Type`](#type) / [`Group`](#group)
  Schema class constructor.
  `definition`: Either schema definition or types that will control how parser handle tags in YAML.
  `group`: Optional built-in schema to use.

- `extend(types: SchemaDefinition | Type[] | Type) => Schema` — See [`SchemaDefinition`](#schemadefinition) / [`Type`](#type)
  Method to extend schema by adding more types.
  `types`: Either schema definition or types that will control how parser handle tags in YAML.
  `returns`: Reference to the schema.

#### DEFAULT_SCHEMA

Default built-in schema. for more details check `js-yaml` docs.

#### CORE_SCHEMA

Core built-in schema. for more details check `js-yaml` docs.

#### JSON_SCHEMA

Json built-in schema. for more details check `js-yaml` docs.

#### FAILSAFE_SCHEMA

Failsafe built-in schema. for more details check `js-yaml` docs.

#### LiveLoader

Class that handles loading multiple YAML files at the same time while watching loaded files and update there loads as files change.

- `constructor(opts?: LiveLoaderOptions)` — See [`LiveLoaderOptions`](#liveloaderoptions)
  LiveLoader class constructor.
  `opts`: Options object passed to control live loader behavior.

- `setOptions(opts: LiveLoaderOptions) => void` — See [`LiveLoaderOptions`](#liveloaderoptions)
  Method to set options of the class.
  `opts`: Options object passed to control live loader behavior.

- `addModule(path: string, params?: Record<string, string>) => unknown`
  Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that imported YAML files in the read YAML string are watched as well. works sync so all file watch, reads are sync and tags executions are handled as sync functions and will not be awaited.
  `path`: Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
  `params`: Object of module params aliases and there values to be used in this load. so it's almost always better to use addModuleAsync instead.
  `returns`: Value of loaded YAML file.

- `addModuleAsync(path: string, params?: Record<string, string>) => unknown`
  Method to add new module to the live loader. added modules will be watched using fs.watch() and updated as the watched file changes. note that imported YAML files in the read YAML string are watched as well. works async so all file watch, reads are async and tags executions will be awaited.
  `path`: Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
  `params`: Object of module params aliases and there values to be used in this load.
  `returns`: Value of loaded YAML file.

- `getModule(path: string) => unknown`
  Method to get cached value of loaded module or file. note that value retuned is module's resolve when params is undefined (default params value are used).
  `path`: Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
  `returns`: Cached value of YAML file with default modules params or undefined if file is not loaded.

- `getAllModules() => Record<string, unknown>`
  Method to get cached value of all loaded modules or files. note that values retuned are module's resolve when params is undefined (default params value are used).
  `returns`: Object with keys resolved paths of loaded YAML files and values cached values of YAML files with default modules params.

- `getCache(path: string) => ModuleLoadCache` see [Caching](#caching-concise)
  Method to get all cached data about specific module. `note that they are passed by reference and should never be mutated`.
  `path`: Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.
  `returns`: Module load cache object.

-` getAllCache() => Record<string, ModuleLoadCache>` see [Caching](#caching-concise)
Method to get all cached data of all loaded module. note that they are passed by reference and should never be mutated.
`returns`: Object with keys resolved paths of loaded YAML files and values Module load cache objects for these module..

- `deleteModule(path: string) => void`
  Method to delete module or file from live loader.
  `path`: Filesystem path of YAML file. it will be resolved using `LiveLoaderOptions.basePath`.

- `deleteAllModules() => void`
  Method to clear cache of live loader by deleting all modules or files from live loader.

- `destroy() => void`
  Method to clear live loader along with all of its watchers and cache from memory.

#### YAMLException

Error object when `js-yaml` parse error it thrown.

- `constructor(reason?: string, mark?: Mark)` — See [`Mark`](#mark)
  YAMLException class constructor
  `reason`: Reason of the error.
  `mark`: Mark object that defines error's details.

- `toString(compact?: boolean) => string`
  Method to convert Error object into string.
  `compact`: Boolean to indicated if output error string should be compacted.
  `returns`: Stringified error.

- `name: string`
  Logical name of the YAML string where error is thrown.

- `reason: string`
  Reason of the error.

- `message: string`
  Message of the error.

- `mark: Mark`
  Object that defines error's details.

#### WrapperYAMLException

Error object when `yaml-extend` resolve error is thrown. One of the down sides of being a wrapper is inability to gether error details (exact line, positions... of the error), so mark is replaced by filepath.

- `constructor(reason?: string, filepath?: string, name?: string)`
  WrapperYAMLException class constructor
  `reason`: Reason of the error.

- `toString(compact?: boolean) => string`
  Method to convert Error object into string.
  `compact`: Boolean to indicated if output error string should be compacted.
  `returns`: Stringified error.

- `name: string`
  Logical name of the YAML string where error is thrown.

- `reason: string`
  Reason of the error.

- `message: string`
  Message of the error.

- `filepath: string`
  Filesystem path of the YAML file where error is thrown.

#### TagResolveInstance

Class returned from user-defined type's contruct functions. stores data, type and arg passed to the function, so they can be resolved first.

- `constructor(func: (data: any, type?: string, arg?: string) => unknown | Promise<Unkown>), data: any, type?: string, arg?: string)`
  TagResolveInstance class constructor
  `func`: Constructor function used by the tag.
  `data`: Data passed to the tag.
  `type`: Type passed to the tag.
  `arg`: Argument string passed to the tag.

- `data: any`
  Read only, Data passed to the tag.

- `type?: string`
  Read only, Type passed to the tag.

- `arg?: string`
  Read only, Argument passed to the tag.

- `resolve(data: any, type?: string, arg?: string)`
  Method to execute the constructor function and get value from the tag. works sync.
  `data`: Data passed to the tag.
  `type`: Type passed to the tag.
  `arg`: Argument string passed to the tag.
  `returns`: Value from construct function exectution on resolved data.

- `resolveAsync(data: any, type?: string, arg?: string)`
  Method to execute the constructor function and get value from the tag. works async.
  `data`: Data passed to the tag.
  `type`: Type passed to the tag.
  `arg`: Argument string passed to the tag.
  `returns`: Value from construct function exectution on resolved data.

#### BlueprintInstance

Class that replace and store primitives, expression strings or `TagResolveInstances` in `raw-load` from `js-yaml` which enable lazy resolving based on different `$param` or `%local` values. It also record resolve state to insure left-to-right evaluation order.

- `constructor(rawValue: unknown)`
  BlueprintInstance class constructor
  `rawValue`: The original raw value from js-yaml (primitive, expression string or TagResolveInstance).

- `rawValue: unknown`
  Read only, The original raw value from js-yaml (primitive, expression string or TagResolveInstance).

- `resolved: boolean`
  Boolean, initially false. Set to true after the instance is fully resolved.

### Interfaces

#### LoadOptions

Options object passed to control load behavior. basePath, filpath and params are added.

- `basePath?: string | undefined` — Default: `process.cwd()`
  Filesystem path used as the sandbox root for imports. Prevents access to files outside this directory and is used as the base when resolving relative imports or special `@base/...` import syntax. Example: if basePath is `/proj` and an import says `./configs/a.yaml`, the loader resolves against `/proj`.

- `unsafe?: boolean | undefined` — Default: `false`
  Boolean to disable basePath black boxing. it's not recommend to set it to true unless you have strong reason.

- `filepath?: string | undefined` — Default: `undefined`
  The resolved path of the YAML source. Useful for error messages, caching, and resolving relative imports. If you call `load("./file.yaml")` the loader should set this to the resolved absolute path automatically. `Note that imports and caching will not work if filepath is not supplied here or in function's str field`.

- `filename?: string | undefined` — Default: `undefined`
  String to be used as a file path in error/warning messages. It will be overwritten by YAML text `FILENAME` directive if used.

- `onWarning?: ((this: null, err: YAMLException | WrapperYAMLException) => void) | undefined` — Default: `undefined` — see [`YAMLException`](#yamlexception) / [`WrapperYAMLException`](#wrapperyamlexception)
  Function to call on warning messages.
  `err`: Error thrown either YAMLException or WrapperYAMLException.

- `schema?: Schema | undefined` — Default: `undefined` — See [`Schema`](#schema)
  Specific schema to use.

- `json?: boolean | undefined` — Default: `undefined`
  Compatibility with JSON.parse behaviour.

- `listener?: ((this: State, eventType: ParseEventType, state: State) => void) | undefined` — Default: `undefined` — see [`ParseEventType`](#parseeventtype) / [`State`](#state)
  Listener for parse events.
  `eventType`: Type of the parse event. either close or open.
  `state`: State of the current parse.

- `params?: Record<string, string> | undefined` — Default: `undefined`
  Mapping of module param aliases to string values that will be used to resolve $param expressions in the module. Loader-supplied params should override any defaults declared with %PARAM.

#### DumpOptions

Options object passed to control dump behavior. Identical to `js-yaml`.

- `indent?: number | undefined` — Default: `undefined`
  Indentation width to use (in spaces).

- `noArrayIndent?: boolean | undefined` — Default: `undefined`
  When true, will not add an indentation level to array elements.

- `skipInvalid?: boolean | undefined` — Default: `undefined`
  Do not throw on invalid types (like function in the safe schema) and skip pairs and single values with such types.

- `flowLevel?: number | undefined` — Default: `undefined`
  Specifies level of nesting, when to switch from block to flow style for collections. -1 means block style everwhere.

- `styles?: { [x: string]: any } | undefined` — Default: `undefined`
  Each tag may have own set of styles. - "tag" => "style" map.

- `schema?: Schema | undefined` — Default: `undefined` — See [`Schema`](#schema)
  Specific schema to use.

- `sortKeys?: boolean | ((a: any, b: any) => number) | undefined` — Default: `false`
  If true, sort keys when dumping YAML. If a function, use the function to sort the keys.

- `lineWidth?: number | undefined` — Default: `80`
  Set max line width.

- `noRefs?: boolean | undefined` — Default: `false`
  If true, don't convert duplicate objects into references.

- `noCompatMode?: boolean | undefined` — Default: `false`
  If true don't try to be compatible with older yaml versions. Currently: don't quote "yes", "no" and so on, as required for YAML 1.1 .

- `condenseFlow?: boolean | undefined` — Default: `false`
  If true flow sequences will be condensed, omitting the space between `key: value` or `a, b`. Eg. `'[a,b]'` or `{a:{b:c}}`. Can be useful when using yaml for pretty URL query params as spaces are %-encoded.

- `quotingType?: "'" | '"' | undefined` — Default: `'`
  Strings will be quoted using this quoting style. If you specify single quotes, double quotes will still be used for non-printable characters.

- `forceQuotes?: boolean | undefined` — Default: `false`
  If true, all non-key strings will be quoted even if they normally don't need to.

- `replacer?: ((key: string, value: any) => any) | undefined` — Default: `undefined`
  Callback `function (key, value)` called recursively on each key/value in source object (see `replacer` docs for `JSON.stringify`).

#### ResolveOptions

Options object passed to control resolve behavior. Extends `LoadOptions` and `DumpOptions` with additional configurations defined below.

- `outputPath?: string` — Default: `undefined`
  Filesystem path to write generated resolved YAML text into.

#### LiveLoaderOptions

Options object passed to control liveLoader behavior.

- `onUpdate?: (path: string, load: unknown)` — Default: `undefined` — See [`FileEventType`](#fileeventtype)
  Function to call when a watcher detect file change.
  `path`: Path of updated YAML file.
  `load`: New load value of the YAML file or last cached load value if error is thrown.

- `onError?: (path: string, load: unknown)` — Default: `undefined` — See [`FileEventType`](#fileeventtype)
  Function to call when a watched file throw yaml-extend error.
  `path`: Path of updated YAML file.
  `error`: YAMLException or WrapperYAMLException thrown. — see [`YAMLException`](#yamlexception) / [`WrapperYAMLException`](#wrapperyamlexception)

- `resetOnError?: boolean` — Default: `false`
  How live loader will react when load error is thrown. You should note that error throwing will be very likely to occur when you update files. if setted to true cache of this module will be reseted to null otherwise nothing will happen to old cache when error is thrown.

- `basePath?: string` — Default: `process.cwd()`
  Filesystem path used as the sandbox root for imports. Prevents access to files outside this directory and is used as the base when resolving relative imports or special `@base/...` import syntax. Example: if basePath is `/proj` and an import says `./configs/a.yaml`, the loader resolves against `/proj`.

- `unsafe?: boolean | undefined` — Default: `false`
  Boolean to disable basePath black boxing. it's not recommend to set it to true unless you have strong reason.

- `onWarning?: (this: null, err: YAMLException | WrapperYAMLException) => void` — Default: `undefined` — see [`YAMLException`](#yamlexception) / [`WrapperYAMLException`](#wrapperyamlexception)
  Function to call on warning messages.
  `err`: Error thrown either YAMLException or WrapperYAMLException.

- `schema?: Schema` — Default: `undefined` — See [`Schema`](#schema)
  Specific schema to use.

- `json?: boolean` — Default: `undefined`
  Compatibility with JSON.parse behaviour.

- `listener?: (this: State, eventType: ParseEventType, state: State) => void` — Default: `undefined` — see [`ParseEventType`](#parseeventtype) / [`State`](#state)
  Listener for parse events.
  `eventType`: Type of the parse event. either "close" or "open".
  `state`: State of the current parse.

#### TypeConstructorOptions

Configirations and options that defines how tag handle data.

- `kind?: Kind | undefined` — Default: `undefined` — See [`Kind`](#kind)
  YAML data type that will be handled by this Tag/Type.

- `resolve?: ((data: any) => boolean) | undefined` — Default: `undefined`
  Runtime type guard used when parsing YAML to decide whether a raw node (scalar, mapping or sequence) should be treated as this custom type. Return true when the incoming data matches this type.
  `data`: Raw node's value.
  `returns`: Boolean to indicate if raw value should be handled using this type.

- `construct?: ((data: any, type?: string, arg?: string) => any | Promise<any>) | undefined` — Default: `undefined`
  Function that will be executed on raw node to return custom data type in the load.
  `data`: Raw node's value.
  `type`: Type of the tag.
  `arg`: Argument passed along with the tag which is single scalar value.
  `returns`: Value that will replace node's raw value in the load.

- `instanceOf?: object | undefined` — Default: `undefined`
  Used when dumping (serializing) JS objects to YAML. If a value is an instance of the provided constructor (or matches the object prototype), the dumper can choose this type to represent it.

- `predicate?: ((data: object) => boolean) | undefined` — Default: `undefined`
  Alternative to instanceOf for dump-time detection. If predicate returns true for a JS value, the dumper can select this type to represent that object. Useful when instanceof is not possible (plain objects, duck-typing).
  `data`: Raw node's value.
  `returns`: Boolean to indicate if type will represent object or not while dumping.

- `represent?: ((data: object) => any) | { [x: string]: (data: object) => any } | undefined` — Default: `undefined`
  Controls how a JS value is converted into a YAML node when serializing (dumping). Return either a primitive, array or mapping representation suitable for YAML. When provided as an object, each property maps a style name to a function that produces the representation for that style.

- `representName?: ((data: object) => any) | undefined` — Default: `undefined`
  When represent is given as a map of styles, representName chooses which style to use for a particular value at dump time. It should return the style key (e.g., "canonical" or "short").
  `data`: Raw node's value.
  `returns`: Style key of represent.

- `defaultStyle?: string | undefined` — Default: `undefined`
  The fallback style name to use when represent provides multiple styles and representName is not present (or does not return a valid style).

- `multi?: boolean | undefined` — Default: `undefined`
  Indicates whether this tag/type can be used for multiple YAML tags (i.e., it is not strictly tied to a single tag). This affects how the parser/dumper treats tag resolution and may allow more flexible matching.

- `styleAliases?: ({ [x: string]: any }) | undefined` — Default: `undefined`
  Map alias style names to canonical style identifiers. This lets users refer to styles by alternate names; the dumper normalizes them to the canonical style before selecting a represent function.

#### SchemaDefinition

Definition of schema by supplying both implicit and explicit types.

- `implicit?: Type[] | undefined` — Default: `undefined` — See [`Type`](#type)
  Internal YAML tags or types.

- `explicit?: Type[] | undefined` — Default: `undefined` — See [`Type`](#type)
  Extenral YAML tags or types.

#### State

State of the YAML file parse.

- `input: string`
  The raw YAML text being parsed.

- `filename: string | null`
  Logical name for YAML string.

- `schema: Schema`
  The `Schema` instance currently in use.

- `onWarning: (this: null, e: YAMLException) => void`
  Optional callback invoked for non-fatal parse warnings.

- `json: boolean`
  If true, parser attempts to behave like `JSON.parse` where applicable (restricts some YAML behaviors for JSON compatibility).

- `length: number`
  The total length (number of characters) of `input`.

- `position: number`
  Current zero-based index within `input` where the parser is reading.

- `line: number`
  Current line number (zero-based).

- `lineStart: number`
  The index in `input` where the current line begins. Combined with `position` to compute the `column`.

- `lineIndent: number`
  Number of spaces (indent) at the current line.

- `version: null | number`
  YAML version (e.g. 1.1, 1.2) if the document declares one; otherwise null.

- `checkLineBreaks: boolean`
  Whether to validate line-break characters strictly.

- `kind: string`
  Internal marker describing the current parsing context (for example document, mapping, sequence, etc.).

- `result: any`
  The partially- or fully-parsed JavaScript value produced so far for the current document. Updated as nodes are constructed.

- `implicitTypes: Type[]`
  Array of `Type` instances that the parser should consider implicitly when trying to recognize scalars/values.

#### Mark

Mark for YAMLException that defines error's details.

- `buffer: string`
  The original input text (or the relevant buffer slice) used to produce the error.

- `column: number`
  Zero-based column number (character offset from lineStart) where the error occurred.

- `line: number`
  Zero-based line number where the problem was detected.

- `name: string`
  The logical name for YAML string (filename).

- `position: number`
  Absolute character index in `buffer` for the error location.

- `snippet: string`
  short excerpt from the input surrounding the error.

#### DirectivesObj

Object the holds directives data for YAML file.

- `filename: string | undefined`
  Logical `filename` as declared by the `%FILENAME` YAML directive.

- `tagsMap: Map<string, string>`
  Map of `handle` → `prefix (URI)` as declared by the `%TAG` YAML directive.

- `privateArr: string[]`
  Array of `node paths` declared private via the `%PRIVATE` YAML directive.

- `paramsMap: Map<string, string>`
  Map of `alias` → `default value` as declared by the `%PARAM` YAML directive.

- `localsMap: Map<string, string>`
  Map of `alias` → `default value` as declared by the `%LOCAL` YAML directive.

- `importMap: Map(string, {path: string, params: Record<string, string>})`
  Map of `alias` → `{path, params}` as declared by the `%PRIVATE` YAML directive.

#### ParamLoadEntry

Entry representing a resolved module load for a specific set of params, Keyed in the parent cache by a hash computed from `params`.

- `load: unknown`
  Final resolved value returned after parsing/loading the YAML module.

- `params?: Record<string, string> | undefined`
  Parameter values used to produce this load (may be undefined).

#### ModuleLoadCache

Cache that stores all resolved loads and metadata for a single YAML module.

- `loadByParamHash: Map<string, ParamLoadEntry>` — See [ParamLoadEntry](#paramloadentry)

Map from params-hash → ParamLoadEntry. Use the hash of the params (string) as the map key so different param sets map to their respective resolved load results.

- `directives: DirectivesObj | undefined` — See [DirectivesObj](#directivesobj)
  Parsed directive data for the module (e.g., %TAG, %PARAM, %LOCAL, %PRIVATE). undefined if invalid YAML string is passed.

- `resolvedPath: string`
  Absolute or resolved filesystem path of the module.

- `source: string`
  Original YAML string.

- `sourceHash: string`
  Hash computed from `source` (used to detect changes / cache misses).

- `blueprint: unknown | undefined`
  Canonical "blueprint" produced from the YAML text used to generate loads. undefined if invalid YAML string is passed.

### Enums

#### Kind

Kind or type of YAML data.
`Value`: "sequence" | "scalar" | "mapping"

#### Group

Built-in schemas by `js-yaml`.
`Value`: "DEFAULT" | "CORE" | "JSON" | "FAILSAFE";

#### ParseEventType

Types of parse event.
`Value`: "close" | "open"

#### FileEventType

Types of file system event.
`Value`: "change" | "rename"

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to report issues, run tests, and submit pull requests.

Please follow the Code of Conduct and include tests for new features or bug fixes.

## License

`yaml-extend` is released under the [MIT License](LICENSE). See the full license in the `LICENSE` file.
