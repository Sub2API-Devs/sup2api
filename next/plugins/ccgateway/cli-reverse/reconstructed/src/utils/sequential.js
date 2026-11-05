/**
 * utils/sequential.ts
 *
 * 把异步函数包装为串行执行（同一时刻只运行一个调用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sequential.ts
 * pieces: chunk-h88kgep4.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { chalkLevel, colorSupport } from "../ink/colorize.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-h88kgep4.js:8625-8859 fingerprint (2.1.88 match: sequential, 0.368)
/**
 * 把异步函数包装成串行执行：上一调用完成后才开始下一调用（Proxy 惰性初始化）。
 */
var sequential; // deferred: uses chalkLevel (../ink/colorize.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h88kgep4.js:8625", () => {
  sequential = new Proxy(chalkLevel, {
    get(target, prop) {
      colorSupport.ensureInit();
      return Reflect.get(target, prop, target);
    },
    set(target, prop, value) {
      colorSupport.ensureInit();
      return Reflect.set(target, prop, value, target);
    },
    has(target, prop) {
      colorSupport.ensureInit();
      return Reflect.has(target, prop);
    },
    apply(target, thisArg, args) {
      colorSupport.ensureInit();
      return Reflect.apply(target, thisArg, args);
    },
  });
});
export { sequential };
