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
import { or } from "../utils/settings/commandSyncNames.js";
import { getClaudeAIOAuthTokenOrigin, sameOwnerAccount } from "../utils/auth.js";
import { Vt } from "../utils/agentId.js";
import { env } from "../utils/env.js";
import {
  hasBridgeChildFeatureEnabled,
  classifyBridgeSessionRoles,
  machineLaneVersionRefusal,
  resolveBridgeChildFeatures,
} from "./bridgeEnabled.js";
import { $Je } from "./sessionTags.js";
import { setPermissionModeWithGuards } from "../utils/permissions/permissionSetup.js";
import { logError } from "../utils/log.js";
import { settingsChangeDetector } from "../utils/settings/changeDetector.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";
import { isArtifactSdkDefaultOff } from "../services/artifacts/artifactToolGates.js";
import { useLocalProjectsEntrypoint, clearLocalProjectsEntrypoint } from "../constants/system.js";
import { BH } from "../state/sliceHelpers.js";
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
import { ir } from "../services/mcp/client.js";
import { commandBelongsToServer } from "../services/mcp/utils.js";
import { createHeadlessHearthMount } from "./headlessHearthMount.js";
import { CCRClient } from "../cli/transports/ccrClient.js";
import { configureApiKeyHeaders } from "../services/api/client.js";

//@ chunk-h3xe040t.js:13316-13399 placement
function K(r, u) {
  let _ = getJwtSessionId(r.session_ingress_token);
  return _ !== void 0 && sameSessionId(_, u) ? _ : u;
}
//@ chunk-h3xe040t.js:13399-13470 placement
function Q(r, u) {
  try {
    let _ = K(decodeWorkSecret(r), u);
    return isSafeBridgeId(_) ? _ : u;
  } catch {
    return u;
  }
}
/**
 * 解析 work secret 里的 claude_code_args/mcp_config，为 sdk_host 通道生成会话配置（模型、权限、拒绝规则、元 MCP）。
 */
//@ chunk-h3xe040t.js:13470-15324 placement
function applySdkHostLaneConfig(r, u) {
  let _ = isBridgeServerSessionConfigEnabled();
  try {
    let S = decodeWorkSecret(r);
    if (!S.claude_code_args && !S.mcp_config) return;
    if (!_) {
      logConfigNotApplied(u.sessionId, { lane: lit("sdk_host"), ...carriedConfigFlags(S) });
      return;
    }
    let C = K(S, u.sessionId),
      o = applyBridgeServerArgs(
        { claude_code_args: S.claude_code_args, mcp_config: S.mcp_config },
        { sessionId: C, apiBaseUrl: getBridgeBaseUrl() },
      ),
      v = !1;
    if (o.appendSystemPrompt) {
      let appendSystemPrompt = u.getAppendSystemPrompt();
      if (!appendSystemPrompt?.includes(o.appendSystemPrompt))
        u.setAppendSystemPrompt(
          appendSystemPrompt
            ? `${appendSystemPrompt}

${o.appendSystemPrompt}`
            : o.appendSystemPrompt,
        );
      v = !0;
    }
    let E = o.disallowedTools.length > 0 ? u.addDenyRules(o.disallowedTools) : 0,
      P =
        o.metaMountUrl !== null && u.mountMetaMcp !== void 0
          ? u.mountMetaMcp({ url: o.metaMountUrl, autoAllowTools: o.autoAllowTools, sessionId: C })
          : !1,
      M = {
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
        ...(o.metaDropReason !== null && { meta_drop: fromEnum(o.metaDropReason) }),
      };
    if (
      (logForDebugging(
        `[bridge:server-config] sdk-host lane sessionId=${u.sessionId} appendPrompt=${v ? "applied" : "unset"} denyRules=${E} metaMcp=${o.metaMountUrl === null ? "unset" : P ? "mounted" : "not-mounted"} extraArgsIgnored=${M.extra_args_ignored}`,
      ),
      logEvent("tengu_bridge_server_config_applied", M),
      o.disallowedTools.length > 0 && E === 0)
    )
      logFeatureSad("bridge_server_session_config", "disallowed_tools_not_applied", M);
    else if (S.mcp_config && o.metaMountUrl === null)
      logFeatureSad("bridge_server_session_config", "meta_mcp_not_verified", M);
    else if (o.metaMountUrl !== null && !P)
      logFeatureSad("bridge_server_session_config", "meta_mcp_not_mounted", M);
    else logFeatureOk("bridge_server_session_config", M);
  } catch (error) {
    let C = error instanceof WorkSecretShapeError ? error.verdict : "derivation_threw";
    if ((logForDebugging(`[bridge:server-config] sdk-host lane not applied: ${C}`, { level: "warn" }), _))
      logFeatureBad("bridge_server_session_config", C);
  }
}
//@ chunk-h3xe040t.js:15324-15611 placement
function subtractEnvironmentEntries(r, u) {
  let _ = new Map();
  for (let o of u) if (o !== DEFAULTS_PLACEHOLDER) _.set(o, (_.get(o) ?? 0) + 1);
  let S = u[0] === DEFAULTS_PLACEHOLDER,
    C = [];
  for (let o = r.length - 1; o >= 0; o--) {
    let v = r[o];
    if (v === void 0) continue;
    let E = _.get(v) ?? 0;
    if (E > 0) {
      _.set(v, E - 1);
      continue;
    }
    if (S && v === DEFAULTS_PLACEHOLDER && r[o + 1] === u[1]) {
      S = !1;
      continue;
    }
    C.push(v);
  }
  return C.reverse();
}
/**
 * 把服务端下发的 auto mode environment 与本地设置合并，返回合并结果与差异标记。
 */
//@ chunk-h3xe040t.js:15611-16072 placement
function mergeAutoModeEnvironment(r, u, _) {
  let S = getFlagSettingsInline() ?? {},
    { autoMode: autoMode, ...o } = S,
    v = isPlainObject(autoMode) ? autoMode : {},
    { environment: environment, ...P } = v,
    M = stringArray(environment),
    y = subtractEnvironmentEntries(M, u),
    T = [];
  if (r.length > 0) {
    let x = getAutoModeConfig()?.environment ?? [],
      j = new Set(u),
      G = new Set(M),
      any = x.some((V) => !j.has(V)),
      any_2 = x.some((V) => !G.has(V)),
      U = u[0] === DEFAULTS_PLACEHOLDER;
    T = !y.includes(DEFAULTS_PLACEHOLDER) && (U ? !any_2 : !any) ? [DEFAULTS_PLACEHOLDER, ...r] : [...r];
  }
  let H = [...y, ...T];
  if (arraysEqual(H, M)) {
    _(T);
    return;
  }
  let O = H.length > 0 ? { ...P, environment: H } : P,
    B = Object.keys(O).length > 0 ? { ...o, autoMode: O } : o;
  (setFlagSettingsInline(Object.keys(B).length > 0 ? B : null), _(T), or());
}
//@ chunk-h3xe040t.js:16072-16280 placement
function getEnvOAuthAccountIdentity() {
  switch (getClaudeAIOAuthTokenOrigin()) {
    case "env":
    case "fd": {
      let r = Vt(env.CLAUDE_CODE_ACCOUNT_UUID);
      return r
        ? { accountUuid: r, organizationUuid: Vt(env.CLAUDE_CODE_ORGANIZATION_UUID) ?? void 0 }
        : void 0;
    }
    case "store":
    case "none":
      return;
  }
}
//@ chunk-h3xe040t.js:16280-16513 placement
function isSameOwnerCaseInsensitive(r, u) {
  if (!r || !u) return !1;
  return sameOwnerAccount(
    { accountUuid: u.accountUuid.toLowerCase(), organizationUuid: u.organizationUuid?.toLowerCase() },
    { accountUuid: r.accountUuid.toLowerCase(), organizationUuid: r.organizationUuid?.toLowerCase() },
  );
}
//@ chunk-h3xe040t.js:16513-16614 placement
var NOOP_SESSION_CONFIG_APPLY = {
  undo: () => null,
  granted: { autoMode: !1, facts: 0, artifact: !1, autoCompact: !1, projectsEntrypoint: !1 },
};
/**
 * 附加到 headless 会话时拉取会话配置（auto mode 环境等）并在仍需要时应用。
 */
//@ chunk-h3xe040t.js:16614-19156 placement
async function fetchAttachSessionConfig(r) {
  let u = hasBridgeChildFeatureEnabled("attach"),
    _ = r.autoModeEnvironment.length > 0;
  if (!u && !_) return NOOP_SESSION_CONFIG_APPLY;
  let S = !1;
  S = _;
  let C = u || S ? await $Je(r.sessionId, { baseUrl: getBridgeBaseUrl(), credentials: r.credentials }) : null;
  if ((await r.applyAfter, !r.stillWanted())) return NOOP_SESSION_CONFIG_APPLY;
  let o = classifyBridgeSessionRoles(C);
  if (o.projectThreadChild && machineLaneVersionRefusal()?.reason === "floor_unreachable")
    return (logFeatureSad("bridge_rc_child_grants", "floor_unreachable"), NOOP_SESSION_CONFIG_APPLY);
  let v = null;
  if (_ && !o.projectThreadChild) v = C === null ? "session_tags_unread" : "session_untagged";
  let E = getSettingsForSource("policySettings")?.permissions?.defaultMode !== void 0,
    P = resolveBridgeChildFeatures({ roles: o, modePinned: E, settings: getInitialSettings_2 });
  if (u && o.rcChild && E) logFeatureSad("bridge_rc_child_grants", "auto_policy_pinned");
  let M = !1,
    y = null;
  if (P.autoOverSettings) {
    let mode = r.permission.get().mode,
      k = r.inheritLiftedFrom ?? null,
      U = mode === "default" || mode === "acceptEdits",
      W = mode === "plan" && k !== null && r.permission.get().prePlanMode === k;
    if ((U || W) && r.keepChosenMode()) logFeatureSad("bridge_rc_child_grants", "auto_withheld_mode_chosen");
    else if ((U || W) && r.permission.get().isAutoModeAvailable === !1)
      logFeatureSad("bridge_rc_child_grants", "auto_unavailable");
    else if (W)
      (r.permission.set((N) => ({ ...N, prePlanMode: "auto" })),
        (M = !0),
        (y = k),
        logFeatureOk("bridge_rc_child_grants"));
    else if (!U) logFeatureSad("bridge_rc_child_grants", "auto_host_mode_kept");
    else if (
      setPermissionModeWithGuards("auto", r.permission.get(), r.permission.set, "remote_control_attach").ok
    )
      ((M = !0), (y = mode), logFeatureOk("bridge_rc_child_grants"));
    else logFeatureSad("bridge_rc_child_grants", "auto_refused");
  }
  let T = [],
    H = null,
    O = (A) => {
      try {
        mergeAutoModeEnvironment(A, T, (k) => {
          T = k;
        });
      } catch (error) {
        logError(error);
      }
    };
  if (v !== null) logFeatureSad("bridge_rc_child_grants", `facts_${v}`);
  else if (_) {
    O(r.autoModeEnvironment);
    let A = () => O(r.autoModeEnvironment),
      subscribe = settingsChangeDetector.subscribe(A),
      U = onGrowthBookRefresh(A);
    H = () => {
      (subscribe(), U());
    };
  }
  let B = !1;
  if (P.artifact && isArtifactSdkDefaultOff()) ((B = !0), env.set("CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT", !0));
  let x = !1;
  if (P.autoCompact && getSettingsForSource("flagSettings")?.autoCompactEnabled === void 0)
    (setFlagSettingsInline({ ...getFlagSettingsInline(), autoCompactEnabled: !0 }),
      settingsChangeDetector.notifyChange("flagSettings"),
      (x = !0));
  let j = !1;
  if (P.projectsEntrypoint)
    if (((j = useLocalProjectsEntrypoint()), j)) logFeatureOk("bridge_projects_entrypoint_name");
    else logFeatureSad("bridge_projects_entrypoint_name", "host_name_kept");
  let G = !1;
  return {
    granted: { autoMode: M, facts: T.length, artifact: B, autoCompact: x, projectsEntrypoint: j },
    undo() {
      if (G) return null;
      if (((G = !0), H?.(), O([]), B)) env.unset("CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT");
      if (j) clearLocalProjectsEntrypoint();
      if (x) {
        let { autoCompactEnabled: autoCompactEnabled, ...k } = getFlagSettingsInline() ?? {};
        if (autoCompactEnabled === !0)
          (setFlagSettingsInline(Object.keys(k).length > 0 ? k : null),
            settingsChangeDetector.notifyChange("flagSettings"));
      }
      if (y !== null && r.permission.get().mode === "auto")
        setPermissionModeWithGuards(y, r.permission.get(), r.permission.set, "remote_control_detach");
      else if (
        y !== null &&
        r.permission.get().mode === "plan" &&
        r.permission.get().prePlanMode === "auto"
      ) {
        let A = y;
        return (r.permission.set((k) => ({ ...k, prePlanMode: A })), A);
      }
      return null;
    },
  };
}
//@ chunk-h3xe040t.js:19156-19225 placement
function q() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
/**
 * 创建由 work secret 驱动的 headless 会话：接管权限上下文、动态 MCP 状态与配置应用队列，返回会话控制对象。
 */
//@ chunk-h3xe040t.js:19225-25833 placement
function createHeadlessWorkSecretSession(r) {
  let {
      getAppState: getAppState,
      setAppState: setAppState,
      getDynamicMcpState: getDynamicMcpState,
    } = r.stores,
    C = BH(setAppState, "toolPermissionContext"),
    o = null,
    v = null,
    E = null,
    P = null,
    M = 0,
    resolved = Promise.resolve(),
    T = 0,
    H = null,
    O = !1,
    B = {
      get: r.permission.get,
      set: (e) => {
        let n = O;
        O = !0;
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
    let n = new Set(e.map((s) => formatPermissionRule(permissionRuleValueFromString(s)))),
      filtered = [...n].filter((s) => x(s) === 0);
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
  function G(e, n, p, s, h) {
    if (!h)
      return (
        logForDebugging(
          "[bridge:server-config] meta mount skipped: the bridge exposes no worker credential",
          { level: "warn" },
        ),
        null
      );
    if (
      getAppState().mcp.clients.some((client) => client.name === CLAUDE_CODE_REMOTE) ||
      CLAUDE_CODE_REMOTE in getDynamicMcpState().configs
    )
      return (
        logForDebugging(
          `[bridge:server-config] meta mount skipped: a server named ${CLAUDE_CODE_REMOTE} is already configured`,
          { level: "warn" },
        ),
        null
      );
    let I = registerCliOwnedConfig(
        { ...ccrMetaMcpServerConfig(p, n), scope: "dynamic" },
        { getBearerToken: h },
      ),
      R = { config: I, allowRules: [] };
    return (
      (e.meta = R),
      setAppState((w) =>
        setMcpClientInAppState(w, CLAUDE_CODE_REMOTE, {
          client: { name: CLAUDE_CODE_REMOTE, type: "pending", config: I },
          tools: [],
          commands: [],
        }),
      ),
      (R.allowRules = buildSessionAllowRuleUpdates(s.map((w) => buildMcpToolName(CLAUDE_CODE_REMOTE, w)))),
      C((w) => applyMcpMountAllowRules(w, R.allowRules)),
      R
    );
  }
  async function A(e) {
    let n = identityEpoch(),
      p;
    try {
      p = {
        ...(await q().reconnectMcpServerImpl(CLAUDE_CODE_REMOTE, e, r.storageV5, r.credentials)),
        attemptEpoch: n,
      };
    } catch (error) {
      (logForDebugging(`[bridge:server-config] meta mount connect threw: ${errorMessage(error)}`, {
        level: "warn",
      }),
        (p = {
          client: { name: CLAUDE_CODE_REMOTE, type: "failed", config: e, error: "Connection failed" },
          tools: [],
          commands: [],
          attemptEpoch: n,
        }));
    }
    if (o?.meta?.config !== e) {
      if (p.client.type === "connected") await q().detachAndCloseConnection(p.client);
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
  function k(e) {
    C((s) => replaceMcpMountRules(s, e.allowRules, "one"));
    let found = getAppState().mcp.clients.find((client) => client.name === CLAUDE_CODE_REMOTE);
    if (found && found.config !== e.config) {
      if (ir(CLAUDE_CODE_REMOTE, found.config) === ir(CLAUDE_CODE_REMOTE, e.config)) return Promise.resolve();
      return U(e.config);
    }
    let p = getMcpPrefix(CLAUDE_CODE_REMOTE);
    return (
      setAppState((s) => {
        let { [CLAUDE_CODE_REMOTE]: h, ...I } = s.mcp.resources,
          { [CLAUDE_CODE_REMOTE]: R, ...w } = s.mcp.resourceTemplates;
        return {
          ...s,
          mcp: {
            ...s.mcp,
            clients: s.mcp.clients.filter((client) => client !== found),
            tools: s.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, CLAUDE_CODE_REMOTE, p)),
            commands: s.mcp.commands.filter(
              (command) => !commandBelongsToServer(command, CLAUDE_CODE_REMOTE),
            ),
            resources: I,
            resourceTemplates: w,
          },
        };
      }),
      U(e.config)
    );
  }
  function U(e) {
    return q()
      .clearServerCache(CLAUDE_CODE_REMOTE, e)
      .catch((n) => {
        logForDebugging(`[bridge:server-config] meta unmount cleanup failed: ${errorMessage(n)}`, {
          level: "warn",
        });
      });
  }
  function W() {
    let e = o;
    if (((o = null), !e)) return Promise.resolve();
    if (e.writtenPrompt !== void 0) {
      let appendSystemPrompt = r.getAppendSystemPrompt();
      if (appendSystemPrompt === e.writtenPrompt) r.setAppendSystemPrompt(e.hostAppendSystemPrompt);
      else {
        let hostAppendSystemPrompt = e.hostAppendSystemPrompt,
          h = hostAppendSystemPrompt
            ? e.writtenPrompt.slice(hostAppendSystemPrompt.length)
            : `

${e.writtenPrompt}`;
        if (appendSystemPrompt !== void 0 && appendSystemPrompt.endsWith(h))
          r.setAppendSystemPrompt(appendSystemPrompt.slice(0, -h.length));
      }
    }
    P = e.grants?.undo() ?? null;
    let n = Promise.all([
      e.meta ? k(e.meta) : Promise.resolve(),
      e.hearth ? e.hearth.drop() : Promise.resolve(),
    ]).then(() => {
      return;
    });
    return (
      (resolved = Promise.all([resolved, n]).then(
        () => {
          return;
        },
        () => {
          return;
        },
      )),
      n
    );
  }
  function N(e, n) {
    if (!isBridgeServerSessionConfigEnabled()) return [];
    try {
      return applyBridgeServerArgs(
        { auto_mode_environment: decodeWorkSecret(e).auto_mode_environment },
        { sessionId: n, apiBaseUrl: getBridgeBaseUrl() },
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
    if (n === void 0 || (v?.sessionId === e && v.model === n)) return Promise.resolve();
    let p;
    try {
      p = r.applyModelPick(n);
    } catch (error) {
      return (logError(error), Promise.resolve());
    }
    return Promise.resolve(p)
      .then((s) => {
        if (s && !s.ok) {
          (logFeatureSad("bridge_server_session_config", "model_pick_refused"),
            logForDebugging(
              "[bridge:server-config] sdk-host lane model pick refused; the model in force stands",
              { level: "warn" },
            ));
          return;
        }
        ((v = { sessionId: e, model: n }),
          logForDebugging("[bridge:server-config] sdk-host lane model pick applied"));
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
    if (n === void 0 || (E?.sessionId === e && E.effort === n)) return;
    let p;
    try {
      p = r.applyEffortSeed(n);
    } catch (error) {
      logError(error);
      return;
    }
    if (!p.ok) {
      (logFeatureSad("bridge_server_session_config", "effort_pick_refused"),
        logForDebugging("[bridge:server-config] sdk-host lane effort refused; the effort in force stands", {
          level: "warn",
        }));
      return;
    }
    ((E = { sessionId: e, effort: n }),
      logForDebugging("[bridge:server-config] sdk-host lane effort seeded"));
  }
  function se(e, n, p, s) {
    if (!n) return null;
    let h;
    try {
      h = new URL(`/v1/code/sessions/${e}`, getBridgeBaseUrl());
    } catch (error) {
      return (
        logForDebugging(`[bridge:server-config] reply mount skipped: ${errorMessage(error)}`, {
          level: "warn",
        }),
        null
      );
    }
    let I = createHeadlessHearthMount({
        stores: r.stores,
        storageV5: r.storageV5,
        credentials: r.credentials,
        sessionId: e,
        apiBaseUrl: h.origin,
        getBearerToken: n,
        getWorkerEpoch: p ?? (() => 0),
        readHearthBinding: () =>
          CCRClient.readProjectsBindingFor(h, () => {
            let w = n();
            return w ? configureApiKeyHeaders(w) : {};
          }),
        sdkHostConfigs: r.sdkHostConfigs,
      }),
      R = s.then(() => r.awaitHostApplyQuiescence());
    return { mount: I, gate: R, startup: R.then(() => I.sync("startup")) };
  }
  function le(e, n, p) {
    let grantInputs = e.grantInputs;
    if (!grantInputs) return Promise.resolve();
    let h = M,
      I = T;
    return fetchAttachSessionConfig({
      sessionId: grantInputs.sessionId,
      credentials: r.credentials,
      autoModeEnvironment: grantInputs.facts,
      permission: B,
      stillWanted: () => o === e && M === h,
      applyAfter: p.then(r.settleAutoModeAvailability).then(() => {
        return;
      }, logError),
      inheritLiftedFrom: n,
      keepChosenMode: () => (n !== null ? T !== I : H !== null && H !== "auto"),
    })
      .then((R) => {
        if (o === e && M === h) e.grants = R;
        else R.undo();
      })
      .catch(logError);
  }
  return {
    apply(e, n) {
      let p = Q(e, n.bridgeSessionId);
      W();
      let s = resolved,
        h = {
          hostAppendSystemPrompt: r.getAppendSystemPrompt(),
          writtenPrompt: void 0,
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
      let I = se(p, n.getWorkerBearerToken, n.getWorkerEpoch, s);
      if (I) ((h.hearth = I.mount), (h.hearthGate = I.gate), (h.hearthStartup = I.startup));
      let sessionEffort = getAppState().sessionEffort,
        w = ne(p, V(e))
          .then(() => {
            if (o === h && getAppState().sessionEffort === sessionEffort) ie(p, oe(e));
          })
          .catch(logError);
      h.grantInputs = { sessionId: p, facts: N(e, p) };
      let L = P;
      ((P = null),
        (h.grantsSettled = le(h, L, w)),
        applySdkHostLaneConfig(e, {
          sessionId: n.bridgeSessionId,
          getAppendSystemPrompt: r.getAppendSystemPrompt,
          setAppendSystemPrompt: (J) => {
            (r.setAppendSystemPrompt(J), (h.writtenPrompt = J));
          },
          addDenyRules: j,
          mountMetaMcp: ({ url: url, autoAllowTools: autoAllowTools, sessionId: sessionId }) => {
            if (((h.meta = G(h, sessionId, url, autoAllowTools, n.getWorkerBearerToken)), h.meta === null))
              return !1;
            return (A(h.meta.config).catch(logError), !0);
          },
        }));
    },
    undo: W,
    loginChanged: (e) => {
      let n = o;
      if (n && isSameOwnerCaseInsensitive(n.attachedAs, e)) return;
      if ((M++, (P = null), n)) (n.grants?.undo(), (n.grants = null), (n.grantsSettled = null));
    },
    noteModeChoice: (e) => {
      if (O) return;
      (T++, (H = e), (P = null));
    },
    projectsReplyMount: () => o?.hearth ?? null,
    resyncProjectsReplyMount: () => {
      let e = o,
        n = e?.hearth;
      if (!e || !n) return;
      e.hearthGate.then(() => n.sync("binding_changed"));
    },
    takeFirstTurnJoins: () => {
      if (!o) return { replyMount: null, grants: null };
      let e = { replyMount: o.hearthStartup, grants: o.grantsSettled };
      return ((o.hearthStartup = null), (o.grantsSettled = null), e);
    },
  };
}
