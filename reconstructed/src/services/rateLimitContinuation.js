/**
 * services/rateLimitContinuation.ts
 *
 * 2.1.316 新增：速率限制后继续的套餐判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9694pmdw.js (8)
 * attribution: placement 8
 */
import { randomUUID } from "crypto";
import {
  isClaudeAISubscriber,
  getOauthAccountInfo,
  getSubscriptionType,
  getRateLimitTier,
} from "../utils/auth.js";
import { isFirstPartyApiBackend } from "../utils/model/providers.js";
import { getIsInteractive, getIsRemoteMode, mainAgentId } from "../bootstrap/state.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { isAutoResumableLimit } from "./api/errors.js";
import { enqueueCommand } from "../utils/messageQueueManager.js";

//@ chunk-9694pmdw.js:392-597 placement
function getSubscriptionTier(e, r) {
  switch (e) {
    case "pro":
      return "pro";
    case "max":
      switch (r) {
        case "default_claude_max_5x":
          return "max_5x";
        case "default_claude_max_20x":
          return "max_20x";
        default:
          return "max_other";
      }
    default:
      return "other";
  }
}
//@ chunk-9694pmdw.js:597-744 placement
var AUTO_CONTINUE_PROMPT =
  "You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";
//@ chunk-9694pmdw.js:744-832 placement
function Qce() {
  return (
    isClaudeAISubscriber() &&
    getOauthAccountInfo()?.billingType !== "usage_based" &&
    isFirstPartyApiBackend() &&
    getIsInteractive() &&
    !getIsRemoteMode() &&
    !isBgSession()
  );
}
//@ chunk-9694pmdw.js:832-899 placement
function WQe(e) {
  return Qce() && isAutoResumableLimit(e) && e.rateLimitType === "five_hour";
}
//@ chunk-9694pmdw.js:899-996 placement
var n = ["five_hour", "seven_day", "seven_day_overage_included", "seven_day_opus", "seven_day_sonnet"];
//@ chunk-9694pmdw.js:996-1087 placement
function hin(e) {
  return Qce() && isAutoResumableLimit(e) && e.rateLimitType !== void 0 && n.includes(e.rateLimitType);
}
//@ chunk-9694pmdw.js:1087-1122 placement
function JTe() {
  return getSubscriptionTier(getSubscriptionType(), getRateLimitTier());
}
/**
 * 用量限制解除后把自动继续提示（meta、低优先级、跳过斜杠命令）排入主 agent 的命令队列。
 */
//@ chunk-9694pmdw.js:1122-1269 placement
function enqueueAutoContinuation() {
  enqueueCommand({
    agentId: mainAgentId(),
    mode: "prompt",
    priority: "later",
    value: AUTO_CONTINUE_PROMPT,
    uuid: randomUUID(),
    origin: { kind: "auto-continuation" },
    isMeta: !0,
    skipSlashCommands: !0,
  });
}

export { WQe, Qce, JTe, enqueueAutoContinuation, hin };
