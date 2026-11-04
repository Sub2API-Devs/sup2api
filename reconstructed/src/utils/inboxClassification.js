/**
 * utils/inboxClassification.ts
 *
 * 2.1.316 新增：收件箱消息的分类缓存（判定结果复用策略 until/always）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (4)
 * attribution: placement 4
 */
import { count } from "./collections.js";
import { isToolResultMessage } from "./messageProvenance.js";
import { logForDebugging } from "./debug.js";

//@ chunk-0sfjpx19.js:129913-130039 placement
/**
 * 对话快照：非 progress 消息数与最后一条非 progress 消息的 uuid。
 */
function conversationSnapshot(messages) {
  return {
    messageCount: count(messages, (message) => message.type !== "progress"),
    lastMessageUuid: messages.findLast((message) => message.type !== "progress")?.uuid,
  };
}
//@ chunk-0sfjpx19.js:130039-130110 placement
/**
 * 找出最后一条真实用户消息的 uuid。
 */
function lastRealUserUuid(messages) {
  return messages.findLast((message) => message.type === "user" && !isToolResultMessage(message))?.uuid;
}
//@ chunk-0sfjpx19.js:130110-130124 placement
var MAX_VERDICT_TTL_MS = 300000;
//@ chunk-0sfjpx19.js:130124-131202 placement
/**
 * 按（发送者,类型）缓存消息分类判定，支持 until 过期复用。
 */
class InboxVerdictCache {
  now;
  verdicts = new Map();
  constructor(now = Date.now) {
    this.now = now;
  }
  getOrClassify(host, port, watermark, classify) {
    let cacheKey = `${host}:${port ?? "*"}`;
    let cachedEntry = this.verdicts.get(cacheKey);
    if (cachedEntry?.reuse === "until") {
      let holdMs = cachedEntry.heldUntil === undefined ? 0 : cachedEntry.heldUntil - this.now();
      if (holdMs > 0 && holdMs <= MAX_VERDICT_TTL_MS) return cachedEntry.promise;
    } else if (
      cachedEntry &&
      (cachedEntry.reuse === "always" ||
        (cachedEntry.watermark.messageCount === watermark.messageCount &&
          cachedEntry.watermark.lastMessageUuid === watermark.lastMessageUuid))
    )
      return cachedEntry.promise;
    let classificationPromise = classify();
    let entry = {
      promise: classificationPromise.then((outcome) => outcome.allow),
      watermark,
      reuse: undefined,
    };
    this.verdicts.set(cacheKey, entry);
    classificationPromise.then(
      (result) => {
        if (result.unavailable && !result.transcriptTooLong) {
          if (
            !result.allow &&
            typeof result.retryAfterMs === "number" &&
            Number.isFinite(result.retryAfterMs) &&
            result.retryAfterMs > 0
          ) {
            let min = Math.min(result.retryAfterMs, MAX_VERDICT_TTL_MS);
            entry.reuse = "until";
            entry.heldUntil = this.now() + min;
            if (this.verdicts.get(cacheKey) === entry)
              logForDebugging(
                `Sandbox network classifier was told to wait by the API; holding the deny of ${cacheKey} for ${min} ms`,
                {
                  level: "warn",
                },
              );
            return;
          }
          if (this.verdicts.get(cacheKey) === entry) this.verdicts.delete(cacheKey);
          return;
        }
        entry.reuse = result.allow || result.transcriptTooLong ? "same-transcript" : "always";
      },
      () => {
        if (this.verdicts.get(cacheKey) === entry) this.verdicts.delete(cacheKey);
      },
    );
    return entry.promise;
  }
  clear() {
    this.verdicts.clear();
  }
}
export { InboxVerdictCache, conversationSnapshot, lastRealUserUuid };
