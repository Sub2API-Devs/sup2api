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
import {
  objectSchema,
  booleanSchema,
  array,
  stringSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dyv7vy4v.js:680-1094 placement
/**
 * 通知偏好 API 的响应 schema。
 */
var NotificationPreferencesSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dyv7vy4v.js:680", () => {
  NotificationPreferencesSchema = DoctorLazy(() => {
    let channelPrefs = objectSchema({
      enable_email: booleanSchema().nullish(),
      enable_push: booleanSchema().nullish(),
    });
    let featurePrefs = objectSchema({
      bogosort: channelPrefs.nullish(),
      code_requires_action: channelPrefs.nullish(),
    });
    let pushReachability = objectSchema({
      has_active_channel: booleanSchema(),
      platforms: array(stringSchema())
        .nullish()
        .transform((platforms) => platforms ?? []),
      most_recent_token_refresh: stringSchema().nullish(),
    });
    return objectSchema({
      account_id: numberSchema().nullish(),
      organization_id: numberSchema().nullish(),
      preferences: objectSchema({
        feature_preference: featurePrefs.nullish(),
      }).nullish(),
      push_reachability: pushReachability.nullish(),
    });
  });
});
//@ chunk-dyv7vy4v.js:1094-1159 placement
/**
 * 按宿主保存的通知偏好状态。
 */
var PREFERENCES_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var notificationPrefsState;
deferInit("chunk-dyv7vy4v.js:1094", () => {
  PREFERENCES_TIMEOUT_MS = 1e4;
  notificationPrefsState = new HostScoped(() => ({
    reachability: createStore(undefined),
    hydrated: createSignal(),
  }));
});
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
function onReachabilityChange(listener) {
  return getNotificationPrefsState().reachability.subscribe(listener);
}
//@ chunk-dyv7vy4v.js:1297-1346 placement
/**
 * 订阅“已水合”信号。
 */
function onHydrated(listener) {
  return getNotificationPrefsState().hydrated.subscribe(listener);
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
    let response = await apiClient.get(PREFERENCES_PATH, {
      timeout: PREFERENCES_TIMEOUT_MS,
    });
    if (!response.ok)
      return {
        ok: false,
        reason: "fetch_failed",
      };
    let parsed = NotificationPreferencesSchema().safeParse(response.data);
    if (!parsed.success) {
      logForDiagnosticsNoPII("warn", "notif_prefs_fetch_parse_failed", {
        issues: parsed.error.issues.map((issue) => issue.path.join(".")).join(","),
      });
      return {
        ok: false,
        reason: "parse_failed",
      };
    }
    return {
      ok: true,
      prefs: parsed.data,
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
async function patchNotificationPreferences(preferences) {
  if (!isClaudeAISubscriber_2()) return;
  try {
    if (
      !(
        await apiClient.patch(PREFERENCES_PATH, preferences, {
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
      let localPrefs = localNotificationPreferences();
      let featurePrefs = {};
      if (typeof localPrefs.agentPushNotifEnabled === "boolean")
        featurePrefs.bogosort = {
          enable_push: localPrefs.agentPushNotifEnabled,
        };
      if (typeof localPrefs.inputNeededNotifEnabled === "boolean")
        featurePrefs.code_requires_action = {
          enable_push: localPrefs.inputNeededNotifEnabled,
        };
      if (Object.keys(featurePrefs).length === 0) return;
      return patchNotificationPreferences({
        preferences: {
          feature_preference: featurePrefs,
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
  let localPrefs = localNotificationPreferences();
  let seedSettings = {};
  if (localPrefs.agentPushNotifEnabled === undefined && typeof enablePush === "boolean")
    seedSettings.agentPushNotifEnabled = enablePush;
  if (localPrefs.inputNeededNotifEnabled === undefined && typeof enablePush_2 === "boolean")
    seedSettings.inputNeededNotifEnabled = enablePush_2;
  logForDiagnosticsNoPII("info", "notif_prefs_hydrate_result", {
    has_active_channel: pushReachability?.has_active_channel,
    server_bogosort: enablePush,
    server_code_requires_action: enablePush_2,
    seeded: Object.keys(seedSettings).length > 0,
  });
  if (Object.keys(seedSettings).length === 0) {
    logFeatureOk("notif_prefs_hydrate");
    return;
  }
  await updateSettingsForSource("userSettings", seedSettings, undefined, storageV5);
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
