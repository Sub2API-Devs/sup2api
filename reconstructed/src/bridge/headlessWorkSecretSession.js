/**
 * bridge/headlessWorkSecretSession.ts
 *
 * 2.1.316 新增：创建由 work secret 驱动的 headless 会话：接管权限上下文、动态 MCP 状态与配置应用队列，返回会话控制对象；附加到 headless 会话时拉取会话配置（auto mode 环境等）并在仍需要时应用等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h3xe040t.js (11)
 * attribution: placement 11
 */
import { getJwtSessionId } from "./jwtUtils.js";
import { sameSessionId, decodeWorkSecret, WorkSecretShapeError } from "./workSecret.js";
import { isSafeBridgeId } from "./sessionIdCompat.js";
import { isBridgeServerSessionConfigEnabled } from "./bridgeGates.js";
import {
  logConfigNotApplied,
  carriedConfigFlags,
  applyBridgeServerArgs,
  carriedModel,
  carriedEffort,
} from "./bridgeServerConfig.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { getBridgeBaseUrl } from "./bridgeConfig.js";
import { count, stringArray, arraysEqual } from "../utils/collections.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { DEFAULTS_PLACEHOLDER } from "../utils/permissions/autoModeRulesPrompt.js";
import { getFlagSettingsInline, setFlagSettingsInline } from "../bootstrap/state.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { getAutoModeConfig, getSettingsForSource, getInitialSettings_2 } from "../utils/settings/settings.js";
import { invalidateCommandNames } from "../utils/settings/commandSyncNames.js";
import { getClaudeAIOAuthTokenOrigin, sameOwnerAccount } from "../utils/auth.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { env } from "../utils/env.js";
import {
  hasBridgeChildFeatureEnabled,
  classifyBridgeSessionRoles,
  machineLaneVersionRefusal,
  resolveBridgeChildFeatures,
} from "./bridgeEnabled.js";
import { readBridgeSessionTags } from "./sessionTags.js";
import { setPermissionModeWithGuards } from "../utils/permissions/permissionSetup.js";
import { logError } from "../utils/log.js";
import { settingsChangeDetector } from "../utils/settings/changeDetector.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";
import { isArtifactSdkDefaultOff } from "../services/artifacts/artifactToolGates.js";
import { useLocalProjectsEntrypoint, clearLocalProjectsEntrypoint } from "../constants/system.js";
import { setSliceField } from "../state/sliceHelpers.js";
import { formatPermissionRule } from "../utils/permissions/disallowedToolsFlag.js";
import { permissionRuleValueFromString } from "../utils/permissions/permissionRuleParser.js";
import { applyValidatedPermissionUpdate } from "../utils/permissions/PermissionUpdate.js";
import { CLAUDE_CODE_REMOTE, ccrMetaMcpServerConfig } from "../services/mcp/ccrMetaMcp.js";
import { registerCliOwnedConfig } from "../services/mcp/cliOwnedClients.js";
import { setMcpClientInAppState } from "../services/mcp/mcpClientState.js";
import {
  buildSessionAllowRuleUpdates,
  applyMcpMountAllowRules,
  replaceMcpMountRules,
} from "../utils/permissions/mcpMountRules.js";
import { buildMcpToolName, getMcpPrefix, isToolFromMcpServer } from "../services/mcp/mcpStringUtils.js";
import { identityEpoch } from "../services/mcp/identityChange.js";
import { errorMessage } from "../utils/errors.js";
import { applyMcpReconnect } from "../services/mcp/mcpReconnect.js";
import { serverCacheKey } from "../services/mcp/client.js";
import { commandBelongsToServer } from "../services/mcp/utils.js";
import { createHeadlessHearthMount } from "./headlessHearthMount.js";
import { CCRClient } from "../cli/transports/ccrClient.js";
import { configureApiKeyHeaders } from "../services/api/client.js";

//@ chunk-h3xe040t.js:13316-13399 placement
function pickSessionIdFromWorkSecret(r, u) {
  let jwtSessionId = getJwtSessionId(r.session_ingress_token);
  return jwtSessionId !== undefined && sameSessionId(jwtSessionId, u) ? jwtSessionId : u;
}
//@ chunk-h3xe040t.js:13399-13470 placement
function resolveBridgeSessionId(r, bridgeSessionId) {
  try {
    let _ = pickSessionIdFromWorkSecret(decodeWorkSecret(r), bridgeSessionId);
    return isSafeBridgeId(_) ? _ : bridgeSessionId;
  } catch {
    return bridgeSessionId;
  }
}
//@ chunk-h3xe040t.js:13470-15324 placement
/**
 * 解析 work secret 里的 claude_code_args/mcp_config，为 sdk_host 通道生成会话配置（模型、权限、拒绝规则、元 MCP）。
 */
function applySdkHostLaneConfig(r, u) {
  let _ = isBridgeServerSessionConfigEnabled();
  try {
    let S = decodeWorkSecret(r);
    if (!S.claude_code_args && !S.mcp_config) return;
    if (!_) {
      logConfigNotApplied(u.sessionId, {
        lane: lit("sdk_host"),
        ...carriedConfigFlags(S),
      });
      return;
    }
    let sessionId = pickSessionIdFromWorkSecret(S, u.sessionId);
    let o = applyBridgeServerArgs(
      {
        claude_code_args: S.claude_code_args,
        mcp_config: S.mcp_config,
      },
      {
        sessionId,
        apiBaseUrl: getBridgeBaseUrl(),
      },
    );
    let v = false;
    if (o.appendSystemPrompt) {
      let y = u.getAppendSystemPrompt();
      if (!y?.includes(o.appendSystemPrompt))
        u.setAppendSystemPrompt(
          y
            ? `${y}

${o.appendSystemPrompt}`
            : o.appendSystemPrompt,
        );
      v = true;
    }
    let E = o.disallowedTools.length > 0 ? u.addDenyRules(o.disallowedTools) : 0;
    let P =
      o.metaMountUrl !== null && u.mountMetaMcp !== undefined
        ? u.mountMetaMcp({
            url: o.metaMountUrl,
            autoAllowTools: o.autoAllowTools,
            sessionId,
          })
        : false;
    let M = {
      lane: lit("sdk_host"),
      ...carriedConfigFlags(S),
      append_prompt: v,
      deny_rules: E,
      extra_args_ignored: count(
        o.extraArgs,
        (y) =>
          y.startsWith("--") &&
          y !== "--model" &&
          !y.startsWith("--disallowed") &&
          !y.startsWith("--allowedTools") &&
          y !== "--effort",
      ),
      meta_mcp_verified: o.metaMountUrl !== null,
      meta_mcp_mounted: P,
      auto_allow: P ? o.autoAllowTools.length : 0,
      ignored_mcp: o.ignoredMcpServers,
      ...(o.metaDropReason !== null && {
        meta_drop: fromEnum(o.metaDropReason),
      }),
    };
    logForDebugging(
      `[bridge:server-config] sdk-host lane sessionId=${u.sessionId} appendPrompt=${v ? "applied" : "unset"} denyRules=${E} metaMcp=${o.metaMountUrl === null ? "unset" : P ? "mounted" : "not-mounted"} extraArgsIgnored=${M.extra_args_ignored}`,
    );
    logEvent("tengu_bridge_server_config_applied", M);
    if (o.disallowedTools.length > 0 && E === 0)
      logFeatureSad("bridge_server_session_config", "disallowed_tools_not_applied", M);
    else if (S.mcp_config && o.metaMountUrl === null)
      logFeatureSad("bridge_server_session_config", "meta_mcp_not_verified", M);
    else if (o.metaMountUrl !== null && !P)
      logFeatureSad("bridge_server_session_config", "meta_mcp_not_mounted", M);
    else logFeatureOk("bridge_server_session_config", M);
  } catch (error) {
    let verdict = error instanceof WorkSecretShapeError ? error.verdict : "derivation_threw";
    logForDebugging(`[bridge:server-config] sdk-host lane not applied: ${verdict}`, {
      level: "warn",
    });
    if (_) logFeatureBad("bridge_server_session_config", verdict);
  }
}
//@ chunk-h3xe040t.js:15324-15611 placement
function subtractEnvironmentEntries(r, u) {
  let _ = new Map();
  for (let o of u) if (o !== DEFAULTS_PLACEHOLDER) _.set(o, (_.get(o) ?? 0) + 1);
  let S = u[0] === DEFAULTS_PLACEHOLDER;
  let C = [];
  for (let j = r.length - 1; j >= 0; j--) {
    let v = r[j];
    if (v === undefined) continue;
    let E = _.get(v) ?? 0;
    if (E > 0) {
      _.set(v, E - 1);
      continue;
    }
    if (S && v === DEFAULTS_PLACEHOLDER && r[j + 1] === u[1]) {
      S = false;
      continue;
    }
    C.push(v);
  }
  return C.reverse();
}
//@ chunk-h3xe040t.js:15611-16072 placement
/**
 * 把服务端下发的 auto mode environment 与本地设置合并，返回合并结果与差异标记。
 */
function mergeAutoModeEnvironment(r, u, _) {
  let S = getFlagSettingsInline() ?? {};
  let { autoMode, ...o } = S;
  let v = isPlainObject(autoMode) ? autoMode : {};
  let { environment, ...P } = v;
  let M = stringArray(environment);
  let y = subtractEnvironmentEntries(M, u);
  let T = [];
  if (r.length > 0) {
    let environment = getAutoModeConfig()?.environment ?? [];
    let j = new Set(u);
    let G = new Set(M);
    let any = environment.some((V) => !j.has(V));
    let any_2 = environment.some((V) => !G.has(V));
    let U = u[0] === DEFAULTS_PLACEHOLDER;
    T = !y.includes(DEFAULTS_PLACEHOLDER) && (U ? !any_2 : !any) ? [DEFAULTS_PLACEHOLDER, ...r] : [...r];
  }
  let H = [...y, ...T];
  if (arraysEqual(H, M)) {
    _(T);
    return;
  }
  let O =
    H.length > 0
      ? {
          ...P,
          environment: H,
        }
      : P;
  let B =
    Object.keys(O).length > 0
      ? {
          ...o,
          autoMode: O,
        }
      : o;
  setFlagSettingsInline(Object.keys(B).length > 0 ? B : null);
  _(T);
  invalidateCommandNames();
}
//@ chunk-h3xe040t.js:16072-16280 placement
function getEnvOAuthAccountIdentity() {
  switch (getClaudeAIOAuthTokenOrigin()) {
    case "env":
    case "fd": {
      let r = normalizeUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID);
      return r
        ? {
            accountUuid: r,
            organizationUuid: normalizeUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID) ?? undefined,
          }
        : undefined;
    }
    case "store":
    case "none":
      return;
  }
}
//@ chunk-h3xe040t.js:16280-16513 placement
function isSameOwnerCaseInsensitive(attachedAs, u) {
  if (!attachedAs || !u) return false;
  return sameOwnerAccount(
    {
      accountUuid: u.accountUuid.toLowerCase(),
      organizationUuid: u.organizationUuid?.toLowerCase(),
    },
    {
      accountUuid: attachedAs.accountUuid.toLowerCase(),
      organizationUuid: attachedAs.organizationUuid?.toLowerCase(),
    },
  );
}
//@ chunk-h3xe040t.js:16513-16614 placement
var NOOP_SESSION_CONFIG_APPLY = {
  undo: () => null,
  granted: {
    autoMode: false,
    facts: 0,
    artifact: false,
    autoCompact: false,
    projectsEntrypoint: false,
  },
};
//@ chunk-h3xe040t.js:16614-19156 placement
/**
 * 附加到 headless 会话时拉取会话配置（auto mode 环境等）并在仍需要时应用。
 */
async function fetchAttachSessionConfig(r) {
  let u = hasBridgeChildFeatureEnabled("attach");
  let _ = r.autoModeEnvironment.length > 0;
  if (!u && !_) return NOOP_SESSION_CONFIG_APPLY;
  let S = false;
  S = _;
  let C =
    u || S
      ? await readBridgeSessionTags(r.sessionId, {
          baseUrl: getBridgeBaseUrl(),
          credentials: r.credentials,
        })
      : null;
  await r.applyAfter;
  if (!r.stillWanted()) return NOOP_SESSION_CONFIG_APPLY;
  let o = classifyBridgeSessionRoles(C);
  if (o.projectThreadChild && machineLaneVersionRefusal()?.reason === "floor_unreachable") {
    logFeatureSad("bridge_rc_child_grants", "floor_unreachable");
    return NOOP_SESSION_CONFIG_APPLY;
  }
  let v = null;
  if (_ && !o.projectThreadChild) v = C === null ? "session_tags_unread" : "session_untagged";
  let E = getSettingsForSource("policySettings")?.permissions?.defaultMode !== undefined;
  let bridgeChildFeatures = resolveBridgeChildFeatures({
    roles: o,
    modePinned: E,
    settings: getInitialSettings_2,
  });
  if (u && o.rcChild && E) logFeatureSad("bridge_rc_child_grants", "auto_policy_pinned");
  let M = false;
  let y = null;
  if (bridgeChildFeatures.autoOverSettings) {
    let mode = r.permission.get().mode;
    let inheritLiftedFrom = r.inheritLiftedFrom ?? null;
    let U = mode === "default" || mode === "acceptEdits";
    let W =
      mode === "plan" && inheritLiftedFrom !== null && r.permission.get().prePlanMode === inheritLiftedFrom;
    if ((U || W) && r.keepChosenMode()) logFeatureSad("bridge_rc_child_grants", "auto_withheld_mode_chosen");
    else if ((U || W) && r.permission.get().isAutoModeAvailable === false)
      logFeatureSad("bridge_rc_child_grants", "auto_unavailable");
    else if (W) {
      r.permission.set((N) => ({
        ...N,
        prePlanMode: "auto",
      }));
      M = true;
      y = inheritLiftedFrom;
      logFeatureOk("bridge_rc_child_grants");
    } else if (!U) logFeatureSad("bridge_rc_child_grants", "auto_host_mode_kept");
    else if (
      setPermissionModeWithGuards("auto", r.permission.get(), r.permission.set, "remote_control_attach").ok
    ) {
      M = true;
      y = mode;
      logFeatureOk("bridge_rc_child_grants");
    } else logFeatureSad("bridge_rc_child_grants", "auto_refused");
  }
  let T = [];
  let H = null;
  let O = (autoModeEnvironment) => {
    try {
      mergeAutoModeEnvironment(autoModeEnvironment, T, (k) => {
        T = k;
      });
    } catch (error) {
      logError(error);
    }
  };
  if (v !== null) logFeatureSad("bridge_rc_child_grants", `facts_${v}`);
  else if (_) {
    O(r.autoModeEnvironment);
    let A = () => O(r.autoModeEnvironment);
    let k = settingsChangeDetector.subscribe(A);
    let U = onGrowthBookRefresh(A);
    H = () => {
      k();
      U();
    };
  }
  let B = false;
  if (bridgeChildFeatures.artifact && isArtifactSdkDefaultOff()) {
    B = true;
    env.set("CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT", true);
  }
  let x = false;
  if (
    bridgeChildFeatures.autoCompact &&
    getSettingsForSource("flagSettings")?.autoCompactEnabled === undefined
  ) {
    setFlagSettingsInline({
      ...getFlagSettingsInline(),
      autoCompactEnabled: true,
    });
    settingsChangeDetector.notifyChange("flagSettings");
    x = true;
  }
  let j = false;
  if (bridgeChildFeatures.projectsEntrypoint) {
    j = useLocalProjectsEntrypoint();
    if (j) logFeatureOk("bridge_projects_entrypoint_name");
    else logFeatureSad("bridge_projects_entrypoint_name", "host_name_kept");
  }
  let G = false;
  return {
    granted: {
      autoMode: M,
      facts: T.length,
      artifact: B,
      autoCompact: x,
      projectsEntrypoint: j,
    },
    undo() {
      if (G) return null;
      G = true;
      H?.();
      O([]);
      if (B) env.unset("CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT");
      if (j) clearLocalProjectsEntrypoint();
      if (x) {
        let { autoCompactEnabled, ...k } = getFlagSettingsInline() ?? {};
        if (autoCompactEnabled === true) {
          setFlagSettingsInline(Object.keys(k).length > 0 ? k : null);
          settingsChangeDetector.notifyChange("flagSettings");
        }
      }
      if (y !== null && r.permission.get().mode === "auto")
        setPermissionModeWithGuards(y, r.permission.get(), r.permission.set, "remote_control_detach");
      else if (
        y !== null &&
        r.permission.get().mode === "plan" &&
        r.permission.get().prePlanMode === "auto"
      ) {
        let A = y;
        r.permission.set((k) => ({
          ...k,
          prePlanMode: A,
        }));
        return A;
      }
      return null;
    },
  };
}
//@ chunk-h3xe040t.js:19156-19225 placement
function mcpClientModule_2() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-h3xe040t.js:19225-25833 placement
/**
 * 创建由 work secret 驱动的 headless 会话：接管权限上下文、动态 MCP 状态与配置应用队列，返回会话控制对象。
 */
function createHeadlessWorkSecretSession(r) {
  let { getAppState, setAppState, getDynamicMcpState } = r.stores;
  let C = setSliceField(setAppState, "toolPermissionContext");
  let o = null;
  let v = null;
  let E = null;
  let P = null;
  let M = 0;
  let resolved = Promise.resolve();
  let T = 0;
  let H = null;
  let O = false;
  let permission = {
    get: r.permission.get,
    set: (e) => {
      let n = O;
      O = true;
      try {
        r.permission.set(e);
      } finally {
        O = n;
      }
    },
  };
  function x(e) {
    return count(getAppState().toolPermissionContext.alwaysDenyRules.session ?? [], (n) => n === e);
  }
  function j(e) {
    let n = new Set(e.map((s) => formatPermissionRule(permissionRuleValueFromString(s))));
    let filtered = [...n].filter((s) => x(s) === 0);
    if (filtered.length > 0)
      C((s) =>
        applyValidatedPermissionUpdate(s, {
          type: "addRules",
          destination: "session",
          behavior: "deny",
          rules: filtered.map(permissionRuleValueFromString),
        }),
      );
    return count([...n], (s) => x(s) > 0);
  }
  function G(e, sessionId, url, autoAllowTools, getWorkerBearerToken) {
    if (!getWorkerBearerToken) {
      logForDebugging("[bridge:server-config] meta mount skipped: the bridge exposes no worker credential", {
        level: "warn",
      });
      return null;
    }
    if (
      getAppState().mcp.clients.some((client) => client.name === CLAUDE_CODE_REMOTE) ||
      CLAUDE_CODE_REMOTE in getDynamicMcpState().configs
    ) {
      logForDebugging(
        `[bridge:server-config] meta mount skipped: a server named ${CLAUDE_CODE_REMOTE} is already configured`,
        {
          level: "warn",
        },
      );
      return null;
    }
    let config = registerCliOwnedConfig(
      {
        ...ccrMetaMcpServerConfig(url, sessionId),
        scope: "dynamic",
      },
      {
        getBearerToken: getWorkerBearerToken,
      },
    );
    let R = {
      config,
      allowRules: [],
    };
    e.meta = R;
    setAppState((w) =>
      setMcpClientInAppState(w, CLAUDE_CODE_REMOTE, {
        client: {
          name: CLAUDE_CODE_REMOTE,
          type: "pending",
          config,
        },
        tools: [],
        commands: [],
      }),
    );
    R.allowRules = buildSessionAllowRuleUpdates(
      autoAllowTools.map((w) => buildMcpToolName(CLAUDE_CODE_REMOTE, w)),
    );
    C((w) => applyMcpMountAllowRules(w, R.allowRules));
    return R;
  }
  async function A(config) {
    let attemptEpoch = identityEpoch();
    let p;
    try {
      p = {
        ...(await mcpClientModule_2().reconnectMcpServerImpl(
          CLAUDE_CODE_REMOTE,
          config,
          r.storageV5,
          r.credentials,
        )),
        attemptEpoch,
      };
    } catch (error) {
      logForDebugging(`[bridge:server-config] meta mount connect threw: ${errorMessage(error)}`, {
        level: "warn",
      });
      p = {
        client: {
          name: CLAUDE_CODE_REMOTE,
          type: "failed",
          config,
          error: "Connection failed",
        },
        tools: [],
        commands: [],
        attemptEpoch,
      };
    }
    if (o?.meta?.config !== config) {
      if (p.client.type === "connected") await mcpClientModule_2().detachAndCloseConnection(p.client);
      return;
    }
    let s = applyMcpReconnect(r.stores, CLAUDE_CODE_REMOTE, p);
    switch (s) {
      case "applied":
        if (p.client.type === "connected") logFeatureOk("bridge_meta_mcp_mount");
        else logFeatureBad("bridge_meta_mcp_mount", `settled_${p.client.type}`);
        return;
      case "superseded":
      case "dropped":
      case "refused":
        logFeatureSad("bridge_meta_mcp_mount", s);
        return;
    }
  }
  function k(meta) {
    C((s) => replaceMcpMountRules(s, meta.allowRules, "one"));
    let found = getAppState().mcp.clients.find((client) => client.name === CLAUDE_CODE_REMOTE);
    if (found && found.config !== meta.config) {
      if (
        serverCacheKey(CLAUDE_CODE_REMOTE, found.config) === serverCacheKey(CLAUDE_CODE_REMOTE, meta.config)
      )
        return Promise.resolve();
      return U(meta.config);
    }
    let mcpPrefix = getMcpPrefix(CLAUDE_CODE_REMOTE);
    setAppState((s) => {
      let { [CLAUDE_CODE_REMOTE]: h, ...I } = s.mcp.resources;
      let { [CLAUDE_CODE_REMOTE]: R, ...w } = s.mcp.resourceTemplates;
      return {
        ...s,
        mcp: {
          ...s.mcp,
          clients: s.mcp.clients.filter((client) => client !== found),
          tools: s.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, CLAUDE_CODE_REMOTE, mcpPrefix)),
          commands: s.mcp.commands.filter((command) => !commandBelongsToServer(command, CLAUDE_CODE_REMOTE)),
          resources: I,
          resourceTemplates: w,
        },
      };
    });
    return U(meta.config);
  }
  function U(config) {
    return mcpClientModule_2()
      .clearServerCache(CLAUDE_CODE_REMOTE, config)
      .catch((error) => {
        logForDebugging(`[bridge:server-config] meta unmount cleanup failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
  }
  function W() {
    let e = o;
    o = null;
    if (!e) return Promise.resolve();
    if (e.writtenPrompt !== undefined) {
      let p = r.getAppendSystemPrompt();
      if (p === e.writtenPrompt) r.setAppendSystemPrompt(e.hostAppendSystemPrompt);
      else {
        let hostAppendSystemPrompt = e.hostAppendSystemPrompt;
        let h = hostAppendSystemPrompt
          ? e.writtenPrompt.slice(hostAppendSystemPrompt.length)
          : `

${e.writtenPrompt}`;
        if (p !== undefined && p.endsWith(h)) r.setAppendSystemPrompt(p.slice(0, -h.length));
      }
    }
    P = e.grants?.undo() ?? null;
    let n = Promise.all([
      e.meta ? k(e.meta) : Promise.resolve(),
      e.hearth ? e.hearth.drop() : Promise.resolve(),
    ]).then(() => {
      return;
    });
    resolved = Promise.all([resolved, n]).then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    return n;
  }
  function N(e, sessionId) {
    if (!isBridgeServerSessionConfigEnabled()) return [];
    try {
      return applyBridgeServerArgs(
        {
          auto_mode_environment: decodeWorkSecret(e).auto_mode_environment,
        },
        {
          sessionId,
          apiBaseUrl: getBridgeBaseUrl(),
        },
      ).autoModeEnvironment;
    } catch {
      return [];
    }
  }
  function V(e) {
    try {
      return carriedModel(decodeWorkSecret(e).claude_code_args);
    } catch {
      return;
    }
  }
  function ne(e, n) {
    if (n === undefined || (v?.sessionId === e && v.model === n)) return Promise.resolve();
    let p;
    try {
      p = r.applyModelPick(n);
    } catch (error) {
      logError(error);
      return Promise.resolve();
    }
    return Promise.resolve(p)
      .then((s) => {
        if (s && !s.ok) {
          logFeatureSad("bridge_server_session_config", "model_pick_refused");
          logForDebugging(
            "[bridge:server-config] sdk-host lane model pick refused; the model in force stands",
            {
              level: "warn",
            },
          );
          return;
        }
        v = {
          sessionId: e,
          model: n,
        };
        logForDebugging("[bridge:server-config] sdk-host lane model pick applied");
      })
      .catch(logError);
  }
  function oe(e) {
    if (!isBridgeServerSessionConfigEnabled()) return;
    try {
      return carriedEffort(decodeWorkSecret(e).claude_code_args);
    } catch {
      return;
    }
  }
  function ie(e, n) {
    if (n === undefined || (E?.sessionId === e && E.effort === n)) return;
    let p;
    try {
      p = r.applyEffortSeed(n);
    } catch (error) {
      logError(error);
      return;
    }
    if (!p.ok) {
      logFeatureSad("bridge_server_session_config", "effort_pick_refused");
      logForDebugging("[bridge:server-config] sdk-host lane effort refused; the effort in force stands", {
        level: "warn",
      });
      return;
    }
    E = {
      sessionId: e,
      effort: n,
    };
    logForDebugging("[bridge:server-config] sdk-host lane effort seeded");
  }
  function se(e, getWorkerBearerToken, getWorkerEpoch, s) {
    if (!getWorkerBearerToken) return null;
    let h;
    try {
      h = new URL(`/v1/code/sessions/${e}`, getBridgeBaseUrl());
    } catch (error) {
      logForDebugging(`[bridge:server-config] reply mount skipped: ${errorMessage(error)}`, {
        level: "warn",
      });
      return null;
    }
    let headlessHearthMount = createHeadlessHearthMount({
      stores: r.stores,
      storageV5: r.storageV5,
      credentials: r.credentials,
      sessionId: e,
      apiBaseUrl: h.origin,
      getBearerToken: getWorkerBearerToken,
      getWorkerEpoch: getWorkerEpoch ?? (() => 0),
      readHearthBinding: () =>
        CCRClient.readProjectsBindingFor(h, () => {
          let w = getWorkerBearerToken();
          return w ? configureApiKeyHeaders(w) : {};
        }),
      sdkHostConfigs: r.sdkHostConfigs,
    });
    let R = s.then(() => r.awaitHostApplyQuiescence());
    return {
      mount: headlessHearthMount,
      gate: R,
      startup: R.then(() => headlessHearthMount.sync("startup")),
    };
  }
  function le(e, n, p) {
    let grantInputs = e.grantInputs;
    if (!grantInputs) return Promise.resolve();
    let h = M;
    let I = T;
    return fetchAttachSessionConfig({
      sessionId: grantInputs.sessionId,
      credentials: r.credentials,
      autoModeEnvironment: grantInputs.facts,
      permission,
      stillWanted: () => o === e && M === h,
      applyAfter: p.then(r.settleAutoModeAvailability).then(() => {
        return;
      }, logError),
      inheritLiftedFrom: n,
      keepChosenMode: () => (n !== null ? T !== I : H !== null && H !== "auto"),
    })
      .then((attachSessionConfig) => {
        if (o === e && M === h) e.grants = attachSessionConfig;
        else attachSessionConfig.undo();
      })
      .catch(logError);
  }
  return {
    apply(e, n) {
      let sessionId = resolveBridgeSessionId(e, n.bridgeSessionId);
      W();
      let s = resolved;
      let h = {
        hostAppendSystemPrompt: r.getAppendSystemPrompt(),
        writtenPrompt: undefined,
        meta: null,
        hearth: null,
        hearthGate: Promise.resolve(),
        hearthStartup: null,
        grants: null,
        grantInputs: null,
        attachedAs: getEnvOAuthAccountIdentity(),
        grantsSettled: null,
      };
      o = h;
      let I = se(sessionId, n.getWorkerBearerToken, n.getWorkerEpoch, s);
      if (I) {
        h.hearth = I.mount;
        h.hearthGate = I.gate;
        h.hearthStartup = I.startup;
      }
      let sessionEffort = getAppState().sessionEffort;
      let w = ne(sessionId, V(e))
        .then(() => {
          if (o === h && getAppState().sessionEffort === sessionEffort) ie(sessionId, oe(e));
        })
        .catch(logError);
      h.grantInputs = {
        sessionId,
        facts: N(e, sessionId),
      };
      let L = P;
      P = null;
      h.grantsSettled = le(h, L, w);
      applySdkHostLaneConfig(e, {
        sessionId: n.bridgeSessionId,
        getAppendSystemPrompt: r.getAppendSystemPrompt,
        setAppendSystemPrompt: (J) => {
          r.setAppendSystemPrompt(J);
          h.writtenPrompt = J;
        },
        addDenyRules: j,
        mountMetaMcp: ({ url, autoAllowTools, sessionId }) => {
          h.meta = G(h, sessionId, url, autoAllowTools, n.getWorkerBearerToken);
          if (h.meta === null) return false;
          A(h.meta.config).catch(logError);
          return true;
        },
      });
    },
    undo: W,
    loginChanged: (e) => {
      let n = o;
      if (n && isSameOwnerCaseInsensitive(n.attachedAs, e)) return;
      M++;
      P = null;
      if (n) {
        n.grants?.undo();
        n.grants = null;
        n.grantsSettled = null;
      }
    },
    noteModeChoice: (e) => {
      if (O) return;
      T++;
      H = e;
      P = null;
    },
    projectsReplyMount: () => o?.hearth ?? null,
    resyncProjectsReplyMount: () => {
      let e = o;
      let hearth = e?.hearth;
      if (!e || !hearth) return;
      e.hearthGate.then(() => hearth.sync("binding_changed"));
    },
    takeFirstTurnJoins: () => {
      if (!o)
        return {
          replyMount: null,
          grants: null,
        };
      let e = {
        replyMount: o.hearthStartup,
        grants: o.grantsSettled,
      };
      o.hearthStartup = null;
      o.grantsSettled = null;
      return e;
    },
  };
}
