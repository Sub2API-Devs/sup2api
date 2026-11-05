/**
 * entrypoints/init.ts
 *
 * init()：启用配置、远程设置与凭证、安全环境变量与 CA、OAuth、优雅退出、1P 事件、mTLS/代理、预连接、上游代理、配置错误处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/init.ts
 * pieces: chunk-exfmq47h.js (1), chunk-f798ahhj.js (1), chunk-fxk1e28j.js (19)
 * attribution: placement 8, affinity 1, fingerprint 2, layout 5, facade-exports 5
 */
import { pendingVerificationState } from "../services/api/verificationRequired.js";
import {
  rootSession,
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
} from "../bootstrap/state.js";
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
  leaveUnparseableGlobalConfigAlone,
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
import { env, primeEnvProbe, getGlobalClaudeFile } from "../utils/env.js";
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
  waitForPolicyLimitsToLoad,
  initializePolicyLimitsLoadingPromise,
  prefetchPolicyLimits,
} from "../services/policyLimits/PolicyLimitsClient.js";
import { installUsageExitFlush } from "../utils/telemetry/pluginTelemetry.js";
import { setupGracefulShutdown, gracefulShutdown } from "../utils/gracefulShutdown.js";
import { isPolicyVerdictAbsent } from "../services/policyLimits/policyEvidence.js";
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
import { registerManagedConfigPrefetchEnabledReader } from "../services/policyLimits/prefetchToggle.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:299317-299443 placement
/**
 * 记录进行中的初始化 Promise（完成后清除），原样返回该 Promise。
 */
function trackPendingInit(promise) {
  let tracked = promise.then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  pendingVerificationState.pending = tracked;
  tracked.then(() => {
    if (pendingVerificationState.pending === tracked) pendingVerificationState.pending = null;
  });
  return promise;
}
//@ chunk-f798ahhj.js:226-295 placement
/**
 * 函数 installTelemetryMeter（安装遥测 meter）；位于「new in 2.1.316 (2.1.88 has no file at this path)」模块。
 */
function installTelemetryMeter(meter, createCounter, options = {}) {
  rootSession().host.telemetryHandles.installMeter(meter, createCounter, options);
}
//@ chunk-fxk1e28j.js:2860-2984 placement
/**
 * 以 telemetry.log 调用插件链底端的默认实现。
 */
function logPluginTelemetry(event, options) {
  return NO_CORE_AT_CHAIN_BOTTOM("telemetry.log", {
    origin: options?.hookOrigin,
    signal: options?.signal,
    ...(options?.engineRaised && {
      engineRaised: true,
    }),
  })(event);
}
//@ chunk-fxk1e28j.js:2984-3434 placement
var CC_PLUGIN_TELEMETRY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var lookupFaultSignal;
var relayTelemetryHooks;
deferInit("chunk-fxk1e28j.js:2984", () => {
  CC_PLUGIN_TELEMETRY = "cc-plugin-telemetry";
  lookupFaultSignal = identity(
    {
      lookupFault: false,
    },
    (signal) => {
      signal.lookupFault = false;
    },
  );
  relayTelemetryHooks = {
    send: (event, signal, hookOrigin) =>
      logPluginTelemetry(event, {
        signal,
        hookOrigin,
        engineRaised: true,
      }),
    isWatched: (event) => {
      try {
        return (
          getPluginRegistry().hooksRespawns.size > 0 ||
          hasCurrentDispatch() ||
          !modulesHookingEvent("telemetry.log", event).every(
            (hook) => hook.name === CC_PLUGIN_TELEMETRY && hasLink(hook),
          )
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
});
//@ chunk-fxk1e28j.js:3434-3449 placement
// deferred: uses eventRecordQueue (../utils/telemetry/thirdPartyEventRecords.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fxk1e28j.js:3434", () => {
  eventRecordQueue.setRoad(relayTelemetryHooks);
});
//@ chunk-fxk1e28j.js:3449-4419 placement
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
    let warn = (message) =>
      logForDebugging(`[agent-proxy] ${message}`, {
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
    let token = readFromInheritedDescriptor(Number(tokenFd), "agent proxy relay's token");
    if (token === null) {
      warn(
        "the relay's token was announced but not read (the line above says why); if its descriptor was empty, something else may have read it first",
      );
      logFeatureBad("agent_proxy_init", "agent_proxy_init_token_fd_unread");
      return;
    }
    return token;
  }
  return;
}
//@ chunk-fxk1e28j.js:4419-4602 placement
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
//@ chunk-fxk1e28j.js:4602-4825 placement
/**
 * 组织 ask 状态变化时重新应用策略设置并通知 policySettings 变更。
 */
function syncOrganizationAskPolicy() {
  let managedSettingsPresent = hasManagedSettingsCached();
  let told = managedSettingsAskState.told;
  if (told !== undefined && told !== managedSettingsPresent) {
    if (managedSettingsPresent)
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
  managedSettingsAskState.told = managedSettingsPresent;
}
//@ chunk-fxk1e28j.js:5277-5341 affinity
function isPrometheusOnly(metricsExporterKinds) {
  return metricsExporterKinds.length > 0 && metricsExporterKinds.every((kind) => kind === "prometheus");
}
//@ chunk-fxk1e28j.js:5341-5638 fingerprint (2.1.88 match: setMeterState, 0.423)
/**
 * 初始化 OTel meter 并安装 claude_code.* 计数器到 telemetryHandles。
 */
async function setMeterState(config, credentials) {
  let { initializeTelemetry } = await import("../utils/telemetry/bigQueryExportIntervalMs.lazy.js");
  let { meter, metricsExporterKinds } = await initializeTelemetry(config, credentials);
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
//@ chunk-fxk1e28j.js:5638-5706 layout
class InitState {
  promise = undefined;
  telemetryInitialized = false;
  telemetryInit = undefined;
}
//@ chunk-fxk1e28j.js:5706-5729 layout
var initStateSlot; // deferred: uses InitState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fxk1e28j.js:5706", () => {
  initStateSlot = new HostScoped(() => new InitState());
});
//@ chunk-fxk1e28j.js:5729-5764 layout
function getInitState() {
  return initStateSlot.of(getRootSession().host);
}
//@ chunk-fxk1e28j.js:5764-10916 fingerprint (2.1.88 match: init, 0.584)
/**
 * init 本体：启用配置（v5 存储后端/远程设置预热/fd 凭证）、standalone 代理中继、应用安全环境变量与 CA、OAuth 账户信息、优雅退出注册、1P 事件日志、mTLS 与全局代理、预连 Anthropic API、CCR 代理（CLAUDE_CODE_REMOTE）、Windows shell 检查、scratchpad 目录；配置错误时弹 InvalidConfig 对话框或退出。
 */
async function initImpl(options = {}) {
  let agentProxyRelayToken = readAgentProxyRelayToken();
  let toolContainerToken = readSessionTunnelInput() ?? agentProxyRelayToken;
  let initStartTime = Date.now();
  logForDiagnosticsNoPII("info", "init_started");
  profileCheckpoint("init_function_start");
  let storageV5EnvPin = options.storageV5EnvPin;
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
    let credentials = credentialsStoreFor(storageV5EnvPin?.backend);
    if (isStorageV5Enabled() && credentials !== undefined) {
      await primeFileDescriptorCredentials(credentials);
      profileCheckpoint("init_fd_credentials_primed");
      await primeStoredLoginCopy(credentials);
      profileCheckpoint("init_stored_login_primed");
    }
    setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars);
    if (env.CCR_AGENT_PROXY_RELAY_MODE !== undefined) {
      let { startAgentProxyStandaloneRelay } =
        await import("../services/selfHostedRunner/agentProxyStandalone.js");
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
      storageV5EnvPin?.backend !== undefined && isSameConfigDir(storageV5EnvPin.configHome)
        ? credentials
        : undefined,
    );
    if (getGatewayAuth()) resetRemoteSettingsSyncCache();
    logForDiagnosticsNoPII("info", "init_safe_env_vars_applied", {
      duration_ms: Date.now() - envVarsStart,
    });
    profileCheckpoint("init_safe_env_vars_applied");
    let storageV5 = pinStorageV5(storageV5EnvPin);
    latchSettingsGateSettled();
    let credentials_2 = credentialsStoreFor(storageV5);
    if (isStorageV5Enabled() && storageV5 !== undefined) await primeWorkspaceRoots(storageV5);
    await primeSettings(storageV5, commandSyncNameState());
    if (isStorageV5Enabled() && storageV5 !== undefined) await primeWIFProfileFiles(storageV5);
    composePolicyLimitsClient({
      storageV5,
      credentials: credentials_2,
    });
    setGrowthBookCredentials(credentials_2);
    setGrowthBookStorageBackend(storageV5);
    if (isStorageV5Enabled() && credentials_2 !== undefined) {
      await primeFileDescriptorCredentials(credentials_2);
      if (startupReadsStoredLogin()) await primeStoredLogin(credentials_2);
    }
    await primePolicyLimitsCache(storageV5);
    watchGlobalConfigThroughStorage(storageV5);
    installUsageExitFlush(storageV5);
    setupGracefulShutdown({
      storageV5,
      credentials: credentials_2,
    });
    profileCheckpoint("init_after_graceful_shutdown");
    Promise.all([
      import("../services/analytics/firstPartyEventLogger.js"),
      import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
    ]).then(([eventLoggingModule, gb]) => {
      eventLoggingModule.initialize1PEventLogging(storageV5);
      gb.onGrowthBookRefresh(async () => {
        await waitForPolicyLimitsToLoad();
        if (isPolicyVerdictAbsent()) return;
        await eventLoggingModule.reinitialize1PEventLoggingIfConfigChanged();
      });
    });
    profileCheckpoint("init_after_1p_event_logging");
    initOrganizationAsk();
    let shouldPopulateOAuth =
      options.preparesSession !== false ||
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_quizzical_giraffe", false) !== true;
    trackPendingInit(populateOAuthAccountInfoIfNeeded(credentials_2, storageV5, shouldPopulateOAuth)).catch(
      logError,
    );
    profileCheckpoint("init_after_oauth_populate");
    primePlanSlugCollisions(storageV5);
    import("../services/remoteTools/unattendedConsentStore.js")
      .then((consentModule) => consentModule.primeUnattendedServingConsent())
      .catch(() => {});
    setRepoDetectionGuards({
      trustProbe: checkHasTrustDialogAccepted,
    });
    primeCurrentRepository();
    if (isEligibleForRemoteManagedSettings()) initializeRemoteManagedSettingsLoadingPromise();
    if (isPolicyLimitsEligible()) initializePolicyLimitsLoadingPromise();
    profileCheckpoint("init_after_remote_settings_check");
    recordFirstStartTime(storageV5);
    getOrCreateMachineID(storageV5);
    if (isStorageV5Enabled() && storageV5 !== undefined) getOrCreateUserID(storageV5);
    let mtlsStart = Date.now();
    logForDebugging("[init] configureGlobalMTLS starting");
    configureGlobalMTLS();
    logForDiagnosticsNoPII("info", "init_mtls_configured", {
      duration_ms: Date.now() - mtlsStart,
    });
    logForDebugging("[init] configureGlobalMTLS complete");
    let proxyUrlWithSource = getProxyUrlWithSource();
    if (proxyUrlWithSource && !parseProxyUrl(proxyUrlWithSource.value)) {
      let proxyErrorText = describeInvalidProxyUrl(proxyUrlWithSource.source, proxyUrlWithSource.value);
      await writeStartupFailureResult({
        sessionId: getSessionId(),
        message: proxyErrorText,
        reason: "proxy_invalid",
      });
      throw new CliUserError(proxyErrorText);
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
    if (options.prefetchManagedConfig === true && shouldPopulateOAuth && isManagedConfigPrefetchEnabled())
      try {
        prefetchRemoteManagedSettings(credentials_2);
        prefetchPolicyLimits();
      } catch {
        logError(Error("a managed-config prefetch threw in init(); start-up went on without it"));
      }
    preconnectAnthropicApi();
    options.startupGrowthBookKick?.();
    options.startClientDataUrlFetch?.();
    if (isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
      let startTime = performance.now();
      try {
        let { initAgentProxy, getAgentProxyEnv, getGhStandinDir } =
          await import("../upstreamproxy/upstreamproxy.js");
        let { registerAgentProxyEnvFn, registerGhStandinDirFn } = await import("../utils/subprocessEnv.js");
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
        let shellToolMessage = `Claude Code on Windows requires a shell tool. Git Bash was not found and the PowerShell tool is disabled (CLAUDE_CODE_USE_POWERSHELL_TOOL=0).
  - Install Git for Windows: https://git-scm.com/downloads/win, or
  - Remove CLAUDE_CODE_USE_POWERSHELL_TOOL from your environment or settings.`;
        console.error(shellToolMessage);
        await writeStartupFailureResult({
          sessionId: getSessionId(),
          message: shellToolMessage,
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
      let { cleanupSessionTeams } = await import("../utils/swarm/teamHelpers.js");
      await cleanupSessionTeams(storageV5);
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
    return storageV5;
  } catch (error) {
    if (error instanceof CliUserError) {
      process.stderr.write(`${error.message}
`);
      await gracefulShutdown(1);
      return;
    }
    if (error instanceof ConfigParseError) {
      if (!getIsNonInteractiveSession() && options.showInvalidConfigDialog) {
        await options.showInvalidConfigDialog({
          error,
        });
        return;
      }
      let configErrorMessage = `Configuration error in ${error.filePath}: ${error.message}
`;
      let advice =
        error.filePath === getGlobalClaudeFile()
          ? leaveUnparseableGlobalConfigAlone()
          : {
              advice: "",
              advicePrinted: true,
            };
      process.stderr.write(advice.advicePrinted ? configErrorMessage : configErrorMessage + advice.advice);
      await writeStartupFailureResult({
        sessionId: getSessionId(),
        message: (configErrorMessage + advice.advice).trimEnd(),
        reason: "config_file_invalid",
      });
      await gracefulShutdown(1);
      return;
    } else throw error;
  }
}
//@ chunk-fxk1e28j.js:10916-10958 facade-exports
/**
 * init() 的记忆化包装：同一 host 只执行一次 initImpl，返回同一个 Promise（导出名 init）。
 */
function init(options) {
  return (getInitState().promise ??= initImpl(options));
}
//@ chunk-fxk1e28j.js:10958-11784 facade-exports (2.1.88 match: initializeTelemetryAfterTrust, 0.505)
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
        let { captureAdmin3PSteeringSnapshot } = await import("../utils/model/thirdPartyDefaultFallbacks.js");
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
//@ chunk-fxk1e28j.js:11784-12130 layout
async function initializeTelemetryOnce(initState, config, credentials) {
  if (initState.telemetryInitialized) return initState.telemetryInit;
  initState.telemetryInitialized = true;
  initState.telemetryInit = (async () => {
    let discardReason = "not_configured";
    try {
      if (
        readFlagWithOverride("tengu_typed_treasure", {
          safe: true,
        })
      )
        putBackUnsuppliedTelemetryEnv();
      await setMeterState(config, credentials);
    } catch (error) {
      initState.telemetryInitialized = false;
      initState.telemetryInit = undefined;
      if (isOtlpLogsConfigured()) discardReason = "init_failed";
      throw error;
    } finally {
      discardPendingOTelEvents(discardReason);
    }
  })();
  return initState.telemetryInit;
}
//@ chunk-fxk1e28j.js:12130-12166 facade-exports
/**
 * 退出前确保遥测已初始化（供 flush 用）。
 */
function initializeTelemetryForExit() {
  return initializeTelemetryOnce(getInitState(), undefined);
}
//@ chunk-fxk1e28j.js:12166-12269 layout
function hasNonNoneExporter(exporters) {
  return (exporters || "")
    .trim()
    .split(",")
    .filter(Boolean)
    .map((exporter) => exporter.trim())
    .some((trimmed) => trimmed !== "none");
}
//@ chunk-fxk1e28j.js:12269-12361 facade-exports
function isOtlpLogsConfigured() {
  return isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY) && hasNonNoneExporter(env.OTEL_LOGS_EXPORTER);
}
//@ chunk-fxk1e28j.js:12361-12584 facade-exports
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
export {
  initializeTelemetryAfterTrust,
  initializeTelemetryForExit,
  init,
  isOtlpLogsConfigured,
  isOtlpLogsConfiguredByPolicy,
};
