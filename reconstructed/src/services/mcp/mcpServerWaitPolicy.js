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
import { KV } from "../oauth/loginEvents.js";
import { isArtifactToolEnabled } from "../artifacts/artifactToolGates.js";
import {
  getEffectiveMcpPolicyKey,
  getClaudeCodeMcpConfigs,
  doesEnterpriseMcpConfigExist,
  isMcpServerAllowedByPolicy,
} from "./config.js";
import { kA } from "../policyLimits/coldStartWaiter.js";
import { isRemoteSettingsFetchFailed } from "../cloudSessions/eligibility.js";
import { getStrictMcpConfig } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { onGrowthBookRefresh } from "../analytics/growthbook.js";
import { onPolicyVerdictHeldStart } from "../policyLimits/policyState.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";

//@ chunk-cm57mjc2.js:12063-13013 placement
function registerArtifactsMcpLaptopEntry({
  session: session,
  store: store,
  scope: scope,
  storageV5: storageV5,
  credentials: credentials,
}) {
  if (!mayBuildArtifactsMcpLaptopEntryAfterStart()) return () => {};
  let of = KV.of(session),
    t = [],
    n = !1,
    c = () => {
      n = !0;
      for (let e of t.splice(0)) e();
    },
    g = async () => {
      if (n || !isArtifactToolEnabled() || !isArtifactsMcpLaptopLoginCompleted()) return;
      let e = getEffectiveMcpPolicyKey(),
        { servers: servers } = await getClaudeCodeMcpConfigs(scope.dynamicMcpConfig ?? {}, {
          storageV5: storageV5,
          credentials: credentials,
        });
      if ((await kA(), n || isRemoteSettingsFetchFailed())) return;
      if (getEffectiveMcpPolicyKey() !== e) {
        o();
        return;
      }
      let r = buildArtifactsMcpLaptopEntryAfterStart({
        toolPermissionContext: store.getState().toolPermissionContext,
        configuredNames: new Set([...Object.keys(scope.dynamicMcpConfig ?? {}), ...Object.keys(servers)]),
        fixedServerSet: getStrictMcpConfig()
          ? "strict_mcp_config"
          : doesEnterpriseMcpConfigExist()
            ? "managed_mcp_config"
            : null,
        allowedByPolicy: isMcpServerAllowedByPolicy,
      });
      if (r === "waiting") return;
      if ((c(), r !== null)) scope.updateDynamicMcpConfig((y) => ({ ...y, [r.name]: r.config }));
    },
    a = () => void g().catch(logError),
    o = () => queueMicrotask(a),
    S = () => {
      (noteLoginsCompletedForArtifactsMcpLaptopEntry(of.getSnapshot().loginCompleted, "as_it_completed"),
        o());
    };
  try {
    (t.push(of.subscribe(S)),
      t.push(onGrowthBookRefresh(o)),
      t.push(onPolicyVerdictHeldStart(o)),
      t.push(settingsChangeDetector.subscribe(o)),
      noteLoginsCompletedForArtifactsMcpLaptopEntry(of.getSnapshot().loginCompleted, "later"),
      a());
  } catch (error) {
    throw (c(), error);
  }
  return c;
}
