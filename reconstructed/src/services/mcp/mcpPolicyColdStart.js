/**
 * services/mcp/mcpPolicyColdStart.ts
 *
 * 2.1.316 新增：MCP 冷启动时等待远程托管设置/策略限制结论
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x8dej8aq.js (1)
 * attribution: placement 1
 */
import {
  isRemoteManagedSettingsColdStartPending,
  isRemoteManagedProvisionPending,
  waitForRemoteManagedSettingsFetchToSettle,
  waitForRemoteManagedSettingsToLoad,
  didRemoteManagedSettingsBackstopRelease,
} from "../remoteManagedSettings/loader.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  shouldAwaitPolicyLimitsOnStartup,
  awaitPolicyLimitsColdStartVerdict,
} from "../policyLimits/PolicyLimitsClient.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { mightHaveMcpServers } from "./types.js";
import { n5e, Br } from "../../utils/startupTiming.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { hostSessionSkipsSharedCache } from "../remoteManagedSettings/remoteSettingsCache.js";
import { oat } from "../policyLimits/startupGate.js";

/**
 * MCP 配置冷启动前等待策略：远程托管设置在验证中时等其落定；可能有 MCP 服务器来源时等远程托管设置加载，并记录等待耗时诊断；需要时再等策略限制结论（超时则不带它继续）。
 */
//@ chunk-x8dej8aq.js:595-1829 placement
async function awaitMcpPolicyColdStart(options) {
  let startTime = performance.now(),
    awaitedSettings = !1,
    waitStart,
    coldStartPending = isRemoteManagedSettingsColdStartPending(),
    mayNeedPolicyLimits = !1;
  if (isRemoteManagedProvisionPending())
    (logForDebugging(
      "[mcp-policy-cold-start] waiting on remote managed-settings confirmation (managedMcpServers is withheld from the unverified cache)",
    ),
      (waitStart = performance.now()),
      await waitForRemoteManagedSettingsFetchToSettle(),
      (awaitedSettings = !0),
      (mayNeedPolicyLimits = !0));
  else if (!coldStartPending && !shouldAwaitPolicyLimitsOnStartup());
  else if (
    options.hasDynamicMcpConfig ||
    !options.pluginStateReliable ||
    getIsNonInteractiveSession() ||
    (await mightHaveMcpServers(options.storageV5))
  ) {
    if (coldStartPending)
      (logForDebugging("[mcp-policy-cold-start] waiting on remote managed-settings load"),
        (waitStart = performance.now()),
        await waitForRemoteManagedSettingsToLoad(),
        (awaitedSettings = !0));
    mayNeedPolicyLimits = !0;
  } else logForDebugging("[mcp-policy-cold-start] skipped \u2014 no MCP server source visible");
  if (waitStart !== void 0 && n5e("mcp_policy_settings_wait_ms") === void 0) {
    let s = performance.now() - waitStart,
      c = didRemoteManagedSettingsBackstopRelease();
    Br("mcp_policy_settings_wait_ms", s, waitStart);
    let d = c
      ? "timed_out"
      : isRemoteManagedSettingsColdStartPending() || isRemoteManagedProvisionPending()
        ? "load_failed"
        : "ok";
    logForDiagnosticsNoPII(d === "ok" ? "info" : "warn", "mcp_policy_settings_wait", {
      waited_ms: Math.round(s),
      timed_out: c,
      outcome: d,
      ...(hostSessionSkipsSharedCache() && { stored_copy: "not_read" }),
    });
  }
  if (
    (oat(
      "settings",
      () =>
        !awaitedSettings
          ? "not_awaited"
          : didRemoteManagedSettingsBackstopRelease()
            ? "timed_out"
            : "completed",
      { since: awaitedSettings ? startTime : void 0 },
    ),
    mayNeedPolicyLimits && shouldAwaitPolicyLimitsOnStartup())
  ) {
    if (
      (logForDebugging(
        "[mcp-policy-cold-start] waiting on the policy-limits verdict (compliance taints feed config ${VAR} expansion)",
      ),
      (await awaitPolicyLimitsColdStartVerdict()) === "timed_out")
    )
      logForDebugging(
        "[mcp-policy-cold-start] policy-limits verdict did not land within the cold-start budget; loading MCP configs without it",
      );
  }
}

export { awaitMcpPolicyColdStart };
