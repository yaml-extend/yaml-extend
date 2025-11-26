import { parseExtend } from "../src/core/parse/index.js";

const parsed = await parseExtend("./test.yaml", {
  basePath: "./test",
  ignoreTags: true,
});

console.dir(parsed, { depth: 10 });
