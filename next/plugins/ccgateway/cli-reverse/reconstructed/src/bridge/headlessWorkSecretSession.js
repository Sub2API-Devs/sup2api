/**
 * bridge/headlessWorkSecretSession.ts
 *
 * 2.1.316 新增：创建由 work secret 驱动的 headless 会话：接管权限上下文、动态 MCP 状态与配置应用队列，返回会话控制对象；附加到 headless 会话时拉取会话配置（auto mode 环境等）并在仍需要时应用等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-68kp927q.js (11)
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
import { countWhere, stringArray, arraysEqual } from "../utils/collections.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { DEFAULTS_PLACEHOLDER } from "../utils/permissions/autoModeRulesPrompt.js";
import { getFlagSettingsInline, setFlagSettingsInline } from "../bootstrap/state.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { getAutoModeConfig, getSettingsForSource, getInitialSettings } from "../utils/settings/settings.js";
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
import { permissionRuleValueFromString, parseRuleString } from "../utils/permissions/permissionRuleParser.js";
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

//@ chunk-68kp927q.js:14465-14548 placement
function pickSessionIdFromWorkSecret(secret, fallbackSessionId) {
  let jwtSessionId = getJwtSessionId(secret.session_ingress_token);
  return jwtSessionId !== undefined && sameSessionId(jwtSessionId, fallbackSessionId)
    ? jwtSessionId
    : fallbackSessionId;
}
//@ chunk-68kp927q.js:14548-14619 placement
function resolveBridgeSessionId(secret, fallbackSessionId) {
  try {
    let sessionId = pickSessionIdFromWorkSecret(decodeWorkSecret(secret), fallbackSessionId);
    return isSafeBridgeId(sessionId) ? sessionId : fallbackSessionId;
  } catch {
    return fallbackSessionId;
  }
}
//@ chunk-68kp927q.js:14619-16473 placement
/**
 * 解析 work secret 里的 claude_code_args/mcp_config，为 sdk_host 通道生成会话配置（模型、权限、拒绝规则、元 MCP）。
 */
function applySdkHostLaneConfig(secret, host) {
  let gateEnabled = isBridgeServerSessionConfigEnabled();
  try {
    let decodedSecret = decodeWorkSecret(secret);
    if (!decodedSecret.claude_code_args && !decodedSecret.mcp_config) return;
    if (!gateEnabled) {
      logConfigNotApplied(host.sessionId, {
        lane: lit("sdk_host"),
        ...carriedConfigFlags(decodedSecret),
      });
      return;
    }
    let sessionId = pickSessionIdFromWorkSecret(decodedSecret, host.sessionId);
    let config = applyBridgeServerArgs(
      {
        claude_code_args: decodedSecret.claude_code_args,
        mcp_config: decodedSecret.mcp_config,
      },
      {
        sessionId,
        apiBaseUrl: getBridgeBaseUrl(),
      },
    );
    let promptAppended = false;
    if (config.appendSystemPrompt) {
      let currentPrompt = host.getAppendSystemPrompt();
      if (!currentPrompt?.includes(config.appendSystemPrompt))
        host.setAppendSystemPrompt(
          currentPrompt
            ? `${currentPrompt}

${config.appendSystemPrompt}`
            : config.appendSystemPrompt,
        );
      promptAppended = true;
    }
    let denyRuleCount = config.disallowedTools.length > 0 ? host.addDenyRules(config.disallowedTools) : 0;
    let metaMounted =
      config.metaMountUrl !== null && host.mountMetaMcp !== undefined
        ? host.mountMetaMcp({
            url: config.metaMountUrl,
            autoAllowTools: config.autoAllowTools,
            sessionId,
          })
        : false;
    let attributes = {
      lane: lit("sdk_host"),
      ...carriedConfigFlags(decodedSecret),
      append_prompt: promptAppended,
      deny_rules: denyRuleCount,
      extra_args_ignored: countWhere(
        config.extraArgs,
        (arg) =>
          arg.startsWith("--") &&
          arg !== "--model" &&
          !arg.startsWith("--disallowed") &&
          !arg.startsWith("--allowedTools") &&
          arg !== "--effort",
      ),
      meta_mcp_verified: config.metaMountUrl !== null,
      meta_mcp_mounted: metaMounted,
      auto_allow: metaMounted ? config.autoAllowTools.length : 0,
      ignored_mcp: config.ignoredMcpServers,
      ...(config.metaDropReason !== null && {
        meta_drop: fromEnum(config.metaDropReason),
      }),
    };
    logForDebugging(
      `[bridge:server-config] sdk-host lane sessionId=${host.sessionId} appendPrompt=${promptAppended ? "applied" : "unset"} denyRules=${denyRuleCount} metaMcp=${config.metaMountUrl === null ? "unset" : metaMounted ? "mounted" : "not-mounted"} extraArgsIgnored=${attributes.extra_args_ignored}`,
    );
    logEvent("tengu_bridge_server_config_applied", attributes);
    if (config.disallowedTools.length > 0 && denyRuleCount === 0)
      logFeatureSad("bridge_server_session_config", "disallowed_tools_not_applied", attributes);
    else if (decodedSecret.mcp_config && config.metaMountUrl === null)
      logFeatureSad("bridge_server_session_config", "meta_mcp_not_verified", attributes);
    else if (config.metaMountUrl !== null && !metaMounted)
      logFeatureSad("bridge_server_session_config", "meta_mcp_not_mounted", attributes);
    else logFeatureOk("bridge_server_session_config", attributes);
  } catch (error) {
    let verdict = error instanceof WorkSecretShapeError ? error.verdict : "derivation_threw";
    logForDebugging(`[bridge:server-config] sdk-host lane not applied: ${verdict}`, {
      level: "warn",
    });
    if (gateEnabled) logFeatureBad("bridge_server_session_config", verdict);
  }
}
//@ chunk-68kp927q.js:16473-16760 placement
function subtractEnvironmentEntries(wanted, merged) {
  let extraCounts = new Map();
  for (let entry of merged)
    if (entry !== DEFAULTS_PLACEHOLDER) extraCounts.set(entry, (extraCounts.get(entry) ?? 0) + 1);
  let mergedHasDefaults = merged[0] === DEFAULTS_PLACEHOLDER;
  let remaining = [];
  for (let j = wanted.length - 1; j >= 0; j--) {
    let entry = wanted[j];
    if (entry === undefined) continue;
    let count = extraCounts.get(entry) ?? 0;
    if (count > 0) {
      extraCounts.set(entry, count - 1);
      continue;
    }
    if (mergedHasDefaults && entry === DEFAULTS_PLACEHOLDER && wanted[j + 1] === merged[1]) {
      mergedHasDefaults = false;
      continue;
    }
    remaining.push(entry);
  }
  return remaining.reverse();
}
//@ chunk-68kp927q.js:16760-17221 placement
/**
 * 把服务端下发的 auto mode environment 与本地设置合并，返回合并结果与差异标记。
 */
function mergeAutoModeEnvironment(hostEntries, mergedEntries, reportFacts) {
  let flagSettings = getFlagSettingsInline() ?? {};
  let { autoMode, ...restSettings } = flagSettings;
  let autoModeObject = isPlainObject(autoMode) ? autoMode : {};
  let { environment, ...restAutoMode } = autoModeObject;
  let mergedEnv = stringArray(environment);
  let keptEnv = subtractEnvironmentEntries(mergedEnv, mergedEntries);
  let hostEnv = [];
  if (hostEntries.length > 0) {
    let environment = getAutoModeConfig()?.environment ?? [];
    let mergedSet = new Set(mergedEntries);
    let mergedEnvSet = new Set(mergedEnv);
    let any = environment.some((entry) => !mergedSet.has(entry));
    let any_2 = environment.some((entry) => !mergedEnvSet.has(entry));
    let mergedIsDefaultsOnly = mergedEntries[0] === DEFAULTS_PLACEHOLDER;
    hostEnv =
      !keptEnv.includes(DEFAULTS_PLACEHOLDER) && (mergedIsDefaultsOnly ? !any_2 : !any)
        ? [DEFAULTS_PLACEHOLDER, ...hostEntries]
        : [...hostEntries];
  }
  let nextEnv = [...keptEnv, ...hostEnv];
  if (arraysEqual(nextEnv, mergedEnv)) {
    reportFacts(hostEnv);
    return;
  }
  let nextAutoMode =
    nextEnv.length > 0
      ? {
          ...restAutoMode,
          environment: nextEnv,
        }
      : restAutoMode;
  let nextSettings =
    Object.keys(nextAutoMode).length > 0
      ? {
          ...restSettings,
          autoMode: nextAutoMode,
        }
      : restSettings;
  setFlagSettingsInline(Object.keys(nextSettings).length > 0 ? nextSettings : null);
  reportFacts(hostEnv);
  invalidateCommandNames();
}
//@ chunk-68kp927q.js:17221-17429 placement
function getEnvOAuthAccountIdentity() {
  switch (getClaudeAIOAuthTokenOrigin()) {
    case "env":
    case "fd": {
      let accountUuid = normalizeUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID);
      return accountUuid
        ? {
            accountUuid,
            organizationUuid: normalizeUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID) ?? undefined,
          }
        : undefined;
    }
    case "store":
    case "none":
      return;
  }
}
//@ chunk-68kp927q.js:17429-17662 placement
function isSameOwnerCaseInsensitive(attachedAs, candidateOwner) {
  if (!attachedAs || !candidateOwner) return false;
  return sameOwnerAccount(
    {
      accountUuid: candidateOwner.accountUuid.toLowerCase(),
      organizationUuid: candidateOwner.organizationUuid?.toLowerCase(),
    },
    {
      accountUuid: attachedAs.accountUuid.toLowerCase(),
      organizationUuid: attachedAs.organizationUuid?.toLowerCase(),
    },
  );
}
//@ chunk-68kp927q.js:17662-17763 placement
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
//@ chunk-68kp927q.js:17763-20305 placement
/**
 * 附加到 headless 会话时拉取会话配置（auto mode 环境等）并在仍需要时应用。
 */
async function fetchAttachSessionConfig(host) {
  let grantsEnabled = hasBridgeChildFeatureEnabled("attach");
  let hasFacts = host.autoModeEnvironment.length > 0;
  if (!grantsEnabled && !hasFacts) return NOOP_SESSION_CONFIG_APPLY;
  let fromFactsOnly = false;
  fromFactsOnly = hasFacts;
  let sessionTags =
    grantsEnabled || fromFactsOnly
      ? await readBridgeSessionTags(host.sessionId, {
          baseUrl: getBridgeBaseUrl(),
          credentials: host.credentials,
        })
      : null;
  await host.applyAfter;
  if (!host.stillWanted()) return NOOP_SESSION_CONFIG_APPLY;
  let roles = classifyBridgeSessionRoles(sessionTags);
  if (roles.projectThreadChild && machineLaneVersionRefusal()?.reason === "floor_unreachable") {
    logFeatureSad("bridge_rc_child_grants", "floor_unreachable");
    return NOOP_SESSION_CONFIG_APPLY;
  }
  let factsGap = null;
  if (hasFacts && !roles.projectThreadChild)
    factsGap = sessionTags === null ? "session_tags_unread" : "session_untagged";
  let modePinned = getSettingsForSource("policySettings")?.permissions?.defaultMode !== undefined;
  let bridgeChildFeatures = resolveBridgeChildFeatures({
    roles,
    modePinned,
    settings: getInitialSettings,
  });
  if (grantsEnabled && roles.rcChild && modePinned)
    logFeatureSad("bridge_rc_child_grants", "auto_policy_pinned");
  let autoModeGranted = false;
  let previousMode = null;
  if (bridgeChildFeatures.autoOverSettings) {
    let mode = host.permission.get().mode;
    let inheritLiftedFrom = host.inheritLiftedFrom ?? null;
    let modeIsNeutral = mode === "default" || mode === "acceptEdits";
    let inInheritedPlan =
      mode === "plan" &&
      inheritLiftedFrom !== null &&
      host.permission.get().prePlanMode === inheritLiftedFrom;
    if ((modeIsNeutral || inInheritedPlan) && host.keepChosenMode())
      logFeatureSad("bridge_rc_child_grants", "auto_withheld_mode_chosen");
    else if ((modeIsNeutral || inInheritedPlan) && host.permission.get().isAutoModeAvailable === false)
      logFeatureSad("bridge_rc_child_grants", "auto_unavailable");
    else if (inInheritedPlan) {
      host.permission.set((context) => ({
        ...context,
        prePlanMode: "auto",
      }));
      autoModeGranted = true;
      previousMode = inheritLiftedFrom;
      logFeatureOk("bridge_rc_child_grants");
    } else if (!modeIsNeutral) logFeatureSad("bridge_rc_child_grants", "auto_host_mode_kept");
    else if (
      setPermissionModeWithGuards("auto", host.permission.get(), host.permission.set, "remote_control_attach")
        .ok
    ) {
      autoModeGranted = true;
      previousMode = mode;
      logFeatureOk("bridge_rc_child_grants");
    } else logFeatureSad("bridge_rc_child_grants", "auto_refused");
  }
  let facts = [];
  let stopWatching = null;
  let applyFacts = (hostEntries) => {
    try {
      mergeAutoModeEnvironment(hostEntries, facts, (applied) => {
        facts = applied;
      });
    } catch (error) {
      logError(error);
    }
  };
  if (factsGap !== null) logFeatureSad("bridge_rc_child_grants", `facts_${factsGap}`);
  else if (hasFacts) {
    applyFacts(host.autoModeEnvironment);
    let reapply = () => applyFacts(host.autoModeEnvironment);
    let unsubscribeSettings = settingsChangeDetector.subscribe(reapply);
    let unsubscribeGrowthBook = onGrowthBookRefresh(reapply);
    stopWatching = () => {
      unsubscribeSettings();
      unsubscribeGrowthBook();
    };
  }
  let artifactGranted = false;
  if (bridgeChildFeatures.artifact && isArtifactSdkDefaultOff()) {
    artifactGranted = true;
    env.set("CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT", true);
  }
  let autoCompactGranted = false;
  if (
    bridgeChildFeatures.autoCompact &&
    getSettingsForSource("flagSettings")?.autoCompactEnabled === undefined
  ) {
    setFlagSettingsInline({
      ...getFlagSettingsInline(),
      autoCompactEnabled: true,
    });
    settingsChangeDetector.notifyChange("flagSettings");
    autoCompactGranted = true;
  }
  let projectsEntrypointGranted = false;
  if (bridgeChildFeatures.projectsEntrypoint) {
    projectsEntrypointGranted = useLocalProjectsEntrypoint();
    if (projectsEntrypointGranted) logFeatureOk("bridge_projects_entrypoint_name");
    else logFeatureSad("bridge_projects_entrypoint_name", "host_name_kept");
  }
  let undone = false;
  return {
    granted: {
      autoMode: autoModeGranted,
      facts: facts.length,
      artifact: artifactGranted,
      autoCompact: autoCompactGranted,
      projectsEntrypoint: projectsEntrypointGranted,
    },
    undo() {
      if (undone) return null;
      undone = true;
      stopWatching?.();
      applyFacts([]);
      if (artifactGranted) env.unset("CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT");
      if (projectsEntrypointGranted) clearLocalProjectsEntrypoint();
      if (autoCompactGranted) {
        let { autoCompactEnabled, ...restSettings } = getFlagSettingsInline() ?? {};
        if (autoCompactEnabled === true) {
          setFlagSettingsInline(Object.keys(restSettings).length > 0 ? restSettings : null);
          settingsChangeDetector.notifyChange("flagSettings");
        }
      }
      if (previousMode !== null && host.permission.get().mode === "auto")
        setPermissionModeWithGuards(
          previousMode,
          host.permission.get(),
          host.permission.set,
          "remote_control_detach",
        );
      else if (
        previousMode !== null &&
        host.permission.get().mode === "plan" &&
        host.permission.get().prePlanMode === "auto"
      ) {
        let restoredMode = previousMode;
        host.permission.set((context) => ({
          ...context,
          prePlanMode: restoredMode,
        }));
        return restoredMode;
      }
      return null;
    },
  };
}
//@ chunk-68kp927q.js:20305-20374 placement
function mcpClientModule_2() {
  return require("../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-68kp927q.js:20374-26983 placement
/**
 * 创建由 work secret 驱动的 headless 会话：接管权限上下文、动态 MCP 状态与配置应用队列，返回会话控制对象。
 */
function createHeadlessWorkSecretSession(host) {
  let { getAppState, setAppState, getDynamicMcpState } = host.stores;
  let updatePermissionSlice = setSliceField(setAppState, "toolPermissionContext");
  let current = null;
  let lastModelPick = null;
  let lastEffortSeed = null;
  let pendingGrants = null;
  let applyGeneration = 0;
  let resolved = Promise.resolve();
  let modeChoiceSequence = 0;
  let chosenMode = null;
  let applyingPermission = false;
  let permission = {
    get: host.permission.get,
    set: (updater) => {
      let previous = applyingPermission;
      applyingPermission = true;
      try {
        host.permission.set(updater);
      } finally {
        applyingPermission = previous;
      }
    },
  };
  function countRule(rule) {
    return countWhere(
      getAppState().toolPermissionContext.alwaysDenyRules.session ?? [],
      (existing) => existing === rule,
    );
  }
  function addDenyRules(rules) {
    let ruleSet = new Set(rules.map((rule) => permissionRuleValueFromString(parseRuleString(rule))));
    let filtered = [...ruleSet].filter((rule) => countRule(rule) === 0);
    if (filtered.length > 0)
      updatePermissionSlice((slice) =>
        applyValidatedPermissionUpdate(slice, {
          type: "addRules",
          destination: "session",
          behavior: "deny",
          rules: filtered.map(parseRuleString),
        }),
      );
    return countWhere([...ruleSet], (rule) => countRule(rule) > 0);
  }
  function mountMeta(state, sessionId, url, autoAllowTools, getWorkerBearerToken) {
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
    let meta = {
      config,
      allowRules: [],
    };
    state.meta = meta;
    setAppState((appState) =>
      setMcpClientInAppState(appState, CLAUDE_CODE_REMOTE, {
        client: {
          name: CLAUDE_CODE_REMOTE,
          type: "pending",
          config,
        },
        tools: [],
        commands: [],
      }),
    );
    meta.allowRules = buildSessionAllowRuleUpdates(
      autoAllowTools.map((toolName) => buildMcpToolName(CLAUDE_CODE_REMOTE, toolName)),
    );
    updatePermissionSlice((slice) => applyMcpMountAllowRules(slice, meta.allowRules));
    return meta;
  }
  async function connectMeta(config) {
    let attemptEpoch = identityEpoch();
    let result;
    try {
      result = {
        ...(await mcpClientModule_2().reconnectMcpServerImpl(
          CLAUDE_CODE_REMOTE,
          config,
          host.storageV5,
          host.credentials,
        )),
        attemptEpoch,
      };
    } catch (error) {
      logForDebugging(`[bridge:server-config] meta mount connect threw: ${errorMessage(error)}`, {
        level: "warn",
      });
      result = {
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
    if (current?.meta?.config !== config) {
      if (result.client.type === "connected")
        await mcpClientModule_2().detachAndCloseConnection(result.client);
      return;
    }
    let applyOutcome = applyMcpReconnect(host.stores, CLAUDE_CODE_REMOTE, result);
    switch (applyOutcome) {
      case "applied":
        if (result.client.type === "connected") logFeatureOk("bridge_meta_mcp_mount");
        else logFeatureBad("bridge_meta_mcp_mount", `settled_${result.client.type}`);
        return;
      case "superseded":
      case "dropped":
      case "refused":
        logFeatureSad("bridge_meta_mcp_mount", applyOutcome);
        return;
    }
  }
  function unmountMeta(meta) {
    updatePermissionSlice((slice) => replaceMcpMountRules(slice, meta.allowRules, "one"));
    let found = getAppState().mcp.clients.find((client) => client.name === CLAUDE_CODE_REMOTE);
    if (found && found.config !== meta.config) {
      if (
        serverCacheKey(CLAUDE_CODE_REMOTE, found.config) === serverCacheKey(CLAUDE_CODE_REMOTE, meta.config)
      )
        return Promise.resolve();
      return clearMetaCache(meta.config);
    }
    let mcpPrefix = getMcpPrefix(CLAUDE_CODE_REMOTE);
    setAppState((appState) => {
      let { [CLAUDE_CODE_REMOTE]: dropResource, ...restResources } = appState.mcp.resources;
      let { [CLAUDE_CODE_REMOTE]: dropTemplate, ...restTemplates } = appState.mcp.resourceTemplates;
      return {
        ...appState,
        mcp: {
          ...appState.mcp,
          clients: appState.mcp.clients.filter((client) => client !== found),
          tools: appState.mcp.tools.filter(
            (tool) => !isToolFromMcpServer(tool, CLAUDE_CODE_REMOTE, mcpPrefix),
          ),
          commands: appState.mcp.commands.filter(
            (command) => !commandBelongsToServer(command, CLAUDE_CODE_REMOTE),
          ),
          resources: restResources,
          resourceTemplates: restTemplates,
        },
      };
    });
    return clearMetaCache(meta.config);
  }
  function clearMetaCache(config) {
    return mcpClientModule_2()
      .clearServerCache(CLAUDE_CODE_REMOTE, config)
      .catch((error) => {
        logForDebugging(`[bridge:server-config] meta unmount cleanup failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
  }
  function undoCurrent() {
    let state = current;
    current = null;
    if (!state) return Promise.resolve();
    if (state.writtenPrompt !== undefined) {
      let currentPrompt = host.getAppendSystemPrompt();
      if (currentPrompt === state.writtenPrompt) host.setAppendSystemPrompt(state.hostAppendSystemPrompt);
      else {
        let hostAppendSystemPrompt = state.hostAppendSystemPrompt;
        let appendedSuffix = hostAppendSystemPrompt
          ? state.writtenPrompt.slice(hostAppendSystemPrompt.length)
          : `

${state.writtenPrompt}`;
        if (currentPrompt !== undefined && currentPrompt.endsWith(appendedSuffix))
          host.setAppendSystemPrompt(currentPrompt.slice(0, -appendedSuffix.length));
      }
    }
    pendingGrants = state.grants?.undo() ?? null;
    let teardown = Promise.all([
      state.meta ? unmountMeta(state.meta) : Promise.resolve(),
      state.hearth ? state.hearth.drop() : Promise.resolve(),
    ]).then(() => {
      return;
    });
    resolved = Promise.all([resolved, teardown]).then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    return teardown;
  }
  function factEntries(secret, sessionId) {
    if (!isBridgeServerSessionConfigEnabled()) return [];
    try {
      return applyBridgeServerArgs(
        {
          auto_mode_environment: decodeWorkSecret(secret).auto_mode_environment,
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
  function pickedModel(secret) {
    try {
      return carriedModel(decodeWorkSecret(secret).claude_code_args);
    } catch {
      return;
    }
  }
  function applyModelPick(sessionId, model) {
    if (model === undefined || (lastModelPick?.sessionId === sessionId && lastModelPick.model === model))
      return Promise.resolve();
    let pickResult;
    try {
      pickResult = host.applyModelPick(model);
    } catch (error) {
      logError(error);
      return Promise.resolve();
    }
    return Promise.resolve(pickResult)
      .then((outcome) => {
        if (outcome && !outcome.ok) {
          logFeatureSad("bridge_server_session_config", "model_pick_refused");
          logForDebugging(
            "[bridge:server-config] sdk-host lane model pick refused; the model in force stands",
            {
              level: "warn",
            },
          );
          return;
        }
        lastModelPick = {
          sessionId,
          model,
        };
        logForDebugging("[bridge:server-config] sdk-host lane model pick applied");
      })
      .catch(logError);
  }
  function pickedEffort(secret) {
    if (!isBridgeServerSessionConfigEnabled()) return;
    try {
      return carriedEffort(decodeWorkSecret(secret).claude_code_args);
    } catch {
      return;
    }
  }
  function seedEffort(sessionId, effort) {
    if (effort === undefined || (lastEffortSeed?.sessionId === sessionId && lastEffortSeed.effort === effort))
      return;
    let seedResult;
    try {
      seedResult = host.applyEffortSeed(effort);
    } catch (error) {
      logError(error);
      return;
    }
    if (!seedResult.ok) {
      logFeatureSad("bridge_server_session_config", "effort_pick_refused");
      logForDebugging("[bridge:server-config] sdk-host lane effort refused; the effort in force stands", {
        level: "warn",
      });
      return;
    }
    lastEffortSeed = {
      sessionId,
      effort,
    };
    logForDebugging("[bridge:server-config] sdk-host lane effort seeded");
  }
  function mountHearth(sessionId, getWorkerBearerToken, getWorkerEpoch, applyGate) {
    if (!getWorkerBearerToken) return null;
    let sessionUrl;
    try {
      sessionUrl = new URL(`/v1/code/sessions/${sessionId}`, getBridgeBaseUrl());
    } catch (error) {
      logForDebugging(`[bridge:server-config] reply mount skipped: ${errorMessage(error)}`, {
        level: "warn",
      });
      return null;
    }
    let headlessHearthMount = createHeadlessHearthMount({
      stores: host.stores,
      storageV5: host.storageV5,
      credentials: host.credentials,
      sessionId,
      apiBaseUrl: sessionUrl.origin,
      getBearerToken: getWorkerBearerToken,
      getWorkerEpoch: getWorkerEpoch ?? (() => 0),
      readHearthBinding: () =>
        CCRClient.readProjectsBindingFor(sessionUrl, () => {
          let token = getWorkerBearerToken();
          return token ? configureApiKeyHeaders(token) : {};
        }),
      sdkHostConfigs: host.sdkHostConfigs,
    });
    let gate = applyGate.then(() => host.awaitHostApplyQuiescence());
    return {
      mount: headlessHearthMount,
      gate,
      startup: gate.then(() => headlessHearthMount.sync("startup")),
    };
  }
  function startGrants(state, inheritLiftedFrom, modelApply) {
    let grantInputs = state.grantInputs;
    if (!grantInputs) return Promise.resolve();
    let generation = applyGeneration;
    let modeSeq = modeChoiceSequence;
    return fetchAttachSessionConfig({
      sessionId: grantInputs.sessionId,
      credentials: host.credentials,
      autoModeEnvironment: grantInputs.facts,
      permission,
      stillWanted: () => current === state && applyGeneration === generation,
      applyAfter: modelApply.then(host.settleAutoModeAvailability).then(() => {
        return;
      }, logError),
      inheritLiftedFrom,
      keepChosenMode: () =>
        inheritLiftedFrom !== null
          ? modeChoiceSequence !== modeSeq
          : chosenMode !== null && chosenMode !== "auto",
    })
      .then((attachSessionConfig) => {
        if (current === state && applyGeneration === generation) state.grants = attachSessionConfig;
        else attachSessionConfig.undo();
      })
      .catch(logError);
  }
  return {
    apply(workSecret, options) {
      let sessionId = resolveBridgeSessionId(workSecret, options.bridgeSessionId);
      undoCurrent();
      let previousResolved = resolved;
      let state = {
        hostAppendSystemPrompt: host.getAppendSystemPrompt(),
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
      current = state;
      let hearth = mountHearth(
        sessionId,
        options.getWorkerBearerToken,
        options.getWorkerEpoch,
        previousResolved,
      );
      if (hearth) {
        state.hearth = hearth.mount;
        state.hearthGate = hearth.gate;
        state.hearthStartup = hearth.startup;
      }
      let sessionEffort = getAppState().sessionEffort;
      let modelTask = applyModelPick(sessionId, pickedModel(workSecret))
        .then(() => {
          if (current === state && getAppState().sessionEffort === sessionEffort)
            seedEffort(sessionId, pickedEffort(workSecret));
        })
        .catch(logError);
      state.grantInputs = {
        sessionId,
        facts: factEntries(workSecret, sessionId),
      };
      let previousGrants = pendingGrants;
      pendingGrants = null;
      state.grantsSettled = startGrants(state, previousGrants, modelTask);
      applySdkHostLaneConfig(workSecret, {
        sessionId: options.bridgeSessionId,
        getAppendSystemPrompt: host.getAppendSystemPrompt,
        setAppendSystemPrompt: (prompt) => {
          host.setAppendSystemPrompt(prompt);
          state.writtenPrompt = prompt;
        },
        addDenyRules,
        mountMetaMcp: ({ url, autoAllowTools, sessionId }) => {
          state.meta = mountMeta(state, sessionId, url, autoAllowTools, options.getWorkerBearerToken);
          if (state.meta === null) return false;
          connectMeta(state.meta.config).catch(logError);
          return true;
        },
      });
    },
    undo: undoCurrent,
    loginChanged: (identity) => {
      let state = current;
      if (state && isSameOwnerCaseInsensitive(state.attachedAs, identity)) return;
      applyGeneration++;
      pendingGrants = null;
      if (state) {
        state.grants?.undo();
        state.grants = null;
        state.grantsSettled = null;
      }
    },
    noteModeChoice: (mode) => {
      if (applyingPermission) return;
      modeChoiceSequence++;
      chosenMode = mode;
      pendingGrants = null;
    },
    projectsReplyMount: () => current?.hearth ?? null,
    resyncProjectsReplyMount: () => {
      let state = current;
      let hearth = state?.hearth;
      if (!state || !hearth) return;
      state.hearthGate.then(() => hearth.sync("binding_changed"));
    },
    takeFirstTurnJoins: () => {
      if (!current)
        return {
          replyMount: null,
          grants: null,
        };
      let pending = {
        replyMount: current.hearthStartup,
        grants: current.grantsSettled,
      };
      current.hearthStartup = null;
      current.grantsSettled = null;
      return pending;
    },
  };
}
export { createHeadlessWorkSecretSession };
