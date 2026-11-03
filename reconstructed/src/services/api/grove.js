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
import { pe, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { Vt } from "../../utils/agentId.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";

/**
 * 1 天 / 1 小时 / 请求超时 3 秒。
 */
//@ chunk-vrsqcfp3.js:687-719 sole-consumer
var ONE_DAY_MS = 86400000,
  ONE_HOUR_MS = 3600000,
  GROVE_REQUEST_TIMEOUT_MS = 3000;
/**
 * anthropic-client-os 头。
 */
//@ chunk-vrsqcfp3.js:719-768 affinity
function getClientOsHeader() {
  return { "anthropic-client-os": getHostPlatformForAnalytics() };
}
/**
 * 读取账号设置 /api/oauth/account/settings（grove_enabled 等），带缓存。旧版名 updateGroveSettings 为错配，实际是 getGroveSettings。
 */
//@ chunk-vrsqcfp3.js:768-1386 fingerprint = updateGroveSettings (0.383)
var updateGroveSettings_2 = io(
  async (groveEnabled) => {
    try {
      return {
        success: !0,
        data: (
          await withOAuth401Retry(
            async () => {
              let n = await apiClient.get("/api/oauth/account/settings", {
                timeout: GROVE_REQUEST_TIMEOUT_MS,
                credentials: groveEnabled,
              });
              if (!n.ok) throw Error(`Failed to get Grove settings: ${n.reason}`);
              if (
                (assertGroveOkStatus(n.status),
                n.data?.grove_enabled !== null && typeof n.data?.grove_enabled !== "boolean")
              )
                throw Error("Grove settings answer has no boolean or null grove_enabled");
              return n;
            },
            { credentials: groveEnabled },
          )
        ).data,
      };
    } catch (err) {
      if (!(err instanceof Error) || !/data-residency|essential-traffic-only|no-auth/.test(err.message))
        logForDebugging(`Failed to fetch Grove settings: ${err}`, { level: "error" });
      return (updateGroveSettings_2.cache.clear?.(), { success: !1 });
    }
  },
  () => "account",
);
/**
 * POST grove_notice_viewed。
 */
//@ chunk-vrsqcfp3.js:1386-1856 fingerprint = markGroveNoticeViewed (0.453)
async function markGroveNoticeViewed(r) {
  try {
    (await withOAuth401Retry(
      async () => {
        let post = await apiClient.post(
          "/api/oauth/account/grove_notice_viewed",
          {},
          { credentials: r, headers: getClientOsHeader() },
        );
        if (!post.ok) throw Error(`Failed to mark Grove notice viewed: ${post.reason}`);
        return (assertGroveOkStatus(post.status), post);
      },
      { credentials: r },
    ),
      logFeatureOk("api_grove_notice_mark_viewed"));
  } catch (err) {
    (logForDebugging(
      `Failed to mark Grove notice viewed: ${err instanceof Error ? err.message : String(err)}`,
      { level: "error" },
    ),
      logFeatureBad("api_grove_notice_mark_viewed", "request_failed"));
  } finally {
    updateGroveSettings_2.cache.clear?.();
  }
}
/**
 * PATCH 账号 grove_enabled（可只在未设置时写入）。
 */
//@ chunk-vrsqcfp3.js:1856-2512 layout
async function updateGroveSettings(r, e, { onlyIfUnset: n = !1 } = {}) {
  try {
    let { data: s } = await withOAuth401Retry(
      async () => {
        let patch = await apiClient.patch(
          n
            ? "/api/oauth/account/settings?opt_in_only_if_unset=grove_enabled"
            : "/api/oauth/account/settings",
          { grove_enabled: r },
          { credentials: e, headers: getClientOsHeader() },
        );
        if (!patch.ok) throw Error(`Failed to update Grove settings: ${patch.reason}`);
        return (assertGroveOkStatus(patch.status), patch);
      },
      { credentials: e },
    );
    return (
      logFeatureOk("api_grove_settings_update"),
      typeof s === "object" && s !== null && "grove_enabled" in s && typeof s.grove_enabled === "boolean"
        ? s.grove_enabled
        : void 0
    );
  } catch (error) {
    (logForDebugging(`updateGroveSettings failed: ${String(error)}`, { level: "error" }),
      logFeatureBad("api_grove_settings_update", "request_failed"));
    return;
  } finally {
    updateGroveSettings_2.cache.clear?.();
  }
}
/**
 * 是否需要 Grove：读缓存配置，无缓存时后台拉取。
 */
//@ chunk-vrsqcfp3.js:2512-2953 fingerprint = isQualifiedForGrove (1)
async function isQualifiedForGrove(r, e) {
  if (!isConsumerSubscriber()) return !1;
  if (!mayHaveProfileScope()) return !1;
  let accountId = getOauthAccountInfo()?.accountUuid;
  if (!accountId) return !1;
  let cachedEntry = getGlobalConfig().groveConfigCache?.[accountId],
    now = Date.now();
  if (!cachedEntry)
    return (
      logForDebugging("Grove: No cache, fetching config in background (dialog skipped this session)"),
      fetchAndStoreGroveConfig(accountId, r, e),
      !1
    );
  if (now - cachedEntry.timestamp > ONE_DAY_MS)
    return (
      logForDebugging("Grove: Cache stale, returning cached data and refreshing in background"),
      fetchAndStoreGroveConfig(accountId, r, e),
      cachedEntry.grove_enabled
    );
  return (logForDebugging("Grove: Using fresh cached config"), cachedEntry.grove_enabled);
}
/**
 * 拉取 Grove 配置并存入全局缓存。
 */
//@ chunk-vrsqcfp3.js:2953-3531 fingerprint = fetchAndStoreGroveConfig (0.904)
async function fetchAndStoreGroveConfig(r, e, n) {
  try {
    let s = credentialIsOwnStoredLogin(),
      c = await getGroveNoticeConfig(n);
    if (!c.success) {
      if (c.errorStatus !== void 0 && c.errorStatus !== 401 && s && getGlobalConfig().groveConfigCache?.[r])
        await saveGlobalConfig((d) => {
          let v = d.groveConfigCache?.[r];
          return v
            ? { ...d, groveConfigCache: { ...d.groveConfigCache, [r]: { ...v, timestamp: Date.now() } } }
            : d;
        }, e);
      return;
    }
    let groveEnabled = c.data.grove_enabled,
      cachedEntry = getGlobalConfig().groveConfigCache?.[r];
    if (cachedEntry?.grove_enabled === groveEnabled && Date.now() - cachedEntry.timestamp <= ONE_DAY_MS)
      return;
    await saveGlobalConfig(
      (current) => ({
        ...current,
        groveConfigCache: {
          ...current.groveConfigCache,
          [r]: { grove_enabled: groveEnabled, timestamp: Date.now() },
        },
      }),
      e,
    );
  } catch (err) {
    logForDebugging(`Grove: Failed to fetch and store config: ${err}`);
  }
}
/**
 * GET /api/claude_code_grove 通知配置。
 */
//@ chunk-vrsqcfp3.js:3531-4327 fingerprint = getGroveNoticeConfig (0.655)
var getGroveNoticeConfig = io(
  async (r) => {
    try {
      let e = await withOAuth401Retry(
          async () => {
            let d = await apiClient.get("/api/claude_code_grove", {
              timeout: GROVE_REQUEST_TIMEOUT_MS,
              credentials: r,
            });
            if (!d.ok) throw Error(`Failed to fetch Grove notice config: ${d.reason}`);
            if ((assertGroveOkStatus(d.status), typeof d.data?.grove_enabled !== "boolean"))
              throw Error("Grove notice config answer has no boolean grove_enabled");
            return d;
          },
          { credentials: r },
        ),
        {
          grove_enabled: grove_enabled,
          domain_excluded: domain_excluded,
          notice_is_grace_period: notice_is_grace_period,
          notice_reminder_frequency: notice_reminder_frequency,
          grove_locked_by_claude_science: grove_locked_by_claude_science,
        } = e.data;
      return {
        success: !0,
        data: {
          grove_enabled: grove_enabled,
          domain_excluded: domain_excluded ?? !1,
          notice_is_grace_period: notice_is_grace_period ?? !0,
          notice_reminder_frequency: notice_reminder_frequency,
          grove_locked_by_claude_science: grove_locked_by_claude_science === !0,
        },
      };
    } catch (err) {
      return (
        logForDebugging(`Failed to fetch Grove notice config: ${err}`),
        getGroveNoticeConfig.cache.clear?.(),
        err instanceof GroveHttpError ? { success: !1, errorStatus: err.status } : { success: !1 }
      );
    }
  },
  () => "config",
);
/**
 * 是否显示 Grove 通知：未作出选择且（不在宽限期或到了提醒频率）。
 */
//@ chunk-vrsqcfp3.js:4327-4829 fingerprint = calculateShouldShowGrove (0.821)
function calculateShouldShowGrove(settingsResult, configResult, showIfAlreadyViewed) {
  if (!settingsResult.success || !configResult.success) return !1;
  let settings = settingsResult.data,
    config = configResult.data;
  if (settings.grove_enabled !== null) return !1;
  if (showIfAlreadyViewed) return !0;
  if (!config.notice_is_grace_period) return !0;
  let reminderFrequency = config.notice_reminder_frequency;
  if (reminderFrequency !== null && settings.grove_notice_viewed_at) {
    let time = new Date(settings.grove_notice_viewed_at).getTime();
    if (isNaN(time))
      return (
        logError(Error(`Invalid grove_notice_viewed_at from API: ${settings.grove_notice_viewed_at}`)),
        !0
      );
    return Math.floor((Date.now() - time) / 86400000) >= reminderFrequency;
  } else {
    let viewedAt = settings.grove_notice_viewed_at;
    return viewedAt === null || viewedAt === void 0;
  }
}
/**
 * 服务端一小时内已确认过 Consumer Terms 选择则不再询问。
 */
//@ chunk-vrsqcfp3.js:4829-4994 layout
async function wasGroveRecentlyConfirmed(r) {
  let e = await getGroveAccountUuid(r),
    n = e !== void 0 && isWithinOneHour(getGroveChoiceSeenAt(getGlobalConfig())[e]);
  if (n) logForDebugging("Grove: the server recently confirmed a Consumer Terms answer; not asking again");
  return n;
}
/**
 * 记录服务端返回的 grove 选择时间。
 */
//@ chunk-vrsqcfp3.js:4994-5415 layout
async function recordGroveChoiceSeen(r, e, n) {
  let now = Date.now();
  try {
    let grove_enabled = r.grove_enabled;
    if (typeof grove_enabled !== "boolean" && grove_enabled !== null) return;
    let u = grove_enabled !== null,
      f = await getGroveAccountUuid(n);
    if (f === void 0 || u === isWithinOneHour(getGroveChoiceSeenAt(getGlobalConfig())[f])) return;
    await saveGlobalConfig((d) => {
      let v = getGroveChoiceSeenAt(d);
      if (u === isWithinOneHour(v[f])) return d;
      let filtered = Object.entries(v).filter(([T, P]) => T !== f && isWithinOneHour(P));
      return { ...d, groveChoiceSeenAt: Object.fromEntries(u ? [...filtered, [f, now]] : filtered) };
    }, e);
  } catch (error) {
    logForDebugging(`Grove: could not save the Consumer Terms check: ${error}`);
  }
}
/**
 * 非交互模式下检查 Grove：需要时打印提示或退出。
 */
//@ chunk-vrsqcfp3.js:5415-6025 fingerprint = checkGroveForNonInteractive (0.667)
async function checkGroveForNonInteractive(r, e) {
  if (await wasGroveRecentlyConfirmed(e)) return;
  let [n, s] = await Promise.all([updateGroveSettings_2(e), getGroveNoticeConfig(e)]);
  if (n.success) recordGroveChoiceSeen(n.data, r, e);
  if (calculateShouldShowGrove(n, s, !1)) {
    let config = s.success ? s.data : null;
    if (
      (logEvent("tengu_grove_print_viewed", { dismissable: config?.notice_is_grace_period }),
      config === null || config.notice_is_grace_period)
    )
      (writeToStderr(`
An update to our Consumer Terms and Privacy Policy will take effect on October 8, 2025. Run \`claude\` to review the updated terms.

`),
        await markGroveNoticeViewed(e));
    else
      (writeToStderr(`
[ACTION REQUIRED] An update to our Consumer Terms and Privacy Policy has taken effect on October 8, 2025. You must run \`claude\` to review the updated terms.

`),
        await gracefulShutdown(1));
  }
}
/**
 * 时间戳在一小时以内。
 */
//@ chunk-vrsqcfp3.js:6025-6098 affinity
function isWithinOneHour(r) {
  if (r === void 0) return !1;
  let e = Date.now() - r;
  return e >= 0 && e < ONE_HOUR_MS;
}
/**
 * groveChoiceSeenAt 配置项（账号 → 时间）的 zod schema。
 */
//@ chunk-vrsqcfp3.js:6098-6123 sole-consumer
var groveChoiceSeenAtSchema = DoctorLazy(() => pe(o(), E()));
/**
 * 读配置里的 groveChoiceSeenAt，校验失败返回 {}。
 */
//@ chunk-vrsqcfp3.js:6123-6205 sole-consumer
function getGroveChoiceSeenAt(r) {
  let safeParse = groveChoiceSeenAtSchema().safeParse(r.groveChoiceSeenAt);
  return safeParse.success ? safeParse.data : {};
}
/**
 * 按凭证来源取账号 uuid（store：OAuth 账号；env/fd：CLAUDE_CODE_ACCOUNT_UUID），小写；未知时返回 undefined 交给服务器判断。
 */
//@ chunk-vrsqcfp3.js:6205-6469 sole-consumer
async function getGroveAccountUuid(r) {
  try {
    switch (await getClaudeAIOAuthTokenOriginAsync(r)) {
      case "store":
        return Vt(getOauthAccountInfo()?.accountUuid)?.toLowerCase();
      case "env":
      case "fd":
        return Vt(env.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();
      case "none":
        return;
    }
  } catch (error) {
    logForDebugging(`Grove: account unknown, so asking the server: ${error}`);
    return;
  }
}
/**
 * Grove 接口非 2xx 时抛出，携带 status。
 */
//@ chunk-vrsqcfp3.js:6469-6589 sole-consumer
class GroveHttpError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  status;
  constructor(r) {
    super(`HTTP ${r}`, "Grove request answered with an error status");
    this.status = r;
  }
}
/**
 * 状态码不在 200–299 时抛 GroveHttpError。
 */
//@ chunk-vrsqcfp3.js:6589-6635 sole-consumer
function assertGroveOkStatus(r) {
  if (r < 200 || r >= 300) throw new GroveHttpError(r);
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
