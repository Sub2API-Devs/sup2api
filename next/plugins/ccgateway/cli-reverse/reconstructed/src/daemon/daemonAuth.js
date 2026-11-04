/**
 * daemon/daemonAuth.ts
 *
 * 2.1.316 新增：daemon 认证管理：令牌更新广播、401 处理、冷却、组织查询；daemon 配置 schema（目录、名称、spawnMode、容量、权限模式等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e3de30et.js (14)
 * attribution: placement 14
 */
import { join } from "path";
import { randomUUID } from "crypto";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { getPlatform } from "../utils/platform.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { logFeatureSad, logFeatureOk, withFeatureTelemetry } from "../services/analytics/featureTelemetry.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
  toError,
} from "../utils/errors.js";
import { getFileReader } from "../utils/fileStore.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  _enum,
  numberSchema,
  preprocess,
  booleanSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { normalizePermissionModeAlias, EXTERNAL_PERMISSION_MODES } from "../types/permissions.js";
import { SANDBOX_SETTING_HINT, BRIDGE_LOGIN_ERROR } from "../bridge/types.js";
import { EXIT_CONFIG_ERROR } from "../utils/exitCodes.js";
import { getBridgeTokenOverride } from "../bridge/bridgeConfig.js";
import { logForDebugging } from "../utils/debug.js";
import { isDaemonWorkerRegistryEnabled } from "../utils/fleetGates.js";
import { sleep } from "../utils/sleep.js";
import { logError } from "../utils/log.js";
import { updateDaemonConfig, normalizeDirEntries } from "./scheduledWorker.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e3de30et.js:1144-1263 placement
function isDaemonAuthMessage(message) {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message.type === "token_update" || message.type === "auth_401_result")
  );
}
//@ chunk-e3de30et.js:1263-1348 placement
function isAuth401Result(message) {
  return typeof message === "object" && message !== null && "type" in message && message.type === "auth_401";
}
//@ chunk-e3de30et.js:1348-1403 placement
var AUTH_COOLDOWN_MS = 300000;
var AUTH_RECHECK_MS = 240000;
var AUTH_STATUS_TTL_MS = 300000;
var AUTH_RETRY_MS = 30000;
var AUTH_STATUS_MAX_AGE_MS = 86400000;
//@ chunk-e3de30et.js:1403-1457 placement
function readAuthCooldown() {
  return STORAGE_SPACES.state("daemon-auth-cooldown");
}
//@ chunk-e3de30et.js:1457-1509 placement
function readAuthStatus() {
  return STORAGE_SPACES.state("daemon-auth-status");
}
//@ chunk-e3de30et.js:1509-8583 placement
/**
 * daemon 认证管理：令牌更新广播、401 处理、冷却、组织查询。
 */
function createDaemonAuthManager(
  signal,
  log,
  isLoginOff3P,
  storageV5,
  credentials,
  isWorkerUsingToken = () => false,
) {
  let loginOffOptions = () => ({
    usesLoginOffFirstParty: isLoginOff3P(),
  });
  let authState;
  let is3POnly = false;
  let refreshTimer = null;
  let workerChannels = new Set();
  let keychainRetryTimer = null;
  let oauthModulePromise = null;
  function loadOauthModule() {
    return (oauthModulePromise ??= import("../utils/auth.js"));
  }
  function broadcastToken(accessToken) {
    let message = {
      type: "token_update",
      accessToken,
    };
    for (let channel of workerChannels)
      try {
        channel.send(message);
      } catch {}
  }
  let lastOrgLookupToken;
  async function lookupOrganization(token, force = false) {
    if (
      lastOrgLookupToken === token ||
      getPlatform() !== "macos" ||
      !(force || isWorkerUsingToken()) ||
      isEssentialTrafficOnly()
    )
      return;
    lastOrgLookupToken = token;
    try {
      let oauthModule = await loadOauthModule();
      if (oauthModule.isUsing3PServices() && !loginOffOptions().usesLoginOffFirstParty) {
        clearOrgLookupToken(token);
        return;
      }
      if ((await oauthModule.getClaudeAIOAuthTokenOriginAsync(credentials)) !== "store") return;
      let { validateOauthTokenWithOutcome, isTransientValidateFailure } =
        await import("../services/oauth/getOauthProfileFromApiKey.lazy.js");
      let outcome = await validateOauthTokenWithOutcome(token);
      if (!outcome.ok) {
        let isTransient = isTransientValidateFailure(outcome);
        if (isTransient) clearOrgLookupToken(token);
        logFeatureSad("daemon_snapshot_org_lookup", outcome.reason, {
          transient: isTransient,
        });
        log(`auth: token organization lookup: no answer (${outcome.reason})`);
        return;
      }
      let organizationUuid = outcome.data?.organization_uuid;
      let organizationUuid_2 =
        typeof organizationUuid === "string" && organizationUuid ? organizationUuid : null;
      logFeatureOk("daemon_snapshot_org_lookup", {
        named: organizationUuid_2 !== null,
      });
      if (authState?.accessToken === token)
        authState = {
          ...authState,
          organizationUuid: organizationUuid_2,
        };
    } catch {
      clearOrgLookupToken(token);
      log("auth: token organization lookup failed");
    }
  }
  function clearOrgLookupToken(token) {
    if (lastOrgLookupToken === token) lastOrgLookupToken = undefined;
  }
  function setAuthState(tokens) {
    authState = {
      accessToken: tokens.accessToken,
      scopes: tokens.scopes,
      subscriptionType: tokens.subscriptionType ?? null,
      rateLimitTier: tokens.rateLimitTier ?? null,
      organizationUuid: null,
    };
    lookupOrganization(tokens.accessToken);
  }
  async function reloadTokens() {
    let tokens = await (await loadOauthModule()).getClaudeAIOAuthTokensAsync(credentials);
    if (tokens?.accessToken && tokens.accessToken !== authState?.accessToken) {
      setAuthState(tokens);
      broadcastToken(tokens.accessToken);
    }
    scheduleRefresh(tokens?.expiresAt ?? null);
  }
  let lastSeenToken;
  let lastSkipsKeychain = false;
  function startKeychainRetry(token) {
    lastSeenToken = token;
    if (keychainRetryTimer || signal.aborted) return;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    log("auth: no token found, will re-check keychain every 30s");
    keychainRetryTimer = setInterval(function () {
      loadOauthModule()
        .then(async (oauthModule) => {
          let skipsKeychain = oauthModule.isUsing3PServices() && !isLoginOff3P() && !isWorkerUsingToken();
          if (skipsKeychain !== lastSkipsKeychain) {
            lastSkipsKeychain = skipsKeychain;
            log(
              skipsKeychain
                ? "auth: re-check skips the keychain (3P provider, no worker uses the token)"
                : "auth: re-check reads the keychain again",
            );
          }
          if (skipsKeychain) return;
          oauthModule.clearOAuthTokenCache();
          let claudeAIOAuthTokensAsync = await oauthModule.getClaudeAIOAuthTokensAsync(credentials);
          let reason;
          if (
            claudeAIOAuthTokensAsync?.accessToken &&
            claudeAIOAuthTokensAsync.accessToken !== lastSeenToken &&
            claudeAIOAuthTokensAsync.expiresAt &&
            claudeAIOAuthTokensAsync.expiresAt > Date.now()
          )
            reason = "auth: token found via keychain re-check";
          else if (
            claudeAIOAuthTokensAsync?.refreshToken &&
            (await oauthModule.checkAndRefreshOAuthTokenIfNeeded({
              credentials,
              storageV5,
              ...loginOffOptions(),
            }))
          )
            reason = "auth: token refreshed via keychain re-check retry";
          if (reason) {
            await reloadTokens();
            if (authState && keychainRetryTimer) {
              clearInterval(keychainRetryTimer);
              keychainRetryTimer = null;
              log(reason);
            }
          }
        })
        .catch((error) => log(`auth: keychain re-check error: ${error}`));
    }, AUTH_RETRY_MS);
    keychainRetryTimer.unref();
  }
  function scheduleRefresh(expiresAt) {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (!expiresAt || signal.aborted) return;
    let min = Math.min(Math.max(expiresAt - Date.now() - AUTH_RECHECK_MS, 5000), AUTH_STATUS_MAX_AGE_MS);
    log(`auth: scheduling proactive refresh in ${Math.round(min / 1000)}s`);
    refreshTimer = setTimeout(refreshNow, min);
    refreshTimer.unref();
  }
  async function refreshNow() {
    if (signal.aborted) return;
    try {
      log("auth: proactive refresh starting");
      let oauthModule = await loadOauthModule();
      let accessToken = authState?.accessToken;
      let refreshed = await oauthModule.checkAndRefreshOAuthTokenIfNeeded({
        credentials,
        storageV5,
        ...loginOffOptions(),
      });
      oauthModule.clearOAuthTokenCache();
      let claudeAIOAuthTokensAsync = await oauthModule.getClaudeAIOAuthTokensAsync(credentials);
      let expiresAt = claudeAIOAuthTokensAsync?.expiresAt ?? null;
      let hasFreshToken = expiresAt === null || expiresAt > Date.now() + AUTH_COOLDOWN_MS;
      if (
        claudeAIOAuthTokensAsync?.accessToken &&
        (refreshed || claudeAIOAuthTokensAsync.accessToken !== accessToken || hasFreshToken) &&
        (expiresAt === null || expiresAt > Date.now() + AUTH_RECHECK_MS)
      ) {
        await reloadTokens();
        log(
          refreshed
            ? "auth: proactive refresh succeeded"
            : "auth: token still valid (cross-process refresh or not yet due)",
        );
        return;
      }
      if (claudeAIOAuthTokensAsync?.accessToken && expiresAt !== null && expiresAt > Date.now()) {
        log("auth: proactive refresh failed, retrying in ~60s (token still valid)");
        scheduleRefresh(Date.now() + 60000 + AUTH_RECHECK_MS);
        return;
      }
      log("auth: proactive refresh failed, signalling re-auth required");
      let accessToken_2 = claudeAIOAuthTokensAsync?.accessToken ?? accessToken;
      authState = undefined;
      await signalReauth();
      startKeychainRetry(accessToken_2);
    } catch (error) {
      log(`auth: proactive refresh error: ${error}`);
      scheduleRefresh(Date.now() + 60000 + AUTH_RECHECK_MS);
    }
  }
  async function handle401(token) {
    if (is3POnly) {
      log("auth: 401 ignored (3P provider active, no OAuth)");
      return false;
    }
    log("auth: handling 401");
    let oauthModule = await loadOauthModule();
    if (await oauthModule.handleOAuth401Error(token, credentials, storageV5, loginOffOptions())) {
      oauthModule.clearOAuthTokenCache();
      await reloadTokens();
      log("auth: 401 recovery succeeded");
      return true;
    }
    log("auth: 401 recovery failed, signalling re-auth required");
    authState = undefined;
    await signalReauth();
    oauthModule.clearOAuthTokenCache();
    let claudeAIOAuthTokensAsync = await oauthModule.getClaudeAIOAuthTokensAsync(credentials);
    if (
      claudeAIOAuthTokensAsync?.accessToken !== undefined &&
      claudeAIOAuthTokensAsync.accessToken !== token
    ) {
      await reloadTokens();
      return true;
    }
    startKeychainRetry(token);
    return false;
  }
  let reauthInFlight = null;
  function signalReauth() {
    if (reauthInFlight) return reauthInFlight;
    reauthInFlight = writeReauthFiles().finally(() => {
      reauthInFlight = null;
    });
    return reauthInFlight;
  }
  async function writeReauthFiles() {
    let oauthModule = await loadOauthModule();
    if (oauthModule.getAnthropicApiKey()) {
      log("auth: browser login skipped (API key auth available)");
      return;
    }
    if (oauthModule.isUsing3PServices() && !isLoginOff3P()) {
      log("auth: browser login skipped (3P provider, no OAuth-consuming worker)");
      return;
    }
    let claudeConfigDir = getClaudeConfigDir();
    let cooldownPath = join(claudeConfigDir, "daemon-auth-cooldown");
    let statusPath = join(claudeConfigDir, "daemon-auth-status.json");
    try {
      let cooldownText;
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        let readResult = await storageV5.read([readAuthCooldown()]);
        if (!readResult.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 cooldown read failed: ${readResult.error.code}${"telemetryCode" in readResult.error && readResult.error.telemetryCode ? ` (${readResult.error.telemetryCode})` : ""}`,
            "daemon-auth v5 cooldown read failed",
          );
        let cooldownItem = readResult.value.items[0];
        cooldownText = cooldownItem.found ? Buffer.from(cooldownItem.value).toString("utf8") : null;
      } else cooldownText = await getFileReader().read(cooldownPath);
      let cooldownTs = cooldownText === null ? NaN : parseInt(cooldownText, 10);
      if (!Number.isNaN(cooldownTs) && Date.now() - cooldownTs < AUTH_STATUS_TTL_MS) {
        log("auth: browser login skipped (cooldown)");
        return;
      }
    } catch (error) {
      if (!isENOENT(error)) log(`auth: cooldown read error: ${error}`);
    }
    try {
      await getFileReader().mkdir(claudeConfigDir);
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        let writeResult = await storageV5.write(readAuthCooldown(), String(Date.now()), {
          publishDiscipline: "inPlace",
        });
        if (!writeResult.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 cooldown write failed: ${writeResult.error.code}${"telemetryCode" in writeResult.error && writeResult.error.telemetryCode ? ` (${writeResult.error.telemetryCode})` : ""}`,
            "daemon-auth v5 cooldown write failed",
          );
      } else await getFileReader().write(cooldownPath, String(Date.now()));
    } catch (error) {
      log(`auth: cooldown write error: ${error}`);
    }
    try {
      let { execFileNoThrow } = await import("../utils/execFileNoThrow.js");
      execFileNoThrow("notify-send", ["Claude", "Your Claude assistant needs re-authentication"]);
    } catch {}
    try {
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        let statusResult = await storageV5.write(
          readAuthStatus(),
          jsonStringify({
            status: "auth_required",
            since: Date.now(),
          }),
          {
            publishDiscipline: "inPlace",
          },
        );
        if (!statusResult.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 status write failed: ${statusResult.error.code}${"telemetryCode" in statusResult.error && statusResult.error.telemetryCode ? ` (${statusResult.error.telemetryCode})` : ""}`,
            "daemon-auth v5 status write failed",
          );
      } else
        await getFileReader().write(
          statusPath,
          jsonStringify({
            status: "auth_required",
            since: Date.now(),
          }),
        );
    } catch (error) {
      log(`auth: status write error: ${error}`);
    }
    log("auth: headless daemon cannot complete OAuth \u2014 run `claude auth login` to refresh");
  }
  function onWorkerMessage(message) {
    if (!isAuth401Result(message)) return;
    handle401(message.failedToken)
      .then((refreshed) => {
        for (let channel of workerChannels)
          try {
            let reply = {
              type: "auth_401_result",
              refreshed,
              requestId: message.requestId,
            };
            channel.send(reply);
          } catch {}
      })
      .catch((error) => {
        log(`auth: 401 handler error: ${error}`);
        for (let channel of workerChannels)
          try {
            let reply = {
              type: "auth_401_result",
              refreshed: false,
              requestId: message.requestId,
            };
            channel.send(reply);
          } catch {}
      });
  }
  function attachWorker(channel) {
    workerChannels.add(channel);
    channel.on("message", onWorkerMessage);
    if (authState)
      try {
        let message = {
          type: "token_update",
          accessToken: authState.accessToken,
        };
        channel.send(message);
      } catch {}
  }
  function detachWorker(channel) {
    channel.removeListener("message", onWorkerMessage);
    workerChannels.delete(channel);
  }
  let ready = (async () => {
    if (signal.aborted) return;
    try {
      let oauthModule = await loadOauthModule();
      let tokens = await oauthModule.getClaudeAIOAuthTokensAsync(credentials);
      if (!tokens?.accessToken && oauthModule.isUsing3PServices()) {
        is3POnly = true;
        log("auth: 3P provider active, skipping OAuth refresh loop");
        return;
      }
      if (tokens?.accessToken) {
        setAuthState(tokens);
        scheduleRefresh(tokens.expiresAt ?? null);
      }
      await oauthModule.checkAndRefreshOAuthTokenIfNeeded({
        credentials,
        storageV5,
        ...loginOffOptions(),
      });
      await reloadTokens();
    } catch (error) {
      log(`auth: init error: ${error}`);
    }
  })();
  ready.then(() => {
    if (signal.aborted || authState || is3POnly) return;
    startKeychainRetry();
  });
  signal.addEventListener(
    "abort",
    () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
      if (keychainRetryTimer) {
        clearInterval(keychainRetryTimer);
        keychainRetryTimer = null;
      }
    },
    {
      once: true,
    },
  );
  return {
    ready,
    getAccessToken() {
      return authState?.accessToken;
    },
    getAuthSnapshot() {
      if (authState && !authState.organizationUuid) lookupOrganization(authState.accessToken, true);
      return authState;
    },
    attachWorker,
    detachWorker,
    dispose,
    [Symbol.dispose]: dispose,
  };
  function dispose() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (keychainRetryTimer) {
      clearInterval(keychainRetryTimer);
      keychainRetryTimer = null;
    }
    for (let channel of workerChannels) channel.removeListener("message", onWorkerMessage);
    workerChannels.clear();
  }
}
//@ chunk-e3de30et.js:8583-9560 placement
/**
 * worker 侧认证客户端：通过 IPC 接收令牌更新、请求刷新。
 */
function createWorkerAuthClient(initialAccessToken, credentials, storageV5) {
  if (typeof process.send === "function") {
    let timeoutRequest = function (requestId) {
      let request = pendingRequests.get(requestId);
      if (request) {
        pendingRequests.delete(requestId);
        request.resolve(false);
      }
    };
    let currentToken = initialAccessToken;
    process.on("message", (message) => {
      if (!isDaemonAuthMessage(message)) return;
      if (message.type === "token_update") currentToken = message.accessToken;
    });
    let pendingRequests = new Map();
    process.on("message", (message) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "auth_401_result"
      ) {
        let result = message;
        let request = pendingRequests.get(result.requestId);
        if (request) {
          clearTimeout(request.timer);
          pendingRequests.delete(result.requestId);
          request.resolve(result.refreshed);
        }
      }
    });
    process.channel?.unref();
    return {
      getAccessToken() {
        return currentToken;
      },
      reportAuth401(failedToken) {
        let requestId = randomUUID();
        let message = {
          type: "auth_401",
          failedToken,
          requestId,
        };
        return new Promise((resolve) => {
          let timer = setTimeout(timeoutRequest, 30000, requestId);
          timer.unref();
          pendingRequests.set(requestId, {
            resolve,
            timer,
          });
          try {
            process.send(message);
          } catch {
            clearTimeout(timer);
            pendingRequests.delete(requestId);
            resolve(false);
          }
        });
      },
    };
  }
  let oauthModule = null;
  async function loadOauthModule() {
    return (oauthModule ??= await import("../utils/auth.js"));
  }
  loadOauthModule();
  return {
    getAccessToken() {
      return oauthModule?.getClaudeAIOAuthTokens()?.accessToken;
    },
    async reportAuth401(failedToken) {
      return (await loadOauthModule()).handleOAuth401Error(failedToken, credentials, storageV5, {
        usesLoginOffFirstParty: true,
      });
    },
  };
}
//@ chunk-e3de30et.js:9560-9645 placement
function isShutdownResult(message) {
  return typeof message === "object" && message !== null && "type" in message && message.type === "shutdown";
}
//@ chunk-e3de30et.js:9645-9805 placement
function getRestartCause(message) {
  if (!isShutdownResult(message) || typeof message !== "object" || message === null || !("cause" in message))
    return;
  return message.cause === "upgrade" || message.cause === "reload" || message.cause === "yield"
    ? message.cause
    : undefined;
}
//@ chunk-e3de30et.js:9805-13196 placement
/**
 * daemon 配置 schema（目录、名称、spawnMode、容量、权限模式等）。
 */
var DaemonConfigSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DAEMON_RESTART_WAIT_MS;
var DAEMON_POLL_MS;
var handleRemoteControlInput;
deferInit("chunk-e3de30et.js:9805", () => {
  DaemonConfigSchema = DoctorLazy(() =>
    objectSchema({
      dir: stringSchema(),
      name: stringSchema().optional(),
      spawnMode: _enum(["same-dir", "worktree"]).default("same-dir"),
      capacity: numberSchema().int().positive().default(32),
      permissionMode: preprocess(normalizePermissionModeAlias, _enum(EXTERNAL_PERMISSION_MODES)).optional(),
      sandbox: booleanSchema().optional(),
      sessionTimeoutSeconds: numberSchema().int().positive().optional(),
      createSessionOnStart: booleanSchema().default(false),
    }).strict(),
  );
  DAEMON_RESTART_WAIT_MS = 60000;
  DAEMON_POLL_MS = 500;
  handleRemoteControlInput = async (rawConfig, signal, log, authClient, storageV5, credentials) => {
    let config = DaemonConfigSchema().parse(rawConfig);
    if (config.sandbox) {
      log(`The sandbox key is not supported for Remote Control. Remove it. ${SANDBOX_SETTING_HINT}`);
      process.exit(EXIT_CONFIG_ERROR);
    }
    let { initializeErrorLogSink } = await import("../utils/errorLogSink.js");
    let { initializeAnalyticsSink } = await import("../services/analytics/sink.js");
    initializeErrorLogSink();
    initializeAnalyticsSink();
    let getAccessToken = () => getBridgeTokenOverride() ?? authClient.getAccessToken();
    if (!getAccessToken()) {
      log(BRIDGE_LOGIN_ERROR);
      process.exit(1);
    }
    let [
      { initialize1PEventLogging },
      { initializeGrowthBook, getFeatureValue_CACHED_MAY_BE_STALE: getFeatureValue, getUserAttributes },
      { flushAnalyticsSinks },
      { populateOAuthAccountInfoIfNeeded },
    ] = await Promise.all([
      import("../services/analytics/firstPartyEventLogger.js"),
      import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
      import("../services/analytics/flushSinks.js"),
      import("../services/oauth/client.js"),
    ]);
    initialize1PEventLogging(storageV5);
    await populateOAuthAccountInfoIfNeeded(credentials, storageV5).catch((error) => {
      logForDebugging(
        `[daemon:remoteControl] oauthAccount backfill failed (${error instanceof Error ? error.name : typeof error})`,
      );
    });
    if (!getUserAttributes().organizationUUID)
      logForDebugging(
        "[daemon:remoteControl] no org identity; GrowthBook not initialized, gates serve cached/default values",
      );
    else
      initializeGrowthBook().catch((error) => {
        logForDebugging(
          `[daemon:remoteControl] GrowthBook init failed (${error instanceof Error ? error.name : typeof error}); feature gates keep serving the disk cache`,
          {
            level: "error",
          },
        );
      });
    if (!isDaemonWorkerRegistryEnabled()) {
      let eligibilityError = await checkRemoteControlWorkerEligibility();
      if (eligibilityError !== undefined) {
        log(eligibilityError.reason);
        await flushAnalyticsSinks();
        process.exit(eligibilityError.retry ? 1 : EXIT_CONFIG_ERROR);
      }
    }
    let { runBridgeHeadless, BridgeHeadlessPermanentError } = await import("../bridge/bridgeMain.js");
    let busyPingTimer = null;
    let wasBusy = false;
    let sendToParent = (message) => {
      if (typeof process.send !== "function") return;
      try {
        process.send(message);
      } catch {}
    };
    let sendBusy = (busy) =>
      sendToParent({
        type: "rc_busy",
        busy,
      });
    let stopBusyPing = () => {
      if (busyPingTimer !== null) {
        clearInterval(busyPingTimer);
        busyPingTimer = null;
      }
    };
    let onBusyChange = (busyCount) => {
      let busy = busyCount > 0;
      if (busy !== wasBusy) {
        wasBusy = busy;
        sendBusy(busy);
      }
      if (busy) {
        if (busyPingTimer === null) {
          busyPingTimer = setInterval((ping) => ping(true), DAEMON_RESTART_WAIT_MS, sendBusy);
          busyPingTimer.unref?.();
        }
      } else stopBusyPing();
    };
    let persistActiveSessionsOnShutdown = getFeatureValue("tengu_daemon_upgrade_defer_busy", true);
    let shutdownCause = null;
    let resolveShutdown = () => {};
    let promise = new Promise((resolve) => {
      resolveShutdown = resolve;
    });
    let onParentMessage = (message) => {
      if (isShutdownResult(message)) {
        shutdownCause = getRestartCause(message) ?? null;
        resolveShutdown();
      }
    };
    process.on("message", onParentMessage);
    let awaitShutdownCause = async () => {
      await Promise.race([promise, sleep(DAEMON_POLL_MS)]);
      return shutdownCause;
    };
    let toolHostWatcher;
    let createToolHostHandler;
    let sweepToolHost;
    try {
      let toolHostModule = await import("../remote/tools/toolHostAdvert.js");
      let checks = toolHostModule.liveToolHostChecks(config.dir, credentials);
      let switches = toolHostModule.liveToolHostSwitches({
        dir: config.dir,
        checks,
        isOfferingFolder: () => toolHostWatcher?.getToolHostAdvert().kind === "advertise",
        hasAccessToken: () => Boolean(getAccessToken()),
      });
      let toolHostHandler;
      let isPermanentError = false;
      toolHostWatcher = await toolHostModule.watchToolHostAdvert({
        dir: config.dir,
        log,
        checks,
        refuse: toolHostModule.helperRefusal,
        onVerdict: (verdict) => {
          if (toolHostHandler !== undefined && toolHostModule.isSwitchedOffRemotely(verdict))
            toolHostHandler.sweep("gate_off").catch((error) => logError(toError(error)));
        },
      });
      createToolHostHandler = (handlerArgs) => {
        try {
          toolHostHandler = toolHostModule.buildToolHostWorkHandler(
            {
              folder: config.dir,
              switches,
              ...handlerArgs,
              onLiveCountChange: (count) =>
                sendToParent({
                  type: "rc_serving_tools",
                  count,
                }),
            },
            {
              unattendedGrant: undefined,
              withoutShellSecrets: false,
            },
          );
        } catch (error) {
          logError(toError(error));
        }
        return toolHostHandler;
      };
      let sweepPromise;
      sweepToolHost = async () => {
        if (toolHostHandler !== undefined)
          sweepPromise ??= toolHostModule.sweepToolHostForShutdown(toolHostHandler);
        await sweepPromise;
      };
      signal.addEventListener("abort", () => void sweepToolHost?.(), {
        once: true,
      });
    } catch (error) {
      logError(toError(error));
    }
    let isPermanentFailure = false;
    try {
      await runBridgeHeadless(
        {
          dir: config.dir,
          name: config.name,
          spawnMode: config.spawnMode,
          capacity: config.capacity,
          permissionMode: config.permissionMode,
          createSessionOnStart: config.createSessionOnStart,
          getAccessToken,
          onAuth401: authClient.reportAuth401,
          log,
          storageV5,
          credentials,
          onBusyChange,
          persistActiveSessionsOnShutdown,
          awaitShutdownCause,
          getToolHostAdvert: toolHostWatcher?.getToolHostAdvert,
          createToolHostHandler,
        },
        signal,
      );
    } catch (error) {
      if (!(error instanceof BridgeHeadlessPermanentError)) throw error;
      log(error.message);
      isPermanentFailure = true;
    } finally {
      await sweepToolHost?.();
      stopBusyPing();
      toolHostWatcher?.stop();
      process.off("message", onParentMessage);
      await flushAnalyticsSinks();
    }
    if (isPermanentFailure) process.exit(EXIT_CONFIG_ERROR);
  };
});
//@ chunk-e3de30et.js:13196-13634 placement
/**
 * 检查 Remote Control worker 的资格（桥接阻断码、最低版本、组织）。
 */
async function checkRemoteControlWorkerEligibility() {
  let [{ getBridgeBlockedCode }, { checkBridgeMinVersion }, { getUserAttributes }] = await Promise.all([
    import("../bridge/applyRemoteControlToAppState.lazy.js"),
    import("../bridge/bridgeEnabled.js"),
    import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
  ]);
  if (!getUserAttributes().organizationUUID)
    return {
      reason: remoteControlStartError("token_scope_limited"),
      retry: false,
    };
  let blockedCode = await getBridgeBlockedCode();
  if (blockedCode !== null)
    return {
      reason: remoteControlStartError(blockedCode),
      retry: blockedCode === "flags_unreachable" || blockedCode === "not_signed_in",
    };
  let versionError = checkBridgeMinVersion();
  return versionError === null
    ? undefined
    : {
        reason: versionError,
        retry: false,
      };
}
//@ chunk-e3de30et.js:13634-13749 placement
function remoteControlStartError(code) {
  return `Remote Control cannot start (${code}). Run \`claude remote-control\` in a terminal to see why.`;
}
//@ chunk-e3de30et.js:13749-14031 placement
/**
 * 在 daemon 配置中添加或更新某目录的远程控制项，返回 added/updated。
 */
async function upsertRemoteControlDir(entry, storageV5, credentials) {
  return withFeatureTelemetry("daemon_rc_add", async () => {
    let outcome = "added";
    await updateDaemonConfig(
      (config) => {
        let entries = normalizeDirEntries(config.remoteControl);
        let index = entries.findIndex((existing) => existing.dir === entry.dir);
        if (index >= 0) {
          let definedFields = pickByHelper(entry, (value) => value !== undefined);
          entries[index] = {
            ...entries[index],
            ...definedFields,
          };
          outcome = "updated";
        } else {
          entries.push(entry);
          outcome = "added";
        }
        config.remoteControl = entries;
      },
      storageV5,
      credentials,
    );
    return outcome;
  });
}
//@ chunk-e3de30et.js:14031-14268 placement
/**
 * 从 daemon 配置中移除某目录的远程控制项，空时删除该字段。
 */
async function removeRemoteControlDir(entry, storageV5, credentials) {
  return withFeatureTelemetry("daemon_rc_remove", async () => {
    await updateDaemonConfig(
      (config) => {
        let entries = normalizeDirEntries(config.remoteControl);
        let filtered = entries.filter((existing) => existing.dir !== entry);
        if (filtered.length === entries.length) return false;
        if (filtered.length === 0) delete config.remoteControl;
        else config.remoteControl = filtered;
      },
      storageV5,
      credentials,
    );
  });
}
export {
  removeRemoteControlDir,
  checkRemoteControlWorkerEligibility,
  upsertRemoteControlDir,
  DaemonConfigSchema,
  handleRemoteControlInput,
  isShutdownResult,
  createWorkerAuthClient,
  createDaemonAuthManager,
};
