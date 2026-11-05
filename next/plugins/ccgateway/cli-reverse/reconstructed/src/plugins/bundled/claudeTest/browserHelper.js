/**
 * plugins/bundled/claudeTest/browserHelper.ts
 *
 * 2.1.316 新增：Claude Test 浏览器助手（Playwright MCP 服务器）的启停、登录变化监视与移除
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mhn0amzz.js (52)
 * attribution: placement 52
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, resolve, join } from "path";
import { readdir } from "fs/promises";
import { claudeTestMarkState } from "./commandHook.js";
import { isSyntheticOutputToolEnabled } from "../../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { withDeadline } from "../../../utils/sleep.js";
import { getBuiltinPlugins, isBuiltinPluginAvailable } from "../../builtinPlugins.js";
import {
  CC_PLUGIN_CLAUDE_TEST,
  HELPER_SERVER_NAME,
  BROWSER,
  CLAUDE_TEST_EXPLORER,
  CLAUDE_TEST_AUTHOR,
  CLAUDE_TEST_RUNNER,
} from "./constants.js";
import { reloadBoundPlugins } from "../../functionHooks/devModsWatch.js";
import { claudeTestState } from "./appFacts.js";
import { isFrozenMarker } from "../../../utils/frozenMarkers.js";
import { isBridgeOrVerifiedSlackTurn } from "../../../utils/promptSubmissionOrigin.js";
import { logError } from "../../../utils/log.js";
import { withTelemetryMessage, toError, errorMessage } from "../../../utils/errors.js";
import { HostScoped } from "../../../utils/hostScoped.js";
import { loginEventCounter } from "../../../services/oauth/loginEvents.js";
import { onGrowthBookRefresh } from "../../../services/analytics/growthbook.js";
import { onPolicyVerdictChanged } from "../../../services/policyLimits/policyState.js";
import { subscribeGlobalConfigInstalled } from "../../../utils/config.js";
import { onCredentialChange } from "../../../utils/auth/credentialEpoch.js";
import { onComplianceTaintsChanged } from "../../../services/policyLimits/complianceTaints.js";
import { clearPluginCache } from "../../../utils/plugins/pluginLoader.js";
import { currentSurfaceBinding } from "../../functionHooks/surfaceBinding.js";
import { getRootSession, getProjectRoot } from "../../../bootstrap/state.js";
import { readSignedInAccount } from "./consent.js";
import { loadedModuleArgs } from "../../hooksModules/loadedModuleFilters.js";
import { getClaudeAIOAuthTokensAsync } from "../../../utils/auth.js";
import { uiLog } from "../../functionHooks/hooksWorkerClient.js";
import { clearPluginAgents } from "../../../utils/plugins/pluginLoadState.js";
import { refreshAgentsAndDefinitions } from "../../functionHooks/hooksModuleLoader.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  booleanSchema,
  array,
  unknown,
  literal,
  _enum,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { isSubpathOf } from "../../../utils/pathPrefix.js";
import { isUntouchableSpelling } from "../../../utils/networkPaths.js";
import { logForDebugging } from "../../../utils/debug.js";
import { readPluginFileSafe, readSmallFileText } from "../../../utils/plugins/safeFileRead.js";
import {
  logFeatureOkAsync,
  logFeatureBadAsync,
  logFeatureOk,
  logFeatureBad,
} from "../../../services/analytics/featureTelemetry.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import { stripBom } from "../../../utils/json.js";
import { getCwd } from "../../../utils/cwd.js";
import { isBackgroundShellDisabled } from "../../../tools/AgentTool/backgroundGates.js";
import {
  isAsyncReplEnabled,
  isAsyncLaneMode,
} from "../../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-mhn0amzz.js:107549-107561 placement
/**
 * 重新加载 Claude Test 模块的超时时间（5 秒）。
 */
var CLAUDE_TEST_RELOAD_TIMEOUT_MS = 5000;
//@ chunk-mhn0amzz.js:107561-107791 placement
/**
 * 确保 Claude Test 模块已重新加载（带超时），返回 not-tried/loaded/held/slow/failed。
 */
async function ensureClaudeTestReloaded(opts, timeoutMs = CLAUDE_TEST_RELOAD_TIMEOUT_MS) {
  try {
    let state = claudeTestMarkState();
    if (state.reload === undefined) {
      if (!isSyntheticOutputToolEnabled(opts)) return "not-tried";
      state.reload = reloadClaudeTestModule().then((outcome) => {
        state.outcome = outcome;
        return outcome;
      });
    }
    let outcome = (await withDeadline(state.reload, timeoutMs)) ?? "slow";
    return outcome === "loaded" && !isAbortableAndEnabled(opts)() ? "failed" : outcome;
  } catch {
    return "failed";
  }
}
//@ chunk-mhn0amzz.js:107791-107833 placement
/**
 * 判断 Claude Test 模块是否已发起重载。
 */
function isClaudeTestReloadPending() {
  return claudeTestMarkState().reload !== undefined;
}
//@ chunk-mhn0amzz.js:107833-107903 placement
/**
 * 判断重载已发起但还没有结果。
 */
function isClaudeTestReloadOutstanding() {
  let state = claudeTestMarkState();
  return state.reload !== undefined && state.outcome === undefined;
}
//@ chunk-mhn0amzz.js:107903-107977 placement
/**
 * 返回一个检查函数：信号未中止且 Claude Test 插件仍启用。
 */
function isAbortableAndEnabled(opts) {
  let { signal } = opts.abortController;
  return () => !signal.aborted && isClaudeTestPluginEnabled();
}
//@ chunk-mhn0amzz.js:107977-108034 placement
/**
 * 判断 Claude Test 是否在内置插件的启用列表中。
 */
function isClaudeTestPluginEnabled() {
  return getBuiltinPlugins().enabled.some((plugin) => plugin.name === CC_PLUGIN_CLAUDE_TEST);
}
//@ chunk-mhn0amzz.js:108198-108323 placement
/**
 * 重新加载插件模块，返回 held/loaded/failed。
 */
async function reloadClaudeTestModule() {
  try {
    if ((await reloadBoundPlugins()) === "held") return "held";
    return claudeTestState.isModuleLoaded ? "loaded" : "failed";
  } catch {
    return "failed";
  }
}
//@ chunk-mhn0amzz.js:108323-108418 placement
/**
 * 若消息由 composer 直接提交且非冻结标记、非子代理，返回其标记。
 */
function composerSubmitMarker(payload) {
  let submittedFromComposer = payload.submittedFromComposer;
  return isFrozenMarker(submittedFromComposer) &&
    !isBridgeOrVerifiedSlackTurn(payload) &&
    payload.agentId === undefined
    ? submittedFromComposer
    : undefined;
}
//@ chunk-mhn0amzz.js:108418-108505 placement
/**
 * 把本次工具调用的参数与 composer 提交标记记到助手状态里。
 */
function rememberComposerMark(args, ctx) {
  try {
    let marker = composerSubmitMarker(ctx);
    claudeTestMarkState().mark =
      marker === undefined
        ? undefined
        : {
            args,
            marker,
          };
  } catch {}
}
//@ chunk-mhn0amzz.js:108505-108642 placement
/**
 * 取出并清除提交标记，判断本次调用是否由 composer 直接提交同样参数触发。
 */
function consumeComposerMark(args, ctx) {
  let state = claudeTestMarkState();
  let mark = state.mark;
  state.mark = undefined;
  return (
    mark !== undefined &&
    mark.args === args &&
    ctx.agentId === undefined &&
    ctx.submittedFromComposer === mark.marker
  );
}
//@ chunk-mhn0amzz.js:108642-109134 placement
/**
 * 浏览器助手被关闭时的两段用户提示：登录/计划变化导致关闭，以及插件当前不可用导致关闭。
 */
var HELPER_OFF_LOGIN_CHANGED_TEXT =
  "Claude Test's browser helper is off now, because the Claude Code login or plan changed, or could not be checked. A test run in progress can no longer use the browser. If /claude-test shows in the command list, type it to start again.";
var HELPER_OFF_UNAVAILABLE_TEXT =
  "Claude Test's browser helper is off because Claude Test is not available in this session right now. A test run in progress can no longer use the browser. If /claude-test shows again, for example a moment after a /login, type it to start again.";
//@ chunk-mhn0amzz.js:109134-109254 placement
/**
 * 浏览器助手登录监视的初始状态。
 */
function createHelperWatchState() {
  return {
    watched: undefined,
    isCheckQueued: false,
    stopsInFlight: 0,
    isRecheckOwed: false,
    isRemovalOwed: false,
    owedLine: undefined,
  };
}
//@ chunk-mhn0amzz.js:109254-109518 placement
/**
 * 浏览器助手控制器：start / mayRun / takeOut / mayConnect（登录未变化且未在停止时才允许连接）。
 */
function createBrowserHelperController(helper, state = createHelperWatchState()) {
  return {
    start: () => describeHelperStop(helper, state),
    mayRun: () => checkHelperMayRun(helper, state),
    takeOut: () => void removeBrowserHelper(helper, state),
    mayConnect: () => {
      let { watched } = state;
      let login = helper.login();
      if (watched !== undefined && login === undefined) queueLoginRecheck(helper, state);
      return (
        watched !== undefined &&
        state.stopsInFlight === 0 &&
        !state.isRemovalOwed &&
        helper.isModuleLoaded() &&
        sameLogin(login, watched.login)
      );
    },
  };
}
//@ chunk-mhn0amzz.js:109518-109528 placement
/**
 * 空串（无登录）
 */
var NO_LOGIN_ALIAS = "";
//@ chunk-mhn0amzz.js:109528-109558 placement
/**
 * 登录等价比较
 */
function sameLogin(login, login_2) {
  return login === login_2;
}
//@ chunk-mhn0amzz.js:109558-110030 placement
function describeHelperStop(helper, state) {
  let login = helper.login();
  let { watched } = state;
  if (state.stopsInFlight > 0 || state.isRemovalOwed) {
    stopLoginWatch_2(helper, state);
    return "not_offered";
  }
  if (watched !== undefined && !sameLogin(login, watched.login)) {
    stopLoginWatch_2(helper, state, HELPER_OFF_LOGIN_CHANGED_TEXT);
    return "login_changed";
  }
  if (watched === undefined) {
    if (login === undefined) {
      stopLoginWatch_2(helper, state);
      return "failed";
    }
    try {
      state.watched = {
        login,
        stop: helper.subscribe(() => queueLoginRecheck(helper, state)),
      };
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "claude-test: could not watch who is signed in; stopping the browser helper",
        ),
      );
      stopLoginWatch_2(helper, state);
      return "failed";
    }
  }
  if (!helper.isOffered()) {
    stopLoginWatch_2(helper, state);
    return "not_offered";
  }
  return "watching";
}
//@ chunk-mhn0amzz.js:110030-110311 placement
/**
 * 判断助手能否运行：停止中或待移除时不提供；登录变化时停止并返回 login_changed。
 */
function checkHelperMayRun(helper, state) {
  let { watched } = state;
  if (state.stopsInFlight > 0) return "not_offered";
  if (state.isRemovalOwed) {
    stopLoginWatch_2(helper, state);
    return "not_offered";
  }
  if (watched !== undefined && !sameLogin(helper.login(), watched.login)) {
    stopLoginWatch_2(helper, state, HELPER_OFF_LOGIN_CHANGED_TEXT);
    return "login_changed";
  }
  if (helper.isOffered()) return "yes";
  if (watched !== undefined || helper.isRunning()) stopLoginWatch_2(helper, state);
  return "not_offered";
}
//@ chunk-mhn0amzz.js:110311-110406 placement
/**
 * 把“重新核对浏览器助手登录状态”排到微任务里，避免重复排队。
 */
function queueLoginRecheck(helper, state) {
  if (state.isCheckQueued) return;
  state.isCheckQueued = true;
  queueMicrotask(() => void recheckHelperLogin(helper, state));
}
//@ chunk-mhn0amzz.js:110406-110685 placement
/**
 * 预热登录后重新核对：登录变了或插件不再提供时停止助手。
 */
async function recheckHelperLogin(helper, state) {
  await Promise.resolve()
    .then(helper.warmLogin)
    .catch(() => {});
  state.isCheckQueued = false;
  let { watched } = state;
  if (watched === undefined) return;
  if (state.stopsInFlight > 0) {
    state.isRecheckOwed = true;
    return;
  }
  let loginUnchanged = sameLogin(helper.login(), watched.login);
  if (!state.isRemovalOwed && loginUnchanged && helper.isOffered()) return;
  await stopLoginWatch_2(
    helper,
    state,
    loginUnchanged ? HELPER_OFF_UNAVAILABLE_TEXT : HELPER_OFF_LOGIN_CHANGED_TEXT,
  );
}
//@ chunk-mhn0amzz.js:110685-111142 placement
async function stopLoginWatch_2(helper, state, reason) {
  let { watched } = state;
  if (reason !== undefined && helper.isRunning()) state.owedLine = reason;
  state.stopsInFlight += 1;
  let stopped = await stopHelperServer(helper);
  state.stopsInFlight -= 1;
  if (!stopped) {
    state.isRemovalOwed = true;
    if (state.isRecheckOwed && state.stopsInFlight === 0) {
      state.isRecheckOwed = false;
      queueLoginRecheck(helper, state);
    }
    return;
  }
  state.isRecheckOwed = false;
  state.isRemovalOwed = false;
  let { owedLine } = state;
  state.owedLine = undefined;
  if (state.watched === watched) state.watched = undefined;
  if (watched !== undefined) runCleanupStep("end the login watch", watched.stop);
  stopLoginWatch(state);
  if (owedLine !== undefined) runCleanupStep("show the stop message", () => helper.tell(owedLine));
}
//@ chunk-mhn0amzz.js:111142-111241 placement
/**
 * 停掉当前登录监视并清空监视对象。
 */
function stopLoginWatch(state) {
  let { watched } = state;
  if (watched?.login === NO_LOGIN_ALIAS) {
    state.watched = undefined;
    runCleanupStep("end the login watch", watched.stop);
  }
}
//@ chunk-mhn0amzz.js:111241-111816 placement
/**
 * 从会话中移除浏览器助手，失败时安排重试。
 */
async function removeBrowserHelper(helper, state) {
  state.stopsInFlight += 1;
  let stopped = await stopHelperServer(helper);
  state.stopsInFlight -= 1;
  if (stopped) {
    state.isRemovalOwed = false;
    stopLoginWatch(state);
    let { owedLine } = state;
    state.owedLine = undefined;
    if (owedLine !== undefined) runCleanupStep("show the stop message", () => helper.tell(owedLine));
    if (state.isRecheckOwed && state.stopsInFlight === 0) {
      state.isRecheckOwed = false;
      queueLoginRecheck(helper, state);
    }
    return;
  }
  state.isRemovalOwed = true;
  if (state.watched !== undefined) {
    if (state.isRecheckOwed && state.stopsInFlight === 0) {
      state.isRecheckOwed = false;
      queueLoginRecheck(helper, state);
    }
    return;
  }
  try {
    state.watched = {
      login: NO_LOGIN_ALIAS,
      stop: helper.subscribe(() => queueLoginRecheck(helper, state)),
    };
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "claude-test: could not set up a retry of removing the browser helper; the next /claude-test tries again",
      ),
    );
  }
}
//@ chunk-mhn0amzz.js:111816-111999 placement
/**
 * 停止浏览器助手 MCP 服务器，失败时记录并返回 false。
 */
async function stopHelperServer(helper) {
  try {
    await helper.stopServer();
    return true;
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "claude-test: could not remove the browser helper from the session; it may still be connected",
      ),
    );
    return false;
  }
}
//@ chunk-mhn0amzz.js:111999-112108 placement
/**
 * 执行一步清理，失败时记录。
 */
function runCleanupStep(step, stop) {
  try {
    stop();
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), `claude-test: removed the browser helper, but could not ${step}`),
    );
  }
}
//@ chunk-mhn0amzz.js:112108-112125 placement
/**
 * 按宿主保存浏览器助手的监视与重试状态。
 */
var helperWatchStateSlot; // deferred: uses createHelperWatchState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mhn0amzz.js:112108", () => {
  helperWatchStateSlot = new HostScoped(createHelperWatchState);
});
//@ chunk-mhn0amzz.js:112125-112313 placement
/**
 * 订阅会影响助手可用性的事件（会话、GrowthBook、策略、全局配置、合规污点），返回统一取消函数。
 */
function subscribeHelperInvalidation(rootSession, onChange) {
  let unsubscribers = [];
  let unsubscribeAll = () => {
    for (let unsubscribe of unsubscribers) unsubscribe();
  };
  try {
    unsubscribers.push(loginEventCounter.of(rootSession).subscribe(onChange));
    unsubscribers.push(onGrowthBookRefresh(onChange));
    unsubscribers.push(onPolicyVerdictChanged(onChange));
    unsubscribers.push(subscribeGlobalConfigInstalled(onChange));
    unsubscribers.push(onCredentialChange(onChange));
    unsubscribers.push(onComplianceTaintsChanged(onChange));
  } catch (error) {
    unsubscribeAll();
    throw error;
  }
  return unsubscribeAll;
}
//@ chunk-mhn0amzz.js:112313-112553 placement
/**
 * 清空助手状态、清插件缓存，从根会话移除浏览器 MCP 服务器。
 */
async function removeBrowserHelperServer() {
  claudeTestState.wantedSessions.clear();
  claudeTestState.hasStartedServer = false;
  try {
    clearPluginCache("claude-test: the browser helper stopped");
  } finally {
    let binding = currentSurfaceBinding();
    if (binding === undefined) throw Error("no session to remove the browser helper from");
    await binding.removeMcpServer(HELPER_SERVER_NAME);
  }
}
//@ chunk-mhn0amzz.js:112553-112565 placement
/**
 * 1000
 */
var HELPER_RECHECK_INTERVAL_MS = 1000;
//@ chunk-mhn0amzz.js:112565-112855 placement
/**
 * 以根会话为上下文构造浏览器助手控制器。
 */
function getBrowserHelperController() {
  let rootSession = getRootSession();
  return createBrowserHelperController(
    {
      login: readSignedInAccount,
      isOffered: () => isBuiltinPluginAvailable(CC_PLUGIN_CLAUDE_TEST),
      isRunning: () => claudeTestState.hasStartedServer || claudeTestState.wantedSessions.size > 0,
      isModuleLoaded: () => loadedModuleArgs(CC_PLUGIN_CLAUDE_TEST) !== undefined,
      warmLogin: () =>
        withDeadline(
          getClaudeAIOAuthTokensAsync().then(
            () => {},
            () => {},
          ),
          HELPER_RECHECK_INTERVAL_MS,
        ).then(() => {}),
      subscribe: (onChange) => subscribeHelperInvalidation(rootSession, onChange),
      stopServer: removeBrowserHelperServer,
      tell: (line) => uiLog(CC_PLUGIN_CLAUDE_TEST, line),
    },
    helperWatchStateSlot.of(rootSession.host),
  );
}
//@ chunk-mhn0amzz.js:112855-112991 placement
/**
 * 插件用的助手入口：start、mayRun、takeOut、mayConnectMcpServer。
 */
var browserHelperHooks = {
  start: () => getBrowserHelperController().start(),
  mayRun: () => getBrowserHelperController().mayRun(),
  takeOut: () => getBrowserHelperController().takeOut(),
  mayConnectMcpServer: (serverName) => serverName === BROWSER && getBrowserHelperController().mayConnect(),
};
//@ chunk-mhn0amzz.js:112991-113020 placement
/**
 * Claude Test 需要的三个代理类型（explorer/author/runner），以及代理定义重读结果的缓存时长。
 */
var CLAUDE_TEST_AGENT_TYPES; // deferred: uses CLAUDE_TEST_EXPLORER (./constants.js) of its import cycle while loading; runs once the cycle is complete
var AGENTS_REREAD_CACHE_MS;
deferInit("chunk-mhn0amzz.js:112991", () => {
  CLAUDE_TEST_AGENT_TYPES = [CLAUDE_TEST_EXPLORER, CLAUDE_TEST_AUTHOR, CLAUDE_TEST_RUNNER];
  AGENTS_REREAD_CACHE_MS = 5000;
});
//@ chunk-mhn0amzz.js:113020-113105 placement
/**
 * 判断给定代理定义里 explorer/author/runner 是否都在。
 */
function hasAllTestAgents(agents) {
  let types = new Set(agents.map((agent) => agent.agentType));
  return CLAUDE_TEST_AGENT_TYPES.every((type) => types.has(type));
}
//@ chunk-mhn0amzz.js:113105-113228 placement
/**
 * 根会话当前激活的 agent 定义，失败返回空数组。
 */
function getActiveAgentDefinitions() {
  try {
    return (
      currentSurfaceBinding()?.toolContext(new AbortController())?.options.agentDefinitions.activeAgents ?? []
    );
  } catch {
    return [];
  }
}
//@ chunk-mhn0amzz.js:113228-113454 placement
/**
 * 清空插件 agent 缓存并重新读取（短时间内复用同一次读取）。
 */
async function rereadPluginAgents() {
  let agentsReread = claudeTestState.agentsReread;
  if (agentsReread !== undefined && Date.now() - agentsReread.at <= AGENTS_REREAD_CACHE_MS) {
    await agentsReread.read;
    return;
  }
  clearPluginAgents();
  let read = refreshAgentsAndDefinitions().finally(() => {
    if (claudeTestState.agentsReread?.read === read) claudeTestState.agentsReread = undefined;
  });
  claudeTestState.agentsReread = {
    read,
    at: Date.now(),
  };
  await read;
}
//@ chunk-mhn0amzz.js:113454-113640 placement
async function seatOwnAgents(
  getAgents = getActiveAgentDefinitions,
  reread = rereadPluginAgents,
  cacheMs = AGENTS_REREAD_CACHE_MS,
) {
  try {
    if (hasAllTestAgents(getAgents())) return "listed";
    let read = await withDeadline(
      reread().then(() => true),
      cacheMs,
    );
    if (hasAllTestAgents(getAgents())) return "listed";
    return read === undefined ? "reading" : "missing";
  } catch {
    return "missing";
  }
}
//@ chunk-mhn0amzz.js:113640-113899 placement
var LOCAL_RUN_DESCRIPTION =
  "Claude Test, local (runs on this machine, not the claude.ai Claude Test connector): runs the plain-language specs in .claude-test/specs/ against your local dev server in a browser on this computer and reports PASS or FAIL per spec, with a screenshot";
//@ chunk-mhn0amzz.js:113899-114122 placement
var BLOCKED_STATES_2 = [
  "needs_input",
  "blocked_before_specs",
  "specs_blocked",
  "signin_missing",
  "signin_expired",
  "used_folder",
  "server_unreachable",
  "restart_needed",
  "signin_needed",
  "upload_unsupported",
  "blank_page",
  "assets_blocked",
  "other",
];
//@ chunk-mhn0amzz.js:114122-114242 placement
var SPEC_PROPOSAL_EVENT_SCHEMA; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mhn0amzz.js:114122", () => {
  SPEC_PROPOSAL_EVENT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      proposed: numberSchema().int().min(0).max(1000),
      firstTime: booleanSchema(),
      filed: array(unknown()).max(1000),
      replaced: array(unknown()).max(1000),
    }),
  );
});
//@ chunk-mhn0amzz.js:114242-114433 placement
/**
 * 解析规格提议事件为遥测计数（proposed/filed/first_time）。
 */
function parseSpecProposalEvent(runResultsFile) {
  let parsed = SPEC_PROPOSAL_EVENT_SCHEMA().safeParse(runResultsFile);
  if (!parsed.success || parsed.data.proposed === 0) return;
  return {
    proposed: parsed.data.proposed,
    filed: parsed.data.filed.length + parsed.data.replaced.length,
    first_time: parsed.data.firstTime,
  };
}
//@ chunk-mhn0amzz.js:114482-114508 placement
/**
 * HostScoped 的运行目录表
 */
var notedRunsByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mhn0amzz.js:114482", () => {
  notedRunsByHost = new HostScoped(() => new Map());
});
//@ chunk-mhn0amzz.js:114508-114545 placement
/**
 * 取当前宿主的运行目录表
 */
function runFolderMap() {
  return notedRunsByHost.of(getRootSession().host);
}
//@ chunk-mhn0amzz.js:114545-114555 placement
/**
 * 64
 */
var MAX_REMEMBERED_RUN_FOLDERS = 64;
//@ chunk-mhn0amzz.js:114555-114914 placement
function rememberRunFolder(folder) {
  try {
    if (!isAbsolute(folder)) return;
    let projectRoot = getProjectRoot();
    let resolved = resolve(folder);
    let folders = runFolderMap();
    if (
      !isSubpathOf(projectRoot, resolved, false) ||
      isUntouchableSpelling(resolved) ||
      folders.has(resolved)
    )
      return;
    if (folders.size >= MAX_REMEMBERED_RUN_FOLDERS) {
      let first = folders.keys().next();
      if (first.done !== true) folders.delete(first.value);
    }
    folders.set(resolved, {
      root: projectRoot,
      isDraftSent: false,
      isRunSent: false,
      isBusy: false,
    });
  } catch (error) {
    logForDebugging(
      `Claude Test could not remember a run folder, so that run is not counted in the usage events: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
}
//@ chunk-mhn0amzz.js:114943-115186 placement
var RUN_RESULTS_SCHEMA; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mhn0amzz.js:114943", () => {
  RUN_RESULTS_SCHEMA = DoctorLazy(() => {
    let countField = numberSchema().int().min(0).max(1e4);
    return objectSchema({
      schema: literal("claude-test-results/1"),
      counts: objectSchema({
        specs: countField,
        passed: countField,
        failed: countField,
        blocked: countField,
      }),
      runnerSeconds: numberSchema().int().min(0).max(86400),
      hostsRefused: countField,
      blockedWord: _enum(BLOCKED_STATES_2).optional().catch("other"),
    });
  });
});
//@ chunk-mhn0amzz.js:115186-115473 placement
/**
 * 解析 claude-test-results/1 结果，返回计数与错误码（没有通过也没有失败时取 blockedWord）。
 */
function parseRunResults(runResultsFile) {
  let parsed = RUN_RESULTS_SCHEMA().safeParse(runResultsFile);
  if (!parsed.success) return;
  let { counts, runnerSeconds, hostsRefused, blockedWord } = parsed.data;
  return {
    errorCode: counts.passed + counts.failed > 0 ? undefined : (blockedWord ?? "other"),
    counts: {
      specs_total: counts.specs,
      passed: counts.passed,
      failed: counts.failed,
      blocked: counts.blocked,
      seconds: runnerSeconds,
      hosts_refused: hostsRefused,
    },
  };
}
//@ chunk-mhn0amzz.js:115473-116195 placement
var countRunsFromUsageEvents = async () => {
  let folders;
  try {
    folders = runFolderMap();
  } catch (error) {
    logForDebugging(`Claude Test could not count runs in the usage events: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
  for (let [folder, entry] of folders) {
    if (entry.isRunSent || entry.isBusy) continue;
    entry.isBusy = true;
    try {
      if ((await readPluginFileSafe(entry.root, folder)) !== "ok") continue;
      let draft = entry.isDraftSent
        ? undefined
        : parseSpecProposalEvent(await readRunResultsFile(join(folder, "saved.json")));
      if (draft !== undefined) {
        await logFeatureOkAsync("claude_test_draft", draft);
        entry.isDraftSent = true;
      }
      let runResults = parseRunResults(await readRunResultsFile(join(folder, "results.json")));
      if (runResults === undefined) continue;
      if (runResults.errorCode === undefined) await logFeatureOkAsync("claude_test_run", runResults.counts);
      else await logFeatureBadAsync("claude_test_run", runResults.errorCode, runResults.counts);
      entry.isRunSent = true;
    } catch (error) {
      logForDebugging(
        `Claude Test could not count a run in the usage events; it is looked at again when the runner next stops: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    } finally {
      entry.isBusy = false;
    }
  }
};
//@ chunk-mhn0amzz.js:116195-116300 placement
/**
 * 读取并解析运行结果文件，失败返回 null。
 */
async function readRunResultsFile(filePath) {
  let raw = await readSmallFileText(filePath);
  if (raw === undefined) return null;
  try {
    return jsonParse(stripBom(raw));
  } catch {
    return null;
  }
}
//@ chunk-mhn0amzz.js:116300-116398 placement
/**
 * 以 claude_test_helper_start 打点记录助手启动成功或失败原因。
 */
function logHelperStart(result) {
  if (result === "listed") logFeatureOk("claude_test_helper_start");
  else logFeatureBad("claude_test_helper_start", result);
}
//@ chunk-mhn0amzz.js:116466-116831 placement
var LOCAL_TASK_DESCRIPTIONS = [
  {
    value: "fix",
    description: "Local, on this machine: do the fix the last local run recommended",
    isFinal: true,
  },
  {
    value: "onboard",
    description: "Local, on this machine: set up this computer and repository (not the claude.ai connector)",
    isFinal: true,
  },
  {
    value: "all",
    description: "Local, on this machine: run every test, not only those that cover what changed",
    isFinal: true,
  },
];
//@ chunk-mhn0amzz.js:116831-117126 placement
/**
 * /claude-test 参数补全：本地任务描述与 .claude-test/specs 下的规格名。
 */
async function completeSpecArgs(used, prefix) {
  let seen = new Set(used);
  if (LOCAL_TASK_DESCRIPTIONS.some((task) => seen.has(task.value))) return [];
  let files = await readdir(join(getCwd(), ".claude-test", "specs")).catch(() => []);
  return [
    ...(used.length === 0 ? LOCAL_TASK_DESCRIPTIONS : []),
    ...files
      .filter((fileName) => fileName.endsWith(".md"))
      .map((fileName) => ({
        value: fileName.slice(0, -3),
      })),
  ].filter((option) => option.value.startsWith(prefix) && !seen.has(option.value));
}
//@ chunk-mhn0amzz.js:117126-117161 placement
/**
 * 后台任务名占位
 */
var CLAUDE_TEST_BACKGROUND = "${CLAUDE_TEST_BACKGROUND}";
//@ chunk-mhn0amzz.js:117161-117248 placement
/**
 * 判断当前会话是否允许后台 shell（禁用或 plan 模式为 none，否则 kept）。
 */
function backgroundShellPolicy(ctx) {
  if (isBackgroundShellDisabled()) return "none";
  if (isAsyncReplEnabled() && isAsyncLaneMode(getToolPermissionContext(ctx).mode)) return "none";
  return "kept";
}
export {
  CLAUDE_TEST_BACKGROUND,
  BLOCKED_STATES_2,
  CLAUDE_TEST_RELOAD_TIMEOUT_MS,
  browserHelperHooks,
  helperWatchStateSlot,
  notedRunsByHost,
  CLAUDE_TEST_AGENT_TYPES,
  LOCAL_RUN_DESCRIPTION,
  AGENTS_REREAD_CACHE_MS,
  HELPER_OFF_LOGIN_CHANGED_TEXT,
  HELPER_OFF_UNAVAILABLE_TEXT,
  hasAllTestAgents,
  completeSpecArgs,
  backgroundShellPolicy,
  createBrowserHelperController,
  parseSpecProposalEvent,
  isClaudeTestReloadOutstanding,
  isClaudeTestReloadPending,
  getActiveAgentDefinitions,
  ensureClaudeTestReloaded,
  createHelperWatchState,
  rememberRunFolder,
  rememberComposerMark,
  runFolderMap,
  composerSubmitMarker,
  countRunsFromUsageEvents,
  logHelperStart,
  parseRunResults,
  seatOwnAgents,
  isAbortableAndEnabled,
  consumeComposerMark,
  isClaudeTestPluginEnabled,
};
