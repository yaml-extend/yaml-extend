import { load } from "../src/index";

const loaded = load("./test.yaml", { basePath: "./test", filename: "test" });

console.debug(loaded);
