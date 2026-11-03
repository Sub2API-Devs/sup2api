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
import { u, M, A, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
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

/**
 * 通知偏好 API 的响应 schema。
 */
//@ chunk-dyv7vy4v.js:680-1094 placement
var NotificationPreferencesSchema = DoctorLazy(() => {
  let e = u({ enable_email: M().nullish(), enable_push: M().nullish() }),
    t = u({ bogosort: e.nullish(), code_requires_action: e.nullish() }),
    r = u({
      has_active_channel: M(),
      platforms: A(o())
        .nullish()
        .transform((n) => n ?? []),
      most_recent_token_refresh: o().nullish(),
    });
  return u({
    account_id: E().nullish(),
    organization_id: E().nullish(),
    preferences: u({ feature_preference: t.nullish() }).nullish(),
    push_reachability: r.nullish(),
  });
});
//@ chunk-dyv7vy4v.js:1094-1159 placement
var y = 1e4,
  k = new HostScoped(() => ({ reachability: createStore(void 0), hydrated: createSignal() }));
//@ chunk-dyv7vy4v.js:1159-1194 placement
function i() {
  return k.of(getRootSession().host);
}
//@ chunk-dyv7vy4v.js:1194-1244 placement
function hKn() {
  return i().reachability.getState();
}
//@ chunk-dyv7vy4v.js:1244-1297 placement
function yKn(e) {
  return i().reachability.subscribe(e);
}
//@ chunk-dyv7vy4v.js:1297-1346 placement
function ijs(e) {
  return i().hydrated.subscribe(e);
}
//@ chunk-dyv7vy4v.js:1346-1593 placement
function localNotificationPreferences() {
  let e = getInitialSettings_2(),
    t = getGlobalConfig();
  return {
    agentPushNotifEnabled:
      e.agentPushNotifEnabled ?? validateConfigValue("agentPushNotifEnabled", t.agentPushNotifEnabled),
    inputNeededNotifEnabled:
      e.inputNeededNotifEnabled ?? validateConfigValue("inputNeededNotifEnabled", t.inputNeededNotifEnabled),
  };
}
//@ chunk-dyv7vy4v.js:1593-1643 placement
var S = "/api/claude_code/notification/preferences";
//@ chunk-dyv7vy4v.js:1643-1668 placement
function d() {
  return isClaudeAISubscriber();
}
/**
 * 获取 /api/claude_code/notification/preferences。
 */
//@ chunk-dyv7vy4v.js:1668-2130 placement
async function fetchNotificationPreferences() {
  if (!d()) return { ok: !1, reason: "no_auth" };
  try {
    let e = await apiClient.get(S, { timeout: y });
    if (!e.ok) return { ok: !1, reason: "fetch_failed" };
    let safeParse = NotificationPreferencesSchema().safeParse(e.data);
    if (!safeParse.success)
      return (
        logForDiagnosticsNoPII("warn", "notif_prefs_fetch_parse_failed", {
          issues: safeParse.error.issues.map((issue) => issue.path.join(".")).join(","),
        }),
        { ok: !1, reason: "parse_failed" }
      );
    return { ok: !0, prefs: safeParse.data };
  } catch (error) {
    let { kind: kind } = classifyAxiosError(error);
    return (
      logForDiagnosticsNoPII("warn", "notif_prefs_fetch_failed", { kind: kind }),
      { ok: !1, reason: "fetch_failed" }
    );
  }
}
//@ chunk-dyv7vy4v.js:2130-2420 placement
async function patchNotificationPreferences(e) {
  if (!d()) return;
  try {
    if (!(await apiClient.patch(S, e, { timeout: y })).ok) {
      logFeatureSad("notif_prefs_patch", "no_auth");
      return;
    }
    (logForDiagnosticsNoPII("info", "notif_prefs_patch_ok", {}), logFeatureOk("notif_prefs_patch"));
  } catch (error) {
    let { kind: kind } = classifyAxiosError(error);
    (logForDiagnosticsNoPII("warn", "notif_prefs_patch_failed", { kind: kind }),
      logFeatureBad("notif_prefs_patch", "http_error"));
  }
}
/**
 * 把本地推送通知设置同步到服务端。
 */
//@ chunk-dyv7vy4v.js:2420-2766 placement
function pushNotificationPreferences() {
  drainSettingsWrites()
    .then(() => {
      let e = localNotificationPreferences(),
        t = {};
      if (typeof e.agentPushNotifEnabled === "boolean") t.bogosort = { enable_push: e.agentPushNotifEnabled };
      if (typeof e.inputNeededNotifEnabled === "boolean")
        t.code_requires_action = { enable_push: e.inputNeededNotifEnabled };
      if (Object.keys(t).length === 0) return;
      return patchNotificationPreferences({ preferences: { feature_preference: t } });
    })
    .catch(logError);
}
/**
 * 启动时拉取通知偏好并更新本地状态。
 */
//@ chunk-dyv7vy4v.js:2766-3873 placement
async function hydrateNotificationPreferences(e) {
  if (!d()) {
    (logFeatureSad("notif_prefs_hydrate", "no_auth"),
      i().reachability.setState(() => null),
      logForDiagnosticsNoPII("info", "notif_prefs_hydrate_skipped", { reason: "no_auth" }));
    return;
  }
  let t = await fetchNotificationPreferences();
  if (!t.ok) {
    (logFeatureBad("notif_prefs_hydrate", t.reason),
      i().reachability.setState(() => null),
      logForDiagnosticsNoPII("info", "notif_prefs_hydrate_skipped", { reason: t.reason }));
    return;
  }
  let prefs = t.prefs,
    n = prefs.push_reachability ?? null;
  if ((i().reachability.setState(() => n), n))
    logEvent("tengu_push_reachability", {
      has_active_channel: n.has_active_channel,
      platform_count: n.platforms.length,
    });
  let _ = prefs.preferences?.feature_preference,
    c = _?.bogosort?.enable_push,
    h = _?.code_requires_action?.enable_push,
    b = localNotificationPreferences(),
    s = {};
  if (b.agentPushNotifEnabled === void 0 && typeof c === "boolean") s.agentPushNotifEnabled = c;
  if (b.inputNeededNotifEnabled === void 0 && typeof h === "boolean") s.inputNeededNotifEnabled = h;
  if (
    (logForDiagnosticsNoPII("info", "notif_prefs_hydrate_result", {
      has_active_channel: n?.has_active_channel,
      server_bogosort: c,
      server_code_requires_action: h,
      seeded: Object.keys(s).length > 0,
    }),
    Object.keys(s).length === 0)
  ) {
    logFeatureOk("notif_prefs_hydrate");
    return;
  }
  (await updateSettingsForSource("userSettings", s, void 0, e),
    i().hydrated.emit(),
    logFeatureOk("notif_prefs_hydrate"));
}

export { yKn, hKn, ijs, hydrateNotificationPreferences, pushNotificationPreferences };
