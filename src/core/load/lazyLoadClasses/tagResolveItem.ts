/**
 * Class that is returned by any Type construct function. it is used to store construct function along with it's params (data, type and params), so
 * when node tree is being resolved the constructor will be executed.
 */
export class TagResolveInstance {
  /** Constructor function passed to the type of the tag. */
  #func: (
    data: any,
    type?: string,
    params?: string
  ) => unknown | Promise<unknown>;

  /** Data passed to the tag. */
  data: any;

  /** Type passed to the tag. */
  type: string | undefined;

  /** Params passed to the tag. */
  params: string | undefined;

  /**
   * @param func - Constructor function used in the tag.
   * @param data - Data passed to the tag.
   * @param type - Type passed to the tag.
   * @param params - Params string passed to the tag.
   */
  constructor(
    func: (
      data: any,
      type?: string,
      params?: string
    ) => unknown | Promise<unknown>,
    data: any,
    type: string | undefined,
    params: string | undefined
  ) {
    this.#func = func;
    this.data = data;
    this.type = type;
    this.params = params;
  }

  /** Method to execute the constructor function and get value from the tag. works sync. */
  resolve() {
    return this.#func(this.data, this.type, this.params);
  }

  /** Method to execute the constructor function and get value from the tag. works async. */
  async resolveAsync() {
    return await this.#func(this.data, this.type, this.params);
  }
}
