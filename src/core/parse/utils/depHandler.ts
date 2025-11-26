/**
 * Class to handle dependency checks.
 */
export class DependencyHandler {
  /** Set that holds: path -> set of dependencies paths. */
  depGraphs: Map<string, Set<string>> = new Map();
  /** Set that holds: path -> set of paths importing it. */
  reverseDepGraphs: Map<string, Set<string>> = new Map();
  /** All paths add to handler. */
  paths: Set<string> = new Set();
  /** Paths added as entery points. */
  entryPaths: Set<string> = new Set();

  /**
   * Method to remove any path that is not currently being imported by entery paths.
   * @param paths - Optional paths to delete from entery paths before purging.
   * @returns Array of paths that are deleted.
   */
  purge(paths?: string[]): string[] {
    // if paths passed deleted them from entery paths
    if (paths) for (const p of paths) this.entryPaths.delete(p);
    // define paths still used (active)
    const activePaths = new Set<string>();
    for (const p of this.entryPaths) {
      activePaths.add(p);
      this._recursiveGetDep(p, activePaths);
    }
    // delete any node that is no longer active
    let deletedPaths: string[] = [];
    for (const p of this.paths)
      if (!activePaths.has(p)) {
        this.deleteDep(p);
        deletedPaths.push(p);
      }
    return deletedPaths;
  }

  /**
   * Method to reset dependency class state.
   * @returns Array of deleted paths.
   */
  reset(): string[] {
    const paths = Array.from(this.paths);
    this.depGraphs = new Map();
    this.reverseDepGraphs = new Map();
    this.paths = new Set();
    this.entryPaths = new Set();
    return paths;
  }

  getDeps(node: string): string[] {
    return Array.from(this._recursiveGetDep(node));
  }

  /**
   * Method to delete path from graph. It's not advised to use it, use purge instead as manual deletion can break the graphs state.
   * @param path - Path that will be deleted.
   */
  deleteDep(path: string): void {
    // delete any edges
    const graph = this.depGraphs.get(path);
    const reverseGraph = this.reverseDepGraphs.get(path);
    if (graph)
      for (const p of graph) this.reverseDepGraphs.get(p)?.delete(path);
    if (reverseGraph)
      for (const p of reverseGraph) this.depGraphs.get(p)?.delete(path);
    // delete state of this path
    this.depGraphs.delete(path);
    this.reverseDepGraphs.delete(path);
    this.paths.delete(path);
    this.entryPaths.delete(path);
  }

  /**
   * Method to add new paths.
   * @param path - Path that will be added.
   * @param entery - Boolean to indicate if path is an entry path.
   */
  addDep(path: string, entery?: boolean) {
    if (!this.depGraphs.has(path)) this.depGraphs.set(path, new Set());
    if (!this.reverseDepGraphs.has(path))
      this.reverseDepGraphs.set(path, new Set());
    this.paths.add(path);
    if (entery) this.entryPaths.add(path);
  }

  /**
   * Method to bind paths and check for circular dependency. Note that it will abort bind if circular dependency is found.
   * @param modulePath - Path of the current module.
   * @param targetPath - Path of the imported module.
   * @returns - null if no circular dependency is present or array of paths of the circular dependency.
   */
  bindPaths(modulePath: string, targetPath: string): string[] | null {
    // if two paths are the same return directly
    if (modulePath === targetPath) return [modulePath, targetPath];

    // ensure paths exist
    this.addDep(modulePath);
    this.addDep(targetPath);

    // get module path graph
    const graph = this.depGraphs.get(modulePath);
    const reverseGraph = this.reverseDepGraphs.get(targetPath);

    // add modulePath -> targetPath in graph
    graph!.add(targetPath);
    // add targetPath -> modulePath in reverse graph
    reverseGraph!.add(modulePath);

    // Now check if there's a path from targetPath back to modulePath. If so, we constructed a cycle. delete association and return cycle
    const path = this._findPath(targetPath, modulePath);
    if (path) {
      graph!.delete(targetPath);
      reverseGraph!.delete(modulePath);
      // path is [targetPath, ..., modulePath], cycle: [modulePath, targetPath, ..., modulePath]
      return [modulePath, ...path];
    }

    return null;
  }

  /** Method to recursively add dependencies of entery path to a set. */
  private _recursiveGetDep(
    node: string,
    set = new Set<string>(),
    visited = new Set<string>()
  ): Set<string> {
    // safe guard from infinite loops
    if (visited.has(node)) return set;
    visited.add(node);

    // get graph for this node
    const g = this.depGraphs.get(node);
    if (!g) return set;

    // add dependencies of graph to the set and call the recrusive call for them as well
    for (const d of g) {
      set.add(d);
      this._recursiveGetDep(d, set, visited);
    }

    // return set
    return set;
  }

  /** Method to find path of circular dependency. */
  private _findPath(start: string, target: string): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      if (visited.has(node)) return false;
      visited.add(node);
      path.push(node);

      if (node === target) return true;

      const neighbors = this.depGraphs.get(node);
      if (neighbors) {
        for (const n of neighbors) {
          if (dfs(n)) return true;
        }
      }

      path.pop();
      return false;
    };

    return dfs(start) ? [...path] : null;
  }
}
