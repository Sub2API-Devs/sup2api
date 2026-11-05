/**
 * utils/plugins/pluginPolicyColdStart.ts
 *
 * 2.1.316 新增：冷启动时等待远程托管设置加载后再加载插件；当前是否为插件命令上下文。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7zw1900d.js (2), chunk-h61dq9nz.js (4)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { initBuiltinPlugins as initBuiltinPlugins_2 } from "../../plugins/builtinPlugins.js";
import { getPolicyMemoryFingerprint } from "../../main.js";
import { serializeCalls } from "../promiseQueue.js";
import { clearMemoryFilesCache } from "../../components/Message.js";
import { invalidateUserContext } from "../../context.js";
import { logError } from "../log.js";
import { marketplaceNameAnswerState } from "./marketplaceNames.js";
import {
  waitForRemoteManagedSettingsFetchToSettle,
  isRemoteManagedSettingsColdStartPending,
  waitForRemoteManagedSettingsToLoad,
  didRemoteManagedSettingsBackstopRelease,
} from "../../services/remoteManagedSettings/loader.js";
import { logForDebugging } from "../debug.js";
import { isShuttingDown } from "../gracefulShutdown.js";
import { unansweredSecuritySettingsDialog } from "../../services/remoteManagedSettings/securityCheck.js";
import { recordLoadBarrier } from "../../services/policyLimits/startupGate.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import {
  logFeatureOkAsync,
  logFeatureBadAsync,
  logFeatureSadAsync,
} from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7zw1900d.js:228-246 placement
/**
 * initBuiltinPlugins：初始化内置插件。
 */
var initBuiltinPlugins = () => initBuiltinPlugins_2();
//@ chunk-7zw1900d.js:246-264 placement
/**
 * 当前是否为插件命令上下文。
 */
var isPluginCommandContext = () => initBuiltinPlugins_2();
//@ chunk-h61dq9nz.js:15837-16067 placement
function watchManagedMemoryPolicy(rootSession) {
  let lastFingerprint = "";
  let lastResponse = "[]";
  let policyMemoryFingerprint = getPolicyMemoryFingerprint();
  let watch = serializeCalls(async (initial) => {
    try {
      let [fingerprint, response] = initial
        ? await policyMemoryFingerprint
        : await getPolicyMemoryFingerprint();
      if (fingerprint === lastFingerprint) return;
      let cause = response === lastResponse ? "policy_refresh" : "managed_folder_check";
      lastFingerprint = fingerprint;
      lastResponse = response;
      if (initial) return;
      clearMemoryFilesCache(rootSession);
      invalidateUserContext(rootSession, cause);
    } catch (error) {
      logError(error);
    }
  });
  watch(true);
  return () => watch(false);
}
//@ chunk-h61dq9nz.js:16067-16147 placement
var READ_ONLY_PLUGIN_SUBCOMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h61dq9nz.js:16067", () => {
  READ_ONLY_PLUGIN_SUBCOMMANDS = new Set([
    "list",
    "marketplace list",
    "validate",
    "tag",
    "test",
    "eval init",
  ]);
});
//@ chunk-h61dq9nz.js:16147-16285 placement
/**
 * commander 动作是否为会修改插件状态的 plugin 子命令（list、marketplace list、validate、tag、test、eval init 除外）。
 */
function isPluginMutationCommand(command) {
  let parts = [];
  for (let node = command; node.parent !== null; node = node.parent) parts.unshift(node.name());
  return parts[0] === "plugin" && !READ_ONLY_PLUGIN_SUBCOMMANDS.has(parts.slice(1).join(" "));
}
//@ chunk-h61dq9nz.js:16285-17095 placement
/**
 * 冷启动时等待远程托管设置加载后再加载插件。
 */
async function awaitPluginPolicyColdStart() {
  if (marketplaceNameAnswerState() === "unanswered") await waitForRemoteManagedSettingsFetchToSettle();
  if (!isRemoteManagedSettingsColdStartPending()) return true;
  logForDebugging("[plugin-policy-cold-start] waiting on remote managed-settings load");
  let startTime = performance.now();
  await waitForRemoteManagedSettingsToLoad();
  let mayContinue = !isShuttingDown() && unansweredSecuritySettingsDialog() === null;
  let timedOut = didRemoteManagedSettingsBackstopRelease();
  let outcome = !mayContinue
    ? "stopped"
    : timedOut
      ? "timed_out"
      : isRemoteManagedSettingsColdStartPending()
        ? "load_failed"
        : "ok";
  recordLoadBarrier("settings", timedOut ? "timed_out" : "completed", {
    since: startTime,
  });
  logForDiagnosticsNoPII(outcome === "ok" ? "info" : "warn", "plugin_policy_settings_wait", {
    waited_ms: Math.round(performance.now() - startTime),
    outcome,
  });
  if (outcome === "ok") {
    await logFeatureOkAsync("plugin_policy_cold_start");
    return true;
  }
  logForDebugging(
    mayContinue
      ? `[plugin-policy-cold-start] going on, managed policy not confirmed: ${outcome}`
      : "[plugin-policy-cold-start] the command does not run: managed settings were not approved, or the process is exiting",
    {
      level: "warn",
    },
  );
  if (outcome === "stopped") await logFeatureBadAsync("plugin_policy_cold_start", outcome);
  else await logFeatureSadAsync("plugin_policy_cold_start", outcome);
  return mayContinue;
}
export {
  isPluginMutationCommand,
  watchManagedMemoryPolicy,
  initBuiltinPlugins,
  isPluginCommandContext,
  awaitPluginPolicyColdStart,
};
