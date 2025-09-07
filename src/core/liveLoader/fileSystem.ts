import { type FSWatcher, type WatchEventType, watch } from "fs";

/**
 * Class to handle file system interactions in live loader.
 */
export class FileSystem {
  /** Array that holds paths of YAML files being handled */
  #files: string[] = [];

  /** Map that links each YAML file path with watcher that updates it. */
  #watchers: Map<string, FSWatcher> = new Map();

  /**
   * Method to check if YAML file is being watched.
   * @param path - Path of the YAML file.
   * @returns Boolean to indicate if YAML file is being watched.
   */
  hasFile(path: string) {
    return this.#files.includes(path);
  }

  /**
   * Method to set watcher for YAML file changes.
   * @param path - Path of the YAML file.
   * @param callback - Callback that will be executed every time file is changed.
   */
  addFile(path: string, callback: (eventType: WatchEventType) => void): void {
    // if already watched return
    if (this.#files.includes(path)) return;

    // create and add watcher to watcher's array
    const watcher = watch(path, callback);
    this.#watchers.set(path, watcher);

    // add file to files array
    this.#files.push(path);
  }

  /**
   * Method to delete watcher of YAML file changes.
   * @param path - Path of the YAML file.
   */
  deleteFile(path: string): void {
    // delete file from file's array
    const idx = this.#files.indexOf(path);
    if (idx !== -1) this.#files.splice(idx, 1);

    // get watcher and delete it
    const watcher = this.#watchers.get(path);
    if (!watcher) return;
    watcher.removeAllListeners();
    watcher.close();
    this.#watchers.delete(path);
  }

  /** Files being watched. */
  get files() {
    return this.#files;
  }

  /** Method to destroy class. */
  destroy() {
    this.#files = null as unknown as string[];
    for (const w of this.#watchers.values()) {
      w.removeAllListeners();
      w.close();
    }
    this.#watchers = null as unknown as Map<string, FSWatcher>;
  }
}
