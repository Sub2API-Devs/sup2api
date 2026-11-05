/**
 * services/mcp/mcpServerWaitPolicy.ts
 *
 * 2.1.316 新增：artifacts MCP 笔记本条目的等待策略注册
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rxz3fpjx.js (1)
 * attribution: placement 1
 */
import {
  mayBuildArtifactsMcpLaptopEntryAfterStart,
  isArtifactsMcpLaptopLoginCompleted,
  buildArtifactsMcpLaptopEntryAfterStart,
  noteLoginsCompletedForArtifactsMcpLaptopEntry,
} from "../artifacts/artifactsMcpLaptop.js";
import { loginEventCounter } from "../oauth/loginEvents.js";
import { isArtifactToolEnabled } from "../artifacts/artifactToolGates.js";
import {
  getEffectiveMcpPolicyKey,
  getClaudeCodeMcpConfigs,
  doesEnterpriseMcpConfigExist,
  isMcpServerAllowedByPolicy,
} from "./config.js";
import { awaitPolicyColdStartWaiter } from "../policyLimits/coldStartWaiter.js";
import { isRemoteSettingsFetchFailed } from "../cloudSessions/eligibility.js";
import { getStrictMcpConfig } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { onGrowthBookRefresh } from "../analytics/growthbook.js";
import { onPolicyVerdictHeldStart } from "../policyLimits/policyState.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";

//@ chunk-rxz3fpjx.js:13211-14161 placement
function registerArtifactsMcpLaptopEntry({ session, store, scope, storageV5, credentials }) {
  if (!mayBuildArtifactsMcpLaptopEntryAfterStart()) return () => {};
  let counter = loginEventCounter.of(session);
  let unsubscribers = [];
  let disposed = false;
  let dispose = () => {
    disposed = true;
    for (let unsubscribe of unsubscribers.splice(0)) unsubscribe();
  };
  let run = async () => {
    if (disposed || !isArtifactToolEnabled() || !isArtifactsMcpLaptopLoginCompleted()) return;
    let effectiveMcpPolicyKey = getEffectiveMcpPolicyKey();
    let { servers } = await getClaudeCodeMcpConfigs(scope.dynamicMcpConfig ?? {}, {
      storageV5,
      credentials,
    });
    await awaitPolicyColdStartWaiter();
    if (disposed || isRemoteSettingsFetchFailed()) return;
    if (getEffectiveMcpPolicyKey() !== effectiveMcpPolicyKey) {
      queueRun();
      return;
    }
    let artifactsMcpLaptopEntryAfterStart = buildArtifactsMcpLaptopEntryAfterStart({
      toolPermissionContext: store.getState().toolPermissionContext,
      configuredNames: new Set([...Object.keys(scope.dynamicMcpConfig ?? {}), ...Object.keys(servers)]),
      fixedServerSet: getStrictMcpConfig()
        ? "strict_mcp_config"
        : doesEnterpriseMcpConfigExist()
          ? "managed_mcp_config"
          : null,
      allowedByPolicy: isMcpServerAllowedByPolicy,
    });
    if (artifactsMcpLaptopEntryAfterStart === "waiting") return;
    dispose();
    if (artifactsMcpLaptopEntryAfterStart !== null)
      scope.updateDynamicMcpConfig((config) => ({
        ...config,
        [artifactsMcpLaptopEntryAfterStart.name]: artifactsMcpLaptopEntryAfterStart.config,
      }));
  };
  let scheduleRun = () => void run().catch(logError);
  let queueRun = () => queueMicrotask(scheduleRun);
  let onLoginChange = () => {
    noteLoginsCompletedForArtifactsMcpLaptopEntry(counter.getSnapshot().loginCompleted, "as_it_completed");
    queueRun();
  };
  try {
    unsubscribers.push(counter.subscribe(onLoginChange));
    unsubscribers.push(onGrowthBookRefresh(queueRun));
    unsubscribers.push(onPolicyVerdictHeldStart(queueRun));
    unsubscribers.push(settingsChangeDetector.subscribe(queueRun));
    noteLoginsCompletedForArtifactsMcpLaptopEntry(counter.getSnapshot().loginCompleted, "later");
    scheduleRun();
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}
export { registerArtifactsMcpLaptopEntry };
