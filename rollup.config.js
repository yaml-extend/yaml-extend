import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  external: ["path", "fs", "fs/promises", "crypto", "yaml"],
  output: [
    { file: "dist/cjs/index.js", format: "cjs", sourcemap: true },
    { file: "dist/esm/index.js", format: "esm", sourcemap: true },
  ],
  plugins: [
    typescript({
      tsconfig: "./tsconfig.build.json",
    }),
  ],
};
