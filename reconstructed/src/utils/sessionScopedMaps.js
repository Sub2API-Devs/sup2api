/**
 * utils/sessionScopedMaps.ts
 *
 * 2.1.316 新增：会话作用域映射
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5vn5bpwt.js (1)
 * attribution: placement 1
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";

//@ chunk-5vn5bpwt.js:227-255 placement
/**
 * sessionScopedMapsSlot：按会话根保存的映射表。
 */
var sessionScopedMapsSlot = new SessionRootSlot(() => new Map());
export { sessionScopedMapsSlot };
