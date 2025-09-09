/**
 * Class that is used to debounce file reads in live loader.
 */
export class Debouncer<T> {
  /** Boolean that indicate if debounce is currently looping and executing functions. */
  private _isExecuting: boolean = false;

  /** Time interval that will be used to debounce. */
  private _timeInterval: number = 200;

  /** Next function to execute. */
  private _nextFunc!: () => Promise<T> | T;

  /** Array that hold resolvers of the promises awaiting. */
  private _promises: { res: (val: any) => any; rej: (err: any) => void }[] = [];

  /**
   * @param timeInterval - Time interval that will be used to debounce.
   */
  constructor(timeInterval = 200) {
    this._timeInterval = timeInterval;
  }

  /**
   * Method to reset time interval.
   * @param ms - New time interval in seconds.
   */
  setInterval(ms: number): void {
    this._timeInterval = ms;
  }

  /**
   * Method to queue and debounce a function.
   * @param func - Function that will be debounced.
   * @returns Value of debounced function.
   */
  async debounce(func: () => Promise<T> | T): Promise<T> {
    if (typeof func !== "function") {
      return Promise.reject(new TypeError("debounce expects a function"));
    }

    // reset function
    this._nextFunc = func;

    // create promise and add it's resolvers to promises array
    const promise = new Promise<T>((res, rej) => {
      this._promises.push({ res, rej });
    });

    // start execution
    this._execute();

    // await promise
    return await promise;
  }

  /** Method to destroy class. */
  destroy() {
    for (const { rej } of this._promises.values()) {
      rej(`Class is destroyed`);
    }
    this._promises = null as unknown as {
      res: (val: any) => any;
      rej: (err: any) => void;
    }[];
    this._nextFunc = null as unknown as () => T | Promise<T>;
  }

  /**
   * Main method for execution. it go into a loop that take nextFunction and execute it, while also resolving promises awaiting for next execution.
   */
  private async _execute(): Promise<void> {
    // if executing return, if not start execution
    if (this._isExecuting) return;
    this._isExecuting = true;

    while (this._promises.length > 0) {
      // get next function
      const func = this._nextFunc;

      // get promises until now and reset array
      const promises = this._promises.slice();
      this._promises = [];

      if (typeof func !== "function") {
        const err = new TypeError("No function to execute");
        for (const p of promises) p.rej(err);
        continue;
      }

      // execute function and resolve or reject
      try {
        const val = await func();
        for (const p of promises) p.res(val);
      } catch (err) {
        for (const p of promises) p.rej(err);
      }

      // wait debounce interval before processing next queued call
      if (this._promises.length > 0) {
        await new Promise((r) => setTimeout(r, this._timeInterval));
      }
    }
    // set executing to false
    this._isExecuting = false;
    // if new promises appeared during debounce interval re execute
    if (this._promises.length > 0) this._execute();
  }
}
