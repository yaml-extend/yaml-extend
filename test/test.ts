import { parseExtend } from "../src/core/parse/parse.js";

/// test
const y = await parseExtend("./test.yaml", { basePath: "./test" });

console.log("Y: ", y, y.errors);
