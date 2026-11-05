/**
 * cli/print/reloadPlugins.ts
 *
 * 2.1.316 新增：重载插件时的市场对账与云插件补丁评估
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-0yw3taqg.js:657531-657714 placement
function createPluginFlagTracker() {
  let keys = new Set();
  return {
    applied(flags) {
      keys = new Set([...keys, ...Object.keys(flags)]);
    },
    retract(flags) {
      let previous = keys;
      keys = new Set();
      return Object.keys(flags).some((key) => previous.has(key))
        ? import_reject(flags, (key, name) => previous.has(name))
        : null;
    },
  };
}
//@ chunk-0yw3taqg.js:657714-657757 placement
function hasCloudPluginsKey(settings) {
  return Object.hasOwn(settings, CLOUD_PLUGINS_FORWARDED_KEY);
}
//@ chunk-0yw3taqg.js:657757-658317 placement
async function evaluateCloudPluginsPatch(options) {
  let keys = Object.keys(options.settings);
  let patch = options.settings[CLOUD_PLUGINS_FORWARDED_KEY];
  if (
    keys.length !== 1 ||
    !isPlainObject_2(patch) ||
    Object.keys(patch).some((key) => !CLOUD_PLUGINS_FORWARDED_KEYS.includes(key))
  )
    return {
      apply: false,
      reason: "malformed",
    };
  if (options.admission === undefined)
    return {
      apply: false,
      reason: "not_admitted",
    };
  if (!options.admission.admitted)
    return {
      apply: false,
      reason: options.admission.reason,
    };
  let startedAt = options.now();
  let flagReady = await withDeadline(
    Promise.resolve()
      .then(options.readFlag)
      .catch(() => false),
    options.flagWaitCapMs,
  );
  let flagWaitMs = Math.round(options.now() - startedAt);
  if (flagReady === undefined)
    return {
      apply: false,
      reason: "flag_unsettled",
    };
  if (!flagReady)
    return {
      apply: false,
      reason: "flag_off",
    };
  return {
    apply: true,
    settings: {
      ...patch,
    },
    flagWaitMs,
  };
}
//@ chunk-0yw3taqg.js:658317-658514 placement
async function splitCloudPluginsPatch(request) {
  let { [CLOUD_PLUGINS_FORWARDED_KEY]: pluginPatch, ...rest } = request.settings;
  let verdict = await evaluateCloudPluginsPatch({
    ...request,
    settings: {
      [CLOUD_PLUGINS_FORWARDED_KEY]: pluginPatch,
    },
  });
  let siblingKeyCount = Object.keys(rest).length;
  return {
    verdict,
    alone: siblingKeyCount === 0,
    merge: verdict.apply
      ? {
          ...rest,
          ...verdict.settings,
        }
      : rest,
    siblingKeyCount,
  };
}
//@ chunk-0yw3taqg.js:658514-658686 placement
function logMixedCloudPluginsPatch(patch) {
  logEvent("tengu_cloud_plugins_mixed_patch", {
    applied: patch.verdict.apply,
    refused_reason: fromEnum(patch.verdict.apply ? "none" : patch.verdict.reason),
    sibling_key_count: patch.siblingKeyCount,
  });
}
//@ chunk-0yw3taqg.js:658686-658698 placement
var PLUGIN_INSTALL_WAIT_MS = 5000;
//@ chunk-0yw3taqg.js:658698-659472 placement
/**
 * reload_plugins 时在准入后等待开关并对齐 marketplace、补装插件（有超时）。
 */
async function reconcileMarketplacesOnReload(options) {
  if (options.admission?.admitted !== true)
    return {
      ran: false,
      reason: "not_admitted",
    };
  let startedAt = options.now();
  let flagReady = await withDeadline(
    Promise.resolve()
      .then(options.readFlag)
      .catch(() => false),
    options.flagWaitCapMs,
  );
  let flagWaitMs = Math.round(options.now() - startedAt);
  if (flagReady === undefined)
    return {
      ran: false,
      reason: "flag_unsettled",
      flagWaitMs,
    };
  if (!flagReady)
    return {
      ran: false,
      reason: "flag_off",
      flagWaitMs,
    };
  let installStartedAt = options.now();
  let installedCount = 0;
  let failedCount = 0;
  let installPromise = Promise.resolve()
    .then(() =>
      options.install((result) => {
        if (result.status === "installed") installedCount++;
        else if (result.status === "failed") failedCount++;
      }),
    )
    .then(
      (changed) => (changed ? "changed" : "unchanged"),
      () => "failed",
    );
  let outcome = await withDeadline(installPromise, options.installTimeoutMs);
  if (outcome === undefined)
    installPromise
      .then((outcome) =>
        options.onLateEnd({
          outcome,
          durationMs: Math.round(options.now() - installStartedAt),
          installedCount,
          failedCount,
        }),
      )
      .catch(logError);
  return {
    ran: true,
    outcome: outcome ?? "timed_out",
    flagWaitMs,
    durationMs: Math.round(options.now() - installStartedAt),
    installedCount,
    failedCount,
  };
}
//@ chunk-0yw3taqg.js:659472-659801 placement
function logLateInstallPass(report) {
  logForDebugging(
    `reload_plugins: the install pass the reload stopped waiting for ended ${report.outcome} after ${report.durationMs}ms (installed=${report.installedCount} failed=${report.failedCount})`,
  );
  logEvent("tengu_cloud_plugins_late_install", {
    outcome: fromEnum(report.outcome),
    duration_ms: report.durationMs,
    installed_count: report.installedCount,
    failed_count: report.failedCount,
  });
}
//@ chunk-0yw3taqg.js:659801-660516 placement
function logMarketplaceReconcile(report) {
  if (!report.ran) {
    if (report.reason !== "not_admitted")
      logForDebugging(
        `reload_plugins: marketplace reconcile skipped (${report.reason} after ${report.flagWaitMs}ms)`,
      );
    return;
  }
  logForDebugging(
    `reload_plugins: marketplace reconcile ${report.outcome} in ${report.durationMs}ms (installed=${report.installedCount} failed=${report.failedCount})`,
  );
  let fields = {
    outcome: fromEnum(report.outcome),
    flag_wait_ms: report.flagWaitMs,
    duration_ms: report.durationMs,
    installed_count: report.installedCount,
    failed_count: report.failedCount,
  };
  if (report.outcome === "failed") logFeatureBad("ccr_plugin_forwarding_reconcile", "install_failed", fields);
  else if (report.outcome === "timed_out")
    logFeatureSad("ccr_plugin_forwarding_reconcile", "timed_out", fields);
  else if (report.failedCount > 0)
    logFeatureSad("ccr_plugin_forwarding_reconcile", "marketplace_failed", fields);
  else logFeatureOk("ccr_plugin_forwarding_reconcile", fields);
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
