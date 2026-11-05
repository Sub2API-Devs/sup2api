/**
 * ink/components/StdinContext.ts
 *
 * StdinContext（stdin、原始模式开关、输入事件订阅）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/StdinContext.ts
 * pieces: chunk-xd1cb3xs.js (2)
 * attribution: fingerprint 2
 */
import { createContext } from "../../../vendor/react/cjs/react.production.js";
import { EventEmitter } from "../events/emitter.js";
import { createJediTermInputState } from "../wheelScroll.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xd1cb3xs.js:8499-8649 fingerprint (2.1.88 match: StdinContext, 0.897)
/**
 * Ink 内部 stdin 上下文：stdin 流、setRawMode、是否支持原始模式、内部事件发射器、终端查询器、JediTerm 输入状态。
 */
var StdinContext; // deferred: uses createJediTermInputState (../wheelScroll.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xd1cb3xs.js:8499", () => {
  StdinContext = createContext({
    stdin: process.stdin,
    internal_eventEmitter: new EventEmitter(),
    setRawMode() {},
    isRawModeSupported: false,
    internal_querier: null,
    internal_jediTermInput: createJediTermInputState(),
  });
});
//@ chunk-xd1cb3xs.js:8649-8686 fingerprint
// deferred: uses StdinContext of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xd1cb3xs.js:8649", () => {
  StdinContext.displayName = "InternalStdinContext";
});
export { StdinContext };
