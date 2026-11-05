/**
 * utils/env/codeModeEnv.ts
 *
 * Code 模式的环境变量形状（开关、重启原因枚举、重启来源）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b0ffgtxf.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createEnvAccessor } from "./envRegistry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b0ffgtxf.js:227-293 placement
/**
 * Code 模式环境变量 shape 的访问器（ome）。
 */
var codeModeShape; // deferred: loads other modules while loading; runs once its import cycle is complete
var codeModeEnv;
deferInit("chunk-b0ffgtxf.js:227", () => {
  codeModeShape = require("../../constants/codeModeShape.lazy.js").codeModeShape;
  codeModeEnv = createEnvAccessor(codeModeShape, null);
});
export { codeModeEnv };
