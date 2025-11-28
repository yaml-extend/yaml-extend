import { parseExtend } from "../src/core/parse/index.js";
import { LiveParser } from "../src/core/liveParser/index.js";

const parser = new LiveParser({
  returnState: true,
  unsafe: true,
  ignoreTags: true,
});
const parsed1 = await parser.parse("./test/test.yaml");
const parsed2 = await parser.parse("./test");
console.debug(parsed1.parse, parsed1.errors);
console.debug(parsed2.parse, parsed2.errors);
