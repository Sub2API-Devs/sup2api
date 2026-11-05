/**
 * services/rateLimitContinuation.ts
 *
 * 2.1.316 新增：速率限制后继续的套餐判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gemvyf2t.js (8)
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
import { enqueue } from "../utils/messageQueueManager.js";

//@ chunk-gemvyf2t.js:392-597 placement
function getSubscriptionTier(subscriptionType, rateLimitTier) {
  switch (subscriptionType) {
    case "pro":
      return "pro";
    case "max":
      switch (rateLimitTier) {
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
//@ chunk-gemvyf2t.js:597-744 placement
var AUTO_CONTINUE_PROMPT =
  "You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";
//@ chunk-gemvyf2t.js:744-832 placement
/**
 * 判断是否满足自动续写条件。
 */
function isAutoContinueEligible() {
  return (
    isClaudeAISubscriber() &&
    getOauthAccountInfo()?.billingType !== "usage_based" &&
    isFirstPartyApiBackend() &&
    getIsInteractive() &&
    !getIsRemoteMode() &&
    !isBgSession()
  );
}
//@ chunk-gemvyf2t.js:832-899 placement
/**
 * 判断 5 小时额度是否可自动恢复。
 */
function isFiveHourAutoResumable(limits) {
  return isAutoContinueEligible() && isAutoResumableLimit(limits) && limits.rateLimitType === "five_hour";
}
//@ chunk-gemvyf2t.js:899-996 placement
var AUTO_RESUMABLE_LIMIT_TYPES = [
  "five_hour",
  "seven_day",
  "seven_day_overage_included",
  "seven_day_opus",
  "seven_day_sonnet",
];
//@ chunk-gemvyf2t.js:996-1087 placement
/**
 * 判断某额度类型是否支持自动恢复。
 */
function canAutoResumeLimitType(limits) {
  return (
    isAutoContinueEligible() &&
    isAutoResumableLimit(limits) &&
    limits.rateLimitType !== undefined &&
    AUTO_RESUMABLE_LIMIT_TYPES.includes(limits.rateLimitType)
  );
}
//@ chunk-gemvyf2t.js:1087-1122 placement
/**
 * 由订阅类型与限额档位得到订阅等级。
 */
function currentSubscriptionTier() {
  return getSubscriptionTier(getSubscriptionType(), getRateLimitTier());
}
//@ chunk-gemvyf2t.js:1122-1269 placement
/**
 * 用量限制解除后把自动继续提示（meta、低优先级、跳过斜杠命令）排入主 agent 的命令队列。
 */
function enqueueAutoContinuation() {
  enqueue({
    agentId: mainAgentId(),
    mode: "prompt",
    priority: "later",
    value: AUTO_CONTINUE_PROMPT,
    uuid: randomUUID(),
    origin: {
      kind: "auto-continuation",
    },
    isMeta: true,
    skipSlashCommands: true,
  });
}
export {
  isAutoContinueEligible,
  currentSubscriptionTier,
  isFiveHourAutoResumable,
  enqueueAutoContinuation,
  canAutoResumeLimitType,
};
