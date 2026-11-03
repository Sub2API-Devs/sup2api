/**
 * ink/bidi.ts
 *
 * 双向文本（RTL）重排判断与处理（Windows Terminal/VS Code 需要应用层重排）；本模块现有声明多为误归
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/bidi.ts
 * pieces: chunk-bzr73sfg.js (3)
 * attribution: placement 2, layout 1
 */
import { env } from "../utils/env.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-bzr73sfg.js:275860-276011 placement
class BidiNeedDetector {
  needed;
  isNeeded() {
    if (this.needed === void 0)
      this.needed = typeof process.env.WT_SESSION === "string" || env.TERM_PROGRAM === "vscode";
    return this.needed;
  }
}
//@ chunk-bzr73sfg.js:276011-276036 layout
var bidiNeedByHost = new HostScoped(() => new BidiNeedDetector());
/**
 * 当前终端是否需要 Ink 自己做双向文本重排（Windows Terminal、VS Code 终端），传给 CellSegmenter 的 reorder 参数。
 */
//@ chunk-bzr73sfg.js:276036-276084 placement
function needsBidiReorder() {
  return bidiNeedByHost.of(getRootSession().host).isNeeded();
}

export { needsBidiReorder };
