/**
 * Class returned from user-defined type's contruct functions. stores data, type and arg passed to the function, so they can be resolved first.
 */
export class TagResolveInstance {
  /** @internal - implementation detail, not part of public API */
  /** Constructor function used by the tag.. */
  private _func: (
    data: any,
    type?: string,
    arg?: string
  ) => unknown | Promise<unknown>;

  /** @internal - implementation detail, not part of public API */
  /** Data passed to the tag. */
  private _data: any;

  /** @internal - implementation detail, not part of public API */
  /** Type passed to the tag. */
  private _type: string | undefined;

  /** @internal - implementation detail, not part of public API */
  /** Argument passed to the tag. */
  private _arg: string | undefined;

  /**
   * @param func - Constructor function used by the tag.
   * @param data - Data passed to the tag.
   * @param type - Type passed to the tag.
   * @param arg - Argument string passed to the tag.
   */
  constructor(
    func: (
      data: any,
      type?: string,
      arg?: string
    ) => unknown | Promise<unknown>,
    data: any,
    type: string | undefined,
    arg: string | undefined
  ) {
    this._func = func;
    this._data = data;
    this._type = type;
    this._arg = arg;
  }

  /**
   * Method to execute the constructor function and get value from the tag. works sync.
   * @param data - Data passed to the tag.
   * @param type - Type passed to the tag.
   * @param arg - Argument string passed to the tag.
   * @retunrs Value from construct function exectution on resolved data.
   */
  resolve(data: any, type?: string, arg?: string): unknown {
    return this._func(data, type, arg);
  }

  /**
   * Method to execute the constructor function and get value from the tag. works async.
   * @param data - Data passed to the tag.
   * @param type - Type passed to the tag.
   * @param arg - Argument string passed to the tag.
   * @retunrs Value from construct function exectution on resolved data.
   */
  async resolveAsync(data: any, type?: string, arg?: string): Promise<unknown> {
    return await this._func(data, type, arg);
  }

  /** Read only, Data passed to the tag. */
  get data(): any {
    return this._data;
  }

  /** Read only, Type passed to the tag. */
  get type(): string | undefined {
    return this._type;
  }

  /** Read only, Argument passed to the tag. */
  get arg(): string | undefined {
    return this._arg;
  }
}
