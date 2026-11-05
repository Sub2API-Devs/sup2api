/**
 * services/api/grove.ts
 *
 * Grove（消费者条款/数据使用选择）接口：读写账号 grove_enabled 设置、获取通知配置、判断是否需要显示 Grove 对话框，以及非交互模式下的处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/grove.ts
 * pieces: chunk-zxdyf8nf.js (18)
 * attribution: sole-consumer 6, affinity 2, fingerprint 7, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getHostPlatformForAnalytics, env } from "../../utils/env.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { withOAuth401Retry } from "../../utils/http.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  isConsumerSubscriber,
  mayHaveProfileScope,
  getOauthAccountInfo,
  credentialIsOwnStoredLogin,
  getClaudeAIOAuthTokenOriginAsync,
} from "../../utils/auth.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";
import { writeToStderr } from "../../utils/process.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { record, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-zxdyf8nf.js:687-719 sole-consumer
/**
 * 1 天 / 1 小时 / 请求超时 3 秒。
 */
var ONE_DAY_MS = 86400000;
var ONE_HOUR_MS = 3600000;
var GROVE_REQUEST_TIMEOUT_MS = 3000;
//@ chunk-zxdyf8nf.js:719-768 affinity
/**
 * anthropic-client-os 头。
 */
function getClientOsHeader() {
  return {
    "anthropic-client-os": getHostPlatformForAnalytics(),
  };
}
//@ chunk-zxdyf8nf.js:768-1386 fingerprint (2.1.88 match: updateGroveSettings, 0.383)
/**
 * 读取账号设置 /api/oauth/account/settings（grove_enabled 等），带缓存。旧版名 updateGroveSettings 为错配，实际是 getGroveSettings。
 */
var updateGroveSettings_2; // deferred: uses withOAuth401Retry (../../utils/http.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zxdyf8nf.js:768", () => {
  updateGroveSettings_2 = memoizeAlias(
    async (groveEnabled) => {
      try {
        return {
          success: true,
          data: (
            await withOAuth401Retry(
              async () => {
                let response = await apiClient.get("/api/oauth/account/settings", {
                  timeout: GROVE_REQUEST_TIMEOUT_MS,
                  credentials: groveEnabled,
                });
                if (!response.ok) throw Error(`Failed to get Grove settings: ${response.reason}`);
                assertGroveOkStatus(response.status);
                if (
                  response.data?.grove_enabled !== null &&
                  typeof response.data?.grove_enabled !== "boolean"
                )
                  throw Error("Grove settings answer has no boolean or null grove_enabled");
                return response;
              },
              {
                credentials: groveEnabled,
              },
            )
          ).data,
        };
      } catch (err) {
        if (!(err instanceof Error) || !/data-residency|essential-traffic-only|no-auth/.test(err.message))
          logForDebugging(`Failed to fetch Grove settings: ${err}`, {
            level: "error",
          });
        updateGroveSettings_2.cache.clear?.();
        return {
          success: false,
        };
      }
    },
    () => "account",
  );
});
//@ chunk-zxdyf8nf.js:1386-1856 fingerprint (2.1.88 match: markGroveNoticeViewed, 0.453)
/**
 * POST grove_notice_viewed。
 */
async function markGroveNoticeViewed(credentials) {
  try {
    await withOAuth401Retry(
      async () => {
        let response = await apiClient.post(
          "/api/oauth/account/grove_notice_viewed",
          {},
          {
            credentials,
            headers: getClientOsHeader(),
          },
        );
        if (!response.ok) throw Error(`Failed to mark Grove notice viewed: ${response.reason}`);
        assertGroveOkStatus(response.status);
        return response;
      },
      {
        credentials,
      },
    );
    logFeatureOk("api_grove_notice_mark_viewed");
  } catch (err) {
    logForDebugging(
      `Failed to mark Grove notice viewed: ${err instanceof Error ? err.message : String(err)}`,
      {
        level: "error",
      },
    );
    logFeatureBad("api_grove_notice_mark_viewed", "request_failed");
  } finally {
    updateGroveSettings_2.cache.clear?.();
  }
}
//@ chunk-zxdyf8nf.js:1856-2512 layout
/**
 * PATCH 账号 grove_enabled（可只在未设置时写入）。
 */
async function updateGroveSettings(groveEnabled, credentials, { onlyIfUnset = false } = {}) {
  try {
    let { data: body } = await withOAuth401Retry(
      async () => {
        let response = await apiClient.patch(
          onlyIfUnset
            ? "/api/oauth/account/settings?opt_in_only_if_unset=grove_enabled"
            : "/api/oauth/account/settings",
          {
            grove_enabled: groveEnabled,
          },
          {
            credentials,
            headers: getClientOsHeader(),
          },
        );
        if (!response.ok) throw Error(`Failed to update Grove settings: ${response.reason}`);
        assertGroveOkStatus(response.status);
        return response;
      },
      {
        credentials,
      },
    );
    logFeatureOk("api_grove_settings_update");
    return typeof body === "object" &&
      body !== null &&
      "grove_enabled" in body &&
      typeof body.grove_enabled === "boolean"
      ? body.grove_enabled
      : undefined;
  } catch (error) {
    logForDebugging(`updateGroveSettings failed: ${String(error)}`, {
      level: "error",
    });
    logFeatureBad("api_grove_settings_update", "request_failed");
    return;
  } finally {
    updateGroveSettings_2.cache.clear?.();
  }
}
//@ chunk-zxdyf8nf.js:2512-2953 fingerprint (2.1.88 match: isQualifiedForGrove, 1)
/**
 * 是否需要 Grove：读缓存配置，无缓存时后台拉取。
 */
async function isQualifiedForGrove(configWriteSource, credentials) {
  if (!isConsumerSubscriber()) return false;
  if (!mayHaveProfileScope()) return false;
  let accountId = getOauthAccountInfo()?.accountUuid;
  if (!accountId) return false;
  let cachedEntry = getGlobalConfig().groveConfigCache?.[accountId];
  let now = Date.now();
  if (!cachedEntry) {
    logForDebugging("Grove: No cache, fetching config in background (dialog skipped this session)");
    fetchAndStoreGroveConfig(accountId, configWriteSource, credentials);
    return false;
  }
  if (now - cachedEntry.timestamp > ONE_DAY_MS) {
    logForDebugging("Grove: Cache stale, returning cached data and refreshing in background");
    fetchAndStoreGroveConfig(accountId, configWriteSource, credentials);
    return cachedEntry.grove_enabled;
  }
  logForDebugging("Grove: Using fresh cached config");
  return cachedEntry.grove_enabled;
}
//@ chunk-zxdyf8nf.js:2953-3532 fingerprint (2.1.88 match: fetchAndStoreGroveConfig, 0.904)
/**
 * 拉取 Grove 配置并存入全局缓存。
 */
async function fetchAndStoreGroveConfig(accountId, configWriteSource, credentials) {
  try {
    let ownLogin = credentialIsOwnStoredLogin();
    let groveNoticeConfig = await getGroveNoticeConfig(credentials);
    if (!groveNoticeConfig.success) {
      if (
        groveNoticeConfig.errorStatus !== undefined &&
        groveNoticeConfig.errorStatus !== 401 &&
        ownLogin &&
        getGlobalConfig().groveConfigCache?.[accountId]
      )
        await saveGlobalConfig((current) => {
          let cached = current.groveConfigCache?.[accountId];
          return cached
            ? {
                ...current,
                groveConfigCache: {
                  ...current.groveConfigCache,
                  [accountId]: {
                    ...cached,
                    timestamp: Date.now(),
                  },
                },
              }
            : current;
        }, configWriteSource);
      return;
    }
    let groveEnabled = groveNoticeConfig.data.grove_enabled;
    let cachedEntry = getGlobalConfig().groveConfigCache?.[accountId];
    if (cachedEntry?.grove_enabled === groveEnabled && Date.now() - cachedEntry.timestamp <= ONE_DAY_MS)
      return;
    await saveGlobalConfig(
      (current) => ({
        ...current,
        groveConfigCache: {
          ...current.groveConfigCache,
          [accountId]: {
            grove_enabled: groveEnabled,
            timestamp: Date.now(),
          },
        },
      }),
      configWriteSource,
    );
  } catch (err) {
    logForDebugging(`Grove: Failed to fetch and store config: ${err}`);
  }
}
//@ chunk-zxdyf8nf.js:3532-4330 fingerprint (2.1.88 match: getGroveNoticeConfig, 0.656)
/**
 * GET /api/claude_code_grove 通知配置。
 */
var getGroveNoticeConfig; // deferred: uses withOAuth401Retry (../../utils/http.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zxdyf8nf.js:3532", () => {
  getGroveNoticeConfig = memoizeAlias(
    async (credentials) => {
      try {
        let response = await withOAuth401Retry(
          async () => {
            let response = await apiClient.get("/api/claude_code_grove", {
              timeout: GROVE_REQUEST_TIMEOUT_MS,
              credentials,
            });
            if (!response.ok) throw Error(`Failed to fetch Grove notice config: ${response.reason}`);
            assertGroveOkStatus(response.status);
            if (typeof response.data?.grove_enabled !== "boolean")
              throw Error("Grove notice config answer has no boolean grove_enabled");
            return response;
          },
          {
            credentials,
          },
        );
        let {
          grove_enabled,
          domain_excluded,
          notice_is_grace_period,
          notice_reminder_frequency,
          grove_locked_by_claude_science: groveLockedByClaudeScience,
        } = response.data;
        return {
          success: true,
          data: {
            grove_enabled,
            domain_excluded: domain_excluded ?? false,
            notice_is_grace_period: notice_is_grace_period ?? true,
            notice_reminder_frequency,
            grove_locked_by_claude_science: groveLockedByClaudeScience === true,
          },
        };
      } catch (err) {
        logForDebugging(`Failed to fetch Grove notice config: ${err}`);
        getGroveNoticeConfig.cache.clear?.();
        return err instanceof GroveHttpError
          ? {
              success: false,
              errorStatus: err.status,
            }
          : {
              success: false,
            };
      }
    },
    () => "config",
  );
});
//@ chunk-zxdyf8nf.js:4330-4832 fingerprint (2.1.88 match: calculateShouldShowGrove, 0.821)
/**
 * 是否显示 Grove 通知：未作出选择且（不在宽限期或到了提醒频率）。
 */
function calculateShouldShowGrove(settingsResult, configResult, showIfAlreadyViewed) {
  if (!settingsResult.success || !configResult.success) return false;
  let settings = settingsResult.data;
  let config = configResult.data;
  if (settings.grove_enabled !== null) return false;
  if (showIfAlreadyViewed) return true;
  if (!config.notice_is_grace_period) return true;
  let reminderFrequency = config.notice_reminder_frequency;
  if (reminderFrequency !== null && settings.grove_notice_viewed_at) {
    let daysSinceViewed = new Date(settings.grove_notice_viewed_at).getTime();
    if (isNaN(daysSinceViewed)) {
      logError(Error(`Invalid grove_notice_viewed_at from API: ${settings.grove_notice_viewed_at}`));
      return true;
    }
    return Math.floor((Date.now() - daysSinceViewed) / 86400000) >= reminderFrequency;
  } else {
    let viewedAt = settings.grove_notice_viewed_at;
    return viewedAt === null || viewedAt === undefined;
  }
}
//@ chunk-zxdyf8nf.js:4832-4997 layout
/**
 * 服务端一小时内已确认过 Consumer Terms 选择则不再询问。
 */
async function wasGroveRecentlyConfirmed(credentials) {
  let groveAccountUuid = await getGroveAccountUuid(credentials);
  let recentlyConfirmed =
    groveAccountUuid !== undefined &&
    isWithinOneHour(getGroveChoiceSeenAt(getGlobalConfig())[groveAccountUuid]);
  if (recentlyConfirmed)
    logForDebugging("Grove: the server recently confirmed a Consumer Terms answer; not asking again");
  return recentlyConfirmed;
}
//@ chunk-zxdyf8nf.js:4997-5418 layout
/**
 * 记录服务端返回的 grove 选择时间。
 */
async function recordGroveChoiceSeen(groveConfig, configWriteSource, credentials) {
  let now = Date.now();
  try {
    let groveEnabled = groveConfig.grove_enabled;
    if (typeof groveEnabled !== "boolean" && groveEnabled !== null) return;
    let hasChoice = groveEnabled !== null;
    let groveAccountUuid = await getGroveAccountUuid(credentials);
    if (
      groveAccountUuid === undefined ||
      hasChoice === isWithinOneHour(getGroveChoiceSeenAt(getGlobalConfig())[groveAccountUuid])
    )
      return;
    await saveGlobalConfig((current) => {
      let groveChoiceSeenAt = getGroveChoiceSeenAt(current);
      if (hasChoice === isWithinOneHour(groveChoiceSeenAt[groveAccountUuid])) return current;
      let filtered = Object.entries(groveChoiceSeenAt).filter(
        ([key, value]) => key !== groveAccountUuid && isWithinOneHour(value),
      );
      return {
        ...current,
        groveChoiceSeenAt: Object.fromEntries(hasChoice ? [...filtered, [groveAccountUuid, now]] : filtered),
      };
    }, configWriteSource);
  } catch (error) {
    logForDebugging(`Grove: could not save the Consumer Terms check: ${error}`);
  }
}
//@ chunk-zxdyf8nf.js:5418-6029 fingerprint (2.1.88 match: checkGroveForNonInteractive, 0.667)
/**
 * 非交互模式下检查 Grove：需要时打印提示或退出。
 */
async function checkGroveForNonInteractive(configWriteSource, credentials) {
  if (await wasGroveRecentlyConfirmed(credentials)) return;
  let [settingsResult, configResult] = await Promise.all([
    updateGroveSettings_2(credentials),
    getGroveNoticeConfig(credentials),
  ]);
  if (settingsResult.success) recordGroveChoiceSeen(settingsResult.data, configWriteSource, credentials);
  if (calculateShouldShowGrove(settingsResult, configResult, false)) {
    let config = configResult.success ? configResult.data : null;
    logEvent("tengu_grove_print_viewed", {
      dismissable: config?.notice_is_grace_period,
    });
    if (config === null || config.notice_is_grace_period) {
      writeToStderr(`
An update to our Consumer Terms and Privacy Policy will take effect on October 8, 2025. Run \`claude\` to review the updated terms.

`);
      await markGroveNoticeViewed(credentials);
    } else {
      writeToStderr(`
[ACTION REQUIRED] An update to our Consumer Terms and Privacy Policy has taken effect on October 8, 2025. You must run \`claude\` to review the updated terms.

`);
      await gracefulShutdown(1);
    }
  }
}
//@ chunk-zxdyf8nf.js:6029-6102 affinity
/**
 * 时间戳在一小时以内。
 */
function isWithinOneHour(seenAt) {
  if (seenAt === undefined) return false;
  let ageMs = Date.now() - seenAt;
  return ageMs >= 0 && ageMs < ONE_HOUR_MS;
}
//@ chunk-zxdyf8nf.js:6102-6127 sole-consumer
/**
 * groveChoiceSeenAt 配置项（账号 → 时间）的 zod schema。
 */
var groveChoiceSeenAtSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zxdyf8nf.js:6102", () => {
  groveChoiceSeenAtSchema = DoctorLazy(() => record(stringSchema(), numberSchema()));
});
//@ chunk-zxdyf8nf.js:6127-6209 sole-consumer
/**
 * 读配置里的 groveChoiceSeenAt，校验失败返回 {}。
 */
function getGroveChoiceSeenAt(globalConfig) {
  let parsed = groveChoiceSeenAtSchema().safeParse(globalConfig.groveChoiceSeenAt);
  return parsed.success ? parsed.data : {};
}
//@ chunk-zxdyf8nf.js:6209-6473 sole-consumer
/**
 * 按凭证来源取账号 uuid（store：OAuth 账号；env/fd：CLAUDE_CODE_ACCOUNT_UUID），小写；未知时返回 undefined 交给服务器判断。
 */
async function getGroveAccountUuid(credentials) {
  try {
    switch (await getClaudeAIOAuthTokenOriginAsync(credentials)) {
      case "store":
        return normalizeUuidOrNull(getOauthAccountInfo()?.accountUuid)?.toLowerCase();
      case "env":
      case "fd":
        return normalizeUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();
      case "none":
        return;
    }
  } catch (error) {
    logForDebugging(`Grove: account unknown, so asking the server: ${error}`);
    return;
  }
}
//@ chunk-zxdyf8nf.js:6473-6593 sole-consumer
/**
 * Grove 接口非 2xx 时抛出，携带 status。
 */
let GroveHttpError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zxdyf8nf.js:6473", () => {
  GroveHttpError = class GroveHttpError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
    status;
    constructor(status) {
      super(`HTTP ${status}`, "Grove request answered with an error status");
      this.status = status;
    }
  };
});
//@ chunk-zxdyf8nf.js:6593-6639 sole-consumer
/**
 * 状态码不在 200–299 时抛 GroveHttpError。
 */
function assertGroveOkStatus(status) {
  if (status < 200 || status >= 300) throw new GroveHttpError(status);
}
export {
  isQualifiedForGrove,
  checkGroveForNonInteractive,
  wasGroveRecentlyConfirmed,
  updateGroveSettings_2,
  getGroveNoticeConfig,
  recordGroveChoiceSeen,
  calculateShouldShowGrove,
  markGroveNoticeViewed,
  updateGroveSettings,
};
