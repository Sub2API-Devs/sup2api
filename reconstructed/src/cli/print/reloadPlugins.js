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
import {
  CLOUD_PLUGINS_FORWARDED_KEY,
  CLOUD_PLUGINS_FORWARDED_KEYS,
} from "../../utils/plugins/cloudPluginForwarding.js";
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
      e = new Set();
      return Object.keys(n).some((key) => r.has(key)) ? wi(n, (s, h) => r.has(h)) : null;
    },
  };
}
//@ chunk-tyg7f3ek.js:615636-615679 placement
function hasCloudPluginsKey(e) {
  return Object.hasOwn(e, CLOUD_PLUGINS_FORWARDED_KEY);
}
//@ chunk-tyg7f3ek.js:615679-616239 placement
async function evaluateCloudPluginsPatch(e) {
  let keys = Object.keys(e.settings);
  let r = e.settings[CLOUD_PLUGINS_FORWARDED_KEY];
  if (
    keys.length !== 1 ||
    !isPlainObject_2(r) ||
    Object.keys(r).some((key) => !CLOUD_PLUGINS_FORWARDED_KEYS.includes(key))
  )
    return {
      apply: false,
      reason: "malformed",
    };
  if (e.admission === undefined)
    return {
      apply: false,
      reason: "not_admitted",
    };
  if (!e.admission.admitted)
    return {
      apply: false,
      reason: e.admission.reason,
    };
  let s = e.now();
  let h = await withDeadline(
    Promise.resolve()
      .then(e.readFlag)
      .catch(() => false),
    e.flagWaitCapMs,
  );
  let flagWaitMs = Math.round(e.now() - s);
  if (h === undefined)
    return {
      apply: false,
      reason: "flag_unsettled",
    };
  if (!h)
    return {
      apply: false,
      reason: "flag_off",
    };
  return {
    apply: true,
    settings: {
      ...r,
    },
    flagWaitMs,
  };
}
//@ chunk-tyg7f3ek.js:616239-616436 placement
async function splitCloudPluginsPatch(e) {
  let { [CLOUD_PLUGINS_FORWARDED_KEY]: n, ...r } = e.settings;
  let s = await evaluateCloudPluginsPatch({
    ...e,
    settings: {
      [CLOUD_PLUGINS_FORWARDED_KEY]: n,
    },
  });
  let h = Object.keys(r).length;
  return {
    verdict: s,
    alone: h === 0,
    merge: s.apply
      ? {
          ...r,
          ...s.settings,
        }
      : r,
    siblingKeyCount: h,
  };
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
//@ chunk-tyg7f3ek.js:616620-617394 placement
/**
 * reload_plugins 时在准入后等待开关并对齐 marketplace、补装插件（有超时）。
 */
async function reconcileMarketplacesOnReload(e) {
  if (e.admission?.admitted !== true)
    return {
      ran: false,
      reason: "not_admitted",
    };
  let n = e.now();
  let r = await withDeadline(
    Promise.resolve()
      .then(e.readFlag)
      .catch(() => false),
    e.flagWaitCapMs,
  );
  let flagWaitMs = Math.round(e.now() - n);
  if (r === undefined)
    return {
      ran: false,
      reason: "flag_unsettled",
      flagWaitMs,
    };
  if (!r)
    return {
      ran: false,
      reason: "flag_off",
      flagWaitMs,
    };
  let h = e.now();
  let y = 0;
  let S = 0;
  let R = Promise.resolve()
    .then(() =>
      e.install((P) => {
        if (P.status === "installed") y++;
        else if (P.status === "failed") S++;
      }),
    )
    .then(
      (P) => (P ? "changed" : "unchanged"),
      () => "failed",
    );
  let w = await withDeadline(R, e.installTimeoutMs);
  if (w === undefined)
    R.then((outcome) =>
      e.onLateEnd({
        outcome,
        durationMs: Math.round(e.now() - h),
        installedCount: y,
        failedCount: S,
      }),
    ).catch(logError);
  return {
    ran: true,
    outcome: w ?? "timed_out",
    flagWaitMs,
    durationMs: Math.round(e.now() - h),
    installedCount: y,
    failedCount: S,
  };
}
//@ chunk-tyg7f3ek.js:617394-617723 placement
function logLateInstallPass(e) {
  logForDebugging(
    `reload_plugins: the install pass the reload stopped waiting for ended ${e.outcome} after ${e.durationMs}ms (installed=${e.installedCount} failed=${e.failedCount})`,
  );
  logEvent("tengu_cloud_plugins_late_install", {
    outcome: fromEnum(e.outcome),
    duration_ms: e.durationMs,
    installed_count: e.installedCount,
    failed_count: e.failedCount,
  });
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
