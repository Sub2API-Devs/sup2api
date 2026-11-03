/**
 * utils/plugins/pluginsChangedSignal.ts
 *
 * 2.1.316 新增：插件变化信号
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { createLazySignal } from "../signal.js";
import { getHostState } from "../hostEnvironment.js";

//@ chunk-e6aww6q8.js:2077220-2077254 placement
var Jz = createLazySignal(() => getHostState().skillsChanged);

export { Jz };
