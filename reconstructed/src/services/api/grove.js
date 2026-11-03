/**
 * services/api/grove.ts
 *
 * Grove（消费者条款/数据使用选择）接口：读写账号 grove_enabled 设置、获取通知配置、判断是否需要显示 Grove 对话框，以及非交互模式下的处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/grove.ts
 * pieces: chunk-vrsqcfp3.js (18)
 * attribution: sole-consumer 6, affinity 2, fingerprint 7, layout 3
 */
import { getHostPlatformForAnalytics, env } from "../../utils/env.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { record, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";

//@ chunk-vrsqcfp3.js:687-719 sole-consumer
/**
 * 1 天 / 1 小时 / 请求超时 3 秒。
 */
var ONE_DAY_MS = 86400000;
var ONE_HOUR_MS = 3600000;
var GROVE_REQUEST_TIMEOUT_MS = 3000;
//@ chunk-vrsqcfp3.js:719-768 affinity
/**
 * anthropic-client-os 头。
 */
function getClientOsHeader() {
  return {
    "anthropic-client-os": getHostPlatformForAnalytics(),
  };
}
//@ chunk-vrsqcfp3.js:768-1386 fingerprint = updateGroveSettings (0.383)
/**
 * 读取账号设置 /api/oauth/account/settings（grove_enabled 等），带缓存。旧版名 updateGroveSettings 为错配，实际是 getGroveSettings。
 */
var updateGroveSettings_2 = io(
  async (groveEnabled) => {
    try {
      return {
        success: true,
        data: (
          await withOAuth401Retry(
            async () => {
              let n = await apiClient.get("/api/oauth/account/settings", {
                timeout: GROVE_REQUEST_TIMEOUT_MS,
                credentials: groveEnabled,
              });
              if (!n.ok) throw Error(`Failed to get Grove settings: ${n.reason}`);
              assertGroveOkStatus(n.status);
              if (n.data?.grove_enabled !== null && typeof n.data?.grove_enabled !== "boolean")
                throw Error("Grove settings answer has no boolean or null grove_enabled");
              return n;
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
//@ chunk-vrsqcfp3.js:1386-1856 fingerprint = markGroveNoticeViewed (0.453)
/**
 * POST grove_notice_viewed。
 */
async function markGroveNoticeViewed(credentials) {
  try {
    await withOAuth401Retry(
      async () => {
        let e = await apiClient.post(
          "/api/oauth/account/grove_notice_viewed",
          {},
          {
            credentials,
            headers: getClientOsHeader(),
          },
        );
        if (!e.ok) throw Error(`Failed to mark Grove notice viewed: ${e.reason}`);
        assertGroveOkStatus(e.status);
        return e;
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
//@ chunk-vrsqcfp3.js:1856-2512 layout
/**
 * PATCH 账号 grove_enabled（可只在未设置时写入）。
 */
async function updateGroveSettings(groveEnabled, credentials, { onlyIfUnset: n = false } = {}) {
  try {
    let { data: s } = await withOAuth401Retry(
      async () => {
        let c = await apiClient.patch(
          n
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
        if (!c.ok) throw Error(`Failed to update Grove settings: ${c.reason}`);
        assertGroveOkStatus(c.status);
        return c;
      },
      {
        credentials,
      },
    );
    logFeatureOk("api_grove_settings_update");
    return typeof s === "object" && s !== null && "grove_enabled" in s && typeof s.grove_enabled === "boolean"
      ? s.grove_enabled
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
//@ chunk-vrsqcfp3.js:2512-2953 fingerprint = isQualifiedForGrove (1)
/**
 * 是否需要 Grove：读缓存配置，无缓存时后台拉取。
 */
async function isQualifiedForGrove(storageV5, credentials) {
  if (!isConsumerSubscriber()) return false;
  if (!mayHaveProfileScope()) return false;
  let accountId = getOauthAccountInfo()?.accountUuid;
  if (!accountId) return false;
  let cachedEntry = getGlobalConfig().groveConfigCache?.[accountId];
  let now = Date.now();
  if (!cachedEntry) {
    logForDebugging("Grove: No cache, fetching config in background (dialog skipped this session)");
    fetchAndStoreGroveConfig(accountId, storageV5, credentials);
    return false;
  }
  if (now - cachedEntry.timestamp > ONE_DAY_MS) {
    logForDebugging("Grove: Cache stale, returning cached data and refreshing in background");
    fetchAndStoreGroveConfig(accountId, storageV5, credentials);
    return cachedEntry.grove_enabled;
  }
  logForDebugging("Grove: Using fresh cached config");
  return cachedEntry.grove_enabled;
}
//@ chunk-vrsqcfp3.js:2953-3531 fingerprint = fetchAndStoreGroveConfig (0.904)
/**
 * 拉取 Grove 配置并存入全局缓存。
 */
async function fetchAndStoreGroveConfig(accountId, e, n) {
  try {
    let s = credentialIsOwnStoredLogin();
    let groveNoticeConfig = await getGroveNoticeConfig(n);
    if (!groveNoticeConfig.success) {
      if (
        groveNoticeConfig.errorStatus !== undefined &&
        groveNoticeConfig.errorStatus !== 401 &&
        s &&
        getGlobalConfig().groveConfigCache?.[accountId]
      )
        await saveGlobalConfig((current) => {
          let v = current.groveConfigCache?.[accountId];
          return v
            ? {
                ...current,
                groveConfigCache: {
                  ...current.groveConfigCache,
                  [accountId]: {
                    ...v,
                    timestamp: Date.now(),
                  },
                },
              }
            : current;
        }, e);
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
      e,
    );
  } catch (err) {
    logForDebugging(`Grove: Failed to fetch and store config: ${err}`);
  }
}
//@ chunk-vrsqcfp3.js:3531-4327 fingerprint = getGroveNoticeConfig (0.655)
/**
 * GET /api/claude_code_grove 通知配置。
 */
var getGroveNoticeConfig = io(
  async (credentials) => {
    try {
      let response = await withOAuth401Retry(
        async () => {
          let d = await apiClient.get("/api/claude_code_grove", {
            timeout: GROVE_REQUEST_TIMEOUT_MS,
            credentials,
          });
          if (!d.ok) throw Error(`Failed to fetch Grove notice config: ${d.reason}`);
          assertGroveOkStatus(d.status);
          if (typeof d.data?.grove_enabled !== "boolean")
            throw Error("Grove notice config answer has no boolean grove_enabled");
          return d;
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
//@ chunk-vrsqcfp3.js:4327-4829 fingerprint = calculateShouldShowGrove (0.821)
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
//@ chunk-vrsqcfp3.js:4829-4994 layout
/**
 * 服务端一小时内已确认过 Consumer Terms 选择则不再询问。
 */
async function wasGroveRecentlyConfirmed(r) {
  let groveAccountUuid = await getGroveAccountUuid(r);
  let n =
    groveAccountUuid !== undefined &&
    isWithinOneHour(getGroveChoiceSeenAt(getGlobalConfig())[groveAccountUuid]);
  if (n) logForDebugging("Grove: the server recently confirmed a Consumer Terms answer; not asking again");
  return n;
}
//@ chunk-vrsqcfp3.js:4994-5415 layout
/**
 * 记录服务端返回的 grove 选择时间。
 */
async function recordGroveChoiceSeen(r, e, n) {
  let now = Date.now();
  try {
    let groveEnabled = r.grove_enabled;
    if (typeof groveEnabled !== "boolean" && groveEnabled !== null) return;
    let u = groveEnabled !== null;
    let groveAccountUuid = await getGroveAccountUuid(n);
    if (
      groveAccountUuid === undefined ||
      u === isWithinOneHour(getGroveChoiceSeenAt(getGlobalConfig())[groveAccountUuid])
    )
      return;
    await saveGlobalConfig((d) => {
      let groveChoiceSeenAt = getGroveChoiceSeenAt(d);
      if (u === isWithinOneHour(groveChoiceSeenAt[groveAccountUuid])) return d;
      let filtered = Object.entries(groveChoiceSeenAt).filter(
        ([key, value]) => key !== groveAccountUuid && isWithinOneHour(value),
      );
      return {
        ...d,
        groveChoiceSeenAt: Object.fromEntries(u ? [...filtered, [groveAccountUuid, now]] : filtered),
      };
    }, e);
  } catch (error) {
    logForDebugging(`Grove: could not save the Consumer Terms check: ${error}`);
  }
}
//@ chunk-vrsqcfp3.js:5415-6025 fingerprint = checkGroveForNonInteractive (0.667)
/**
 * 非交互模式下检查 Grove：需要时打印提示或退出。
 */
async function checkGroveForNonInteractive(storageV5, credentials) {
  if (await wasGroveRecentlyConfirmed(credentials)) return;
  let [settingsResult, configResult] = await Promise.all([
    updateGroveSettings_2(credentials),
    getGroveNoticeConfig(credentials),
  ]);
  if (settingsResult.success) recordGroveChoiceSeen(settingsResult.data, storageV5, credentials);
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
//@ chunk-vrsqcfp3.js:6025-6098 affinity
/**
 * 时间戳在一小时以内。
 */
function isWithinOneHour(r) {
  if (r === undefined) return false;
  let e = Date.now() - r;
  return e >= 0 && e < ONE_HOUR_MS;
}
//@ chunk-vrsqcfp3.js:6098-6123 sole-consumer
/**
 * groveChoiceSeenAt 配置项（账号 → 时间）的 zod schema。
 */
var groveChoiceSeenAtSchema = DoctorLazy(() => record(string(), E()));
//@ chunk-vrsqcfp3.js:6123-6205 sole-consumer
/**
 * 读配置里的 groveChoiceSeenAt，校验失败返回 {}。
 */
function getGroveChoiceSeenAt(globalConfig) {
  let e = groveChoiceSeenAtSchema().safeParse(globalConfig.groveChoiceSeenAt);
  return e.success ? e.data : {};
}
//@ chunk-vrsqcfp3.js:6205-6469 sole-consumer
/**
 * 按凭证来源取账号 uuid（store：OAuth 账号；env/fd：CLAUDE_CODE_ACCOUNT_UUID），小写；未知时返回 undefined 交给服务器判断。
 */
async function getGroveAccountUuid(r) {
  try {
    switch (await getClaudeAIOAuthTokenOriginAsync(r)) {
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
//@ chunk-vrsqcfp3.js:6469-6589 sole-consumer
/**
 * Grove 接口非 2xx 时抛出，携带 status。
 */
class GroveHttpError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  status;
  constructor(r) {
    super(`HTTP ${r}`, "Grove request answered with an error status");
    this.status = r;
  }
}
//@ chunk-vrsqcfp3.js:6589-6635 sole-consumer
/**
 * 状态码不在 200–299 时抛 GroveHttpError。
 */
function assertGroveOkStatus(status) {
  if (status < 200 || status >= 300) throw new GroveHttpError(status);
}
export {
  updateGroveSettings_2,
  getGroveNoticeConfig,
  isQualifiedForGrove,
  checkGroveForNonInteractive,
  recordGroveChoiceSeen,
  calculateShouldShowGrove,
  markGroveNoticeViewed,
  updateGroveSettings,
  wasGroveRecentlyConfirmed,
};
