/**
 * services/rateLimitMocking.ts
 *
 * 内部测试：模拟限额开启时把模拟头转成 429 错误抛给请求方。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/rateLimitMocking.ts
 * pieces: chunk-w5ndchqs.js (1)
 * attribution: fingerprint 1
 */
import { isRateLimitMockingEnabled, Ewi, checkQuotaStatus } from "./claudeAiLimits.js";
import { Ot } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { Awi, Cwi } from "./api/verificationRequired.js";

/**
 * 限额模拟启用时生成模拟 429 错误（无头 429 文案、快速模式限额、unified 被拒且无 overage），否则 null。
 */
//@ chunk-w5ndchqs.js:8434-9271 fingerprint = checkMockRateLimitError (1)
function checkMockRateLimitError(currentModel, isFastModeActive) {
  if (!isRateLimitMockingEnabled()) return null;
  let headerlessMessage = Ewi();
  if (headerlessMessage)
    return new Ot(
      429,
      { error: { type: "rate_limit_error", message: headerlessMessage } },
      headerlessMessage,
      new globalThis.Headers(),
    );
  let mockHeaders = checkQuotaStatus();
  if (!mockHeaders) return null;
  let d = mockHeaders["anthropic-ratelimit-unified-status"],
    m = mockHeaders["anthropic-ratelimit-unified-overage-status"],
    isOpusLimit = mockHeaders["anthropic-ratelimit-unified-representative-claim"] === "seven_day_opus",
    isUsingOpus = currentModel.includes("opus");
  if (isOpusLimit && !isUsingOpus) return null;
  if (Awi()) {
    let fastModeHeaders = Cwi(isFastModeActive);
    if (fastModeHeaders === null) return null;
    return new Ot(
      429,
      { error: { type: "rate_limit_error", message: "Rate limit exceeded" } },
      "Rate limit exceeded",
      new globalThis.Headers(Object.entries(fastModeHeaders).filter(([U, S]) => S !== void 0)),
    );
  }
  if (d === "rejected" && (!m || m === "rejected"))
    return new Ot(
      429,
      { error: { type: "rate_limit_error", message: "Rate limit exceeded" } },
      "Rate limit exceeded",
      new globalThis.Headers(Object.entries(mockHeaders).filter(([R, U]) => U !== void 0)),
    );
  return null;
}

export { checkMockRateLimitError };
