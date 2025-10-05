import { load } from "../src/index";

const loaded = load("./test.yaml", {
  basePath: "./test",
  filename: "test",
  ignorePrivate: "all",
});

console.debug(loaded);
