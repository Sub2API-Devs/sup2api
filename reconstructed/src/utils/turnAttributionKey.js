/**
 * utils/turnAttributionKey.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (4)
 * attribution: placement 4
 */
import { Vt } from "./agentId.js";

//@ chunk-aepeg2w5.js:853069-853143 placement
function GRn(e, { isCrossSession: isCrossSession }) {
  return !isCrossSession && typeof e === "string" ? e : void 0;
}
/**
 * 取消息的回合归因键（任务通知继承）。
 */
//@ chunk-aepeg2w5.js:853143-853323 placement
function messageTurnAttributionKey(e) {
  if (e.turnAttributionKey !== void 0) return e.turnAttributionKey;
  return e.mode === "task-notification" || e.resumeReason !== void 0
    ? Rlt(e.inheritedTurnAttributionKey)
    : void 0;
}
//@ chunk-aepeg2w5.js:853418-853455 placement
function Rlt(e) {
  return Vt(e) ?? void 0;
}
/**
 * 若消息中恰好有一条带回合归属键的非 meta 消息，返回其归属键。
 */
//@ chunk-aepeg2w5.js:853455-853590 placement
function turnAttributionKeyOf(e) {
  let filtered = e.filter((r) => r.turnAttributionKey !== void 0 && !r.isMeta);
  return filtered.length === 1 ? Rlt(filtered[0]?.turnAttributionKey) : void 0;
}

export { messageTurnAttributionKey, turnAttributionKeyOf, GRn, Rlt };
