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
import { getRecordedPhase, recordPhase } from "../../utils/startupTiming.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { hostSessionSkipsSharedCache } from "../remoteManagedSettings/remoteSettingsCache.js";
import { recordLoadBarrier } from "../policyLimits/startupGate.js";

//@ chunk-x8dej8aq.js:595-1829 placement
/**
 * MCP 配置冷启动前等待策略：远程托管设置在验证中时等其落定；可能有 MCP 服务器来源时等远程托管设置加载，并记录等待耗时诊断；需要时再等策略限制结论（超时则不带它继续）。
 */
async function awaitMcpPolicyColdStart(options) {
  let startTime = performance.now();
  let awaitedSettings = false;
  let waitStart;
  let coldStartPending = isRemoteManagedSettingsColdStartPending();
  let mayNeedPolicyLimits = false;
  if (isRemoteManagedProvisionPending()) {
    logForDebugging(
      "[mcp-policy-cold-start] waiting on remote managed-settings confirmation (managedMcpServers is withheld from the unverified cache)",
    );
    waitStart = performance.now();
    await waitForRemoteManagedSettingsFetchToSettle();
    awaitedSettings = true;
    mayNeedPolicyLimits = true;
  } else if (!coldStartPending && !shouldAwaitPolicyLimitsOnStartup());
  else if (
    options.hasDynamicMcpConfig ||
    !options.pluginStateReliable ||
    getIsNonInteractiveSession() ||
    (await mightHaveMcpServers(options.storageV5))
  ) {
    if (coldStartPending) {
      logForDebugging("[mcp-policy-cold-start] waiting on remote managed-settings load");
      waitStart = performance.now();
      await waitForRemoteManagedSettingsToLoad();
      awaitedSettings = true;
    }
    mayNeedPolicyLimits = true;
  } else logForDebugging("[mcp-policy-cold-start] skipped \u2014 no MCP server source visible");
  if (waitStart !== undefined && getRecordedPhase("mcp_policy_settings_wait_ms") === undefined) {
    let s = performance.now() - waitStart;
    let c = didRemoteManagedSettingsBackstopRelease();
    recordPhase("mcp_policy_settings_wait_ms", s, waitStart);
    let d = c
      ? "timed_out"
      : isRemoteManagedSettingsColdStartPending() || isRemoteManagedProvisionPending()
        ? "load_failed"
        : "ok";
    logForDiagnosticsNoPII(d === "ok" ? "info" : "warn", "mcp_policy_settings_wait", {
      waited_ms: Math.round(s),
      timed_out: c,
      outcome: d,
      ...(hostSessionSkipsSharedCache() && {
        stored_copy: "not_read",
      }),
    });
  }
  recordLoadBarrier(
    "settings",
    () =>
      !awaitedSettings
        ? "not_awaited"
        : didRemoteManagedSettingsBackstopRelease()
          ? "timed_out"
          : "completed",
    {
      since: awaitedSettings ? startTime : undefined,
    },
  );
  if (mayNeedPolicyLimits && shouldAwaitPolicyLimitsOnStartup()) {
    logForDebugging(
      "[mcp-policy-cold-start] waiting on the policy-limits verdict (compliance taints feed config ${VAR} expansion)",
    );
    if ((await awaitPolicyLimitsColdStartVerdict()) === "timed_out")
      logForDebugging(
        "[mcp-policy-cold-start] policy-limits verdict did not land within the cold-start budget; loading MCP configs without it",
      );
  }
}
export { awaitMcpPolicyColdStart };
