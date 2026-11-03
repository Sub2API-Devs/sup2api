/**
 * utils/sequential.ts
 *
 * 把异步函数包装为串行执行（同一时刻只运行一个调用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sequential.ts
 * pieces: chunk-4ymxyb4g.js (1)
 * attribution: fingerprint 1
 */
import { chalkLevel, colorSupport } from "../ink/colorize.js";

//@ chunk-4ymxyb4g.js:8705-8939 fingerprint = sequential (0.367)
/**
 * 把异步函数包装成串行执行：上一调用完成后才开始下一调用（Proxy 惰性初始化）。
 */
var sequential = new Proxy(chalkLevel, {
  get(e, r) {
    colorSupport.ensureInit();
    return Reflect.get(e, r, e);
  },
  set(e, r, t) {
    colorSupport.ensureInit();
    return Reflect.set(e, r, t, e);
  },
  has(e, r) {
    colorSupport.ensureInit();
    return Reflect.has(e, r);
  },
  apply(e, r, t) {
    colorSupport.ensureInit();
    return Reflect.apply(e, r, t);
  },
});
export { sequential };
