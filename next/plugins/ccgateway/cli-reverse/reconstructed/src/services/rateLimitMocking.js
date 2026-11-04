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
import {
  isRateLimitMockingEnabled,
  getDisabledMockRateLimitState,
  checkQuotaStatus,
} from "./claudeAiLimits.js";
import { APIError } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { hasFastModeRateLimitDuration, checkFastModeRateLimit } from "./api/verificationRequired.js";

//@ chunk-w5ndchqs.js:8434-9271 fingerprint (2.1.88 match: checkMockRateLimitError, 1)
/**
 * 限额模拟启用时生成模拟 429 错误（无头 429 文案、快速模式限额、unified 被拒且无 overage），否则 null。
 */
function checkMockRateLimitError(currentModel, isFastModeActive) {
  if (!isRateLimitMockingEnabled()) return null;
  let headerlessMessage = getDisabledMockRateLimitState();
  if (headerlessMessage)
    return new APIError(
      429,
      {
        error: {
          type: "rate_limit_error",
          message: headerlessMessage,
        },
      },
      headerlessMessage,
      new globalThis.Headers(),
    );
  let mockHeaders = checkQuotaStatus();
  if (!mockHeaders) return null;
  let status = mockHeaders["anthropic-ratelimit-unified-status"];
  let overageStatus = mockHeaders["anthropic-ratelimit-unified-overage-status"];
  let isOpusLimit = mockHeaders["anthropic-ratelimit-unified-representative-claim"] === "seven_day_opus";
  let isUsingOpus = currentModel.includes("opus");
  if (isOpusLimit && !isUsingOpus) return null;
  if (hasFastModeRateLimitDuration()) {
    let fastModeHeaders = checkFastModeRateLimit(isFastModeActive);
    if (fastModeHeaders === null) return null;
    return new APIError(
      429,
      {
        error: {
          type: "rate_limit_error",
          message: "Rate limit exceeded",
        },
      },
      "Rate limit exceeded",
      new globalThis.Headers(Object.entries(fastModeHeaders).filter(([key, v]) => v !== undefined)),
    );
  }
  if (status === "rejected" && (!overageStatus || overageStatus === "rejected"))
    return new APIError(
      429,
      {
        error: {
          type: "rate_limit_error",
          message: "Rate limit exceeded",
        },
      },
      "Rate limit exceeded",
      new globalThis.Headers(Object.entries(mockHeaders).filter(([key, v]) => v !== undefined)),
    );
  return null;
}
export { checkMockRateLimitError };
