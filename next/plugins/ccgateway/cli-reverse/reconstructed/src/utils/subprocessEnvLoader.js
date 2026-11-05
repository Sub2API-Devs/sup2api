/**
 * utils/subprocessEnvLoader.ts
 *
 * 2.1.316 新增：子进程环境加载
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-txwwx1y1.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createEnvAccessor } from "./env/envRegistry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-txwwx1y1.js:227-294 placement
var toolServerShape; // deferred: loads other modules while loading; runs once its import cycle is complete
var toolServerEnvAccessor;
deferInit("chunk-txwwx1y1.js:227", () => {
  toolServerShape = require("../remote/tools/toolServerShape.lazy.js").toolServerShape;
  toolServerEnvAccessor = createEnvAccessor(toolServerShape, null);
});
export { toolServerEnvAccessor };
