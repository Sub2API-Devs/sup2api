/**
 * entrypoints/init.ts
 *
 * init()：启用配置、远程设置与凭证、安全环境变量与 CA、OAuth、优雅退出、1P 事件、mTLS/代理、预连接、上游代理、配置错误处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/init.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-vbtpanx5.js (19), chunk-xdkvf45x.js (1)
 * attribution: placement 8, affinity 1, fingerprint 2, layout 5, facade-exports 5
 */
import { NO_CORE_AT_CHAIN_BOTTOM } from "../plugins/functionHooks/eventCatalog.js";
import { identity } from "../utils/identity.js";
import { getPluginRegistry } from "../utils/plugins/pluginLoadState.js";
import { hasCurrentDispatch } from "../plugins/functionHooks/dispatch/chain.js";
import { modulesHookingEvent } from "../plugins/functionHooks/hookDispatch.js";
import { hasLink } from "../utils/hasLink.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, CliUserError, ConfigParseError } from "../utils/errors.js";
import { eventRecordQueue } from "../utils/telemetry/thirdPartyEventRecords.js";
import { isHttpMcpServeInvocation } from "./mcpServeArgs.js";
import { toolServerEnvAccessor } from "../utils/subprocessEnvLoader.js";
import {
  markDescriptorAnnouncementConsumed,
  getSessionCounter,
  getSessionStartType,
  getRootSession,
  setGatewayRequiredByHostPolicyReader,
  getSessionId,
  getGatewayAuth,
  onSessionSwitch,
  getIsNonInteractiveSession,
  isOTelInitPending,
  discardPendingOTelEvents,
  rootSession,
} from "../bootstrap/state.js";
import { disableCoreDumps } from "../utils/processHardening.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { readFromInheritedDescriptor } from "../utils/authFileDescriptor.js";
import { managedSettingsAskState, hasManagedSettingsCached } from "../cli/headlessCloud/attachServe.js";
import { managedMarketplaceAnswerFlag } from "../utils/plugins/marketplaceNames.js";
import { logError } from "../utils/log.js";
import {
  onGrowthBookRefresh,
  setGrowthBookCredentials,
  setGrowthBookStorageBackend,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import {
  notifyOrganizationAsking,
  notifyOrganizationAskingForced,
} from "../utils/settings/policyHelper/helperRemote.js";
import {
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  getPolicyHelperSourceLoadErrors,
  getSettingsForSource,
} from "../utils/settings/settings.js";
import { settingsChangeDetector } from "../utils/settings/changeDetector.js";
import { getTelemetryAttributes } from "../utils/telemetryAttributes.js";
import { initRepositoryAttributes } from "../utils/telemetry/repositoryAttributes.js";
import { HostScoped } from "../utils/hostScoped.js";
import { readSessionTunnelInput } from "./sessionTunnelInput.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { profileCheckpoint } from "../utils/startupProfiler.js";
import { isSameConfigDir, isEnvTruthy } from "../utils/envUtils.js";
import { pinStorageV5FromEnv } from "../utils/storage/storageV5EnvPin.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { primeWorkspaceRoots } from "../utils/workspaceRoots.js";
import {
  enableConfigs,
  getGlobalConfig,
  watchGlobalConfigThroughStorage,
  checkHasTrustDialogAccepted,
  recordFirstStartTime,
  getOrCreateMachineID,
  getOrCreateUserID,
} from "../utils/config.js";
import { seedUserSettings, primeSettings } from "../utils/settings/settingsPrime.js";
import { commandSyncNameState } from "../utils/settings/commandSyncNames.js";
import { primeWindowsCredManBackendEnabled } from "../utils/secureStorage/index.js";
import { primeRemoteManagedSettingsCache } from "../services/remoteManagedSettings/remoteSettingsCache.js";
import { credentialsStoreFor } from "../utils/secureStorage/credentialsFileStore.js";
import { primeFileDescriptorCredentials } from "../utils/fileDescriptorCredentials.js";
import {
  primeStoredLoginCopy,
  restoreGatewayAuth,
  startupReadsStoredLogin,
  primeStoredLogin,
} from "../utils/auth.js";
import { withoutHostManagedProviderVars } from "../utils/managedEnv.js";
import { env, primeEnvProbe } from "../utils/env.js";
import { writeStartupFailureResult } from "../cli/startupFailureResult.js";
import {
  applySafeConfigEnvironmentVariables,
  applyConfigEnvironmentVariables,
  putBackUnsuppliedTelemetryEnv,
} from "../utils/managedEnvApply.js";
import { assertScrubSandboxAvailable } from "../utils/subprocessEnv.js";
import { applyExtraCACertsFromConfig } from "../utils/caCertsConfig.js";
import { loadExtraCACerts } from "../utils/caCerts.js";
import { loadMTLSClientMaterial, configureGlobalMTLS } from "../utils/mtls.js";
import { primePlatform, getPlatform } from "../utils/platform.js";
import { loadHostCredentials } from "../utils/hostCredsFile.js";
import { isProviderManagedByHost } from "../utils/entrypointKinds.js";
import { configureProxyAuthHelperFromSettings } from "../utils/auth/proxyAuthHelperConfig.js";
import { resetRemoteSettingsSyncCache } from "../services/cloudSessions/eligibility.js";
import { pinStorageV5 } from "../utils/storage/pinStorageV5.js";
import { latchSettingsGateSettled } from "../utils/settings/settingsSourceTrust.js";
import { primeWIFProfileFiles } from "../utils/wifProfile.js";
import {
  composePolicyLimitsClient,
  primePolicyLimitsCache,
  initializePolicyLimitsLoadingPromise,
  registerManagedConfigPrefetchEnabledReader,
  prefetchPolicyLimits,
} from "../services/policyLimits/PolicyLimitsClient.js";
import { installUsageExitFlush } from "../utils/telemetry/pluginTelemetry.js";
import { setupGracefulShutdown, gracefulShutdownSync } from "../utils/gracefulShutdown.js";
import { populateOAuthAccountInfoIfNeeded } from "../services/oauth/client.js";
import { primePlanSlugCollisions } from "../utils/plans.js";
import { setRepoDetectionGuards, primeCurrentRepository } from "../utils/detectRepository.js";
import {
  isEligibleForRemoteManagedSettings,
  initializeRemoteManagedSettingsLoadingPromise,
  prefetchRemoteManagedSettings,
  waitForRemoteManagedSettingsFetchToSettle,
} from "../services/remoteManagedSettings/loader.js";
import { isPolicyLimitsEligible } from "../services/policyLimits/policyState.js";
import {
  getProxyUrlWithSource,
  parseProxyUrl,
  describeInvalidProxyUrl,
  configureGlobalAgents,
  clearProxyCache,
} from "../utils/proxy.js";
import { isManagedConfigPrefetchEnabled } from "../services/remoteManagedSettings/index.js";
import { preconnectAnthropicApi } from "../utils/apiPreconnect.js";
import { recordPhase } from "../utils/startupTiming.js";
import { setShellIfWindows } from "../utils/windowsPaths.js";
import {
  isBashAvailable,
  isPowerShellToolEnabled,
  WINDOWS_SHELL_REQUIRED_TEXT,
} from "../utils/shell/shellToolUtils.js";
import { getCachedPowerShellPath } from "../utils/shell/powershellDetection.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { shutdownLspServerManager } from "../services/lsp/manager.js";
import { isScratchpadEnabled, ensureScratchpadDir } from "../utils/permissions/filesystem.js";
import { registerConversationResetHook } from "../services/api/streamFallbackWarning.js";
import { clearPromptCacheOnSessionSwitch } from "../services/api/promptCacheBreakDetection.js";
import { watchSessionSwitchForThinkingKeep } from "../services/api/claude.js";
import { isBetaTracingEnabled } from "../utils/telemetry/betaSessionTracing.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { pendingVerificationState } from "../services/api/verificationRequired.js";

//@ chunk-vbtpanx5.js:2848-2972 placement
/**
 * 以 telemetry.log 调用插件链底端的默认实现。
 */
function logPluginTelemetry(e, r) {
  return NO_CORE_AT_CHAIN_BOTTOM("telemetry.log", {
    origin: r?.hookOrigin,
    signal: r?.signal,
    ...(r?.engineRaised && {
      engineRaised: true,
    }),
  })(e);
}
//@ chunk-vbtpanx5.js:2972-3422 placement
var CC_PLUGIN_TELEMETRY = "cc-plugin-telemetry";
var lookupFaultSignal = identity(
  {
    lookupFault: false,
  },
  (e) => {
    e.lookupFault = false;
  },
);
var relayTelemetryHooks = {
  send: (e, signal, hookOrigin) =>
    logPluginTelemetry(e, {
      signal,
      hookOrigin,
      engineRaised: true,
    }),
  isWatched: (e) => {
    try {
      return (
        getPluginRegistry().hooksRespawns.size > 0 ||
        hasCurrentDispatch() ||
        !modulesHookingEvent("telemetry.log", e).every((r) => r.name === CC_PLUGIN_TELEMETRY && hasLink(r))
      );
    } catch (error) {
      if (!lookupFaultSignal.lookupFault) {
        lookupFaultSignal.lookupFault = true;
        logForDebugging(
          `[3P telemetry] Could not tell whether a hook watches telemetry.log, so event records are built while this fails: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      }
      return true;
    }
  },
};
//@ chunk-vbtpanx5.js:3422-3437 placement
eventRecordQueue.setRoad(relayTelemetryHooks);
//@ chunk-vbtpanx5.js:3437-4407 placement
/**
 * http 方式 mcp serve 启动时从 CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR 指定的继承描述符读出代理中继 token（先关闭核心转储；描述符非法或存在 IPC 通道时拒绝），并从环境变量中删除该键。
 */
function readAgentProxyRelayToken() {
  {
    if (!isHttpMcpServeInvocation()) return;
    let tokenFd = toolServerEnvAccessor.CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR;
    toolServerEnvAccessor.unset("CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR");
    if (tokenFd === undefined) return;
    if (tokenFd.trim()) markDescriptorAnnouncementConsumed("CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR");
    let warn = (p) =>
      logForDebugging(`[agent-proxy] ${p}`, {
        level: "warn",
      });
    disableCoreDumps(warn);
    if (!/^[1-9][0-9]{0,5}$/.test(tokenFd) || Number(tokenFd) < 3) {
      warn(
        "CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR is not a descriptor number of 3 or more; no relay token was read",
      );
      logFeatureBad("agent_proxy_init", "agent_proxy_init_token_fd_malformed");
      return;
    }
    if (typeof process.send === "function") {
      warn(
        "this process has an IPC channel, which no launcher of a tool daemon opens; no relay token was read",
      );
      logFeatureBad("agent_proxy_init", "agent_proxy_init_token_fd_ipc");
      return;
    }
    let f = readFromInheritedDescriptor(Number(tokenFd), "agent proxy relay's token");
    if (f === null) {
      warn(
        "the relay's token was announced but not read (the line above says why); if its descriptor was empty, something else may have read it first",
      );
      logFeatureBad("agent_proxy_init", "agent_proxy_init_token_fd_unread");
      return;
    }
    return f;
  }
  return;
}
//@ chunk-vbtpanx5.js:4407-4590 placement
/**
 * 启动时确定组织 ask 状态并订阅 GrowthBook 刷新；失败时记录错误。
 */
function initOrganizationAsk() {
  if (managedSettingsAskState.asks !== undefined) return;
  managedSettingsAskState.asks = managedMarketplaceAnswerFlag;
  try {
    syncOrganizationAskPolicy();
  } catch (error) {
    logForDebugging("organization ask: not settled at start-up; settings reads go by the launch alone", {
      level: "error",
    });
    logError(error);
  }
  onGrowthBookRefresh(syncOrganizationAskPolicy);
}
//@ chunk-vbtpanx5.js:4590-4813 placement
/**
 * 组织 ask 状态变化时重新应用策略设置并通知 policySettings 变更。
 */
function syncOrganizationAskPolicy() {
  let e = hasManagedSettingsCached();
  let told = managedSettingsAskState.told;
  if (told !== undefined && told !== e) {
    if (e)
      notifyOrganizationAsking(() => ({
        settings: getBasePolicySettings(),
        origin: getBasePolicySettingsOrigin(),
        loadErrors: getPolicyHelperSourceLoadErrors(),
      }));
    else
      notifyOrganizationAskingForced(() => ({
        settings: getBasePolicySettings(),
        origin: getBasePolicySettingsOrigin(),
        loadErrors: getPolicyHelperSourceLoadErrors(),
      }));
    settingsChangeDetector.notifyChange("policySettings");
  }
  managedSettingsAskState.told = e;
}
//@ chunk-vbtpanx5.js:5265-5329 affinity
function isPrometheusOnly(metricsExporterKinds) {
  return metricsExporterKinds.length > 0 && metricsExporterKinds.every((r) => r === "prometheus");
}
//@ chunk-vbtpanx5.js:5329-5626 fingerprint = setMeterState (0.423)
/**
 * 初始化 OTel meter 并安装 claude_code.* 计数器到 telemetryHandles。
 */
async function setMeterState(e, r) {
  let { initializeTelemetry } = await import("./chunk-9vvvg0d3.js");
  let { meter, metricsExporterKinds } = await initializeTelemetry(e, r);
  if (meter) {
    installTelemetryMeter(
      meter,
      (name, options) => {
        let counter = meter?.createCounter(name, options);
        return {
          add(value, additionalAttributes = {}) {
            let mergedAttributes = {
              ...getTelemetryAttributes(),
              ...additionalAttributes,
            };
            counter?.add(value, mergedAttributes);
          },
        };
      },
      {
        omitUnits: isPrometheusOnly(metricsExporterKinds),
      },
    );
    await initRepositoryAttributes();
    getSessionCounter()?.add(1, {
      start_type: getSessionStartType(),
    });
  }
}
//@ chunk-vbtpanx5.js:5626-5694 layout
class InitState {
  promise = undefined;
  telemetryInitialized = false;
  telemetryInit = undefined;
}
//@ chunk-vbtpanx5.js:5694-5717 layout
var initStateSlot = new HostScoped(() => new InitState());
//@ chunk-vbtpanx5.js:5717-5752 layout
function getInitState() {
  return initStateSlot.of(getRootSession().host);
}
//@ chunk-vbtpanx5.js:5752-10681 fingerprint = init (0.6)
/**
 * init 本体：启用配置（v5 存储后端/远程设置预热/fd 凭证）、standalone 代理中继、应用安全环境变量与 CA、OAuth 账户信息、优雅退出注册、1P 事件日志、mTLS 与全局代理、预连 Anthropic API、CCR 代理（CLAUDE_CODE_REMOTE）、Windows shell 检查、scratchpad 目录；配置错误时弹 InvalidConfig 对话框或退出。
 */
async function initImpl(e = {}) {
  let agentProxyRelayToken = readAgentProxyRelayToken();
  let toolContainerToken = readSessionTunnelInput() ?? agentProxyRelayToken;
  let initStartTime = Date.now();
  logForDiagnosticsNoPII("info", "init_started");
  profileCheckpoint("init_function_start");
  let storageV5EnvPin = e.storageV5EnvPin;
  if (storageV5EnvPin?.backend !== undefined && !isSameConfigDir(storageV5EnvPin.configHome)) {
    logForDebugging(
      `CLAUDE_CONFIG_DIR no longer names ${storageV5EnvPin.configHome}, where the v5 storage backend was built at start-up; init() loads its config without it`,
      {
        level: "warn",
      },
    );
    storageV5EnvPin = {
      ...storageV5EnvPin,
      backend: undefined,
    };
  }
  storageV5EnvPin ??= pinStorageV5FromEnv();
  try {
    let configsStart = Date.now();
    if (isStorageV5Enabled() && storageV5EnvPin?.backend !== undefined) {
      await primeWorkspaceRoots(storageV5EnvPin.backend);
      await Promise.all([
        enableConfigs(storageV5EnvPin.backend),
        seedUserSettings(storageV5EnvPin.backend, commandSyncNameState()),
      ]);
    } else await enableConfigs();
    logForDiagnosticsNoPII("info", "init_configs_enabled", {
      duration_ms: Date.now() - configsStart,
    });
    profileCheckpoint("init_configs_enabled");
    if (isStorageV5Enabled() && storageV5EnvPin?.backend !== undefined)
      primeWindowsCredManBackendEnabled(
        getGlobalConfig().cachedGrowthBookFeatures?.tengu_windows_credman === true,
      );
    if (isStorageV5Enabled() && storageV5EnvPin?.backend !== undefined) {
      await primeRemoteManagedSettingsCache(storageV5EnvPin.backend);
      profileCheckpoint("init_remote_settings_primed");
    }
    let g = credentialsStoreFor(storageV5EnvPin?.backend);
    if (isStorageV5Enabled() && g !== undefined) {
      await primeFileDescriptorCredentials(g);
      profileCheckpoint("init_fd_credentials_primed");
      await primeStoredLoginCopy(g);
      profileCheckpoint("init_stored_login_primed");
    }
    setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars);
    if (env.CCR_AGENT_PROXY_RELAY_MODE !== undefined) {
      let { startAgentProxyStandaloneRelay } = await import("./chunk-13wgf40r.js");
      let agentProxyStandaloneRelay = await startAgentProxyStandaloneRelay();
      if (agentProxyStandaloneRelay.kind === "failed") {
        console.error(agentProxyStandaloneRelay.message);
        if (agentProxyStandaloneRelay.cause === "url")
          await writeStartupFailureResult({
            sessionId: getSessionId(),
            message: agentProxyStandaloneRelay.message,
            reason: "proxy_invalid",
          });
        process.exit(1);
      }
    }
    let envVarsStart = Date.now();
    applySafeConfigEnvironmentVariables();
    await assertScrubSandboxAvailable();
    applyExtraCACertsFromConfig();
    await Promise.all([loadExtraCACerts(), loadMTLSClientMaterial(), primePlatform(), primeEnvProbe()]);
    await loadHostCredentials();
    if (isProviderManagedByHost()) configureProxyAuthHelperFromSettings();
    await restoreGatewayAuth(
      storageV5EnvPin?.backend !== undefined && isSameConfigDir(storageV5EnvPin.configHome) ? g : undefined,
    );
    if (getGatewayAuth()) resetRemoteSettingsSyncCache();
    logForDiagnosticsNoPII("info", "init_safe_env_vars_applied", {
      duration_ms: Date.now() - envVarsStart,
    });
    profileCheckpoint("init_safe_env_vars_applied");
    let a = pinStorageV5(storageV5EnvPin);
    latchSettingsGateSettled();
    let u = credentialsStoreFor(a);
    if (isStorageV5Enabled() && a !== undefined) await primeWorkspaceRoots(a);
    await primeSettings(a, commandSyncNameState());
    if (isStorageV5Enabled() && a !== undefined) await primeWIFProfileFiles(a);
    composePolicyLimitsClient({
      storageV5: a,
      credentials: u,
    });
    setGrowthBookCredentials(u);
    setGrowthBookStorageBackend(a);
    if (isStorageV5Enabled() && u !== undefined) {
      await primeFileDescriptorCredentials(u);
      if (startupReadsStoredLogin()) await primeStoredLogin(u);
    }
    await primePolicyLimitsCache(a);
    watchGlobalConfigThroughStorage(a);
    installUsageExitFlush(a);
    setupGracefulShutdown({
      storageV5: a,
      credentials: u,
    });
    profileCheckpoint("init_after_graceful_shutdown");
    Promise.all([import("./chunk-3x77zjqp.js"), import("./chunk-6df1d6re.js")]).then(([o, gb]) => {
      o.initialize1PEventLogging(a);
      gb.onGrowthBookRefresh(() => {
        o.reinitialize1PEventLoggingIfConfigChanged();
      });
    });
    profileCheckpoint("init_after_1p_event_logging");
    initOrganizationAsk();
    let h =
      e.preparesSession !== false ||
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_quizzical_giraffe", false) !== true;
    trackPendingInit(populateOAuthAccountInfoIfNeeded(u, a, h)).catch(logError);
    profileCheckpoint("init_after_oauth_populate");
    primePlanSlugCollisions(a);
    import("./chunk-6dhh43sn.js").then((o) => o.primeUnattendedServingConsent()).catch(() => {});
    setRepoDetectionGuards({
      trustProbe: checkHasTrustDialogAccepted,
    });
    primeCurrentRepository();
    if (isEligibleForRemoteManagedSettings()) initializeRemoteManagedSettingsLoadingPromise();
    if (isPolicyLimitsEligible()) initializePolicyLimitsLoadingPromise();
    profileCheckpoint("init_after_remote_settings_check");
    recordFirstStartTime(a);
    getOrCreateMachineID(a);
    if (isStorageV5Enabled() && a !== undefined) getOrCreateUserID(a);
    let mtlsStart = Date.now();
    logForDebugging("[init] configureGlobalMTLS starting");
    configureGlobalMTLS();
    logForDiagnosticsNoPII("info", "init_mtls_configured", {
      duration_ms: Date.now() - mtlsStart,
    });
    logForDebugging("[init] configureGlobalMTLS complete");
    let proxyUrlWithSource = getProxyUrlWithSource();
    if (proxyUrlWithSource && !parseProxyUrl(proxyUrlWithSource.value)) {
      let o = describeInvalidProxyUrl(proxyUrlWithSource.source, proxyUrlWithSource.value);
      await writeStartupFailureResult({
        sessionId: getSessionId(),
        message: o,
        reason: "proxy_invalid",
      });
      throw new CliUserError(o);
    }
    let proxyStart = Date.now();
    logForDebugging("[init] configureGlobalAgents starting");
    configureGlobalAgents();
    logForDiagnosticsNoPII("info", "init_proxy_configured", {
      duration_ms: Date.now() - proxyStart,
    });
    logForDebugging("[init] configureGlobalAgents complete");
    profileCheckpoint("init_network_configured");
    registerManagedConfigPrefetchEnabledReader(isManagedConfigPrefetchEnabled);
    if (e.prefetchManagedConfig === true && h && isManagedConfigPrefetchEnabled())
      try {
        prefetchRemoteManagedSettings(u);
        prefetchPolicyLimits();
      } catch {
        logError(Error("a managed-config prefetch threw in init(); start-up went on without it"));
      }
    preconnectAnthropicApi();
    e.startupGrowthBookKick?.();
    e.startClientDataUrlFetch?.();
    if (isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
      let startTime = performance.now();
      try {
        let { initAgentProxy, getAgentProxyEnv, getGhStandinDir } = await import("./chunk-j9e5zgt8.js");
        let { registerAgentProxyEnvFn, registerGhStandinDirFn } = await import("./chunk-1vnf3c6f.js");
        registerAgentProxyEnvFn(getAgentProxyEnv);
        registerGhStandinDirFn(getGhStandinDir);
        await initAgentProxy({
          toolContainerToken,
        });
      } catch (err) {
        logForDebugging(
          `[init] agent proxy init failed: ${err instanceof Error ? err.message : String(err)}; continuing without proxy`,
          {
            level: "warn",
          },
        );
      }
      recordPhase("agent_proxy_init_ms", performance.now() - startTime, startTime);
    }
    setShellIfWindows();
    if (getPlatform() === "windows" && !isBashAvailable()) {
      if (!isPowerShellToolEnabled()) {
        let s = `Claude Code on Windows requires a shell tool. Git Bash was not found and the PowerShell tool is disabled (CLAUDE_CODE_USE_POWERSHELL_TOOL=0).
  - Install Git for Windows: https://git-scm.com/downloads/win, or
  - Remove CLAUDE_CODE_USE_POWERSHELL_TOOL from your environment or settings.`;
        console.error(s);
        await writeStartupFailureResult({
          sessionId: getSessionId(),
          message: s,
          reason: "shell_tool_missing",
        });
        process.exit(1);
      }
      if ((await getCachedPowerShellPath()) === null) {
        console.error(WINDOWS_SHELL_REQUIRED_TEXT);
        await writeStartupFailureResult({
          sessionId: getSessionId(),
          message: WINDOWS_SHELL_REQUIRED_TEXT,
          reason: "shell_tool_missing",
        });
        process.exit(1);
      }
    }
    registerCleanup(shutdownLspServerManager);
    registerCleanup(async () => {
      let { cleanupSessionTeams } = await import("./chunk-brc6p73m.js");
      await cleanupSessionTeams(a);
    });
    if (isScratchpadEnabled()) {
      let scratchpadStart = Date.now();
      try {
        let scratchpadDir = await ensureScratchpadDir();
        logForDiagnosticsNoPII(
          "info",
          scratchpadDir === null ? "init_scratchpad_unavailable" : "init_scratchpad_created",
          {
            duration_ms: Date.now() - scratchpadStart,
          },
        );
      } catch (error) {
        logForDebugging(`init: ensureScratchpadDir failed: ${error}`, {
          level: "error",
        });
      }
    }
    onSessionSwitch(() => {
      if (isScratchpadEnabled())
        ensureScratchpadDir().catch((error) =>
          logForDebugging(`onSessionSwitch: ensureScratchpadDir failed: ${error}`, {
            level: "error",
          }),
        );
    });
    registerConversationResetHook();
    clearPromptCacheOnSessionSwitch();
    watchSessionSwitchForThinkingKeep();
    logForDiagnosticsNoPII("info", "init_completed", {
      duration_ms: Date.now() - initStartTime,
    });
    profileCheckpoint("init_function_end");
    return a;
  } catch (error) {
    if (error instanceof CliUserError) {
      process.stderr.write(`${error.message}
`);
      gracefulShutdownSync(1);
      return;
    }
    if (error instanceof ConfigParseError) {
      if (!getIsNonInteractiveSession() && e.showInvalidConfigDialog) {
        await e.showInvalidConfigDialog({
          error,
        });
        return;
      }
      process.stderr.write(`Configuration error in ${error.filePath}: ${error.message}
`);
      gracefulShutdownSync(1);
      return;
    } else throw error;
  }
}
//@ chunk-vbtpanx5.js:10681-10723 facade-exports
/**
 * init() 的记忆化包装：同一 host 只执行一次 initImpl，返回同一个 Promise（导出名 init）。
 */
function init(e) {
  return (getInitState().promise ??= initImpl(e));
}
//@ chunk-vbtpanx5.js:10723-11549 facade-exports = initializeTelemetryAfterTrust (0.505)
/**
 * 信任建立后初始化 OpenTelemetry：需要等待远程托管设置时延后到其完成，否则立即初始化（只做一次）。
 */
function initializeTelemetryAfterTrust(storageV5) {
  let initState = getInitState();
  if (isEligibleForRemoteManagedSettings()) {
    if (getIsNonInteractiveSession() && isBetaTracingEnabled())
      initializeTelemetryOnce(initState, storageV5).catch((error) => {
        try {
          logForDebugging(
            `[3P telemetry] Eager telemetry init failed (beta tracing): ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        } catch {}
      });
    logForDebugging("[3P telemetry] Waiting for remote managed settings fetch before telemetry init");
    waitForRemoteManagedSettingsFetchToSettle()
      .then(async () => {
        logForDebugging("[3P telemetry] Remote managed settings fetch settled, initializing telemetry");
        applyConfigEnvironmentVariables();
        let { captureAdmin3PSteeringSnapshot } = await import("./chunk-kva132ev.js");
        captureAdmin3PSteeringSnapshot();
        let [extraCACerts, mtlsClientMaterial] = await Promise.all([
          loadExtraCACerts(),
          loadMTLSClientMaterial(),
        ]);
        if (extraCACerts || mtlsClientMaterial.changed) {
          clearProxyCache();
          configureGlobalAgents();
        }
        await initializeTelemetryOnce(initState, storageV5);
      })
      .catch((error) => {
        if (isOTelInitPending() && !initState.telemetryInitialized)
          discardPendingOTelEvents(
            isOtlpLogsConfigured() || isOtlpLogsConfiguredByPolicy() ? "init_failed" : "not_configured",
          );
        try {
          logForDebugging(
            `[3P telemetry] Telemetry init failed (remote settings path): ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        } catch {}
      });
  } else
    initializeTelemetryOnce(initState, storageV5).catch((error) => {
      try {
        logForDebugging(`[3P telemetry] Telemetry init failed: ${errorMessage(error)}`, {
          level: "error",
        });
      } catch {}
    });
}
//@ chunk-vbtpanx5.js:11549-11895 layout
async function initializeTelemetryOnce(initState, r, f) {
  if (initState.telemetryInitialized) return initState.telemetryInit;
  initState.telemetryInitialized = true;
  initState.telemetryInit = (async () => {
    let p = "not_configured";
    try {
      if (
        readFlagWithOverride("tengu_typed_treasure", {
          safe: true,
        })
      )
        putBackUnsuppliedTelemetryEnv();
      await setMeterState(r, f);
    } catch (error) {
      initState.telemetryInitialized = false;
      initState.telemetryInit = undefined;
      if (isOtlpLogsConfigured()) p = "init_failed";
      throw error;
    } finally {
      discardPendingOTelEvents(p);
    }
  })();
  return initState.telemetryInit;
}
//@ chunk-vbtpanx5.js:11895-11931 facade-exports
/**
 * 退出前确保遥测已初始化（供 flush 用）。
 */
function initializeTelemetryForExit() {
  return initializeTelemetryOnce(getInitState(), undefined);
}
//@ chunk-vbtpanx5.js:11931-12034 layout
function hasNonNoneExporter(e) {
  return (e || "")
    .trim()
    .split(",")
    .filter(Boolean)
    .map((r) => r.trim())
    .some((r) => r !== "none");
}
//@ chunk-vbtpanx5.js:12034-12126 facade-exports
function isOtlpLogsConfigured() {
  return isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY) && hasNonNoneExporter(env.OTEL_LOGS_EXPORTER);
}
//@ chunk-vbtpanx5.js:12126-12349 facade-exports
function isOtlpLogsConfiguredByPolicy() {
  try {
    let env_2 = getSettingsForSource("policySettings")?.env;
    if (!env_2) return false;
    return (
      (isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY) ||
        isEnvTruthy(env_2.CLAUDE_CODE_ENABLE_TELEMETRY)) &&
      (hasNonNoneExporter(env.OTEL_LOGS_EXPORTER) || hasNonNoneExporter(env_2.OTEL_LOGS_EXPORTER))
    );
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:289694-289820 placement
/**
 * 记录进行中的初始化 Promise（完成后清除），原样返回该 Promise。
 */
function trackPendingInit(e) {
  let n = e.then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  pendingVerificationState.pending = n;
  n.then(() => {
    if (pendingVerificationState.pending === n) pendingVerificationState.pending = null;
  });
  return e;
}
//@ chunk-xdkvf45x.js:226-295 placement
/**
 * 函数 installTelemetryMeter（安装遥测 meter）；位于「new in 2.1.316 (2.1.88 has no file at this path)」模块。
 */
function installTelemetryMeter(meter, r, o = {}) {
  rootSession().host.telemetryHandles.installMeter(meter, r, o);
}
export {
  initializeTelemetryAfterTrust,
  init,
  initializeTelemetryForExit,
  isOtlpLogsConfigured,
  isOtlpLogsConfiguredByPolicy,
};
