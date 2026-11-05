/**
 * bridge/headlessHearthMount.ts
 *
 * 2.1.316 新增。无头会话为项目线程回复挂载 MCP 服务，随绑定变化收敛。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4zbhy05s.js (5)
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
import { permissionRuleValueFromString } from "../utils/permissions/permissionRuleParser.js";
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

//@ chunk-4zbhy05s.js:756-825 placement
function mcpClientModule() {
  return require("../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-4zbhy05s.js:825-859 placement
var MOUNT_RETRY_BACKOFF_MS = [500, 1500, 4000, 15000, 60000];
//@ chunk-4zbhy05s.js:859-5891 placement
/**
 * 无头会话为项目线程回复挂载 MCP 服务，随绑定变化收敛。
 */
function createHeadlessHearthMount(host) {
  let { getAppState, setAppState, getDynamicMcpState } = host.stores;
  let updatePermissionSlice = setSliceField(setAppState, "toolPermissionContext");
  let mounted = null;
  let resolved = Promise.resolve();
  let allowsSuspended = false;
  let dropped = false;
  let retryIndex = 0;
  let retryTimer = null;
  function scheduleRetry() {
    if (dropped) return false;
    if (retryTimer !== null) return true;
    let retryDelayMs = MOUNT_RETRY_BACKOFF_MS[retryIndex];
    if (retryDelayMs === undefined) {
      logForDebugging(
        "[bridge:projects] reply mount retries exhausted \u2014 the mount stays as it is until the binding changes",
        {
          level: "warn",
        },
      );
      return false;
    }
    retryIndex++;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      sync("retry");
    }, retryDelayMs);
    retryTimer.unref();
    return true;
  }
  function clearRetry() {
    retryIndex = 0;
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }
  function sync(reason) {
    resolved = resolved
      .then(() => converge(reason))
      .catch((error) => {
        logForDebugging(`[bridge:projects] converge (${reason}) threw: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
    return resolved;
  }
  async function converge(reason) {
    if (dropped) return;
    if (reason === "binding_changed") clearRetry();
    let hearthBinding = await host.readHearthBinding();
    if (dropped) return;
    if (!hearthBinding.read) {
      logForDebugging(`[bridge:projects] binding read did not answer (${reason}) \u2014 mount left as is`, {
        level: "warn",
      });
      if (!mounted || dialFailed(mounted)) scheduleRetry();
      return;
    }
    let decoded = decodeHearthWorkerBinding(
      {
        hearth: hearthBinding.assertion,
      },
      {
        apiBaseUrl: host.apiBaseUrl,
        sessionId: host.sessionId,
      },
    );
    if (!decoded.binding) {
      clearRetry();
      if (mounted) {
        logForDebugging(
          `[bridge:projects] binding gone (${decoded.reason}, ${reason}) \u2014 dropping the reply mount`,
        );
        let previous = mounted;
        mounted = null;
        await unmount(previous);
      }
      return;
    }
    reassertOwnership();
    if (mounted && mounted.binding.mountUrl === decoded.binding.mountUrl) {
      if (dialFailed(mounted)) {
        logForDebugging(
          `[bridge:projects] the reply mount's dial had failed \u2014 dialing again (${reason})`,
        );
        let previous = mounted;
        mounted = null;
        await unmount(previous);
        if (dropped) return;
        await mount(decoded.binding);
        return;
      }
      reconcileAllows(mounted, decoded.binding);
      mounted.binding = decoded.binding;
      return;
    }
    logForDebugging(
      `[bridge:projects] joined to a project thread (${reason}) \u2014 mounting the reply server`,
    );
    await mount(decoded.binding);
  }
  async function mount(binding) {
    if (
      getAppState().mcp.clients.some((client) => client.name === HEARTHBOT) ||
      HEARTHBOT in getDynamicMcpState().configs ||
      nameHeldBySdkHost()
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
        ...hearthMcpServerConfig(binding.mountUrl, host.sessionId),
        scope: "dynamic",
        role: "comms",
      },
      {
        getBearerToken: host.getBearerToken,
      },
    );
    let entry = {
      binding,
      config,
      allowRules: [],
    };
    mounted = entry;
    setAppState((appState) =>
      setMcpClientInAppState(appState, HEARTHBOT, {
        client: {
          name: HEARTHBOT,
          type: "pending",
          config,
        },
        tools: [],
        commands: [],
      }),
    );
    if (!allowsSuspended)
      entry.allowRules = grantAllows(
        binding.autoAllowTools.map((autoAllowTool) =>
          permissionRuleValueFromString({
            toolName: buildMcpToolName(HEARTHBOT, autoAllowTool),
          }),
        ),
      );
    await connectMount(entry);
  }
  async function connectMount(entry) {
    let attemptEpoch = identityEpoch();
    let result;
    try {
      result = {
        ...(await mcpClientModule().reconnectMcpServerImpl(
          HEARTHBOT,
          entry.config,
          host.storageV5,
          host.credentials,
        )),
        attemptEpoch,
      };
    } catch (error) {
      logForDebugging(`[bridge:projects] reply mount connect threw: ${errorMessage(error)}`, {
        level: "warn",
      });
      result = {
        client: {
          name: HEARTHBOT,
          type: "failed",
          config: entry.config,
          error: "Connection failed",
        },
        tools: [],
        commands: [],
        attemptEpoch,
      };
    }
    if (mounted !== entry) {
      if (result.client.type === "connected") await mcpClientModule().detachAndCloseConnection(result.client);
      return;
    }
    let applyOutcome = applyMcpReconnect(host.stores, HEARTHBOT, result);
    if (applyOutcome !== "applied") {
      logFeatureSad("bridge_projects_mcp_mount", applyOutcome);
      reassertOwnership();
      return;
    }
    if (result.client.type === "connected") {
      clearRetry();
      noteHearthDegraded(HEARTHBOT, undefined);
      logFeatureOk("bridge_projects_mcp_mount");
    } else if (isRetryableMountFailure(result.client)) {
      noteHearthDegraded(
        HEARTHBOT,
        Object.assign(Error("reply mount dial failed"), {
          mcpErrorSource: "downstream_unreachable",
        }),
      );
      if (scheduleRetry()) logFeatureSad("bridge_projects_mcp_mount", "settled_failed_retrying");
      else logFeatureBad("bridge_projects_mcp_mount", "settled_failed");
    } else
      logFeatureBad(
        "bridge_projects_mcp_mount",
        result.client.type === "failed"
          ? `settled_failed_${(result.client.errorCode ?? "answered").toLowerCase()}`
          : `settled_${result.client.type}`,
      );
  }
  function dialFailed(entry) {
    let client = getAppState().mcp.clients.find((client) => client.name === HEARTHBOT);
    return client !== undefined && client.config === entry.config && isRetryableMountFailure(client);
  }
  async function unmount(entry) {
    revokeAllows(entry.allowRules);
    let found = getAppState().mcp.clients.find((client) => client.name === HEARTHBOT);
    if (found && found.config !== entry.config) {
      await clearCache(entry.config);
      return;
    }
    let mcpPrefix = getMcpPrefix(HEARTHBOT);
    setAppState((appState) => {
      let { [HEARTHBOT]: dropResource, ...restResources } = appState.mcp.resources;
      let { [HEARTHBOT]: dropTemplate, ...restTemplates } = appState.mcp.resourceTemplates;
      return {
        ...appState,
        mcp: {
          ...appState.mcp,
          clients: appState.mcp.clients.filter((client) => client !== found),
          tools: appState.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, HEARTHBOT, mcpPrefix)),
          commands: appState.mcp.commands.filter((command) => !commandBelongsToServer(command, HEARTHBOT)),
          resources: restResources,
          resourceTemplates: restTemplates,
        },
      };
    });
    await clearCache(entry.config);
  }
  function reassertOwnership() {
    if (!mounted) return;
    let found = getAppState().mcp.clients.find((client) => client.name === HEARTHBOT);
    if (found && found.config === mounted.config && !nameHeldBySdkHost()) {
      if (!allowsSuspended) reconcileAllows(mounted, mounted.binding);
      return;
    }
    logForDebugging(
      "[bridge:projects] the reply mount\u2019s name is no longer held by its own row \u2014 retracting its pre-approvals",
      {
        level: "warn",
      },
    );
    let previous = mounted;
    mounted = null;
    unmount(previous);
  }
  function nameHeldBySdkHost() {
    return Object.hasOwn(host.sdkHostConfigs(), HEARTHBOT);
  }
  function suspendAllowsForApply(configs) {
    if (!Object.hasOwn(configs, HEARTHBOT)) return;
    allowsSuspended = true;
    if (!mounted) return;
    let allowRules = mounted.allowRules;
    mounted.allowRules = [];
    revokeAllows(allowRules);
  }
  function reassertAfterApply() {
    allowsSuspended = false;
    reassertOwnership();
  }
  function reconcileAllows(entry, binding) {
    if (allowsSuspended) return;
    let mapped = binding.autoAllowTools.map((autoAllowTool) =>
      permissionRuleValueFromString({
        toolName: buildMcpToolName(HEARTHBOT, autoAllowTool),
      }),
    );
    let wantedSet = new Set(mapped);
    let currentSet = new Set(entry.allowRules);
    let filtered = entry.allowRules.filter((allowRule) => !wantedSet.has(allowRule));
    if (filtered.length > 0) revokeAllows(filtered);
    let filtered_2 = entry.allowRules.filter((allowRule) => wantedSet.has(allowRule));
    let additions = grantAllows(mapped.filter((rule) => !currentSet.has(rule)));
    entry.allowRules = [...filtered_2, ...additions];
  }
  function grantAllows(rules) {
    if (dropped) return [];
    let rules_2 = buildSessionAllowRuleUpdates(rules);
    updatePermissionSlice((slice) => applyMcpMountAllowRules(slice, rules_2));
    return rules_2;
  }
  function revokeAllows(allowRules) {
    updatePermissionSlice((slice) => replaceMcpMountRules(slice, allowRules, "one"));
  }
  function clearCache(config) {
    return mcpClientModule()
      .clearServerCache(HEARTHBOT, config)
      .catch((error) => {
        logForDebugging(`[bridge:projects] reply mount cleanup failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
  }
  function drop() {
    dropped = true;
    clearRetry();
    if (mounted) {
      let allowRules = mounted.allowRules;
      mounted.allowRules = [];
      revokeAllows(allowRules);
    }
    resolved = resolved
      .then(async () => {
        if (!mounted) return;
        logForDebugging("[bridge:projects] dropping the reply mount");
        let previous = mounted;
        mounted = null;
        await unmount(previous);
      })
      .catch((error) => {
        logForDebugging(`[bridge:projects] drop threw: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
    return resolved;
  }
  return {
    sync,
    drop,
    reassertOwnership,
    suspendAllowsForApply,
    reassertAfterApply,
    current: () => mounted?.binding ?? null,
    projectFilesDoor: () =>
      mounted
        ? {
            channelId: mounted.binding.channelId,
            sessionId: host.sessionId,
            apiBaseUrl: host.apiBaseUrl,
            getBearerToken: host.getBearerToken,
            getWorkerEpoch: host.getWorkerEpoch,
          }
        : null,
  };
}
//@ chunk-4zbhy05s.js:5891-5955 placement
function isRetryableMountFailure(client) {
  return client.type === "failed" && !NON_RETRYABLE_MOUNT_CODES.has(client.errorCode ?? "");
}
//@ chunk-4zbhy05s.js:5955-6083 placement
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
