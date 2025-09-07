/**
 * Class to handle circular dependency checks.
 */
export class CircularDepHandler {
  /** adjacency list: node -> set of dependencies (edges node -> dep) */
  #graphs: Map<string, Map<string, Set<string>>> = new Map();

  /**
   * Method to handle checking of the circular dependency.
   * @param modulePath - Path of the current module.
   * @param targetPath - Path of the imported module.
   * @param loadId - Unique id that identifies this load.
   * @returns - null if no circular dependency is present or array of paths or the circular dependency.
   */
  addDep(
    modulePath: string,
    targetPath: string | undefined,
    loadId: string
  ): string[] | null {
    // get graph for this loadId
    let graph = this.#graphs.get(loadId);
    if (!graph) {
      graph = new Map();
      this.#graphs.set(loadId, graph);
    }

    // ensure nodes exist
    if (!graph.has(modulePath)) graph.set(modulePath, new Set());

    // root/initial load — nothing to check
    if (!targetPath) return null;

    if (!graph.has(targetPath)) graph.set(targetPath, new Set());

    // add the edge modulePath -> targetPath
    graph.get(modulePath)!.add(targetPath);

    // Now check if there's a path from targetPath back to modulePath.
    // If so, we constructed a cycle.
    const path = this.#findPath(targetPath, modulePath, graph);
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
   * @param loadId - Unique id that identifies this load.
   */
  deleteDep(modulePath: string, loadId: string): void {
    // get graph for this loadId
    const graph = this.#graphs.get(loadId);
    if (!graph) return;

    // remove outgoing edges (delete node key)
    if (graph.has(modulePath)) graph.delete(modulePath);

    // remove incoming edges from other nodes
    for (const [k, deps] of graph.entries()) {
      deps.delete(modulePath);
    }
  }

  /**
   * Method to delete all dependency nodes (path of a module) of specific loadId from graphs.
   * @param loadId - Unique id that identifies this load.
   */
  deleteLoadId(loadId: string): void {
    this.#graphs.delete(loadId);
  }

  /** Method to find path of circular dependency. */
  #findPath(
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

/** Class to handle circular dependency check. */
export const circularDepClass = new CircularDepHandler();
