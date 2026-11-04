/**
 * ink/line-width-cache.ts
 *
 * 并入已有模块：推进输入解析状态机（粘贴、鼠标前缀丢弃），产出按键；超时后刷出未完成的转义序列等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/line-width-cache.ts
 * pieces: chunk-bzr73sfg.js (4)
 * attribution: placement 2, layout 1, callgraph-witnessed 1
 */
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { bunStringWidth } from "./stringWidth.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bzr73sfg.js:175327-175339 placement
var MAX_LINE_WIDTH_CACHE_SIZE = 4096;
//@ chunk-bzr73sfg.js:175339-175544 placement
/**
 * 按行字符串缓存显示宽度（bunStringWidth），满 4096 条清空。
 */
class LineWidthCache {
  #e = new Map();
  measure(line) {
    let cached = this.#e.get(line);
    if (cached !== undefined) return cached;
    let width = bunStringWidth(line);
    if (this.#e.size >= MAX_LINE_WIDTH_CACHE_SIZE) this.#e.clear();
    this.#e.set(line, width);
    return width;
  }
  get size() {
    return this.#e.size;
  }
  reset() {
    this.#e.clear();
  }
}
//@ chunk-bzr73sfg.js:175544-175558 layout
var lineWidthCache; // deferred: uses LineWidthCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bzr73sfg.js:175544", () => {
  lineWidthCache = new LineWidthCache();
});
//@ chunk-bzr73sfg.js:175558-175595 callgraph-witnessed = lineWidth (0)
/**
 * 取一行文本的显示宽度（带缓存）。
 */
function lineWidth(line) {
  return lineWidthCache.measure(line);
}
export { lineWidth };
