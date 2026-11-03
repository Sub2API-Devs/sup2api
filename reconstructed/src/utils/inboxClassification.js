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

/**
 * 对话快照：非 progress 消息数与最后一条非 progress 消息的 uuid。
 */
//@ chunk-0sfjpx19.js:129913-130039 placement
function conversationSnapshot(e) {
  return {
    messageCount: count(e, (n) => n.type !== "progress"),
    lastMessageUuid: e.findLast((n) => n.type !== "progress")?.uuid,
  };
}
//@ chunk-0sfjpx19.js:130039-130110 placement
function bAs(e) {
  return e.findLast((n) => n.type === "user" && !isToolResultMessage(n))?.uuid;
}
//@ chunk-0sfjpx19.js:130110-130124 placement
var Dr = 300000;
/**
 * 按（发送者,类型）缓存消息分类判定，支持 until 过期复用。
 */
//@ chunk-0sfjpx19.js:130124-131202 placement
class InboxVerdictCache {
  now;
  verdicts = new Map();
  constructor(e = Date.now) {
    this.now = e;
  }
  getOrClassify(e, n, r, s) {
    let h = `${e}:${n ?? "*"}`,
      y = this.verdicts.get(h);
    if (y?.reuse === "until") {
      let k = y.heldUntil === void 0 ? 0 : y.heldUntil - this.now();
      if (k > 0 && k <= Dr) return y.promise;
    } else if (
      y &&
      (y.reuse === "always" ||
        (y.watermark.messageCount === r.messageCount && y.watermark.lastMessageUuid === r.lastMessageUuid))
    )
      return y.promise;
    let _ = s(),
      b = { promise: _.then((k) => k.allow), watermark: r, reuse: void 0 };
    return (
      this.verdicts.set(h, b),
      _.then(
        (k) => {
          if (k.unavailable && !k.transcriptTooLong) {
            if (
              !k.allow &&
              typeof k.retryAfterMs === "number" &&
              Number.isFinite(k.retryAfterMs) &&
              k.retryAfterMs > 0
            ) {
              let min = Math.min(k.retryAfterMs, Dr);
              if (((b.reuse = "until"), (b.heldUntil = this.now() + min), this.verdicts.get(h) === b))
                logForDebugging(
                  `Sandbox network classifier was told to wait by the API; holding the deny of ${h} for ${min} ms`,
                  { level: "warn" },
                );
              return;
            }
            if (this.verdicts.get(h) === b) this.verdicts.delete(h);
            return;
          }
          b.reuse = k.allow || k.transcriptTooLong ? "same-transcript" : "always";
        },
        () => {
          if (this.verdicts.get(h) === b) this.verdicts.delete(h);
        },
      ),
      b.promise
    );
  }
  clear() {
    this.verdicts.clear();
  }
}

export { InboxVerdictCache, conversationSnapshot, bAs };
