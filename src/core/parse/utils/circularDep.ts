/**
 * Class to handle circular dependency checks.
 */
export class CircularDepHandler {
  /** adjacency list: node -> set of dependencies (edges node -> dep) */
  private _graphs: Map<string, Set<string>> = new Map();

  /**
   * Method to handle checking of the circular dependency.
   * @param modulePath - Path of the current module.
   * @param targetPath - Path of the imported module.
   * @returns - null if no circular dependency is present or array of paths or the circular dependency.
   */
  addDep(modulePath: string, targetPath: string | undefined): string[] | null {
    // ensure nodes exist
    if (!this._graphs.has(modulePath)) this._graphs.set(modulePath, new Set());

    // root/initial load — nothing to check
    if (!targetPath) return null;

    if (!this._graphs.has(targetPath)) this._graphs.set(targetPath, new Set());

    // add the edge modulePath -> targetPath
    this._graphs.get(modulePath)!.add(targetPath);

    // Now check if there's a path from targetPath back to modulePath.
    // If so, we constructed a cycle.
    const path = this._findPath(targetPath, modulePath, this._graphs);
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
   */
  deleteDep(modulePath: string): void {
    // remove outgoing edges (delete node key)
    if (this._graphs.has(modulePath)) this._graphs.delete(modulePath);

    // remove incoming edges from other nodes
    for (const [k, deps] of this._graphs.entries()) {
      deps.delete(modulePath);
    }
  }

  /** Method to find path of circular dependency. */
  private _findPath(
    start: string,
    target: string,
    graph: Map<string, Set<string>>
  ): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      if (visited.has(node)) return false;
      visited.add(node);
      path.push(node);

      if (node === target) return true;

      const neighbors = graph.get(node);
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
