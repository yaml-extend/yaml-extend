import { traverseNodes, verifyNodeType } from "./helpers.js";
import type { Context } from "./index.js";
import { deepClone } from "../../utils/random.js";
import { ParseState, TempParseState } from "../../parseTypes.js";
import { getImport } from "../directives/index.js";
import { YAMLExprError } from "../../../extendClasses/error.js";

/**
 * Method to handle 'import' expression. works sync.
 * @param parts - Data parts.
 * @param tempState - Unique id generated for this resolve executiion, used to access cache.
 * @returns Value from resolving the expression.
 */
export async function handleImport(
  ctx: Context,
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  // get needed state
  const paths = ctx.paths;
  const args: Record<string, unknown> = ctx.args?.argsObj ?? {};

  // get needed cache data
  const cache = state.cache.get(tempState.resolvedPath);
  if (!cache) return;
  const imp = getImport(cache.directives.import, paths[1].path, true);
  if (!imp) return;

  // merge default with defined params
  const finalParams = { ...imp.defaultParams, ...args };

  // import file
  const parse = await importModule(imp.path, finalParams, state, tempState);
  // traverse load using nodepath and verify node type if passed
  const node = await traverseNodes(parse, paths, state, tempState, 2);
  if (ctx.type) {
    const verified = verifyNodeType(node, ctx.type.type);
    if (!verified) {
      tempState.errors.push(
        new YAMLExprError(
          ctx.textToken.pos,
          "",
          `Type mis-match, value used is not of type: ${ctx.type.type}.`
        )
      );
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
async function importModule(
  targetPath: string,
  targetParams: Record<string, unknown>,
  state: ParseState,
  tempState: TempParseState
): Promise<unknown> {
  // deep clone options and update params
  const clonedOptions = deepClone(tempState.options);
  clonedOptions.params = targetParams;

  // load str
  const parseData = await tempState.parseFunc(targetPath, clonedOptions, state);
  // push any errors
  tempState.importedErrors.push(...parseData.errors);

  // return load
  return parseData.parse;
}
