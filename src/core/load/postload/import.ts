import { resolve, dirname } from "path";
import { readFile as readFileAsync } from "fs/promises";
import { readFileSync } from "fs";
import { WrapperYAMLException } from "../../../wrapperClasses/error.js";
import {
  HandledLoadOpts,
  InternalLoad,
  InternalLoadAsync,
} from "../../../types.js";
import { circularDepClass } from "../../circularDep.js";
import { isInsideSandBox, isYamlFile } from "../../helpers.js";

/** Class to handle importing another YAML files. */
export class ImportHandler {
  /** Internal load function used to load imported YAML files. */
  #load: InternalLoad;

  /** Internal load async function used to load imported YAML files. */
  #loadAsync: InternalLoadAsync;

  /**
   * @param load - Reference to internalLoad function, so it can be used in $import interpolation. passed like this to avoid circular dependency.
   * @param loadAsync - Reference to internalLoadAsync function, so it can be used in $import interpolation. passed like this to avoid circular dependency.
   */
  constructor(load: InternalLoad, loadAsync: InternalLoadAsync) {
    this.#load = load;
    this.#loadAsync = loadAsync;
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
  import(
    modulePath: string,
    targetPath: string,
    targetParams: Record<string, string>,
    loadOpts: HandledLoadOpts,
    loadId: string
  ) {
    // remove file name from module path if present
    const dirModulePath = this.#removeFileName(modulePath);

    // resolve path by adding targer path to module path
    const resPath = this.#handlePath(
      loadOpts?.basePath ?? process.cwd(),
      dirModulePath,
      targetPath,
      loadId
    );

    // read YAML file and get string
    const str = readFileSync(resPath, { encoding: "utf8" });

    // load str
    const load = this.#load(
      str,
      {
        ...loadOpts,
        paramsVal: targetParams,
        filepath: resPath,
      },
      loadId
    );

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
  async importAsync(
    modulePath: string,
    targetPath: string,
    targetParams: Record<string, string>,
    loadOpts: HandledLoadOpts,
    loadId: string
  ) {
    // remove file name from module path if present
    const dirModulePath = this.#removeFileName(modulePath);

    // resolve path by adding targer path to module path
    const resPath = this.#handlePath(
      loadOpts?.basePath ?? process.cwd(),
      dirModulePath,
      targetPath,
      loadId
    );

    // read YAML file and get string
    const str = await readFileAsync(resPath, { encoding: "utf8" });

    // load str
    const load = await this.#loadAsync(
      str,
      {
        ...loadOpts,
        paramsVal: targetParams,
        filepath: resPath,
      },
      loadId
    );

    // return load
    return load;
  }

  /**
   * Method to handle relative paths by resolving & insuring that they live inside the sandbox and are actual YAML files, also detect circular dependency if present.
   * @param basePath - Base path defined by user in the options (or cwd if was omitted by user) that will contain and sandbox all imports.
   * @param modulePath - Path of the current YAML file.
   * @param targetPath - Path of the imported YAML file.
   * @param loadId - Unique id that identifies this load.
   * @returns Resolved safe path that will be passed to fs readFile function.
   */
  #handlePath(
    basePath: string,
    modulePath: string,
    targetPath: string,
    loadId: string
  ): string {
    // resolve path
    const resPath = resolve(modulePath, targetPath);

    // make sure it's inside sandbox
    const isSandboxed = isInsideSandBox(resPath, basePath);
    if (!isSandboxed)
      throw new WrapperYAMLException(
        `Path used: ${targetPath} is out of scope of base path: ${basePath}`
      );

    const isYaml = isYamlFile(resPath);
    if (!isYaml)
      throw new WrapperYAMLException(
        `You can only load YAML files the loader. loaded file: ${resPath}`
      );

    // detect circular dependency if present
    const circularDep = circularDepClass.addDep(modulePath, resPath, loadId);
    if (circularDep)
      throw new WrapperYAMLException(
        `Circular dependency detected: ${circularDep.join(" -> ")}`
      );

    // return path
    return resPath;
  }

  /**
   * Method to remove file name from path and just keep path until last directory.
   * @param path - Path that will be handled.
   * @returns Path after file name removal.
   */
  #removeFileName(path: string): string {
    return isYamlFile(path) ? dirname(path) : path;
  }
}
