/**
 * ink/bidi.ts
 *
 * 双向文本（RTL）重排判断与处理（Windows Terminal/VS Code 需要应用层重排）；本模块现有声明多为误归
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/bidi.ts
 * pieces: chunk-2avr6cej.js (3)
 * attribution: placement 2, layout 1
 */
import { env } from "../utils/env.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:275441-275592 placement
class BidiNeedDetector {
  needed;
  isNeeded() {
    if (this.needed === undefined)
      this.needed = typeof process.env.WT_SESSION === "string" || env.TERM_PROGRAM === "vscode";
    return this.needed;
  }
}
//@ chunk-2avr6cej.js:275592-275617 layout
var bidiNeedByHost; // deferred: uses BidiNeedDetector of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2avr6cej.js:275592", () => {
  bidiNeedByHost = new HostScoped(() => new BidiNeedDetector());
});
//@ chunk-2avr6cej.js:275617-275665 placement
/**
 * 当前终端是否需要 Ink 自己做双向文本重排（Windows Terminal、VS Code 终端），传给 CellSegmenter 的 reorder 参数。
 */
function needsBidiReorder() {
  return bidiNeedByHost.of(getRootSession().host).isNeeded();
}
export { needsBidiReorder };
