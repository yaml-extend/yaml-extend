import { parseExtend } from "../src/core/parse/index.js";

const parsed = await parseExtend("./test/test.yaml", {
  ignoreTags: true,
});

console.dir(parsed, { depth: 10 });
