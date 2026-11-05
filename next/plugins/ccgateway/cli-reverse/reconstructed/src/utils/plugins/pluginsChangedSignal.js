/**
 * utils/plugins/pluginsChangedSignal.ts
 *
 * 2.1.316 新增：插件变化信号
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { createLazySignal } from "../signal.js";
import { getHostState } from "../hostEnvironment.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2133613-2133647 placement
/**
 * skillsChangedSignal：技能变更的惰性信号。
 */
var skillsChangedSignal; // deferred: uses getHostState (../hostEnvironment.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2133613", () => {
  skillsChangedSignal = createLazySignal(() => getHostState().skillsChanged);
});
export { skillsChangedSignal };
