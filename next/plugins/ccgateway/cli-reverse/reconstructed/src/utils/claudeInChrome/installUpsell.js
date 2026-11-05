/**
 * utils/claudeInChrome/installUpsell.ts
 *
 * 2.1.316 新增：Claude in Chrome 安装推广
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (13)
 * attribution: placement 13
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, _enum, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME, openInChrome, detectAvailableBrowser } from "./common.js";
import { logForDebugging } from "../debug.js";
import { HTTPS_CLAUDE_AI_CHROME } from "../../commands/chrome/chrome.js";
import { createSignal } from "../signal.js";
import {
  isChromeExtensionInstalled,
  isClaudeInChromeAllowed,
  setupClaudeInChrome,
  CHROME_EXTENSION_RECONNECT_URL,
  markClaudeInChromeUnwired,
  isClaudeInChromeWiredThisSession,
  hasBaseChromeOfferEligibility,
  hasChromeExtensionEvidence,
} from "./setup.js";
import { sleep } from "../sleep.js";
import { saveGlobalConfig, getGlobalConfig } from "../config.js";
import { isChromeServerPolicyDenied, sessionAutoAllowsToolCalls } from "./serverPolicy.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { callMcpTool } from "../../services/mcp/mcpWireUtils.js";
import { jsonParse } from "../slowOperations.js";
import { maybeAddBrowserBatchToChromeSelect, isToolSearchEnabledOptimistic } from "../toolSearch.js";
import { getChromeSystemPrompt } from "../toolSearchChrome.js";
import {
  isDiskless,
  getIsNonInteractiveSession,
  getTeammateAgentId,
  getSessionBypassPermissionsMode,
  getTeleportedSessionInfo,
} from "../../bootstrap/state.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { isActingAsBgJob } from "../concurrentSessions.js";
import { isSafeMode, isAntBuild } from "../envUtils.js";
import { getPlatform } from "../platform.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  CHROME_NOT_SET_UP_RESULT,
  CHROME_POLICY_DENIED_RESULT,
  CHROME_INSTALL_DECLINED_RESULT,
} from "./skillAvailability.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
import { codeModeHidesToolNamesFromApi, offInCodeModeNoteForModel } from "../codeMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ne2890fx.js:34310-34462 placement
/**
 * Chrome 安装推荐对话框的定义（结果：安装 / 暂不 / 不再询问 / 取消）。
 */
var CHROME_INSTALL_UPSELL_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ne2890fx.js:34310", () => {
  CHROME_INSTALL_UPSELL_DIALOG = withHideWhile({
    kind: "chrome_install_upsell",
    payload: DoctorLazy(() => objectSchema({})),
    result: DoctorLazy(() => _enum(["install", "not_now", "dont_ask_again", "cancelled"])),
    default: "cancelled",
  });
});
//@ chunk-ne2890fx.js:34462-34716 placement
/**
 * Chrome 安装设置对话框的定义（阶段：等待安装、连接中、卡住、已连接、失败；结果：继续 / 继续等待 / 跳过 / 取消）。
 */
var CHROME_INSTALL_SETUP_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ne2890fx.js:34462", () => {
  CHROME_INSTALL_SETUP_DIALOG = withHideWhile({
    kind: "chrome_install_setup",
    payload: DoctorLazy(() =>
      objectSchema({
        phase: _enum(["waiting_install", "connecting", "stalled", "connected", "failed"]),
        installPageOpened: booleanSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["continue", "keep_waiting", "skip", "cancelled"])),
    default: "cancelled",
    hideWhile: [],
  });
});
//@ chunk-ne2890fx.js:34716-35001 placement
/**
 * 安装完成后把 claude-in-chrome MCP 服务器接入当前会话：更新动态 MCP 配置，并交给会话的 MCP 连接管理器 adoptServer（无管理器时等下次 reconcile）。
 */
function adoptChromeMcpServer(context, connection) {
  context.onChangeDynamicMcpConfig?.((config) => ({
    ...config,
    [CLAUDE_IN_CHROME_MCP_SERVER_NAME]: connection.client.config,
  }));
  let connections = context.session.mcpSessionWiring.connections();
  if (!connections) {
    logForDebugging(
      "[claude-in-chrome] no MCP connections owner on this session; the browser tools land on the next reconcile",
    );
    return;
  }
  connections.adoptServer(CLAUDE_IN_CHROME_MCP_SERVER_NAME, connection, {
    asked: true,
  });
}
//@ chunk-ne2890fx.js:35001-35061 placement
/**
 * 等待扩展安装的轮询间隔（2 秒）。
 */
var CHROME_INSTALL_POLL_MS = 2000;
var CHROME_INSTALL_SLOW_POLL_AFTER_MS = 30000;
var CHROME_INSTALL_SLOW_POLL_MS = 5000;
var CHROME_CONNECT_TIMEOUT_MS = 15000;
var CHROME_CONNECT_STALL_MS = 45000;
var CHROME_UPSELL_SETTLE_MS = 5000;
var MAX_CHROME_CONNECT_ATTEMPTS = 5;
//@ chunk-ne2890fx.js:35061-35131 placement
/**
 * 惰性加载 MCP 客户端模块（用于重连与清缓存）。
 */
function mcpClientModule() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-ne2890fx.js:35131-39072 placement
/**
 * Chrome 安装引导：打开扩展安装页，轮询直到检测到扩展，写 cachedChromeExtensionInstalled 后进入连接阶段；遇到托管策略拒绝则停止。
 */
async function runChromeInstallSetup(context, requestDialog) {
  let signal = context.abortController.signal;
  let installPageOpened = await openInChrome(HTTPS_CLAUDE_AI_CHROME).catch((error) => {
    logForDebugging(`[Claude in Chrome] Install setup failed to open install page: ${error}`, {
      level: "error",
    });
    return false;
  });
  let abortController = new AbortController();
  let onAbort = () => abortController.abort();
  if (signal.aborted) abortController.abort();
  else
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
  let phase = "waiting_install";
  let signal_2 = createSignal();
  function setPhase(nextPhase) {
    if (phase === nextPhase) return;
    phase = nextPhase;
    signal_2.emit();
  }
  let didWire = false;
  let completed = false;
  let failureReason = "setup_connect_failed";
  let connection;
  let connectionRef;
  let driverPromise = runSetupDriver().catch((error) => {
    logForDebugging(`[Claude in Chrome] Install setup driver failed: ${error}`, {
      level: "error",
    });
    failureReason = "setup_driver_error";
    setPhase("failed");
  });
  async function runSetupDriver() {
    let now = Date.now();
    while (!abortController.signal.aborted) {
      if (await isChromeExtensionInstalled().catch(() => false)) break;
      await sleep(
        Date.now() - now >= CHROME_INSTALL_SLOW_POLL_AFTER_MS
          ? CHROME_INSTALL_SLOW_POLL_MS
          : CHROME_INSTALL_POLL_MS,
        abortController.signal,
      );
    }
    if (abortController.signal.aborted) return;
    setPhase("connecting");
    saveGlobalConfig(
      (config) =>
        config.cachedChromeExtensionInstalled === true
          ? config
          : {
              ...config,
              cachedChromeExtensionInstalled: true,
            },
      context.storageV5,
    );
    if (isChromeServerPolicyDenied()) {
      logForDebugging(
        "[Claude in Chrome] Install setup stopped: managed policy denied the chrome MCP server during the install wait",
      );
      failureReason = "policy_denied_mid_wait";
      setPhase("failed");
      return;
    }
    if (!isClaudeInChromeAllowed()) {
      logForDebugging(
        "[Claude in Chrome] Install setup stopped: organization policy (allow_claude_browser_extension) denied Claude in Chrome during the install wait",
      );
      failureReason = "chrome_policy_denied_mid_wait";
      setPhase("failed");
      return;
    }
    didWire = true;
    let { mcpConfig } = setupClaudeInChrome({
      skipReconnectAutoOpen: true,
    });
    let serverConfig = mcpConfig[CLAUDE_IN_CHROME_MCP_SERVER_NAME];
    if (!serverConfig) {
      failureReason = "setup_no_config";
      setPhase("failed");
      return;
    }
    let { reconnectMcpServerImpl } = mcpClientModule();
    let reconnectResult;
    try {
      reconnectResult = await reconnectMcpServerImpl(
        CLAUDE_IN_CHROME_MCP_SERVER_NAME,
        serverConfig,
        context.storageV5,
        context.credentials,
      );
    } catch (error) {
      logForDebugging(`[Claude in Chrome] Install setup MCP connect failed: ${error}`, {
        level: "error",
      });
      failureReason = "setup_reconnect_error";
      setPhase("failed");
      return;
    }
    if (reconnectResult.client.type === "connected")
      connectionRef = {
        config: serverConfig,
      };
    if (reconnectResult.client.type !== "connected" || abortController.signal.aborted) {
      if (!abortController.signal.aborted) {
        failureReason = "setup_client_not_connected";
        setPhase("failed");
      }
      return;
    }
    let now_2 = Date.now();
    let nudged = false;
    let probeErrors = 0;
    while (!abortController.signal.aborted) {
      let probeOutcome = await probeChromeConnection(reconnectResult.client, abortController.signal);
      if (probeOutcome === "connected") {
        connection = reconnectResult;
        setPhase("connected");
        return;
      }
      if (probeOutcome === "error") {
        probeErrors++;
        if (probeErrors >= MAX_CHROME_CONNECT_ATTEMPTS) {
          failureReason = "setup_probe_errors";
          setPhase("failed");
          return;
        }
      } else probeErrors = 0;
      let elapsedMs = Date.now() - now_2;
      if (!nudged && elapsedMs >= CHROME_CONNECT_TIMEOUT_MS) {
        nudged = true;
        openInChrome(CHROME_EXTENSION_RECONNECT_URL).catch((error) =>
          logForDebugging(`[Claude in Chrome] Install setup reconnect nudge failed: ${error}`),
        );
      }
      if (phase === "connecting" && elapsedMs >= CHROME_CONNECT_STALL_MS) setPhase("stalled");
      await sleep(CHROME_INSTALL_POLL_MS, abortController.signal);
    }
  }
  function snapshot() {
    return {
      phase,
      installPageOpened,
    };
  }
  async function* phaseStream() {
    let lastSnapshot = snapshot();
    yield lastSnapshot;
    while (!abortController.signal.aborted) {
      if (snapshot().phase !== lastSnapshot.phase) {
        lastSnapshot = snapshot();
        yield lastSnapshot;
        continue;
      }
      await waitForChange();
      if (abortController.signal.aborted) return;
    }
  }
  function waitForChange() {
    return new Promise((resolve) => {
      let unsubscribe = signal_2.subscribe(() => {
        unsubscribe();
        abortController.signal.removeEventListener("abort", onAbortSignal);
        resolve();
      });
      let onAbortSignal = () => {
        unsubscribe();
        resolve();
      };
      abortController.signal.addEventListener("abort", onAbortSignal, {
        once: true,
      });
    });
  }
  try {
    while (true) {
      let dialogResult = await requestDialog(CHROME_INSTALL_SETUP_DIALOG, phaseStream(), {
        signal,
      });
      if (dialogResult === "keep_waiting") continue;
      let { phase } = snapshot();
      if (dialogResult === "continue" && phase === "connected" && connection) {
        if (isChromeServerPolicyDenied()) {
          logFeatureSad("chrome_install_upsell", "policy_denied_late", {
            install_page_opened: installPageOpened,
          });
          return SETUP_POLICY_DENIED_RESULT;
        }
        if (!isClaudeInChromeAllowed()) {
          logFeatureSad("chrome_install_upsell", "chrome_policy_denied_late", {
            install_page_opened: installPageOpened,
          });
          return SETUP_POLICY_DENIED_RESULT;
        }
        if (sessionAutoAllowsToolCalls(context)) {
          logFeatureSad("chrome_install_upsell", "bypass_mode_late", {
            install_page_opened: installPageOpened,
          });
          return SETUP_BYPASS_MODE_RESULT;
        }
        let setupResult = completeChromeSetup(context, connection, installPageOpened);
        completed = true;
        connectionRef = undefined;
        return setupResult;
      }
      if (phase === "failed") {
        if (failureReason === "policy_denied_mid_wait" || failureReason === "chrome_policy_denied_mid_wait") {
          logFeatureSad("chrome_install_upsell", failureReason, {
            install_page_opened: installPageOpened,
          });
          return SETUP_POLICY_DENIED_RESULT;
        }
        logFeatureBad("chrome_install_upsell", failureReason, {
          install_page_opened: installPageOpened,
        });
        return SETUP_CONNECT_FAILED_RESULT;
      }
      if (dialogResult === "cancelled" && signal.aborted) {
        logFeatureSad("chrome_install_upsell", "setup_aborted", {
          install_page_opened: installPageOpened,
        });
        return SETUP_INTERRUPTED_RESULT;
      }
      logFeatureSad(
        "chrome_install_upsell",
        phase === "waiting_install"
          ? "setup_skipped_waiting_install"
          : phase === "connected"
            ? "setup_skipped_after_connect"
            : "setup_skipped_connecting",
        {
          install_page_opened: installPageOpened,
        },
      );
      return SETUP_SKIPPED_RESULT;
    }
  } catch (error) {
    if (signal.aborted) {
      logFeatureSad("chrome_install_upsell", "setup_aborted", {
        install_page_opened: installPageOpened,
      });
      return SETUP_INTERRUPTED_RESULT;
    }
    logForDebugging(`[Claude in Chrome] Install setup dialog failed: ${error}`, {
      level: "error",
    });
    logFeatureBad("chrome_install_upsell", "setup_dialog_error", {
      install_page_opened: installPageOpened,
    });
    return SETUP_INTERNAL_ERROR_RESULT;
  } finally {
    signal.removeEventListener("abort", onAbort);
    abortController.abort();
    if (!completed) {
      if (didWire) markClaudeInChromeUnwired();
      driverPromise
        .then(() => {
          if (!connectionRef) return;
          let { config } = connectionRef;
          connectionRef = undefined;
          return mcpClientModule().clearServerCache(CLAUDE_IN_CHROME_MCP_SERVER_NAME, config);
        })
        .catch((error) =>
          logForDebugging(`[Claude in Chrome] Install setup orphan cleanup failed: ${error}`, {
            level: "error",
          }),
        );
    }
  }
}
//@ chunk-ne2890fx.js:39072-39531 placement
/**
 * 在超时内调用 list_connected_browsers 探测扩展是否已连接：返回 connected / not_connected / error。
 */
async function probeChromeConnection(client, signal) {
  try {
    let winner = await Promise.race([
      callMcpTool(
        client,
        {
          name: "list_connected_browsers",
          arguments: {},
        },
        undefined,
        true,
      ),
      sleep(CHROME_UPSELL_SETTLE_MS, signal).then(() => {
        return;
      }),
    ]);
    if (!winner) return "not_connected";
    let firstBlock = Array.isArray(winner.content) ? winner.content[0] : undefined;
    let text =
      firstBlock &&
      typeof firstBlock === "object" &&
      "text" in firstBlock &&
      typeof firstBlock.text === "string"
        ? firstBlock.text
        : undefined;
    if (!text) return "not_connected";
    let parsed;
    try {
      parsed = jsonParse(text);
    } catch {
      return "not_connected";
    }
    return Array.isArray(parsed) && parsed.length > 0 ? "connected" : "not_connected";
  } catch {
    return "error";
  }
}
//@ chunk-ne2890fx.js:39531-40088 placement
/**
 * Chrome 安装设置完成：接入 MCP、写全局配置（默认启用、完成引导、扩展已安装）、记埋点，返回给模型的"浏览器工具已可用"说明与 Chrome 系统提示。
 */
function completeChromeSetup(context, connection, installPageOpened) {
  adoptChromeMcpServer(context, connection);
  saveGlobalConfig(
    (chunk) =>
      chunk.claudeInChromeDefaultEnabled === true &&
      chunk.hasCompletedClaudeInChromeOnboarding === true &&
      chunk.cachedChromeExtensionInstalled === true
        ? chunk
        : {
            ...chunk,
            claudeInChromeDefaultEnabled: true,
            hasCompletedClaudeInChromeOnboarding: true,
            cachedChromeExtensionInstalled: true,
          },
    context.storageV5,
  );
  logFeatureOk("chrome_install_upsell", {
    install_page_opened: installPageOpened,
  });
  return `Claude in Chrome setup completed: the extension is installed and connected, and the mcp__claude-in-chrome__* browser tools are now available in this session. Continue the user's task using them.

${maybeAddBrowserBatchToChromeSelect(getChromeSystemPrompt(isToolSearchEnabledOptimistic()))}`;
}
//@ chunk-ne2890fx.js:40088-42470 placement
/**
 * Chrome 安装设置未完成时给模型的结果文案：用户选择跳过、连接失败、回合被中断、内部错误、组织策略禁止、切换到 bypass 模式。
 */
var SETUP_SKIPPED_RESULT =
  "The user started installing the Claude in Chrome extension but chose to continue without browser tools. Do not suggest the extension again this session. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. If they finish installing later, /chrome completes the connection, and the next Claude Code session detects the extension automatically.";
var SETUP_CONNECT_FAILED_RESULT =
  "The Claude in Chrome extension was installed, but the browser connection could not be established in this session. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. The user can finish the connection with /chrome (Reconnect extension), and the next Claude Code session will detect the extension automatically.";
var SETUP_INTERRUPTED_RESULT =
  "Claude in Chrome setup did not complete because the turn was interrupted \u2014 the user did not choose to continue without browser tools. Continue without browser tools for now (WebFetch and WebSearch cover read-only web content). If the user finishes installing, /chrome completes the connection, and the next Claude Code session detects the extension automatically.";
var SETUP_INTERNAL_ERROR_RESULT =
  "Claude in Chrome setup ended early due to an internal error; the extension may or may not be installed. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. The user can finish setup with /chrome, and the next Claude Code session detects the extension automatically.";
var SETUP_POLICY_DENIED_RESULT =
  "Browser automation is not available: this organization's managed settings do not permit the Claude in Chrome MCP server (the policy loaded while setup was in progress). Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. Do not suggest the extension again.";
var SETUP_BYPASS_MODE_RESULT =
  "Browser tools were not enabled: the session switched to a mode that auto-allows tool calls without prompts (bypass permissions) while setup was in progress, and Claude in Chrome is not wired into that configuration. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. Once the session leaves that mode, /chrome completes the connection.";
//@ chunk-ne2890fx.js:42470-42766 placement
/**
 * 是否显示 Chrome 安装推荐：未接入、未处理过、组织允许、具备基本资格、非远程/WSL/teleport 等、扩展未安装、未被关闭，且 GrowthBook tengu_chrome_install_upsell。
 */
function shouldOfferChromeInstallUpsell() {
  if (isDiskless() || isClaudeInChromeWiredThisSession()) return false;
  if (claudeInChromeSession().installUpsellResolution !== undefined) return false;
  return (
    isClaudeInChromeAllowed() &&
    hasBaseChromeOfferEligibility() &&
    !getIsNonInteractiveSession() &&
    !isActingAsBgJob() &&
    getTeammateAgentId() === undefined &&
    !isSafeMode() &&
    !getSessionBypassPermissionsMode() &&
    getPlatform() !== "wsl" &&
    !isRemoteSessionAvailable() &&
    getTeleportedSessionInfo()?.isTeleported !== true &&
    !isAntBuild() &&
    !hasChromeExtensionEvidence() &&
    getGlobalConfig().chromeInstallUpsellDismissed !== true &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_chrome_install_upsell", false) &&
    !isChromeServerPolicyDenied()
  );
}
//@ chunk-ne2890fx.js:42766-42825 placement
/**
 * 本会话是否已解析过 Chrome 安装升级提示。
 */
function hasInstallUpsellResolution() {
  return claudeInChromeSession().installUpsellResolution !== undefined;
}
//@ chunk-ne2890fx.js:42825-43431 placement
/**
 * 浏览器技能不可用时决定是否推荐安装 Claude in Chrome（每会话只解析一次并缓存 Promise）：技能预加载、子代理、无盘或已中断时直接返回默认结果。
 */
async function resolveChromeInstallUpsell(context) {
  if (
    context.options?.isSkillPreload ||
    context.agentId !== undefined ||
    isDiskless() ||
    context.abortController.signal.aborted
  )
    return CHROME_NOT_SET_UP_RESULT;
  if (codeModeAccepted() && codeModeHidesToolNamesFromApi()) return offInCodeModeNoteForModel();
  let session = claudeInChromeSession();
  if (session.installUpsellResolution) return session.installUpsellResolution;
  let requestDialog = context.requestDialog;
  if (!requestDialog) {
    session.installUpsellResolution = Promise.resolve(CHROME_NOT_SET_UP_RESULT);
    return session.installUpsellResolution;
  }
  session.installUpsellResolution = runChromeInstallUpsell(context, requestDialog).catch((error) => {
    if (context.abortController.signal.aborted) {
      session.installUpsellResolution = undefined;
      return CHROME_NOT_SET_UP_RESULT;
    }
    logForDebugging(`[Claude in Chrome] Install upsell failed: ${error}`, {
      level: "error",
    });
    logFeatureBad("chrome_install_upsell", "upsell_error");
    return CHROME_NOT_SET_UP_RESULT;
  });
  return session.installUpsellResolution;
}
//@ chunk-ne2890fx.js:43431-45421 placement
/**
 * 安装推荐主流程：策略禁止、扩展已安装、bypass 模式、无 Chromium 浏览器时跳过；否则弹出推荐对话框，按 install / dont_ask_again / not_now 处理并返回给模型的文案。
 */
async function runChromeInstallUpsell(context, requestDialog) {
  if (isChromeServerPolicyDenied()) {
    logForDebugging(
      "[Claude in Chrome] Skipping install upsell: managed MCP policy (deniedMcpServers or managed-mcp.json) blocks the chrome MCP server",
    );
    logFeatureSad("chrome_install_upsell", "policy_denied");
    return CHROME_POLICY_DENIED_RESULT;
  }
  if (!isClaudeInChromeAllowed()) {
    logForDebugging(
      "[Claude in Chrome] Skipping install upsell: denied by organization policy (allow_claude_browser_extension)",
    );
    logFeatureSad("chrome_install_upsell", "chrome_policy_denied");
    return CHROME_POLICY_DENIED_RESULT;
  }
  if (await isChromeExtensionInstalled().catch(() => false)) {
    saveGlobalConfig(
      (config) =>
        config.cachedChromeExtensionInstalled === true
          ? config
          : {
              ...config,
              cachedChromeExtensionInstalled: true,
            },
      context.storageV5,
    );
    return "The Claude in Chrome extension is installed, but browser tools are not enabled for this session. Tell the user Claude Code can work in their Chrome browser once browser tools are on: they can run /chrome to manage them, or restart Claude Code to get a one-time prompt to enable them. Do not attempt mcp__claude-in-chrome__* tool calls this session.";
  }
  if (context.abortController.signal.aborted) {
    claudeInChromeSession().installUpsellResolution = undefined;
    return CHROME_NOT_SET_UP_RESULT;
  }
  if (sessionAutoAllowsToolCalls(context)) {
    logForDebugging(
      "[Claude in Chrome] Skipping install upsell: session auto-allows tool calls with no prompt (bypass or plan+bypass)",
    );
    if (!claudeInChromeSession().installUpsellBypassSuppressionCounted) {
      claudeInChromeSession().installUpsellBypassSuppressionCounted = true;
      logFeatureSad("chrome_install_upsell", "suppressed_bypass_mode");
    }
    claudeInChromeSession().installUpsellResolution = undefined;
    return CHROME_NOT_SET_UP_RESULT;
  }
  if ((await detectAvailableBrowser()) === null) {
    logForDebugging("[Claude in Chrome] Skipping install upsell: no Chromium-family browser detected");
    logFeatureSad("chrome_install_upsell", "no_browser_detected");
    return CHROME_NOT_SET_UP_RESULT;
  }
  switch (
    await requestDialog(
      CHROME_INSTALL_UPSELL_DIALOG,
      {},
      {
        signal: context.abortController.signal,
      },
    )
  ) {
    case "install": {
      let setupResult = await runChromeInstallSetup(context, requestDialog);
      if (setupResult === SETUP_INTERRUPTED_RESULT)
        claudeInChromeSession().installUpsellResolution = undefined;
      return setupResult;
    }
    case "dont_ask_again":
      logFeatureSad("chrome_install_upsell", "dont_ask_again");
      saveGlobalConfig(
        (config) =>
          config.chromeInstallUpsellDismissed === true
            ? config
            : {
                ...config,
                chromeInstallUpsellDismissed: true,
              },
        context.storageV5,
      );
      return CHROME_INSTALL_DECLINED_RESULT;
    case "not_now":
      logFeatureSad("chrome_install_upsell", "declined");
      return CHROME_INSTALL_DECLINED_RESULT;
    case "cancelled":
      if (context.abortController.signal.aborted) {
        claudeInChromeSession().installUpsellResolution = undefined;
        return CHROME_NOT_SET_UP_RESULT;
      }
      logFeatureSad("chrome_install_upsell", "cancelled");
      return CHROME_INSTALL_DECLINED_RESULT;
  }
}
export {
  CHROME_INSTALL_UPSELL_DIALOG,
  CHROME_INSTALL_SETUP_DIALOG,
  resolveChromeInstallUpsell,
  hasInstallUpsellResolution,
  shouldOfferChromeInstallUpsell,
};
