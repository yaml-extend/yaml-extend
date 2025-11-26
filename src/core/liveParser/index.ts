import { initState, parseExtend } from "../parse/index.js";
import { Options, ParseExtend, ParseState } from "../parse/parseTypes.js";
import {
  getParseEntery,
  purgeCache,
  resetCache,
} from "../parse/utils/cache.js";

/**
 * Class to preserve state along parsing multiple entry paths.
 */
export class LiveParser {
  /** State object of the parser. It should never be mutated. */
  state: ParseState;
  private _options: Omit<Options, "params">;
  private _purgeInterval: NodeJS.Timeout | undefined;
  private _isDestroyed: boolean = false;

  /**
   * @param options - Options object passed to control parser behavior.
   * @param intervalPurge - Should set an interval to purge un-used path caches.
   */
  constructor(
    options?: Omit<Options, "params">,
    intervalPurge: boolean = true
  ) {
    this._options = options ?? {};
    this.state = initState();
    if (intervalPurge)
      this._purgeInterval = setInterval(() => {
        purgeCache(this.state);
      }, 10000);
  }

  /**
   * Method to set options, note that cache will be reseted every time options change.
   * @param options - Options object passed to control parser behavior.
   */
  setOptions(options: Omit<Options, "params">) {
    if (this._isDestroyed) return;
    this._options = { ...this._options, ...options };
    resetCache(this.state);
  }

  /**
   * Method to parse YAML file at specific path.
   * @param path - Path that will be parsed.
   * @returns Parse value of this path.
   */
  async parse(path: string): Promise<Awaited<ReturnType<ParseExtend>>> {
    if (this._isDestroyed) throw new Error("LiveParser class is destroyed.");
    // add path as entry point
    this.state.dependency.addDep(path, true);
    // check cache, if present return directly
    const cached = getParseEntery(
      this.state,
      path,
      this._options.universalParams
    );
    if (cached)
      return {
        ...cached,
        state: this._options.returnState ? this.state : undefined,
      };
    // parse and return value
    return await parseExtend(path, this._options, this.state);
  }

  /**
   * Method to delete path as an entry point.
   * @param path - Path the will be deleted.
   * @returns Boolean to indicate if path is fully removed from cache of is still preserved as an imported path.
   */
  purge(path: string): boolean {
    if (this._isDestroyed) throw new Error("LiveParser class is destroyed.");
    const deletedPaths = purgeCache(this.state, [path]);
    return deletedPaths.includes(path);
  }

  destroy() {
    if (this._isDestroyed) return;
    this.state = null as unknown as any;
    this._options = null as unknown as any;
    if (this._purgeInterval) clearInterval(this._purgeInterval);
    this._isDestroyed = true;
  }
}
