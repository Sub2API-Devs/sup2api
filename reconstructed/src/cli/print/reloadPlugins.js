/**
 * cli/print/reloadPlugins.ts
 *
 * 2.1.316 新增：重载插件时的市场对账与云插件补丁评估
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (9)
 * attribution: placement 9
 */
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { CLOUD_PLUGINS_FORWARDED_KEY, DLs } from "../../utils/plugins/cloudPluginForwarding.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { withDeadline } from "../../utils/sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-tyg7f3ek.js:615453-615636 placement
function createPluginFlagTracker() {
  let e = new Set();
  return {
    applied(n) {
      e = new Set([...e, ...Object.keys(n)]);
    },
    retract(n) {
      let r = e;
      return ((e = new Set()), Object.keys(n).some((s) => r.has(s)) ? wi(n, (s, h) => r.has(h)) : null);
    },
  };
}
//@ chunk-tyg7f3ek.js:615636-615679 placement
function hasCloudPluginsKey(e) {
  return Object.hasOwn(e, CLOUD_PLUGINS_FORWARDED_KEY);
}
//@ chunk-tyg7f3ek.js:615679-616239 placement
async function evaluateCloudPluginsPatch(e) {
  let keys = Object.keys(e.settings),
    r = e.settings[CLOUD_PLUGINS_FORWARDED_KEY];
  if (keys.length !== 1 || !isPlainObject_2(r) || Object.keys(r).some((S) => !DLs.includes(S)))
    return { apply: !1, reason: "malformed" };
  if (e.admission === void 0) return { apply: !1, reason: "not_admitted" };
  if (!e.admission.admitted) return { apply: !1, reason: e.admission.reason };
  let now = e.now(),
    h = await withDeadline(
      Promise.resolve()
        .then(e.readFlag)
        .catch(() => !1),
      e.flagWaitCapMs,
    ),
    rounded = Math.round(e.now() - now);
  if (h === void 0) return { apply: !1, reason: "flag_unsettled" };
  if (!h) return { apply: !1, reason: "flag_off" };
  return { apply: !0, settings: { ...r }, flagWaitMs: rounded };
}
//@ chunk-tyg7f3ek.js:616239-616436 placement
async function splitCloudPluginsPatch(e) {
  let { [CLOUD_PLUGINS_FORWARDED_KEY]: n, ...r } = e.settings,
    s = await evaluateCloudPluginsPatch({ ...e, settings: { [CLOUD_PLUGINS_FORWARDED_KEY]: n } }),
    h = Object.keys(r).length;
  return { verdict: s, alone: h === 0, merge: s.apply ? { ...r, ...s.settings } : r, siblingKeyCount: h };
}
//@ chunk-tyg7f3ek.js:616436-616608 placement
function logMixedCloudPluginsPatch(e) {
  logEvent("tengu_cloud_plugins_mixed_patch", {
    applied: e.verdict.apply,
    refused_reason: fromEnum(e.verdict.apply ? "none" : e.verdict.reason),
    sibling_key_count: e.siblingKeyCount,
  });
}
//@ chunk-tyg7f3ek.js:616608-616620 placement
var PLUGIN_INSTALL_WAIT_MS = 5000;
/**
 * reload_plugins 时在准入后等待开关并对齐 marketplace、补装插件（有超时）。
 */
//@ chunk-tyg7f3ek.js:616620-617394 placement
async function reconcileMarketplacesOnReload(e) {
  if (e.admission?.admitted !== !0) return { ran: !1, reason: "not_admitted" };
  let now = e.now(),
    r = await withDeadline(
      Promise.resolve()
        .then(e.readFlag)
        .catch(() => !1),
      e.flagWaitCapMs,
    ),
    rounded = Math.round(e.now() - now);
  if (r === void 0) return { ran: !1, reason: "flag_unsettled", flagWaitMs: rounded };
  if (!r) return { ran: !1, reason: "flag_off", flagWaitMs: rounded };
  let now_2 = e.now(),
    y = 0,
    S = 0,
    R = Promise.resolve()
      .then(() =>
        e.install((P) => {
          if (P.status === "installed") y++;
          else if (P.status === "failed") S++;
        }),
      )
      .then(
        (P) => (P ? "changed" : "unchanged"),
        () => "failed",
      ),
    w = await withDeadline(R, e.installTimeoutMs);
  if (w === void 0)
    R.then((P) =>
      e.onLateEnd({ outcome: P, durationMs: Math.round(e.now() - now_2), installedCount: y, failedCount: S }),
    ).catch(logError);
  return {
    ran: !0,
    outcome: w ?? "timed_out",
    flagWaitMs: rounded,
    durationMs: Math.round(e.now() - now_2),
    installedCount: y,
    failedCount: S,
  };
}
//@ chunk-tyg7f3ek.js:617394-617723 placement
function logLateInstallPass(e) {
  (logForDebugging(
    `reload_plugins: the install pass the reload stopped waiting for ended ${e.outcome} after ${e.durationMs}ms (installed=${e.installedCount} failed=${e.failedCount})`,
  ),
    logEvent("tengu_cloud_plugins_late_install", {
      outcome: fromEnum(e.outcome),
      duration_ms: e.durationMs,
      installed_count: e.installedCount,
      failed_count: e.failedCount,
    }));
}
//@ chunk-tyg7f3ek.js:617723-618438 placement
function logMarketplaceReconcile(e) {
  if (!e.ran) {
    if (e.reason !== "not_admitted")
      logForDebugging(`reload_plugins: marketplace reconcile skipped (${e.reason} after ${e.flagWaitMs}ms)`);
    return;
  }
  logForDebugging(
    `reload_plugins: marketplace reconcile ${e.outcome} in ${e.durationMs}ms (installed=${e.installedCount} failed=${e.failedCount})`,
  );
  let n = {
    outcome: fromEnum(e.outcome),
    flag_wait_ms: e.flagWaitMs,
    duration_ms: e.durationMs,
    installed_count: e.installedCount,
    failed_count: e.failedCount,
  };
  if (e.outcome === "failed") logFeatureBad("ccr_plugin_forwarding_reconcile", "install_failed", n);
  else if (e.outcome === "timed_out") logFeatureSad("ccr_plugin_forwarding_reconcile", "timed_out", n);
  else if (e.failedCount > 0) logFeatureSad("ccr_plugin_forwarding_reconcile", "marketplace_failed", n);
  else logFeatureOk("ccr_plugin_forwarding_reconcile", n);
}

export {
  createPluginFlagTracker,
  reconcileMarketplacesOnReload,
  PLUGIN_INSTALL_WAIT_MS,
  logLateInstallPass,
  logMarketplaceReconcile,
  hasCloudPluginsKey,
  splitCloudPluginsPatch,
  logMixedCloudPluginsPatch,
};
