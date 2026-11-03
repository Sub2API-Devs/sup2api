/**
 * utils/plugins/pluginPolicyColdStart.ts
 *
 * 2.1.316 新增：冷启动时等待远程托管设置加载后再加载插件；当前是否为插件命令上下文。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (6)
 * attribution: placement 6
 */
import { getPolicyMemoryFingerprint } from "../../main.js";
import { serializeCalls } from "../promiseQueue.js";
import { clearMemoryFilesCache } from "../../components/Message.js";
import { invalidateUserContext } from "../../context.js";
import { logError } from "../log.js";
import { initBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { J_ } from "./marketplaceNames.js";
import {
  waitForRemoteManagedSettingsFetchToSettle,
  isRemoteManagedSettingsColdStartPending,
  waitForRemoteManagedSettingsToLoad,
  didRemoteManagedSettingsBackstopRelease,
} from "../../services/remoteManagedSettings/loader.js";
import { logForDebugging } from "../debug.js";
import { isShuttingDown } from "../gracefulShutdown.js";
import { unansweredSecuritySettingsDialog } from "../../services/remoteManagedSettings/securityCheck.js";
import { oat } from "../../services/policyLimits/startupGate.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import {
  logFeatureOkAsync,
  logFeatureBadAsync,
  logFeatureSadAsync,
} from "../../services/analytics/featureTelemetry.js";

//@ chunk-cjydagjy.js:15659-15889 placement
function watchManagedMemoryPolicy(e) {
  let r = "",
    n = "[]",
    s = getPolicyMemoryFingerprint(),
    S = serializeCalls(async (y) => {
      try {
        let [P, E] = y ? await s : await getPolicyMemoryFingerprint();
        if (P === r) return;
        let A = E === n ? "policy_refresh" : "managed_folder_check";
        if (((r = P), (n = E), y)) return;
        (clearMemoryFilesCache(e), invalidateUserContext(e, A));
      } catch (error) {
        logError(error);
      }
    });
  return (S(!0), () => S(!1));
}
//@ chunk-cjydagjy.js:15889-15906 placement
var No = () => initBuiltinPlugins();
/**
 * 当前是否为插件命令上下文。
 */
//@ chunk-cjydagjy.js:15906-15924 placement
var isPluginCommandContext = () => initBuiltinPlugins();
//@ chunk-cjydagjy.js:15924-16004 placement
var READ_ONLY_PLUGIN_SUBCOMMANDS = new Set([
  "list",
  "marketplace list",
  "validate",
  "tag",
  "test",
  "eval init",
]);
/**
 * commander 动作是否为会修改插件状态的 plugin 子命令（list、marketplace list、validate、tag、test、eval init 除外）。
 */
//@ chunk-cjydagjy.js:16004-16142 placement
function isPluginMutationCommand(e) {
  let r = [];
  for (let n = e; n.parent !== null; n = n.parent) r.unshift(n.name());
  return r[0] === "plugin" && !READ_ONLY_PLUGIN_SUBCOMMANDS.has(r.slice(1).join(" "));
}
/**
 * 冷启动时等待远程托管设置加载后再加载插件。
 */
//@ chunk-cjydagjy.js:16142-16952 placement
async function awaitPluginPolicyColdStart() {
  if (J_() === "unanswered") await waitForRemoteManagedSettingsFetchToSettle();
  if (!isRemoteManagedSettingsColdStartPending()) return !0;
  logForDebugging("[plugin-policy-cold-start] waiting on remote managed-settings load");
  let startTime = performance.now();
  await waitForRemoteManagedSettingsToLoad();
  let r = !isShuttingDown() && unansweredSecuritySettingsDialog() === null,
    n = didRemoteManagedSettingsBackstopRelease(),
    s = !r ? "stopped" : n ? "timed_out" : isRemoteManagedSettingsColdStartPending() ? "load_failed" : "ok";
  if (
    (oat("settings", n ? "timed_out" : "completed", { since: startTime }),
    logForDiagnosticsNoPII(s === "ok" ? "info" : "warn", "plugin_policy_settings_wait", {
      waited_ms: Math.round(performance.now() - startTime),
      outcome: s,
    }),
    s === "ok")
  )
    return (await logFeatureOkAsync("plugin_policy_cold_start"), !0);
  if (
    (logForDebugging(
      r
        ? `[plugin-policy-cold-start] going on, managed policy not confirmed: ${s}`
        : "[plugin-policy-cold-start] the command does not run: managed settings were not approved, or the process is exiting",
      { level: "warn" },
    ),
    s === "stopped")
  )
    await logFeatureBadAsync("plugin_policy_cold_start", s);
  else await logFeatureSadAsync("plugin_policy_cold_start", s);
  return r;
}

export {
  isPluginMutationCommand,
  watchManagedMemoryPolicy,
  No,
  isPluginCommandContext,
  awaitPluginPolicyColdStart,
};
