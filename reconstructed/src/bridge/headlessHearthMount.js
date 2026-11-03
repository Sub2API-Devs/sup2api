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
import { BH } from "../state/sliceHelpers.js";
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
function j() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-n501v0b7.js:824-858 placement
var Y = [500, 1500, 4000, 15000, 60000];
/**
 * 无头会话为项目线程回复挂载 MCP 服务，随绑定变化收敛。
 */
//@ chunk-n501v0b7.js:858-5889 placement
function createHeadlessHearthMount(s) {
  let {
      getAppState: getAppState,
      setAppState: setAppState,
      getDynamicMcpState: getDynamicMcpState,
    } = s.stores,
    A = BH(setAppState, "toolPermissionContext"),
    n = null,
    resolved = Promise.resolve(),
    p = !1,
    u = !1,
    M = 0,
    c = null;
  function B() {
    if (u) return !1;
    if (c !== null) return !0;
    let e = Y[M];
    if (e === void 0)
      return (
        logForDebugging(
          "[bridge:projects] reply mount retries exhausted \u2014 the mount stays as it is until the binding changes",
          { level: "warn" },
        ),
        !1
      );
    return (
      M++,
      (c = setTimeout(() => {
        ((c = null), E("retry"));
      }, e)),
      c.unref(),
      !0
    );
  }
  function y() {
    if (((M = 0), c !== null)) (clearTimeout(c), (c = null));
  }
  function E(e) {
    return (
      (resolved = resolved
        .then(() => N(e))
        .catch((o) => {
          logForDebugging(`[bridge:projects] converge (${e}) threw: ${errorMessage(o)}`, { level: "warn" });
        })),
      resolved
    );
  }
  async function N(e) {
    if (u) return;
    if (e === "binding_changed") y();
    let hearthBinding = await s.readHearthBinding();
    if (u) return;
    if (!hearthBinding.read) {
      if (
        (logForDebugging(`[bridge:projects] binding read did not answer (${e}) \u2014 mount left as is`, {
          level: "warn",
        }),
        !n || C(n))
      )
        B();
      return;
    }
    let r = decodeHearthWorkerBinding(
      { hearth: hearthBinding.assertion },
      { apiBaseUrl: s.apiBaseUrl, sessionId: s.sessionId },
    );
    if (!r.binding) {
      if ((y(), n)) {
        logForDebugging(`[bridge:projects] binding gone (${r.reason}, ${e}) \u2014 dropping the reply mount`);
        let i = n;
        ((n = null), await h(i));
      }
      return;
    }
    if ((S(), n && n.binding.mountUrl === r.binding.mountUrl)) {
      if (C(n)) {
        logForDebugging(`[bridge:projects] the reply mount's dial had failed \u2014 dialing again (${e})`);
        let i = n;
        if (((n = null), await h(i), u)) return;
        await T(r.binding);
        return;
      }
      (P(n, r.binding), (n.binding = r.binding));
      return;
    }
    (logForDebugging(`[bridge:projects] joined to a project thread (${e}) \u2014 mounting the reply server`),
      await T(r.binding));
  }
  async function T(e) {
    if (
      getAppState().mcp.clients.some((client) => client.name === HEARTHBOT) ||
      HEARTHBOT in getDynamicMcpState().configs ||
      k()
    ) {
      (logForDebugging(
        `[bridge:projects] reply mount skipped: a server named ${HEARTHBOT} is already configured`,
        { level: "warn" },
      ),
        logFeatureSad("bridge_projects_mcp_mount", "name_taken"));
      return;
    }
    let o = registerCliOwnedConfig(
        { ...hearthMcpServerConfig(e.mountUrl, s.sessionId), scope: "dynamic", role: "comms" },
        { getBearerToken: s.getBearerToken },
      ),
      r = { binding: e, config: o, allowRules: [] };
    if (
      ((n = r),
      setAppState((i) =>
        setMcpClientInAppState(i, HEARTHBOT, {
          client: { name: HEARTHBOT, type: "pending", config: o },
          tools: [],
          commands: [],
        }),
      ),
      !p)
    )
      r.allowRules = O(
        e.autoAllowTools.map((autoAllowTool) =>
          formatPermissionRule({ toolName: buildMcpToolName(HEARTHBOT, autoAllowTool) }),
        ),
      );
    await U(r);
  }
  async function U(e) {
    let o = identityEpoch(),
      r;
    try {
      r = {
        ...(await j().reconnectMcpServerImpl(HEARTHBOT, e.config, s.storageV5, s.credentials)),
        attemptEpoch: o,
      };
    } catch (error) {
      (logForDebugging(`[bridge:projects] reply mount connect threw: ${errorMessage(error)}`, {
        level: "warn",
      }),
        (r = {
          client: { name: HEARTHBOT, type: "failed", config: e.config, error: "Connection failed" },
          tools: [],
          commands: [],
          attemptEpoch: o,
        }));
    }
    if (n !== e) {
      if (r.client.type === "connected") await j().detachAndCloseConnection(r.client);
      return;
    }
    let i = applyMcpReconnect(s.stores, HEARTHBOT, r);
    if (i !== "applied") {
      (logFeatureSad("bridge_projects_mcp_mount", i), S());
      return;
    }
    if (r.client.type === "connected")
      (y(), noteHearthDegraded(HEARTHBOT, void 0), logFeatureOk("bridge_projects_mcp_mount"));
    else if (F(r.client))
      if (
        (noteHearthDegraded(
          HEARTHBOT,
          Object.assign(Error("reply mount dial failed"), { mcpErrorSource: "downstream_unreachable" }),
        ),
        B())
      )
        logFeatureSad("bridge_projects_mcp_mount", "settled_failed_retrying");
      else logFeatureBad("bridge_projects_mcp_mount", "settled_failed");
    else
      logFeatureBad(
        "bridge_projects_mcp_mount",
        r.client.type === "failed"
          ? `settled_failed_${(r.client.errorCode ?? "answered").toLowerCase()}`
          : `settled_${r.client.type}`,
      );
  }
  function C(e) {
    let found = getAppState().mcp.clients.find((client) => client.name === HEARTHBOT);
    return found !== void 0 && found.config === e.config && F(found);
  }
  async function h(e) {
    _(e.allowRules);
    let found = getAppState().mcp.clients.find((client) => client.name === HEARTHBOT);
    if (found && found.config !== e.config) {
      await D(e.config);
      return;
    }
    let r = getMcpPrefix(HEARTHBOT);
    (setAppState((i) => {
      let { [HEARTHBOT]: R, ...b } = i.mcp.resources,
        { [HEARTHBOT]: I, ...H } = i.mcp.resourceTemplates;
      return {
        ...i,
        mcp: {
          ...i.mcp,
          clients: i.mcp.clients.filter((client) => client !== found),
          tools: i.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, HEARTHBOT, r)),
          commands: i.mcp.commands.filter((command) => !commandBelongsToServer(command, HEARTHBOT)),
          resources: b,
          resourceTemplates: H,
        },
      };
    }),
      await D(e.config));
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
      { level: "warn" },
    );
    let o = n;
    ((n = null), h(o));
  }
  function k() {
    return Object.hasOwn(s.sdkHostConfigs(), HEARTHBOT);
  }
  function x(e) {
    if (!Object.hasOwn(e, HEARTHBOT)) return;
    if (((p = !0), !n)) return;
    let allowRules = n.allowRules;
    ((n.allowRules = []), _(allowRules));
  }
  function L() {
    ((p = !1), S());
  }
  function P(e, o) {
    if (p) return;
    let mapped = o.autoAllowTools.map((autoAllowTool) =>
        formatPermissionRule({ toolName: buildMcpToolName(HEARTHBOT, autoAllowTool) }),
      ),
      i = new Set(mapped),
      R = new Set(e.allowRules),
      filtered = e.allowRules.filter((allowRule) => !i.has(allowRule));
    if (filtered.length > 0) _(filtered);
    let filtered_2 = e.allowRules.filter((allowRule) => i.has(allowRule)),
      H = O(mapped.filter((l) => !R.has(l)));
    e.allowRules = [...filtered_2, ...H];
  }
  function O(e) {
    if (u) return [];
    let o = buildSessionAllowRuleUpdates(e);
    return (A((r) => applyMcpMountAllowRules(r, o)), o);
  }
  function _(e) {
    A((o) => replaceMcpMountRules(o, e, "one"));
  }
  function D(e) {
    return j()
      .clearServerCache(HEARTHBOT, e)
      .catch((o) => {
        logForDebugging(`[bridge:projects] reply mount cleanup failed: ${errorMessage(o)}`, {
          level: "warn",
        });
      });
  }
  function V() {
    if (((u = !0), y(), n)) {
      let allowRules = n.allowRules;
      ((n.allowRules = []), _(allowRules));
    }
    return (
      (resolved = resolved
        .then(async () => {
          if (!n) return;
          logForDebugging("[bridge:projects] dropping the reply mount");
          let e = n;
          ((n = null), await h(e));
        })
        .catch((e) => {
          logForDebugging(`[bridge:projects] drop threw: ${errorMessage(e)}`, { level: "warn" });
        })),
      resolved
    );
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
function F(s) {
  return s.type === "failed" && !NON_RETRYABLE_MOUNT_CODES.has(s.errorCode ?? "");
}
/**
 * 挂载失败中不应重试的错误码集合（凭证被拒、策略阻止、需审批、禁用、身份变化、正在关闭）。
 */
//@ chunk-n501v0b7.js:5953-6081 placement
var NON_RETRYABLE_MOUNT_CODES = new Set([
  "CLI_OWNED_BEARER_REJECTED",
  "POLICY_BLOCKED",
  "APPROVAL_REQUIRED",
  "DISABLED",
  "IDENTITY_CHANGED",
  "SHUTTING_DOWN",
]);

export { createHeadlessHearthMount };
