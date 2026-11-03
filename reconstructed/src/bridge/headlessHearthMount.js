/**
 * bridge/headlessHearthMount.ts
 *
 * 2.1.316 新增。无头会话为项目线程回复挂载 MCP 服务，随绑定变化收敛。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n501v0b7.js (5)
 * attribution: placement 5
 */
import { setSliceField } from "../state/sliceHelpers.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { decodeHearthWorkerBinding } from "./hearthBinding.js";
import { HEARTHBOT, hearthMcpServerConfig } from "../services/mcp/ccrMetaMcp.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { registerCliOwnedConfig } from "../services/mcp/cliOwnedClients.js";
import { setMcpClientInAppState } from "../services/mcp/mcpClientState.js";
import { formatPermissionRule } from "../utils/permissions/disallowedToolsFlag.js";
import { buildMcpToolName, getMcpPrefix, isToolFromMcpServer } from "../services/mcp/mcpStringUtils.js";
import { identityEpoch } from "../services/mcp/identityChange.js";
import { applyMcpReconnect } from "../services/mcp/mcpReconnect.js";
import { noteHearthDegraded } from "../services/mcp/hearthDegraded.js";
import { commandBelongsToServer } from "../services/mcp/utils.js";
import {
  buildSessionAllowRuleUpdates,
  applyMcpMountAllowRules,
  replaceMcpMountRules,
} from "../utils/permissions/mcpMountRules.js";

//@ chunk-n501v0b7.js:755-824 placement
function mcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-n501v0b7.js:824-858 placement
var MOUNT_RETRY_BACKOFF_MS = [500, 1500, 4000, 15000, 60000];
//@ chunk-n501v0b7.js:858-5889 placement
/**
 * 无头会话为项目线程回复挂载 MCP 服务，随绑定变化收敛。
 */
function createHeadlessHearthMount(s) {
  let { getAppState, setAppState, getDynamicMcpState } = s.stores;
  let A = setSliceField(setAppState, "toolPermissionContext");
  let n = null;
  let resolved = Promise.resolve();
  let p = false;
  let u = false;
  let M = 0;
  let c = null;
  function B() {
    if (u) return false;
    if (c !== null) return true;
    let e = MOUNT_RETRY_BACKOFF_MS[M];
    if (e === undefined) {
      logForDebugging(
        "[bridge:projects] reply mount retries exhausted \u2014 the mount stays as it is until the binding changes",
        {
          level: "warn",
        },
      );
      return false;
    }
    M++;
    c = setTimeout(() => {
      c = null;
      E("retry");
    }, e);
    c.unref();
    return true;
  }
  function y() {
    M = 0;
    if (c !== null) {
      clearTimeout(c);
      c = null;
    }
  }
  function E(e) {
    resolved = resolved
      .then(() => N(e))
      .catch((error) => {
        logForDebugging(`[bridge:projects] converge (${e}) threw: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
    return resolved;
  }
  async function N(e) {
    if (u) return;
    if (e === "binding_changed") y();
    let hearthBinding = await s.readHearthBinding();
    if (u) return;
    if (!hearthBinding.read) {
      logForDebugging(`[bridge:projects] binding read did not answer (${e}) \u2014 mount left as is`, {
        level: "warn",
      });
      if (!n || C(n)) B();
      return;
    }
    let r = decodeHearthWorkerBinding(
      {
        hearth: hearthBinding.assertion,
      },
      {
        apiBaseUrl: s.apiBaseUrl,
        sessionId: s.sessionId,
      },
    );
    if (!r.binding) {
      y();
      if (n) {
        logForDebugging(`[bridge:projects] binding gone (${r.reason}, ${e}) \u2014 dropping the reply mount`);
        let i = n;
        n = null;
        await h(i);
      }
      return;
    }
    S();
    if (n && n.binding.mountUrl === r.binding.mountUrl) {
      if (C(n)) {
        logForDebugging(`[bridge:projects] the reply mount's dial had failed \u2014 dialing again (${e})`);
        let i = n;
        n = null;
        await h(i);
        if (u) return;
        await T(r.binding);
        return;
      }
      P(n, r.binding);
      n.binding = r.binding;
      return;
    }
    logForDebugging(`[bridge:projects] joined to a project thread (${e}) \u2014 mounting the reply server`);
    await T(r.binding);
  }
  async function T(binding) {
    if (
      getAppState().mcp.clients.some((client) => client.name === HEARTHBOT) ||
      HEARTHBOT in getDynamicMcpState().configs ||
      k()
    ) {
      logForDebugging(
        `[bridge:projects] reply mount skipped: a server named ${HEARTHBOT} is already configured`,
        {
          level: "warn",
        },
      );
      logFeatureSad("bridge_projects_mcp_mount", "name_taken");
      return;
    }
    let config = registerCliOwnedConfig(
      {
        ...hearthMcpServerConfig(binding.mountUrl, s.sessionId),
        scope: "dynamic",
        role: "comms",
      },
      {
        getBearerToken: s.getBearerToken,
      },
    );
    let r = {
      binding,
      config,
      allowRules: [],
    };
    n = r;
    setAppState((i) =>
      setMcpClientInAppState(i, HEARTHBOT, {
        client: {
          name: HEARTHBOT,
          type: "pending",
          config,
        },
        tools: [],
        commands: [],
      }),
    );
    if (!p)
      r.allowRules = O(
        binding.autoAllowTools.map((autoAllowTool) =>
          formatPermissionRule({
            toolName: buildMcpToolName(HEARTHBOT, autoAllowTool),
          }),
        ),
      );
    await U(r);
  }
  async function U(e) {
    let attemptEpoch = identityEpoch();
    let r;
    try {
      r = {
        ...(await mcpClientModule().reconnectMcpServerImpl(HEARTHBOT, e.config, s.storageV5, s.credentials)),
        attemptEpoch,
      };
    } catch (error) {
      logForDebugging(`[bridge:projects] reply mount connect threw: ${errorMessage(error)}`, {
        level: "warn",
      });
      r = {
        client: {
          name: HEARTHBOT,
          type: "failed",
          config: e.config,
          error: "Connection failed",
        },
        tools: [],
        commands: [],
        attemptEpoch,
      };
    }
    if (n !== e) {
      if (r.client.type === "connected") await mcpClientModule().detachAndCloseConnection(r.client);
      return;
    }
    let i = applyMcpReconnect(s.stores, HEARTHBOT, r);
    if (i !== "applied") {
      logFeatureSad("bridge_projects_mcp_mount", i);
      S();
      return;
    }
    if (r.client.type === "connected") {
      y();
      noteHearthDegraded(HEARTHBOT, undefined);
      logFeatureOk("bridge_projects_mcp_mount");
    } else if (isRetryableMountFailure(r.client)) {
      noteHearthDegraded(
        HEARTHBOT,
        Object.assign(Error("reply mount dial failed"), {
          mcpErrorSource: "downstream_unreachable",
        }),
      );
      if (B()) logFeatureSad("bridge_projects_mcp_mount", "settled_failed_retrying");
      else logFeatureBad("bridge_projects_mcp_mount", "settled_failed");
    } else
      logFeatureBad(
        "bridge_projects_mcp_mount",
        r.client.type === "failed"
          ? `settled_failed_${(r.client.errorCode ?? "answered").toLowerCase()}`
          : `settled_${r.client.type}`,
      );
  }
  function C(e) {
    let found = getAppState().mcp.clients.find((client) => client.name === HEARTHBOT);
    return found !== undefined && found.config === e.config && isRetryableMountFailure(found);
  }
  async function h(e) {
    _(e.allowRules);
    let found = getAppState().mcp.clients.find((client) => client.name === HEARTHBOT);
    if (found && found.config !== e.config) {
      await D(e.config);
      return;
    }
    let mcpPrefix = getMcpPrefix(HEARTHBOT);
    setAppState((i) => {
      let { [HEARTHBOT]: R, ...b } = i.mcp.resources;
      let { [HEARTHBOT]: I, ...H } = i.mcp.resourceTemplates;
      return {
        ...i,
        mcp: {
          ...i.mcp,
          clients: i.mcp.clients.filter((client) => client !== found),
          tools: i.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, HEARTHBOT, mcpPrefix)),
          commands: i.mcp.commands.filter((command) => !commandBelongsToServer(command, HEARTHBOT)),
          resources: b,
          resourceTemplates: H,
        },
      };
    });
    await D(e.config);
  }
  function S() {
    if (!n) return;
    let found = getAppState().mcp.clients.find((client) => client.name === HEARTHBOT);
    if (found && found.config === n.config && !k()) {
      if (!p) P(n, n.binding);
      return;
    }
    logForDebugging(
      "[bridge:projects] the reply mount\u2019s name is no longer held by its own row \u2014 retracting its pre-approvals",
      {
        level: "warn",
      },
    );
    let o = n;
    n = null;
    h(o);
  }
  function k() {
    return Object.hasOwn(s.sdkHostConfigs(), HEARTHBOT);
  }
  function x(e) {
    if (!Object.hasOwn(e, HEARTHBOT)) return;
    p = true;
    if (!n) return;
    let allowRules = n.allowRules;
    n.allowRules = [];
    _(allowRules);
  }
  function L() {
    p = false;
    S();
  }
  function P(e, binding) {
    if (p) return;
    let mapped = binding.autoAllowTools.map((autoAllowTool) =>
      formatPermissionRule({
        toolName: buildMcpToolName(HEARTHBOT, autoAllowTool),
      }),
    );
    let i = new Set(mapped);
    let R = new Set(e.allowRules);
    let filtered = e.allowRules.filter((allowRule) => !i.has(allowRule));
    if (filtered.length > 0) _(filtered);
    let filtered_2 = e.allowRules.filter((allowRule) => i.has(allowRule));
    let H = O(mapped.filter((l) => !R.has(l)));
    e.allowRules = [...filtered_2, ...H];
  }
  function O(e) {
    if (u) return [];
    let sessionAllowRuleUpdates = buildSessionAllowRuleUpdates(e);
    A((r) => applyMcpMountAllowRules(r, sessionAllowRuleUpdates));
    return sessionAllowRuleUpdates;
  }
  function _(allowRules) {
    A((o) => replaceMcpMountRules(o, allowRules, "one"));
  }
  function D(config) {
    return mcpClientModule()
      .clearServerCache(HEARTHBOT, config)
      .catch((error) => {
        logForDebugging(`[bridge:projects] reply mount cleanup failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
  }
  function V() {
    u = true;
    y();
    if (n) {
      let allowRules = n.allowRules;
      n.allowRules = [];
      _(allowRules);
    }
    resolved = resolved
      .then(async () => {
        if (!n) return;
        logForDebugging("[bridge:projects] dropping the reply mount");
        let e = n;
        n = null;
        await h(e);
      })
      .catch((error) => {
        logForDebugging(`[bridge:projects] drop threw: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
    return resolved;
  }
  return {
    sync: E,
    drop: V,
    reassertOwnership: S,
    suspendAllowsForApply: x,
    reassertAfterApply: L,
    current: () => n?.binding ?? null,
    projectFilesDoor: () =>
      n
        ? {
            channelId: n.binding.channelId,
            sessionId: s.sessionId,
            apiBaseUrl: s.apiBaseUrl,
            getBearerToken: s.getBearerToken,
            getWorkerEpoch: s.getWorkerEpoch,
          }
        : null,
  };
}
//@ chunk-n501v0b7.js:5889-5953 placement
function isRetryableMountFailure(s) {
  return s.type === "failed" && !NON_RETRYABLE_MOUNT_CODES.has(s.errorCode ?? "");
}
//@ chunk-n501v0b7.js:5953-6081 placement
/**
 * 挂载失败中不应重试的错误码集合（凭证被拒、策略阻止、需审批、禁用、身份变化、正在关闭）。
 */
var NON_RETRYABLE_MOUNT_CODES = new Set([
  "CLI_OWNED_BEARER_REJECTED",
  "POLICY_BLOCKED",
  "APPROVAL_REQUIRED",
  "DISABLED",
  "IDENTITY_CHANGED",
  "SHUTTING_DOWN",
]);
export { createHeadlessHearthMount };
