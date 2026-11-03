/**
 * entrypoints/init.ts
 *
 * init()：启用配置、远程设置与凭证、安全环境变量与 CA、OAuth、优雅退出、1P 事件、mTLS/代理、预连接、上游代理、配置错误处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/init.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-vbtpanx5.js (13)
 * attribution: placement 1, affinity 1, fingerprint 2, layout 5, facade-exports 5
 */
import { Koi } from "./_new/init.helpers-xdkv.js";
import { getTelemetryAttributes } from "../utils/telemetryAttributes.js";
import { initRepositoryAttributes } from "../utils/telemetry/repositoryAttributes.js";
import {
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
import { HostScoped } from "../utils/hostScoped.js";
import { readAgentProxyRelayToken, initOrganizationAsk } from "./_new/readAgentProxyRelayToken.js";
import { readSessionTunnelInput } from "./sessionTunnelInput.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { profileCheckpoint } from "../utils/startupProfiler.js";
import { isSameConfigDir, isEnvTruthy } from "../utils/envUtils.js";
import { logForDebugging } from "../utils/debug.js";
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
import { is } from "../utils/settings/commandSyncNames.js";
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
import { env, YMi } from "../utils/env.js";
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
import { XMi, getPlatform } from "../utils/platform.js";
import { loadHostCredentials } from "../utils/hostCredsFile.js";
import { isProviderManagedByHost } from "../utils/entrypointKinds.js";
import { configureProxyAuthHelperFromSettings } from "../utils/auth/proxyAuthHelperConfig.js";
import { resetRemoteSettingsSyncCache } from "../services/cloudSessions/eligibility.js";
import { pinStorageV5 } from "../utils/storage/pinStorageV5.js";
import { wxi } from "../utils/settings/settingsSourceTrust.js";
import { primeWIFProfileFiles } from "../utils/wifProfile.js";
import {
  composePolicyLimitsClient,
  primePolicyLimitsCache,
  initializePolicyLimitsLoadingPromise,
  registerManagedConfigPrefetchEnabledReader,
  prefetchPolicyLimits,
} from "../services/policyLimits/PolicyLimitsClient.js";
import {
  setGrowthBookCredentials,
  setGrowthBookStorageBackend,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import { iri } from "../utils/telemetry/pluginTelemetry.js";
import { setupGracefulShutdown, gracefulShutdownSync } from "../utils/gracefulShutdown.js";
import { populateOAuthAccountInfoIfNeeded } from "../services/oauth/client.js";
import { logError } from "../utils/log.js";
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
import { CliUserError, ConfigParseError, errorMessage } from "../utils/errors.js";
import { isManagedConfigPrefetchEnabled } from "../services/remoteManagedSettings/index.js";
import { preconnectAnthropicApi } from "../utils/apiPreconnect.js";
import { Br } from "../utils/startupTiming.js";
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
import { E8s } from "../services/api/claude.js";
import { isBetaTracingEnabled } from "../utils/telemetry/betaSessionTracing.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { getSettingsForSource } from "../utils/settings/settings.js";
import { ru } from "../services/api/verificationRequired.js";

//@ chunk-vbtpanx5.js:5265-5329 affinity
function isPrometheusOnly(e) {
  return e.length > 0 && e.every((r) => r === "prometheus");
}
/**
 * 初始化 OTel meter 并安装 claude_code.* 计数器到 telemetryHandles。
 */
//@ chunk-vbtpanx5.js:5329-5626 fingerprint = setMeterState (0.423)
async function setMeterState(e, r) {
  let { initializeTelemetry: initializeTelemetry } = await import("./chunk-9vvvg0d3.js"),
    { meter: meter, metricsExporterKinds: metricsExporterKinds } = await initializeTelemetry(e, r);
  if (meter)
    (Koi(
      meter,
      (name, options) => {
        let counter = meter?.createCounter(name, options);
        return {
          add(u, h = {}) {
            let mergedAttributes = { ...getTelemetryAttributes(), ...h };
            counter?.add(u, mergedAttributes);
          },
        };
      },
      { omitUnits: isPrometheusOnly(metricsExporterKinds) },
    ),
      await initRepositoryAttributes(),
      getSessionCounter()?.add(1, { start_type: getSessionStartType() }));
}
//@ chunk-vbtpanx5.js:5626-5694 layout
class InitState {
  promise = void 0;
  telemetryInitialized = !1;
  telemetryInit = void 0;
}
//@ chunk-vbtpanx5.js:5694-5717 layout
var initStateSlot = new HostScoped(() => new InitState());
//@ chunk-vbtpanx5.js:5717-5752 layout
function getInitState() {
  return initStateSlot.of(getRootSession().host);
}
/**
 * init 本体：启用配置（v5 存储后端/远程设置预热/fd 凭证）、standalone 代理中继、应用安全环境变量与 CA、OAuth 账户信息、优雅退出注册、1P 事件日志、mTLS 与全局代理、预连 Anthropic API、CCR 代理（CLAUDE_CODE_REMOTE）、Windows shell 检查、scratchpad 目录；配置错误时弹 InvalidConfig 对话框或退出。
 */
//@ chunk-vbtpanx5.js:5752-10681 fingerprint = init (0.6)
async function initImpl(e = {}) {
  let r = readAgentProxyRelayToken(),
    f = readSessionTunnelInput() ?? r,
    initStartTime = Date.now();
  (logForDiagnosticsNoPII("info", "init_started"), profileCheckpoint("init_function_start"));
  let storageV5EnvPin = e.storageV5EnvPin;
  if (storageV5EnvPin?.backend !== void 0 && !isSameConfigDir(storageV5EnvPin.configHome))
    (logForDebugging(
      `CLAUDE_CONFIG_DIR no longer names ${storageV5EnvPin.configHome}, where the v5 storage backend was built at start-up; init() loads its config without it`,
      { level: "warn" },
    ),
      (storageV5EnvPin = { ...storageV5EnvPin, backend: void 0 }));
  storageV5EnvPin ??= pinStorageV5FromEnv();
  try {
    let configsStart = Date.now();
    if (isStorageV5Enabled() && storageV5EnvPin?.backend !== void 0)
      (await primeWorkspaceRoots(storageV5EnvPin.backend),
        await Promise.all([
          enableConfigs(storageV5EnvPin.backend),
          seedUserSettings(storageV5EnvPin.backend, is()),
        ]));
    else await enableConfigs();
    if (
      (logForDiagnosticsNoPII("info", "init_configs_enabled", { duration_ms: Date.now() - configsStart }),
      profileCheckpoint("init_configs_enabled"),
      isStorageV5Enabled() && storageV5EnvPin?.backend !== void 0)
    )
      primeWindowsCredManBackendEnabled(
        getGlobalConfig().cachedGrowthBookFeatures?.tengu_windows_credman === !0,
      );
    if (isStorageV5Enabled() && storageV5EnvPin?.backend !== void 0)
      (await primeRemoteManagedSettingsCache(storageV5EnvPin.backend),
        profileCheckpoint("init_remote_settings_primed"));
    let g = credentialsStoreFor(storageV5EnvPin?.backend);
    if (isStorageV5Enabled() && g !== void 0)
      (await primeFileDescriptorCredentials(g),
        profileCheckpoint("init_fd_credentials_primed"),
        await primeStoredLoginCopy(g),
        profileCheckpoint("init_stored_login_primed"));
    if (
      (setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars),
      env.CCR_AGENT_PROXY_RELAY_MODE !== void 0)
    ) {
      let { startAgentProxyStandaloneRelay: startAgentProxyStandaloneRelay } =
          await import("./chunk-13wgf40r.js"),
        s = await startAgentProxyStandaloneRelay();
      if (s.kind === "failed") {
        if ((console.error(s.message), s.cause === "url"))
          await writeStartupFailureResult({
            sessionId: getSessionId(),
            message: s.message,
            reason: "proxy_invalid",
          });
        process.exit(1);
      }
    }
    let envVarsStart = Date.now();
    if (
      (applySafeConfigEnvironmentVariables(),
      await assertScrubSandboxAvailable(),
      applyExtraCACertsFromConfig(),
      await Promise.all([loadExtraCACerts(), loadMTLSClientMaterial(), XMi(), YMi()]),
      await loadHostCredentials(),
      isProviderManagedByHost())
    )
      configureProxyAuthHelperFromSettings();
    if (
      (await restoreGatewayAuth(
        storageV5EnvPin?.backend !== void 0 && isSameConfigDir(storageV5EnvPin.configHome) ? g : void 0,
      ),
      getGatewayAuth())
    )
      resetRemoteSettingsSyncCache();
    (logForDiagnosticsNoPII("info", "init_safe_env_vars_applied", { duration_ms: Date.now() - envVarsStart }),
      profileCheckpoint("init_safe_env_vars_applied"));
    let a = pinStorageV5(storageV5EnvPin);
    wxi();
    let u = credentialsStoreFor(a);
    if (isStorageV5Enabled() && a !== void 0) await primeWorkspaceRoots(a);
    if ((await primeSettings(a, is()), isStorageV5Enabled() && a !== void 0)) await primeWIFProfileFiles(a);
    if (
      (composePolicyLimitsClient({ storageV5: a, credentials: u }),
      setGrowthBookCredentials(u),
      setGrowthBookStorageBackend(a),
      isStorageV5Enabled() && u !== void 0)
    ) {
      if ((await primeFileDescriptorCredentials(u), startupReadsStoredLogin())) await primeStoredLogin(u);
    }
    (await primePolicyLimitsCache(a),
      watchGlobalConfigThroughStorage(a),
      iri(a),
      setupGracefulShutdown({ storageV5: a, credentials: u }),
      profileCheckpoint("init_after_graceful_shutdown"),
      Promise.all([import("./chunk-3x77zjqp.js"), import("./chunk-6df1d6re.js")]).then(([o, s]) => {
        (o.initialize1PEventLogging(a),
          s.onGrowthBookRefresh(() => {
            o.reinitialize1PEventLoggingIfConfigChanged();
          }));
      }),
      profileCheckpoint("init_after_1p_event_logging"),
      initOrganizationAsk());
    let h =
      e.preparesSession !== !1 || getFeatureValue_CACHED_MAY_BE_STALE("tengu_quizzical_giraffe", !1) !== !0;
    if (
      (trackPendingInit(populateOAuthAccountInfoIfNeeded(u, a, h)).catch(logError),
      profileCheckpoint("init_after_oauth_populate"),
      primePlanSlugCollisions(a),
      import("./chunk-6dhh43sn.js").then((o) => o.primeUnattendedServingConsent()).catch(() => {}),
      setRepoDetectionGuards({ trustProbe: checkHasTrustDialogAccepted }),
      primeCurrentRepository(),
      isEligibleForRemoteManagedSettings())
    )
      initializeRemoteManagedSettingsLoadingPromise();
    if (isPolicyLimitsEligible()) initializePolicyLimitsLoadingPromise();
    if (
      (profileCheckpoint("init_after_remote_settings_check"),
      recordFirstStartTime(a),
      getOrCreateMachineID(a),
      isStorageV5Enabled() && a !== void 0)
    )
      getOrCreateUserID(a);
    let mtlsStart = Date.now();
    (logForDebugging("[init] configureGlobalMTLS starting"),
      configureGlobalMTLS(),
      logForDiagnosticsNoPII("info", "init_mtls_configured", { duration_ms: Date.now() - mtlsStart }),
      logForDebugging("[init] configureGlobalMTLS complete"));
    let y = getProxyUrlWithSource();
    if (y && !parseProxyUrl(y.value)) {
      let o = describeInvalidProxyUrl(y.source, y.value);
      throw (
        await writeStartupFailureResult({ sessionId: getSessionId(), message: o, reason: "proxy_invalid" }),
        new CliUserError(o)
      );
    }
    let proxyStart = Date.now();
    if (
      (logForDebugging("[init] configureGlobalAgents starting"),
      configureGlobalAgents(),
      logForDiagnosticsNoPII("info", "init_proxy_configured", { duration_ms: Date.now() - proxyStart }),
      logForDebugging("[init] configureGlobalAgents complete"),
      profileCheckpoint("init_network_configured"),
      registerManagedConfigPrefetchEnabledReader(isManagedConfigPrefetchEnabled),
      e.prefetchManagedConfig === !0 && h && isManagedConfigPrefetchEnabled())
    )
      try {
        (prefetchRemoteManagedSettings(u), prefetchPolicyLimits());
      } catch {
        logError(Error("a managed-config prefetch threw in init(); start-up went on without it"));
      }
    if (
      (preconnectAnthropicApi(),
      e.startupGrowthBookKick?.(),
      e.startClientDataUrlFetch?.(),
      isEnvTruthy(process.env.CLAUDE_CODE_REMOTE))
    ) {
      let startTime = performance.now();
      try {
        let {
            initAgentProxy: initAgentProxy,
            getAgentProxyEnv: getAgentProxyEnv,
            getGhStandinDir: getGhStandinDir,
          } = await import("./chunk-j9e5zgt8.js"),
          {
            registerAgentProxyEnvFn: registerAgentProxyEnvFn,
            registerGhStandinDirFn: registerGhStandinDirFn,
          } = await import("./chunk-1vnf3c6f.js");
        (registerAgentProxyEnvFn(getAgentProxyEnv),
          registerGhStandinDirFn(getGhStandinDir),
          await initAgentProxy({ toolContainerToken: f }));
      } catch (err) {
        logForDebugging(
          `[init] agent proxy init failed: ${err instanceof Error ? err.message : String(err)}; continuing without proxy`,
          { level: "warn" },
        );
      }
      Br("agent_proxy_init_ms", performance.now() - startTime, startTime);
    }
    if ((setShellIfWindows(), getPlatform() === "windows" && !isBashAvailable())) {
      if (!isPowerShellToolEnabled()) {
        let s = `Claude Code on Windows requires a shell tool. Git Bash was not found and the PowerShell tool is disabled (CLAUDE_CODE_USE_POWERSHELL_TOOL=0).
  - Install Git for Windows: https://git-scm.com/downloads/win, or
  - Remove CLAUDE_CODE_USE_POWERSHELL_TOOL from your environment or settings.`;
        (console.error(s),
          await writeStartupFailureResult({
            sessionId: getSessionId(),
            message: s,
            reason: "shell_tool_missing",
          }),
          process.exit(1));
      }
      if ((await getCachedPowerShellPath()) === null)
        (console.error(WINDOWS_SHELL_REQUIRED_TEXT),
          await writeStartupFailureResult({
            sessionId: getSessionId(),
            message: WINDOWS_SHELL_REQUIRED_TEXT,
            reason: "shell_tool_missing",
          }),
          process.exit(1));
    }
    if (
      (registerCleanup(shutdownLspServerManager),
      registerCleanup(async () => {
        let { cleanupSessionTeams: cleanupSessionTeams } = await import("./chunk-brc6p73m.js");
        await cleanupSessionTeams(a);
      }),
      isScratchpadEnabled())
    ) {
      let scratchpadStart = Date.now();
      try {
        let s = await ensureScratchpadDir();
        logForDiagnosticsNoPII(
          "info",
          s === null ? "init_scratchpad_unavailable" : "init_scratchpad_created",
          { duration_ms: Date.now() - scratchpadStart },
        );
      } catch (error) {
        logForDebugging(`init: ensureScratchpadDir failed: ${error}`, { level: "error" });
      }
    }
    return (
      onSessionSwitch(() => {
        if (isScratchpadEnabled())
          ensureScratchpadDir().catch((o) =>
            logForDebugging(`onSessionSwitch: ensureScratchpadDir failed: ${o}`, { level: "error" }),
          );
      }),
      registerConversationResetHook(),
      clearPromptCacheOnSessionSwitch(),
      E8s(),
      logForDiagnosticsNoPII("info", "init_completed", { duration_ms: Date.now() - initStartTime }),
      profileCheckpoint("init_function_end"),
      a
    );
  } catch (error) {
    if (error instanceof CliUserError) {
      (process.stderr.write(`${error.message}
`),
        gracefulShutdownSync(1));
      return;
    }
    if (error instanceof ConfigParseError) {
      if (!getIsNonInteractiveSession() && e.showInvalidConfigDialog) {
        await e.showInvalidConfigDialog({ error: error });
        return;
      }
      (process.stderr.write(`Configuration error in ${error.filePath}: ${error.message}
`),
        gracefulShutdownSync(1));
      return;
    } else throw error;
  }
}
/**
 * init() 的记忆化包装：同一 host 只执行一次 initImpl，返回同一个 Promise（导出名 init）。
 */
//@ chunk-vbtpanx5.js:10681-10723 facade-exports
function init(e) {
  return (getInitState().promise ??= initImpl(e));
}
/**
 * 信任建立后初始化 OpenTelemetry：需要等待远程托管设置时延后到其完成，否则立即初始化（只做一次）。
 */
//@ chunk-vbtpanx5.js:10723-11549 facade-exports = initializeTelemetryAfterTrust (0.505)
function initializeTelemetryAfterTrust(e) {
  let r = getInitState();
  if (isEligibleForRemoteManagedSettings()) {
    if (getIsNonInteractiveSession() && isBetaTracingEnabled())
      initializeTelemetryOnce(r, e).catch((error) => {
        try {
          logForDebugging(
            `[3P telemetry] Eager telemetry init failed (beta tracing): ${errorMessage(error)}`,
            { level: "error" },
          );
        } catch {}
      });
    (logForDebugging("[3P telemetry] Waiting for remote managed settings fetch before telemetry init"),
      waitForRemoteManagedSettingsFetchToSettle()
        .then(async () => {
          (logForDebugging("[3P telemetry] Remote managed settings fetch settled, initializing telemetry"),
            applyConfigEnvironmentVariables());
          let { captureAdmin3PSteeringSnapshot: captureAdmin3PSteeringSnapshot } =
            await import("./chunk-kva132ev.js");
          captureAdmin3PSteeringSnapshot();
          let [p, n] = await Promise.all([loadExtraCACerts(), loadMTLSClientMaterial()]);
          if (p || n.changed) (clearProxyCache(), configureGlobalAgents());
          await initializeTelemetryOnce(r, e);
        })
        .catch((error) => {
          if (isOTelInitPending() && !r.telemetryInitialized)
            discardPendingOTelEvents(
              isOtlpLogsConfigured() || isOtlpLogsConfiguredByPolicy() ? "init_failed" : "not_configured",
            );
          try {
            logForDebugging(
              `[3P telemetry] Telemetry init failed (remote settings path): ${errorMessage(error)}`,
              { level: "error" },
            );
          } catch {}
        }));
  } else
    initializeTelemetryOnce(r, e).catch((error) => {
      try {
        logForDebugging(`[3P telemetry] Telemetry init failed: ${errorMessage(error)}`, { level: "error" });
      } catch {}
    });
}
//@ chunk-vbtpanx5.js:11549-11895 layout
async function initializeTelemetryOnce(e, r, f) {
  if (e.telemetryInitialized) return e.telemetryInit;
  return (
    (e.telemetryInitialized = !0),
    (e.telemetryInit = (async () => {
      let p = "not_configured";
      try {
        if (readFlagWithOverride("tengu_typed_treasure", { safe: !0 })) putBackUnsuppliedTelemetryEnv();
        await setMeterState(r, f);
      } catch (error) {
        if (((e.telemetryInitialized = !1), (e.telemetryInit = void 0), isOtlpLogsConfigured()))
          p = "init_failed";
        throw error;
      } finally {
        discardPendingOTelEvents(p);
      }
    })()),
    e.telemetryInit
  );
}
/**
 * 退出前确保遥测已初始化（供 flush 用）。
 */
//@ chunk-vbtpanx5.js:11895-11931 facade-exports
function initializeTelemetryForExit() {
  return initializeTelemetryOnce(getInitState(), void 0);
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
    let e = getSettingsForSource("policySettings")?.env;
    if (!e) return !1;
    return (
      (isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY) ||
        isEnvTruthy(e.CLAUDE_CODE_ENABLE_TELEMETRY)) &&
      (hasNonNoneExporter(env.OTEL_LOGS_EXPORTER) || hasNonNoneExporter(e.OTEL_LOGS_EXPORTER))
    );
  } catch {
    return !1;
  }
}
/**
 * 记录进行中的初始化 Promise（完成后清除），原样返回该 Promise。
 */
//@ chunk-aepeg2w5.js:289694-289820 placement
function trackPendingInit(e) {
  let n = e.then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  return (
    (ru.pending = n),
    n.then(() => {
      if (ru.pending === n) ru.pending = null;
    }),
    e
  );
}

export {
  initializeTelemetryAfterTrust,
  init,
  initializeTelemetryForExit,
  isOtlpLogsConfigured,
  isOtlpLogsConfiguredByPolicy,
};
