/**
 * utils/claudeInChrome/mcpServer.ts
 *
 * 内置 Chrome MCP 服务器（--claude-in-chrome-mcp）：组织策略检查与 bearer 门控、浏览器桥/原生宿主上下文、遥测白名单。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeInChrome/mcpServer.ts
 * pieces: chunk-ztt2k9pv.js (15)
 * attribution: fingerprint 6, callgraph-fingerprint 1, file-local 1, layout 7
 */
import { format } from "util";
import { fromEnum, lit, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../../services/analytics/safeMetadata.js";
import { sanitizedMachineReasonForTelemetry, errorMessage } from "../errors.js";
import { BROWSER_TOOLS, BROWSER_TOOL_TIMEOUT_MS } from "./browserToolSchemas.js";
import { normalizeUuidOrNull } from "../agentId.js";
import { env } from "../env.js";
import { getHostSuppliedKeyStatus } from "../hostSuppliedKey.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { getSecureSocketPath, getAllSocketPaths } from "./common.js";
import { countDisconnectedAnswers, phoneChromeAnswer } from "./phoneAnswer.js";
import {
  logToolCallDisconnected,
  bumpBrowserRoster,
  logExtensionConnected,
  logChromeBridgeConnected,
} from "./telemetry.js";
import {
  getGlobalConfig,
  saveGlobalConfig,
  watchGlobalConfigThroughStorage,
  seedInstallIDs,
} from "../config.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { HTTPS_CLAUDE_AI_CHROME } from "../../commands/chrome/chrome.js";
import { isClaudeAiChatCowork } from "../entrypointKinds.js";
import {
  supersedeHintedPreferredDeviceId,
  hintedPreferredDeviceId,
  hintedLocalDeviceIds,
  hintedHostPlatform,
} from "./browserHints.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { getAPIProvider, isActualFirstPartyAnthropicBaseUrl } from "../model/providers.js";
import { checkAndRefreshOAuthTokenIfNeeded, getClaudeAIOAuthTokens } from "../auth.js";
import { loginToHandOn } from "../auth/launcherHostLogin.js";
import { validateOauthToken } from "../../services/oauth/validateOauthToken.js";
import { logEvent } from "../../services/analytics/index.js";
import { getWebSocketTLSOptions } from "../mtls.js";
import { getWebSocketProxyUrl, configureGlobalAgents } from "../proxy.js";
import { fileSuffixForOauthConfig } from "../../constants/oauth.js";
import { fetchPolicyLimitsForBearer } from "../../services/policyLimits/PolicyLimitsClient.js";
import { isPolicyAllowedInResponse } from "../../services/policyLimits/policyEvidence.js";
import { logForDebugging, initDefaultDebugLog } from "../debug.js";
import { withFeatureTelemetry, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { loadFastPathPolicy } from "../../cli/fastPathSettings.js";
import { restoreGatewayAuthForFastPath } from "../auth/gatewayAuthFastPath.js";
import { initializeAnalyticsSink } from "../../services/analytics/sink.js";
import { pinStorageV5 } from "../storage/pinStorageV5.js";
import { credentialsStoreFor } from "../secureStorage/credentialsFileStore.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { shutdown1PEventLogging } from "../../services/analytics/firstPartyEventLogger.js";
import { shutdownDatadog } from "../../services/analytics/datadog.js";

//@ chunk-ztt2k9pv.js:12830-13177 fingerprint (2.1.88 match: SAFE_BRIDGE_STRING_KEYS, 0.455)
/**
 * Chrome 桥遥测字段白名单：bridge_status/error_type/tool_name/tool_use_id/transport 只允许已知取值，其余归为 other 或丢弃。
 */
function SAFE_BRIDGE_STRING_KEYS(safeKey, value) {
  switch (safeKey) {
    case "bridge_status":
      return value === "paired" || value === "waiting" ? fromEnum(value) : lit("other");
    case "error_type":
      return sanitizedMachineReasonForTelemetry(value);
    case "tool_name":
      return BROWSER_TOOLS.some((browserTool) => `browser:${browserTool.name}` === value)
        ? fromSanitizer_SANITIZER_OUTPUT_ONLY(value)
        : lit("browser:other");
    case "tool_use_id":
      return normalizeUuidOrNull(value) === null ? undefined : fromSanitizer_SANITIZER_OUTPUT_ONLY(value);
    case "transport":
      return value === "bridge" || value === "native" ? fromEnum(value) : lit("other");
    default:
      return;
  }
}
//@ chunk-ztt2k9pv.js:13177-13972 callgraph-fingerprint (2.1.88 match: BUG_REPORT_URL, 0.418)
/**
 * Chrome MCP 服务器常量：bug 反馈链接、权限模式 ask/skip_all_permission_checks/follow_a_plan、配对设备 ID 格式、browser_batch 90s 超时、断连提示文案片段。
 */
var BUG_REPORT_URL = "https://github.com/anthropics/claude-code/issues/new?labels=bug,claude-in-chrome";
var PERMISSION_MODES = ["ask", "skip_all_permission_checks", "follow_a_plan"];
var DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
var ALTERNATIVES_HINT =
  "If the user prefers, continue with alternatives (web search, or ask them to do the browser step themselves).";
var BROWSER_BATCH_TIMEOUT_MS = 90000;
var MULTI_ORG_HINT =
  " If the user belongs to more than one organization, the extension must also be signed in to the same organization as this conversation. To change the extension's organization, the user logs out in the extension's settings, then logs in and selects this conversation's organization. Logging out erases the shortcuts and scheduled tasks saved in the extension, so suggest it only if the other checks did not help and the user is in more than one organization, and tell the user about that loss first.";
//@ chunk-ztt2k9pv.js:13972-14012 file-local
/**
 * 判断字符串是否是合法的 Chrome 权限模式（ask/skip_all_permission_checks/follow_a_plan）。
 */
function isPermissionMode(raw) {
  return PERMISSION_MODES.some((m) => m === raw);
}
//@ chunk-ztt2k9pv.js:14012-14207 fingerprint (2.1.88 match: getChromeBridgeUrl, 0.875)
/**
 * 浏览器桥 WebSocket 地址：USE_LOCAL_OAUTH/LOCAL_BRIDGE → ws://localhost:8765，USE_STAGING_OAUTH → staging，否则 wss://bridge.claudeusercontent.com。
 */
function getChromeBridgeUrl() {
  if (env.USE_LOCAL_OAUTH || env.LOCAL_BRIDGE) return "ws://localhost:8765";
  if (env.USE_STAGING_OAUTH) return "wss://bridge-staging.claudeusercontent.com";
  return "wss://bridge.claudeusercontent.com";
}
//@ chunk-ztt2k9pv.js:14207-14261 fingerprint (2.1.88 match: isLocalBridge, 1)
/**
 * 是否连本地浏览器桥（USE_LOCAL_OAUTH 或 LOCAL_BRIDGE）。
 */
function isLocalBridge() {
  return env.USE_LOCAL_OAUTH || env.LOCAL_BRIDGE;
}
//@ chunk-ztt2k9pv.js:14261-19744 fingerprint (2.1.88 match: createChromeContext, 0.606)
/**
 * 构造 Chrome MCP 服务器上下文：日志器、socket 路径（本地原生宿主）、bridgeConfig（云端桥 URL、按 OAuth 令牌解析账户 UUID 并检测与持久化登录不一致、取 OAuth 令牌前经 bearerGate 校验组织策略、代理/TLS 选项）、CLAUDE_CHROME_PERMISSION_MODE/CLAUDE_CHROME_PAIRED_DEVICE_ID/CLAUDE_CHROME_TAB_GROUP_KEY 解析、断连时给模型的详细提示、配对成功写入全局配置 chromeExtension、遥测事件过滤。
 */
function createChromeContext(env_2, options) {
  let { availabilityFunnel = false, storageV5, credentials, bearerGate } = options;
  let logger = new DebugLogger();
  let CLAUDE_CODE_REMOTE_SESSION_ID =
    env_2?.CLAUDE_CODE_REMOTE_SESSION_ID ?? env.CLAUDE_CODE_REMOTE_SESSION_ID;
  let screenshotSaveDir;
  let chromeBridgeUrl = getChromeBridgeUrl();
  logger.info(`Bridge URL: ${chromeBridgeUrl}`);
  let cachedAccount;
  let accountMismatch = false;
  let permissionModeRaw = env_2?.CLAUDE_CHROME_PERMISSION_MODE ?? process.env.CLAUDE_CHROME_PERMISSION_MODE;
  let initialPermissionMode;
  if (permissionModeRaw)
    if (isPermissionMode(permissionModeRaw)) initialPermissionMode = permissionModeRaw;
    else
      logger.warn(
        `Invalid CLAUDE_CHROME_PERMISSION_MODE "${permissionModeRaw}". Valid values: ${PERMISSION_MODES.join(", ")}`,
      );
  let pairedDeviceIdRaw = env_2?.CLAUDE_CHROME_PAIRED_DEVICE_ID ?? env.CLAUDE_CHROME_PAIRED_DEVICE_ID;
  let pairedDeviceId;
  if (pairedDeviceIdRaw)
    if (DEVICE_ID_PATTERN.test(pairedDeviceIdRaw)) pairedDeviceId = pairedDeviceIdRaw;
    else logger.warn("Ignoring CLAUDE_CHROME_PAIRED_DEVICE_ID: not a browser extension device id");
  switch (getHostSuppliedKeyStatus()) {
    case "malformed":
      logger.warn('Ignoring CLAUDE_CHROME_TAB_GROUP_KEY: expected "chat:" followed by a lowercase UUID.');
      break;
    case "ignored":
      logger.info(
        "Ignoring CLAUDE_CHROME_TAB_GROUP_KEY: this process hosts several sessions, so each uses its own tab group.",
      );
      break;
    case "used":
      logger.info(
        "CLAUDE_CHROME_TAB_GROUP_KEY is set and well-formed. Claude Code's own browser calls carry it as the tab group key unless this process hosts several sessions.",
      );
      break;
    case "unset":
      break;
  }
  let session = claudeInChromeSession();
  return {
    serverName: "Claude in Chrome",
    logger,
    socketPath: getSecureSocketPath(),
    getSocketPaths: getAllSocketPaths,
    clientTypeId: "claude-code",
    onAuthenticationError: () => {
      logger.warn(
        "Authentication error occurred. Please ensure you are logged into the Claude browser extension with the same claude.ai account as Claude Code.",
      );
    },
    onToolCallDisconnected: countDisconnectedAnswers(() => {
      if (availabilityFunnel) logToolCallDisconnected(accountMismatch);
      if (accountMismatch)
        return `Browser extension is not connected: the OAuth token Claude Code is using belongs to a different claude.ai account than the one Claude Code is logged in as. If CLAUDE_CODE_OAUTH_TOKEN is set in your shell or CI profile, unset it (or re-mint it for this account), then run /logout and /login in Claude Code and make sure the browser extension is signed into the same claude.ai account. If you continue to experience issues, please report a bug: ${BUG_REPORT_URL}`;
      let phoneAnswer = phoneChromeAnswer();
      if (phoneAnswer !== undefined) return phoneAnswer;
      if (Boolean(pairedDeviceId) && !getGlobalConfig().chromeExtension?.pairedDeviceId)
        return `Browser extension is not connected. The browser chosen for this session could not be reached: the computer running it may be closed or asleep, Chrome may not be running there, or this session may not be able to connect to Chrome. Ask the user to make sure that computer is awake and Chrome is open there, then retry. If it still fails, ask the user to check that the Claude extension in that Chrome is signed in to the same claude.ai account they use here.${MULTI_ORG_HINT} ${ALTERNATIVES_HINT}`;
      if (isRemoteManagedEnvironment()) {
        let notConnectedMessage = `Browser extension is not connected. Chrome on the user's computer could not be reached from this session: that computer may be closed or asleep, Chrome may not be running there, the Claude extension may not be installed there (${HTTPS_CLAUDE_AI_CHROME}), or this session may not be able to connect to Chrome. Ask the user to make sure that computer is awake and Chrome is open there with the Claude extension, then retry. If it still fails, ask the user to check that the extension is signed in to the same claude.ai account they use here.${MULTI_ORG_HINT}`;
        return isClaudeAiChatCowork() ? `${notConnectedMessage} ${ALTERNATIVES_HINT}` : notConnectedMessage;
      }
      return `Browser extension is not connected. Please ensure the Claude browser extension is installed and running (${HTTPS_CLAUDE_AI_CHROME}), and that you are logged into claude.ai with the same account as Claude Code. If this is your first time connecting to Chrome, you may need to restart Chrome for the installation to take effect. If you continue to experience issues, please report a bug: ${BUG_REPORT_URL}`;
    }),
    onPeerRosterChanged: () => bumpBrowserRoster(session),
    onExtensionPaired: (deviceId, name) => {
      if (availabilityFunnel) logExtensionConnected();
      supersedeHintedPreferredDeviceId(deviceId);
      saveGlobalConfig((config) => {
        if (
          config.chromeExtension?.pairedDeviceId === deviceId &&
          config.chromeExtension?.pairedDeviceName === name
        )
          return config;
        return {
          ...config,
          chromeExtension: {
            pairedDeviceId: deviceId,
            pairedDeviceName: name,
          },
        };
      }, storageV5);
      logger.info(`Paired with "${name}" (${deviceId.slice(0, 8)})`);
    },
    getPersistedDeviceId: () =>
      hintedPreferredDeviceId(() => getGlobalConfig().chromeExtension?.pairedDeviceId || pairedDeviceId),
    getLocalDeviceIds: async () => hintedLocalDeviceIds(),
    getHostPlatform: () => hintedHostPlatform(),
    askUserToolName: ASKUSERQUESTION,
    getToolCallTimeoutMs: (req) =>
      req === "browser_batch" ? BROWSER_BATCH_TIMEOUT_MS : BROWSER_TOOL_TIMEOUT_MS,
    ...(screenshotSaveDir !== undefined && {
      getScreenshotSaveDir: () => screenshotSaveDir,
    }),
    bridgeConfig: {
      url: chromeBridgeUrl,
      getUserId: async () => {
        let persistedAccountUuid =
          getGlobalConfig().oauthAccount?.accountUuid || process.env.CLAUDE_CODE_ACCOUNT_UUID;
        if (getAPIProvider() !== "firstParty") {
          accountMismatch = false;
          return persistedAccountUuid;
        }
        await checkAndRefreshOAuthTokenIfNeeded({
          credentials,
          storageV5,
        }).catch(() => {});
        let accessToken = loginToHandOn(getClaudeAIOAuthTokens())?.accessToken;
        if (!accessToken) {
          accountMismatch = false;
          return persistedAccountUuid;
        }
        if (cachedAccount?.token !== accessToken) {
          let profile = await validateOauthToken(accessToken).catch(() => {
            return;
          });
          if (!profile?.account_uuid) {
            accountMismatch = false;
            return persistedAccountUuid;
          }
          cachedAccount = {
            token: accessToken,
            accountUuid: profile.account_uuid.toLowerCase(),
          };
        }
        let accountUuid = cachedAccount.accountUuid;
        let mismatch =
          persistedAccountUuid !== undefined && persistedAccountUuid.toLowerCase() !== accountUuid;
        if (mismatch && !accountMismatch) {
          logEvent("tengu_chrome_bridge_account_mismatch", {
            has_env_token: Boolean(env.CLAUDE_CODE_OAUTH_TOKEN),
            persisted_from_config: Boolean(getGlobalConfig().oauthAccount?.accountUuid),
          });
          logger.warn(
            "The OAuth token in use resolves to a different claude.ai account than the persisted Claude Code login. Using the token-derived account for the browser bridge. If CLAUDE_CODE_OAUTH_TOKEN is set, unset it or re-mint it for this account, then /logout and /login.",
          );
        }
        accountMismatch = mismatch;
        return accountUuid;
      },
      getOAuthToken: async () => {
        await checkAndRefreshOAuthTokenIfNeeded({
          credentials,
          storageV5,
          usesLoginOffFirstParty: true,
        }).catch(() => {});
        let token = loginToHandOn(getClaudeAIOAuthTokens())?.accessToken ?? "";
        if (token && !(await bearerGate(token))) return "";
        return token;
      },
      getWsOptions: () => {
        let tlsOptions = getWebSocketTLSOptions(undefined);
        let proxy = getWebSocketProxyUrl(chromeBridgeUrl);
        if (!tlsOptions && !proxy) return;
        return {
          ...tlsOptions,
          ...(proxy && {
            proxy,
          }),
        };
      },
      ...(isLocalBridge() && {
        devUserId: "dev_user_local",
      }),
    },
    ...(initialPermissionMode && {
      initialPermissionMode,
    }),
    ...false,
    trackEvent: (eventName, metadata) => {
      if (availabilityFunnel && eventName === "chrome_bridge_connection_succeeded") {
        let status = metadata?.status;
        logChromeBridgeConnected(status === "paired" || status === "waiting" ? status : undefined);
      }
      let safeMetadata = {};
      if (metadata)
        for (let [key, value] of Object.entries(metadata)) {
          let safeKey = key === "status" ? "bridge_status" : key;
          if (typeof value === "boolean" || typeof value === "number") safeMetadata[safeKey] = value;
          else if (typeof value === "string") {
            let safeValue = SAFE_BRIDGE_STRING_KEYS(safeKey, value);
            if (safeValue !== undefined) safeMetadata[safeKey] = safeValue;
          }
        }
      logEvent(eventName, safeMetadata);
    },
  };
}
//@ chunk-ztt2k9pv.js:19744-19755 layout
/**
 * 启动时读取组织 Chrome 策略的超时（3s）。
 */
var ORG_POLICY_TIMEOUT_MS = 3000;
//@ chunk-ztt2k9pv.js:19755-19934 layout
/**
 * 启动前读组织策略 allow_claude_browser_extension：先看短路条件，再刷新 OAuth 并用令牌查询。
 */
async function checkChromeOrgPolicy(options) {
  let shortCircuit = getPolicyShortCircuit();
  if (shortCircuit) return shortCircuit;
  await checkAndRefreshOAuthTokenIfNeeded(options).catch(() => {});
  let accessToken = loginToHandOn(getClaudeAIOAuthTokens())?.accessToken;
  if (!accessToken)
    return {
      denied: false,
      unverified: "no_oauth_token",
      verified: null,
    };
  return checkPolicyForToken(accessToken, options);
}
//@ chunk-ztt2k9pv.js:19934-20224 layout
/**
 * 策略短路：CLAUDE_CODE_CHROME_MCP_ORG_DENIED 直接拒绝；第三方提供商或自定义 base URL 时不读策略（unverified）。
 */
function getPolicyShortCircuit() {
  if (env.CLAUDE_CODE_CHROME_MCP_ORG_DENIED)
    return {
      denied: true,
      cause: "parent_org_policy",
    };
  if (getAPIProvider() !== "firstParty")
    return {
      denied: false,
      unverified: "third_party_provider",
      verified: null,
    };
  if (!isActualFirstPartyAnthropicBaseUrl() || fileSuffixForOauthConfig() === "-local-oauth")
    return {
      denied: false,
      unverified: "custom_base_url",
      verified: null,
    };
  return null;
}
//@ chunk-ztt2k9pv.js:20224-20513 layout
/**
 * 用指定 bearer 拉取 policy limits，判断是否允许 allow_claude_browser_extension；拉取失败为 policy_unverified。
 */
async function checkPolicyForToken(bearer, { timeoutMs } = {}) {
  let shortCircuit = getPolicyShortCircuit();
  if (shortCircuit) return shortCircuit;
  let limits = await fetchPolicyLimitsForBearer(bearer, {
    timeoutMs,
  });
  if (!limits)
    return {
      denied: false,
      unverified: "policy_unverified",
      verified: null,
    };
  return isPolicyAllowedInResponse(limits, "allow_claude_browser_extension")
    ? {
        denied: false,
        unverified: null,
        verified: {
          bearer,
        },
      }
    : {
        denied: true,
        cause: "org_policy",
      };
}
//@ chunk-ztt2k9pv.js:20513-20833 layout
/**
 * 生成 bearerGate：已验证令牌直接放行，被拒令牌记黑名单不交给桥，新令牌各查一次策略。
 */
function createBearerGate(verified) {
  let verifiedBearer = verified?.bearer;
  let deniedTokens = new Set();
  return async (token) => {
    if (token === verifiedBearer) return true;
    if (deniedTokens.has(token)) return false;
    let verdict = await checkPolicyForToken(token);
    if (verdict.denied) {
      deniedTokens.add(token);
      logForDebugging(`[Claude in Chrome] ${ORG_DENIED_MESSAGE} (bridge token withheld)`, {
        level: "warn",
      });
      return false;
    }
    if (verdict.verified) verifiedBearer = verdict.verified.bearer;
    else
      logForDebugging(`[Claude in Chrome] ${describeUnverifiedPolicy(verdict.unverified)}`, {
        level: "warn",
      });
    return true;
  };
}
//@ chunk-ztt2k9pv.js:20833-20899 layout
/**
 * 组织策略禁用 Claude in Chrome 时的提示文案。
 */
var ORG_DENIED_MESSAGE = "Claude in Chrome is disabled by your organization policy.";
//@ chunk-ztt2k9pv.js:20899-21450 layout
/**
 * 策略未能验证的原因 → 警告文案（扩展侧仍会执行组织设置）。
 */
function describeUnverifiedPolicy(unverified) {
  switch (unverified) {
    case "third_party_provider":
    case "custom_base_url":
      return "Organization Claude in Chrome policy not read: third-party provider or custom ANTHROPIC_BASE_URL. Continuing; the extension enforces the org setting.";
    case "no_oauth_token":
      return "Organization Claude in Chrome policy not read: no claude.ai sign-in. Continuing; the extension enforces the org setting.";
    case "policy_unverified":
      return "Couldn't read your organization's Claude in Chrome policy (network or server error). Continuing; the extension enforces the org setting.";
  }
}
//@ chunk-ztt2k9pv.js:21450-22678 fingerprint (2.1.88 match: runClaudeInChromeMcpServer, 0.46)
/**
 * `claude --claude-in-chrome-mcp` 入口：加载存储与凭证、配置全局代理，检查组织策略（拒绝则退出 1），用 createChromeContext 构造上下文，经 @ant/claude-for-chrome-mcp 的 createClaudeForChromeMcpServer 创建服务器并接到 StdioServerTransport；stdin 结束时清理退出。
 */
async function runClaudeInChromeMcpServer(options) {
  return withFeatureTelemetry("chrome_mcp_server_start", async () => {
    let startupWarning = await loadFastPathPolicy(options);
    if (startupWarning)
      process.stderr.write(`${startupWarning}
`);
    try {
      await restoreGatewayAuthForFastPath();
    } catch (error) {
      process.stderr
        .write(`[Claude in Chrome] could not load the Cloud gateway sign-in, so this server runs as if it were not signed in to the gateway, until it restarts. Fix this error: ${errorMessage(error)}
`);
    }
    initializeAnalyticsSink();
    let storageV5 = pinStorageV5(options);
    let credentials = credentialsStoreFor(storageV5);
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      initDefaultDebugLog({
        storageV5,
      });
      watchGlobalConfigThroughStorage(storageV5);
      let { primeFastPathCredentials } = await import("../primeFastPathCredentials.lazy.js");
      await primeFastPathCredentials(credentials);
      await seedInstallIDs(storageV5);
    }
    configureGlobalAgents();
    let policyVerdict = await checkChromeOrgPolicy({
      credentials,
      storageV5,
      timeoutMs: ORG_POLICY_TIMEOUT_MS,
    });
    if (policyVerdict.denied) {
      process.stderr.write(`${ORG_DENIED_MESSAGE}
`);
      logFeatureBad("chrome_mcp_server_start", policyVerdict.cause);
      await shutdown1PEventLogging();
      await shutdownDatadog();
      process.exit(1);
    }
    if (!policyVerdict.verified)
      logForDebugging(`[Claude in Chrome] ${describeUnverifiedPolicy(policyVerdict.unverified)}`, {
        level: "warn",
      });
    let chromeContext = createChromeContext(undefined, {
      storageV5,
      credentials,
      bearerGate: createBearerGate(policyVerdict.verified),
    });
    let { createClaudeForChromeMcpServer } = await import("./BROWSER_TOOLS.lazy.js");
    let { StdioServerTransport } =
      await import("../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/stdio.js");
    let server = createClaudeForChromeMcpServer(chromeContext);
    let transport = new StdioServerTransport();
    let isShuttingDown = false;
    let shutdownAndExit = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      await shutdown1PEventLogging();
      await shutdownDatadog();
      process.exit(0);
    };
    process.stdin.on("end", () => void shutdownAndExit());
    process.stdin.on("error", () => void shutdownAndExit());
    logForDebugging("[Claude in Chrome] Starting MCP server");
    await server.connect(transport);
    logForDebugging("[Claude in Chrome] MCP server started");
  });
}
//@ chunk-ztt2k9pv.js:22678-22898 fingerprint (2.1.88 match: DebugLogger, 1)
/**
 * 把 Chrome MCP 库的日志接到 Claude Code 调试日志（silly/debug→debug）。
 */
class DebugLogger {
  silly(message, ...args) {
    logForDebugging(format(message, ...args), {
      level: "debug",
    });
  }
  debug(message, ...args) {
    logForDebugging(format(message, ...args), {
      level: "debug",
    });
  }
  info(message, ...args) {
    logForDebugging(format(message, ...args), {
      level: "info",
    });
  }
  warn(message, ...args) {
    logForDebugging(format(message, ...args), {
      level: "warn",
    });
  }
  error(message, ...args) {
    logForDebugging(format(message, ...args), {
      level: "error",
    });
  }
}
export { createChromeContext, runClaudeInChromeMcpServer };
