/**
 * services/notifications/notificationPreferences.ts
 *
 * 2.1.316 新增：启动时拉取通知偏好并更新本地状态；获取 /api/claude_code/notification/preferences等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dyv7vy4v.js (13)
 * attribution: placement 13
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, M, array, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { createStore } from "../../state/store.js";
import { createSignal } from "../../utils/signal.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  getInitialSettings_2,
  drainSettingsWrites,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { getGlobalConfig } from "../../utils/config.js";
import { validateConfigValue } from "../../utils/config/globalConfigValidation.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { classifyAxiosError } from "../../utils/errors.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";

//@ chunk-dyv7vy4v.js:680-1094 placement
/**
 * 通知偏好 API 的响应 schema。
 */
var NotificationPreferencesSchema = DoctorLazy(() => {
  let e = u({
    enable_email: M().nullish(),
    enable_push: M().nullish(),
  });
  let t = u({
    bogosort: e.nullish(),
    code_requires_action: e.nullish(),
  });
  let r = u({
    has_active_channel: M(),
    platforms: array(string())
      .nullish()
      .transform((n) => n ?? []),
    most_recent_token_refresh: string().nullish(),
  });
  return u({
    account_id: E().nullish(),
    organization_id: E().nullish(),
    preferences: u({
      feature_preference: t.nullish(),
    }).nullish(),
    push_reachability: r.nullish(),
  });
});
//@ chunk-dyv7vy4v.js:1094-1159 placement
/**
 * 按宿主保存的通知偏好状态。
 */
var PREFERENCES_TIMEOUT_MS = 1e4;
var notificationPrefsState = new HostScoped(() => ({
  reachability: createStore(undefined),
  hydrated: createSignal(),
}));
//@ chunk-dyv7vy4v.js:1159-1194 placement
/**
 * 取当前宿主的通知偏好状态。
 */
function getNotificationPrefsState() {
  return notificationPrefsState.of(getRootSession().host);
}
//@ chunk-dyv7vy4v.js:1194-1244 placement
/**
 * 取可送达性状态。
 */
function getReachability() {
  return getNotificationPrefsState().reachability.getState();
}
//@ chunk-dyv7vy4v.js:1244-1297 placement
/**
 * 订阅可送达性变化。
 */
function onReachabilityChange(e) {
  return getNotificationPrefsState().reachability.subscribe(e);
}
//@ chunk-dyv7vy4v.js:1297-1346 placement
/**
 * 订阅“已水合”信号。
 */
function onHydrated(e) {
  return getNotificationPrefsState().hydrated.subscribe(e);
}
//@ chunk-dyv7vy4v.js:1346-1593 placement
function localNotificationPreferences() {
  let initialSettings = getInitialSettings_2();
  let globalConfig = getGlobalConfig();
  return {
    agentPushNotifEnabled:
      initialSettings.agentPushNotifEnabled ??
      validateConfigValue("agentPushNotifEnabled", globalConfig.agentPushNotifEnabled),
    inputNeededNotifEnabled:
      initialSettings.inputNeededNotifEnabled ??
      validateConfigValue("inputNeededNotifEnabled", globalConfig.inputNeededNotifEnabled),
  };
}
//@ chunk-dyv7vy4v.js:1593-1643 placement
/**
 * 通知偏好的接口路径。
 */
var PREFERENCES_PATH = "/api/claude_code/notification/preferences";
//@ chunk-dyv7vy4v.js:1643-1668 placement
/**
 * 判断是否为 claude.ai 订阅者。
 */
function isClaudeAISubscriber_2() {
  return isClaudeAISubscriber();
}
//@ chunk-dyv7vy4v.js:1668-2130 placement
/**
 * 获取 /api/claude_code/notification/preferences。
 */
async function fetchNotificationPreferences() {
  if (!isClaudeAISubscriber_2())
    return {
      ok: false,
      reason: "no_auth",
    };
  try {
    let e = await apiClient.get(PREFERENCES_PATH, {
      timeout: PREFERENCES_TIMEOUT_MS,
    });
    if (!e.ok)
      return {
        ok: false,
        reason: "fetch_failed",
      };
    let t = NotificationPreferencesSchema().safeParse(e.data);
    if (!t.success) {
      logForDiagnosticsNoPII("warn", "notif_prefs_fetch_parse_failed", {
        issues: t.error.issues.map((issue) => issue.path.join(".")).join(","),
      });
      return {
        ok: false,
        reason: "parse_failed",
      };
    }
    return {
      ok: true,
      prefs: t.data,
    };
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    logForDiagnosticsNoPII("warn", "notif_prefs_fetch_failed", {
      kind,
    });
    return {
      ok: false,
      reason: "fetch_failed",
    };
  }
}
//@ chunk-dyv7vy4v.js:2130-2420 placement
async function patchNotificationPreferences(e) {
  if (!isClaudeAISubscriber_2()) return;
  try {
    if (
      !(
        await apiClient.patch(PREFERENCES_PATH, e, {
          timeout: PREFERENCES_TIMEOUT_MS,
        })
      ).ok
    ) {
      logFeatureSad("notif_prefs_patch", "no_auth");
      return;
    }
    logForDiagnosticsNoPII("info", "notif_prefs_patch_ok", {});
    logFeatureOk("notif_prefs_patch");
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    logForDiagnosticsNoPII("warn", "notif_prefs_patch_failed", {
      kind,
    });
    logFeatureBad("notif_prefs_patch", "http_error");
  }
}
//@ chunk-dyv7vy4v.js:2420-2766 placement
/**
 * 把本地推送通知设置同步到服务端。
 */
function pushNotificationPreferences() {
  drainSettingsWrites()
    .then(() => {
      let e = localNotificationPreferences();
      let t = {};
      if (typeof e.agentPushNotifEnabled === "boolean")
        t.bogosort = {
          enable_push: e.agentPushNotifEnabled,
        };
      if (typeof e.inputNeededNotifEnabled === "boolean")
        t.code_requires_action = {
          enable_push: e.inputNeededNotifEnabled,
        };
      if (Object.keys(t).length === 0) return;
      return patchNotificationPreferences({
        preferences: {
          feature_preference: t,
        },
      });
    })
    .catch(logError);
}
//@ chunk-dyv7vy4v.js:2766-3873 placement
/**
 * 启动时拉取通知偏好并更新本地状态。
 */
async function hydrateNotificationPreferences(storageV5) {
  if (!isClaudeAISubscriber_2()) {
    logFeatureSad("notif_prefs_hydrate", "no_auth");
    getNotificationPrefsState().reachability.setState(() => null);
    logForDiagnosticsNoPII("info", "notif_prefs_hydrate_skipped", {
      reason: "no_auth",
    });
    return;
  }
  let notificationPreferences = await fetchNotificationPreferences();
  if (!notificationPreferences.ok) {
    logFeatureBad("notif_prefs_hydrate", notificationPreferences.reason);
    getNotificationPrefsState().reachability.setState(() => null);
    logForDiagnosticsNoPII("info", "notif_prefs_hydrate_skipped", {
      reason: notificationPreferences.reason,
    });
    return;
  }
  let prefs = notificationPreferences.prefs;
  let pushReachability = prefs.push_reachability ?? null;
  getNotificationPrefsState().reachability.setState(() => pushReachability);
  if (pushReachability)
    logEvent("tengu_push_reachability", {
      has_active_channel: pushReachability.has_active_channel,
      platform_count: pushReachability.platforms.length,
    });
  let featurePreference = prefs.preferences?.feature_preference;
  let enablePush = featurePreference?.bogosort?.enable_push;
  let enablePush_2 = featurePreference?.code_requires_action?.enable_push;
  let b = localNotificationPreferences();
  let s = {};
  if (b.agentPushNotifEnabled === undefined && typeof enablePush === "boolean")
    s.agentPushNotifEnabled = enablePush;
  if (b.inputNeededNotifEnabled === undefined && typeof enablePush_2 === "boolean")
    s.inputNeededNotifEnabled = enablePush_2;
  logForDiagnosticsNoPII("info", "notif_prefs_hydrate_result", {
    has_active_channel: pushReachability?.has_active_channel,
    server_bogosort: enablePush,
    server_code_requires_action: enablePush_2,
    seeded: Object.keys(s).length > 0,
  });
  if (Object.keys(s).length === 0) {
    logFeatureOk("notif_prefs_hydrate");
    return;
  }
  await updateSettingsForSource("userSettings", s, undefined, storageV5);
  getNotificationPrefsState().hydrated.emit();
  logFeatureOk("notif_prefs_hydrate");
}
export {
  onReachabilityChange,
  getReachability,
  onHydrated,
  hydrateNotificationPreferences,
  pushNotificationPreferences,
};
