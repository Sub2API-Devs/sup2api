/**
 * services/api/firstTokenDate.ts
 *
 * 拉取组织首次使用 Claude Code 的日期（/api/organization/claude_code_first_token_date）并存入全局配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/firstTokenDate.ts
 * pieces: chunk-zbtr7f5k.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { isExpectedApiError, errorMessage } from "../../utils/errors.js";

//@ chunk-zbtr7f5k.js:1393-2222 fingerprint = fetchAndStoreClaudeCodeFirstTokenDate (0.475)
/**
 * 已有缓存则跳过；否则 GET /api/organization/claude_code_first_token_date，校验日期后写入全局配置 claudeCodeFirstTokenDate。
 */
async function fetchAndStoreClaudeCodeFirstTokenDate(e, credentials) {
  try {
    if (getGlobalConfig().claudeCodeFirstTokenDate !== undefined) {
      logFeatureOk("api_first_token_date_fetch");
      return;
    }
    let f = await apiClient.get("/api/organization/claude_code_first_token_date", {
      auth: "async",
      timeout: 1e4,
      credentials,
    });
    if (!f.ok) {
      if (f.reason === "no-auth") {
        logForDebugging(`Failed to get auth headers for first-token-date fetch: ${f.detail}`, {
          level: "error",
        });
        logFeatureBad("api_first_token_date_fetch", "request_failed");
      }
      return;
    }
    let firstTokenDate = f.data?.first_token_date ?? null;
    if (firstTokenDate !== null) {
      let dateTime = new Date(firstTokenDate).getTime();
      if (isNaN(dateTime)) {
        logError(Error(`Received invalid first_token_date from API: ${firstTokenDate}`));
        logFeatureBad("api_first_token_date_fetch", "invalid_date");
        return;
      }
    }
    await saveGlobalConfig(
      (current) => ({
        ...current,
        claudeCodeFirstTokenDate: firstTokenDate,
      }),
      e,
    );
    logFeatureOk("api_first_token_date_fetch");
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`Failed to fetch first token date: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logFeatureBad("api_first_token_date_fetch", "request_failed");
  }
}
export { fetchAndStoreClaudeCodeFirstTokenDate };
