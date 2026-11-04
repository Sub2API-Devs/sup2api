/**
 * utils/subprocessEnvLoader.ts
 *
 * 2.1.316 新增：子进程环境加载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4svv9e16.js (1)
 * attribution: placement 1
 */
import { createEnvAccessor } from "./env/envRegistry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-4svv9e16.js:227-294 placement
var toolServerShape; // deferred: loads other modules while loading; runs once its import cycle is complete
var toolServerEnvAccessor;
deferInit("chunk-4svv9e16.js:227", () => {
  toolServerShape = require("../remote/tools/toolServerShape.lazy.js").toolServerShape;
  toolServerEnvAccessor = createEnvAccessor(toolServerShape, null);
});
export { toolServerEnvAccessor };
