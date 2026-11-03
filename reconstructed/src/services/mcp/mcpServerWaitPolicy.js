/**
 * services/mcp/mcpServerWaitPolicy.ts
 *
 * 2.1.316 新增：artifacts MCP 笔记本条目的等待策略注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cm57mjc2.js (1)
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

//@ chunk-cm57mjc2.js:12063-13013 placement
function registerArtifactsMcpLaptopEntry({ session, store, scope, storageV5, credentials }) {
  if (!mayBuildArtifactsMcpLaptopEntryAfterStart()) return () => {};
  let s = loginEventCounter.of(session);
  let t = [];
  let n = false;
  let c = () => {
    n = true;
    for (let e of t.splice(0)) e();
  };
  let g = async () => {
    if (n || !isArtifactToolEnabled() || !isArtifactsMcpLaptopLoginCompleted()) return;
    let effectiveMcpPolicyKey = getEffectiveMcpPolicyKey();
    let { servers } = await getClaudeCodeMcpConfigs(scope.dynamicMcpConfig ?? {}, {
      storageV5,
      credentials,
    });
    await awaitPolicyColdStartWaiter();
    if (n || isRemoteSettingsFetchFailed()) return;
    if (getEffectiveMcpPolicyKey() !== effectiveMcpPolicyKey) {
      o();
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
    c();
    if (artifactsMcpLaptopEntryAfterStart !== null)
      scope.updateDynamicMcpConfig((y) => ({
        ...y,
        [artifactsMcpLaptopEntryAfterStart.name]: artifactsMcpLaptopEntryAfterStart.config,
      }));
  };
  let a = () => void g().catch(logError);
  let o = () => queueMicrotask(a);
  let S = () => {
    noteLoginsCompletedForArtifactsMcpLaptopEntry(s.getSnapshot().loginCompleted, "as_it_completed");
    o();
  };
  try {
    t.push(s.subscribe(S));
    t.push(onGrowthBookRefresh(o));
    t.push(onPolicyVerdictHeldStart(o));
    t.push(settingsChangeDetector.subscribe(o));
    noteLoginsCompletedForArtifactsMcpLaptopEntry(s.getSnapshot().loginCompleted, "later");
    a();
  } catch (error) {
    c();
    throw error;
  }
  return c;
}
