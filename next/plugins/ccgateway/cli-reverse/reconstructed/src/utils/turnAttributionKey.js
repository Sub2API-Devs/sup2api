/**
 * utils/turnAttributionKey.ts
 *
 * 2.1.316 新增：回合归因键的读取与校验（消息自带、任务通知继承、跨会话禁用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeUuidOrNull } from "./agentId.js";

//@ chunk-exfmq47h.js:875452-875526 placement
/**
 * 取跨会话继承的回合归属键（跨会话时不给）。
 */
function inheritedAttributionKey(uuid, { isCrossSession }) {
  return !isCrossSession && typeof uuid === "string" ? uuid : undefined;
}
//@ chunk-exfmq47h.js:875526-875706 placement
/**
 * 取消息的回合归因键（任务通知继承）。
 */
function messageTurnAttributionKey(command) {
  if (command.turnAttributionKey !== undefined) return command.turnAttributionKey;
  return command.mode === "task-notification" || command.resumeReason !== undefined
    ? attributionKeyOrUndefined(command.inheritedTurnAttributionKey)
    : undefined;
}
//@ chunk-exfmq47h.js:875801-875838 placement
/**
 * 规范化归属键（空值转 undefined）。
 */
function attributionKeyOrUndefined(value) {
  return normalizeUuidOrNull(value) ?? undefined;
}
//@ chunk-exfmq47h.js:875838-875973 placement
/**
 * 若消息中恰好有一条带回合归属键的非 meta 消息，返回其归属键。
 */
function turnAttributionKeyOf(messages) {
  let filtered = messages.filter((message) => message.turnAttributionKey !== undefined && !message.isMeta);
  return filtered.length === 1 ? attributionKeyOrUndefined(filtered[0]?.turnAttributionKey) : undefined;
}
export {
  attributionKeyOrUndefined,
  messageTurnAttributionKey,
  turnAttributionKeyOf,
  inheritedAttributionKey,
};
