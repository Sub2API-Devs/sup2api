/**
 * utils/claudeInChrome/installUpsell.ts
 *
 * 2.1.316 新增：Claude in Chrome 安装推广
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (13)
 * attribution: placement 13
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, U, M } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { Yi } from "../../commands/mobile/mobile.js";
import { isActingAsBgJob } from "../concurrentSessions.js";
import { isSafeMode, isAntBuild } from "../envUtils.js";
import { getPlatform } from "../platform.js";
import { wt } from "../../remote/remoteMode.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  CHROME_NOT_SET_UP_RESULT,
  CHROME_POLICY_DENIED_RESULT,
  CHROME_INSTALL_DECLINED_RESULT,
} from "./skillAvailability.js";

/**
 * Chrome 安装推荐对话框的定义（结果：安装 / 暂不 / 不再询问 / 取消）。
 */
//@ chunk-hantmvxa.js:34162-34314 placement
var CHROME_INSTALL_UPSELL_DIALOG = withHideWhile({
  kind: "chrome_install_upsell",
  payload: DoctorLazy(() => u({})),
  result: DoctorLazy(() => U(["install", "not_now", "dont_ask_again", "cancelled"])),
  default: "cancelled",
});
/**
 * Chrome 安装设置对话框的定义（阶段：等待安装、连接中、卡住、已连接、失败；结果：继续 / 继续等待 / 跳过 / 取消）。
 */
//@ chunk-hantmvxa.js:34314-34568 placement
var CHROME_INSTALL_SETUP_DIALOG = withHideWhile({
  kind: "chrome_install_setup",
  payload: DoctorLazy(() =>
    u({
      phase: U(["waiting_install", "connecting", "stalled", "connected", "failed"]),
      installPageOpened: M(),
    }),
  ),
  result: DoctorLazy(() => U(["continue", "keep_waiting", "skip", "cancelled"])),
  default: "cancelled",
  hideWhile: [],
});
/**
 * 安装完成后把 claude-in-chrome MCP 服务器接入当前会话：更新动态 MCP 配置，并交给会话的 MCP 连接管理器 adoptServer（无管理器时等下次 reconcile）。
 */
//@ chunk-hantmvxa.js:34568-34853 placement
function adoptChromeMcpServer(e, n) {
  e.onChangeDynamicMcpConfig?.((r) => ({ ...r, [CLAUDE_IN_CHROME_MCP_SERVER_NAME]: n.client.config }));
  let connections = e.session.mcpSessionWiring.connections();
  if (!connections) {
    logForDebugging(
      "[claude-in-chrome] no MCP connections owner on this session; the browser tools land on the next reconcile",
    );
    return;
  }
  connections.adoptServer(CLAUDE_IN_CHROME_MCP_SERVER_NAME, n, { asked: !0 });
}
//@ chunk-hantmvxa.js:34853-34913 placement
var xt = 2000,
  zn = 30000,
  Vn = 5000,
  Kn = 15000,
  Xn = 45000,
  Jn = 5000,
  Qn = 5;
//@ chunk-hantmvxa.js:34913-34983 placement
function It() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
/**
 * Chrome 安装引导：打开扩展安装页，轮询直到检测到扩展，写 cachedChromeExtensionInstalled 后进入连接阶段；遇到托管策略拒绝则停止。
 */
//@ chunk-hantmvxa.js:34983-38924 placement
async function runChromeInstallSetup(e, n) {
  let signal = e.abortController.signal,
    r = await openInChrome(HTTPS_CLAUDE_AI_CHROME).catch(
      (P) => (
        logForDebugging(`[Claude in Chrome] Install setup failed to open install page: ${P}`, {
          level: "error",
        }),
        !1
      ),
    ),
    abortController = new AbortController(),
    y = () => abortController.abort();
  if (signal.aborted) abortController.abort();
  else signal.addEventListener("abort", y, { once: !0 });
  let w = "waiting_install",
    b = createSignal();
  function k(P) {
    if (w === P) return;
    ((w = P), b.emit());
  }
  let C = !1,
    S = !1,
    T = "setup_connect_failed",
    R,
    L,
    x = D().catch((P) => {
      (logForDebugging(`[Claude in Chrome] Install setup driver failed: ${P}`, { level: "error" }),
        (T = "setup_driver_error"),
        k("failed"));
    });
  async function D() {
    let now = Date.now();
    while (!abortController.signal.aborted) {
      if (await isChromeExtensionInstalled().catch(() => !1)) break;
      await sleep(Date.now() - now >= zn ? Vn : xt, abortController.signal);
    }
    if (abortController.signal.aborted) return;
    if (
      (k("connecting"),
      saveGlobalConfig(
        (H) => (H.cachedChromeExtensionInstalled === !0 ? H : { ...H, cachedChromeExtensionInstalled: !0 }),
        e.storageV5,
      ),
      isChromeServerPolicyDenied())
    ) {
      (logForDebugging(
        "[Claude in Chrome] Install setup stopped: managed policy denied the chrome MCP server during the install wait",
      ),
        (T = "policy_denied_mid_wait"),
        k("failed"));
      return;
    }
    if (!isClaudeInChromeAllowed()) {
      (logForDebugging(
        "[Claude in Chrome] Install setup stopped: organization policy (allow_claude_browser_extension) denied Claude in Chrome during the install wait",
      ),
        (T = "chrome_policy_denied_mid_wait"),
        k("failed"));
      return;
    }
    C = !0;
    let { mcpConfig: mcpConfig } = setupClaudeInChrome({ skipReconnectAutoOpen: !0 }),
      q = mcpConfig[CLAUDE_IN_CHROME_MCP_SERVER_NAME];
    if (!q) {
      ((T = "setup_no_config"), k("failed"));
      return;
    }
    let { reconnectMcpServerImpl: reconnectMcpServerImpl } = It(),
      se;
    try {
      se = await reconnectMcpServerImpl(CLAUDE_IN_CHROME_MCP_SERVER_NAME, q, e.storageV5, e.credentials);
    } catch (error) {
      (logForDebugging(`[Claude in Chrome] Install setup MCP connect failed: ${error}`, { level: "error" }),
        (T = "setup_reconnect_error"),
        k("failed"));
      return;
    }
    if (se.client.type === "connected") L = { config: q };
    if (se.client.type !== "connected" || abortController.signal.aborted) {
      if (!abortController.signal.aborted) ((T = "setup_client_not_connected"), k("failed"));
      return;
    }
    let now_2 = Date.now(),
      ve = !1,
      re = 0;
    while (!abortController.signal.aborted) {
      let H = await probeChromeConnection(se.client, abortController.signal);
      if (H === "connected") {
        ((R = se), k("connected"));
        return;
      }
      if (H === "error") {
        if ((re++, re >= Qn)) {
          ((T = "setup_probe_errors"), k("failed"));
          return;
        }
      } else re = 0;
      let be = Date.now() - now_2;
      if (!ve && be >= Kn)
        ((ve = !0),
          openInChrome(CHROME_EXTENSION_RECONNECT_URL).catch((pe) =>
            logForDebugging(`[Claude in Chrome] Install setup reconnect nudge failed: ${pe}`),
          ));
      if (w === "connecting" && be >= Xn) k("stalled");
      await sleep(xt, abortController.signal);
    }
  }
  function B() {
    return { phase: w, installPageOpened: r };
  }
  async function* j() {
    let P = B();
    yield P;
    while (!abortController.signal.aborted) {
      if (B().phase !== P.phase) {
        ((P = B()), yield P);
        continue;
      }
      if ((await W(), abortController.signal.aborted)) return;
    }
  }
  function W() {
    return new Promise((P) => {
      let subscribe = b.subscribe(() => {
          (subscribe(), abortController.signal.removeEventListener("abort", q), P());
        }),
        q = () => {
          (subscribe(), P());
        };
      abortController.signal.addEventListener("abort", q, { once: !0 });
    });
  }
  try {
    while (!0) {
      let P = await n(CHROME_INSTALL_SETUP_DIALOG, j(), { signal: signal });
      if (P === "keep_waiting") continue;
      let { phase: phase } = B();
      if (P === "continue" && phase === "connected" && R) {
        if (isChromeServerPolicyDenied())
          return (
            logFeatureSad("chrome_install_upsell", "policy_denied_late", { install_page_opened: r }),
            SETUP_POLICY_DENIED_RESULT
          );
        if (!isClaudeInChromeAllowed())
          return (
            logFeatureSad("chrome_install_upsell", "chrome_policy_denied_late", { install_page_opened: r }),
            SETUP_POLICY_DENIED_RESULT
          );
        if (sessionAutoAllowsToolCalls(e))
          return (
            logFeatureSad("chrome_install_upsell", "bypass_mode_late", { install_page_opened: r }),
            SETUP_BYPASS_MODE_RESULT
          );
        let q = completeChromeSetup(e, R, r);
        return ((S = !0), (L = void 0), q);
      }
      if (phase === "failed") {
        if (T === "policy_denied_mid_wait" || T === "chrome_policy_denied_mid_wait")
          return (
            logFeatureSad("chrome_install_upsell", T, { install_page_opened: r }),
            SETUP_POLICY_DENIED_RESULT
          );
        return (
          logFeatureBad("chrome_install_upsell", T, { install_page_opened: r }),
          SETUP_CONNECT_FAILED_RESULT
        );
      }
      if (P === "cancelled" && signal.aborted)
        return (
          logFeatureSad("chrome_install_upsell", "setup_aborted", { install_page_opened: r }),
          SETUP_INTERRUPTED_RESULT
        );
      return (
        logFeatureSad(
          "chrome_install_upsell",
          phase === "waiting_install"
            ? "setup_skipped_waiting_install"
            : phase === "connected"
              ? "setup_skipped_after_connect"
              : "setup_skipped_connecting",
          { install_page_opened: r },
        ),
        SETUP_SKIPPED_RESULT
      );
    }
  } catch (error) {
    if (signal.aborted)
      return (
        logFeatureSad("chrome_install_upsell", "setup_aborted", { install_page_opened: r }),
        SETUP_INTERRUPTED_RESULT
      );
    return (
      logForDebugging(`[Claude in Chrome] Install setup dialog failed: ${error}`, { level: "error" }),
      logFeatureBad("chrome_install_upsell", "setup_dialog_error", { install_page_opened: r }),
      SETUP_INTERNAL_ERROR_RESULT
    );
  } finally {
    if ((signal.removeEventListener("abort", y), abortController.abort(), !S)) {
      if (C) markClaudeInChromeUnwired();
      x.then(() => {
        if (!L) return;
        let { config: config } = L;
        return ((L = void 0), It().clearServerCache(CLAUDE_IN_CHROME_MCP_SERVER_NAME, config));
      }).catch((P) =>
        logForDebugging(`[Claude in Chrome] Install setup orphan cleanup failed: ${P}`, { level: "error" }),
      );
    }
  }
}
/**
 * 在超时内调用 list_connected_browsers 探测扩展是否已连接：返回 connected / not_connected / error。
 */
//@ chunk-hantmvxa.js:38924-39383 placement
async function probeChromeConnection(e, n) {
  try {
    let winner = await Promise.race([
      callMcpTool(e, { name: "list_connected_browsers", arguments: {} }, void 0, !0),
      sleep(Jn, n).then(() => {
        return;
      }),
    ]);
    if (!winner) return "not_connected";
    let r = Array.isArray(winner.content) ? winner.content[0] : void 0,
      h = r && typeof r === "object" && "text" in r && typeof r.text === "string" ? r.text : void 0;
    if (!h) return "not_connected";
    let y;
    try {
      y = jsonParse(h);
    } catch {
      return "not_connected";
    }
    return Array.isArray(y) && y.length > 0 ? "connected" : "not_connected";
  } catch {
    return "error";
  }
}
/**
 * Chrome 安装设置完成：接入 MCP、写全局配置（默认启用、完成引导、扩展已安装）、记埋点，返回给模型的"浏览器工具已可用"说明与 Chrome 系统提示。
 */
//@ chunk-hantmvxa.js:39383-39940 placement
function completeChromeSetup(context, connection, installPageOpened) {
  return (
    adoptChromeMcpServer(context, connection),
    saveGlobalConfig(
      (r) =>
        r.claudeInChromeDefaultEnabled === !0 &&
        r.hasCompletedClaudeInChromeOnboarding === !0 &&
        r.cachedChromeExtensionInstalled === !0
          ? r
          : {
              ...r,
              claudeInChromeDefaultEnabled: !0,
              hasCompletedClaudeInChromeOnboarding: !0,
              cachedChromeExtensionInstalled: !0,
            },
      context.storageV5,
    ),
    logFeatureOk("chrome_install_upsell", { install_page_opened: installPageOpened }),
    `Claude in Chrome setup completed: the extension is installed and connected, and the mcp__claude-in-chrome__* browser tools are now available in this session. Continue the user's task using them.

${maybeAddBrowserBatchToChromeSelect(getChromeSystemPrompt(isToolSearchEnabledOptimistic()))}`
  );
}
/**
 * Chrome 安装设置未完成时给模型的结果文案：用户选择跳过、连接失败、回合被中断、内部错误、组织策略禁止、切换到 bypass 模式。
 */
//@ chunk-hantmvxa.js:39940-42322 placement
var SETUP_SKIPPED_RESULT =
    "The user started installing the Claude in Chrome extension but chose to continue without browser tools. Do not suggest the extension again this session. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. If they finish installing later, /chrome completes the connection, and the next Claude Code session detects the extension automatically.",
  SETUP_CONNECT_FAILED_RESULT =
    "The Claude in Chrome extension was installed, but the browser connection could not be established in this session. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. The user can finish the connection with /chrome (Reconnect extension), and the next Claude Code session will detect the extension automatically.",
  SETUP_INTERRUPTED_RESULT =
    "Claude in Chrome setup did not complete because the turn was interrupted \u2014 the user did not choose to continue without browser tools. Continue without browser tools for now (WebFetch and WebSearch cover read-only web content). If the user finishes installing, /chrome completes the connection, and the next Claude Code session detects the extension automatically.",
  SETUP_INTERNAL_ERROR_RESULT =
    "Claude in Chrome setup ended early due to an internal error; the extension may or may not be installed. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. The user can finish setup with /chrome, and the next Claude Code session detects the extension automatically.",
  SETUP_POLICY_DENIED_RESULT =
    "Browser automation is not available: this organization's managed settings do not permit the Claude in Chrome MCP server (the policy loaded while setup was in progress). Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. Do not suggest the extension again.",
  SETUP_BYPASS_MODE_RESULT =
    "Browser tools were not enabled: the session switched to a mode that auto-allows tool calls without prompts (bypass permissions) while setup was in progress, and Claude in Chrome is not wired into that configuration. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. Once the session leaves that mode, /chrome completes the connection.";
/**
 * 是否显示 Chrome 安装推荐：未接入、未处理过、组织允许、具备基本资格、非远程/WSL/teleport 等、扩展未安装、未被关闭，且 GrowthBook tengu_chrome_install_upsell。
 */
//@ chunk-hantmvxa.js:42322-42618 placement
function shouldOfferChromeInstallUpsell() {
  if (isDiskless() || isClaudeInChromeWiredThisSession()) return !1;
  if (Yi().installUpsellResolution !== void 0) return !1;
  return (
    isClaudeInChromeAllowed() &&
    hasBaseChromeOfferEligibility() &&
    !getIsNonInteractiveSession() &&
    !isActingAsBgJob() &&
    getTeammateAgentId() === void 0 &&
    !isSafeMode() &&
    !getSessionBypassPermissionsMode() &&
    getPlatform() !== "wsl" &&
    !wt() &&
    getTeleportedSessionInfo()?.isTeleported !== !0 &&
    !isAntBuild() &&
    !hasChromeExtensionEvidence() &&
    getGlobalConfig().chromeInstallUpsellDismissed !== !0 &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_chrome_install_upsell", !1) &&
    !isChromeServerPolicyDenied()
  );
}
//@ chunk-hantmvxa.js:42618-42677 placement
function $t() {
  return Yi().installUpsellResolution !== void 0;
}
/**
 * 浏览器技能不可用时决定是否推荐安装 Claude in Chrome（每会话只解析一次并缓存 Promise）：技能预加载、子代理、无盘或已中断时直接返回默认结果。
 */
//@ chunk-hantmvxa.js:42677-43256 placement
async function resolveChromeInstallUpsell(e) {
  if (e.options?.isSkillPreload || e.agentId !== void 0 || isDiskless() || e.abortController.signal.aborted)
    return CHROME_NOT_SET_UP_RESULT;
  let n = Yi();
  if (n.installUpsellResolution) return n.installUpsellResolution;
  let requestDialog = e.requestDialog;
  if (!requestDialog)
    return (
      (n.installUpsellResolution = Promise.resolve(CHROME_NOT_SET_UP_RESULT)),
      n.installUpsellResolution
    );
  return (
    (n.installUpsellResolution = runChromeInstallUpsell(e, requestDialog).catch((r) => {
      if (e.abortController.signal.aborted)
        return ((n.installUpsellResolution = void 0), CHROME_NOT_SET_UP_RESULT);
      return (
        logForDebugging(`[Claude in Chrome] Install upsell failed: ${r}`, { level: "error" }),
        logFeatureBad("chrome_install_upsell", "upsell_error"),
        CHROME_NOT_SET_UP_RESULT
      );
    })),
    n.installUpsellResolution
  );
}
/**
 * 安装推荐主流程：策略禁止、扩展已安装、bypass 模式、无 Chromium 浏览器时跳过；否则弹出推荐对话框，按 install / dont_ask_again / not_now 处理并返回给模型的文案。
 */
//@ chunk-hantmvxa.js:43256-45246 placement
async function runChromeInstallUpsell(context, requestDialog) {
  if (isChromeServerPolicyDenied())
    return (
      logForDebugging(
        "[Claude in Chrome] Skipping install upsell: managed MCP policy (deniedMcpServers or managed-mcp.json) blocks the chrome MCP server",
      ),
      logFeatureSad("chrome_install_upsell", "policy_denied"),
      CHROME_POLICY_DENIED_RESULT
    );
  if (!isClaudeInChromeAllowed())
    return (
      logForDebugging(
        "[Claude in Chrome] Skipping install upsell: denied by organization policy (allow_claude_browser_extension)",
      ),
      logFeatureSad("chrome_install_upsell", "chrome_policy_denied"),
      CHROME_POLICY_DENIED_RESULT
    );
  if (await isChromeExtensionInstalled().catch(() => !1))
    return (
      saveGlobalConfig(
        (y) => (y.cachedChromeExtensionInstalled === !0 ? y : { ...y, cachedChromeExtensionInstalled: !0 }),
        context.storageV5,
      ),
      "The Claude in Chrome extension is installed, but browser tools are not enabled for this session. Tell the user Claude Code can work in their Chrome browser once browser tools are on: they can run /chrome to manage them, or restart Claude Code to get a one-time prompt to enable them. Do not attempt mcp__claude-in-chrome__* tool calls this session."
    );
  if (context.abortController.signal.aborted)
    return ((Yi().installUpsellResolution = void 0), CHROME_NOT_SET_UP_RESULT);
  if (sessionAutoAllowsToolCalls(context)) {
    if (
      (logForDebugging(
        "[Claude in Chrome] Skipping install upsell: session auto-allows tool calls with no prompt (bypass or plan+bypass)",
      ),
      !Yi().installUpsellBypassSuppressionCounted)
    )
      ((Yi().installUpsellBypassSuppressionCounted = !0),
        logFeatureSad("chrome_install_upsell", "suppressed_bypass_mode"));
    return ((Yi().installUpsellResolution = void 0), CHROME_NOT_SET_UP_RESULT);
  }
  if ((await detectAvailableBrowser()) === null)
    return (
      logForDebugging("[Claude in Chrome] Skipping install upsell: no Chromium-family browser detected"),
      logFeatureSad("chrome_install_upsell", "no_browser_detected"),
      CHROME_NOT_SET_UP_RESULT
    );
  switch (await requestDialog(CHROME_INSTALL_UPSELL_DIALOG, {}, { signal: context.abortController.signal })) {
    case "install": {
      let y = await runChromeInstallSetup(context, requestDialog);
      if (y === SETUP_INTERRUPTED_RESULT) Yi().installUpsellResolution = void 0;
      return y;
    }
    case "dont_ask_again":
      return (
        logFeatureSad("chrome_install_upsell", "dont_ask_again"),
        saveGlobalConfig(
          (y) => (y.chromeInstallUpsellDismissed === !0 ? y : { ...y, chromeInstallUpsellDismissed: !0 }),
          context.storageV5,
        ),
        CHROME_INSTALL_DECLINED_RESULT
      );
    case "not_now":
      return (logFeatureSad("chrome_install_upsell", "declined"), CHROME_INSTALL_DECLINED_RESULT);
    case "cancelled":
      if (context.abortController.signal.aborted)
        return ((Yi().installUpsellResolution = void 0), CHROME_NOT_SET_UP_RESULT);
      return (logFeatureSad("chrome_install_upsell", "cancelled"), CHROME_INSTALL_DECLINED_RESULT);
  }
}

export {
  CHROME_INSTALL_UPSELL_DIALOG,
  CHROME_INSTALL_SETUP_DIALOG,
  shouldOfferChromeInstallUpsell,
  resolveChromeInstallUpsell,
  $t,
};
