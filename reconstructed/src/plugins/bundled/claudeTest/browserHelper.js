/**
 * plugins/bundled/claudeTest/browserHelper.ts
 *
 * 2.1.316 新增：Claude Test 浏览器助手（Playwright MCP 服务器）的启停、登录变化监视与移除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (52)
 * attribution: placement 52
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
import { u, E, M, array, unknown, literal, _enum } from "../../../../vendor/zod/v4/classic/schemas.js";
import { isSubpathOf } from "../../../utils/pathPrefix.js";
import { isUntouchableSpelling } from "../../../utils/networkPaths.js";
import { logForDebugging } from "../../../utils/debug.js";
import { readPluginFileSafe, mcpAuthCacheContent } from "../../../utils/plugins/safeFileRead.js";
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
  alwaysFalseGateway,
  alwaysFalseRefresh,
} from "../../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";

//@ chunk-ae5g0zb5.js:106307-106319 placement
/**
 * 重新加载 Claude Test 模块的超时时间（5 秒）。
 */
var CLAUDE_TEST_RELOAD_TIMEOUT_MS = 5000;
//@ chunk-ae5g0zb5.js:106319-106549 placement
/**
 * 确保 Claude Test 模块已重新加载（带超时），返回 not-tried/loaded/held/slow/failed。
 */
async function ensureClaudeTestReloaded(opts, n = CLAUDE_TEST_RELOAD_TIMEOUT_MS) {
  try {
    let r = claudeTestMarkState();
    if (r.reload === undefined) {
      if (!isSyntheticOutputToolEnabled(opts)) return "not-tried";
      r.reload = reloadClaudeTestModule().then((s) => {
        r.outcome = s;
        return s;
      });
    }
    let o = (await withDeadline(r.reload, n)) ?? "slow";
    return o === "loaded" && !isAbortableAndEnabled(opts)() ? "failed" : o;
  } catch {
    return "failed";
  }
}
//@ chunk-ae5g0zb5.js:106549-106591 placement
/**
 * 判断 Claude Test 模块是否已发起重载。
 */
function isClaudeTestReloadPending() {
  return claudeTestMarkState().reload !== undefined;
}
//@ chunk-ae5g0zb5.js:106591-106661 placement
/**
 * 判断重载已发起但还没有结果。
 */
function isClaudeTestReloadOutstanding() {
  let e = claudeTestMarkState();
  return e.reload !== undefined && e.outcome === undefined;
}
//@ chunk-ae5g0zb5.js:106661-106735 placement
/**
 * 返回一个检查函数：信号未中止且 Claude Test 插件仍启用。
 */
function isAbortableAndEnabled(e) {
  let { signal } = e.abortController;
  return () => !signal.aborted && isClaudeTestPluginEnabled();
}
//@ chunk-ae5g0zb5.js:106735-106792 placement
/**
 * 判断 Claude Test 是否在内置插件的启用列表中。
 */
function isClaudeTestPluginEnabled() {
  return getBuiltinPlugins().enabled.some((e) => e.name === CC_PLUGIN_CLAUDE_TEST);
}
//@ chunk-ae5g0zb5.js:106956-107081 placement
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
//@ chunk-ae5g0zb5.js:107081-107176 placement
/**
 * 若消息由 composer 直接提交且非冻结标记、非子代理，返回其标记。
 */
function composerSubmitMarker(e) {
  let submittedFromComposer = e.submittedFromComposer;
  return isFrozenMarker(submittedFromComposer) && !isBridgeOrVerifiedSlackTurn(e) && e.agentId === undefined
    ? submittedFromComposer
    : undefined;
}
//@ chunk-ae5g0zb5.js:107176-107263 placement
/**
 * 把本次工具调用的参数与 composer 提交标记记到助手状态里。
 */
function rememberComposerMark(args, n) {
  try {
    let r = composerSubmitMarker(n);
    claudeTestMarkState().mark =
      r === undefined
        ? undefined
        : {
            args,
            marker: r,
          };
  } catch {}
}
//@ chunk-ae5g0zb5.js:107263-107400 placement
/**
 * 取出并清除提交标记，判断本次调用是否由 composer 直接提交同样参数触发。
 */
function consumeComposerMark(e, n) {
  let r = claudeTestMarkState();
  let mark = r.mark;
  r.mark = undefined;
  return (
    mark !== undefined &&
    mark.args === e &&
    n.agentId === undefined &&
    n.submittedFromComposer === mark.marker
  );
}
//@ chunk-ae5g0zb5.js:107400-107892 placement
/**
 * 浏览器助手被关闭时的两段用户提示：登录/计划变化导致关闭，以及插件当前不可用导致关闭。
 */
var HELPER_OFF_LOGIN_CHANGED_TEXT =
  "Claude Test's browser helper is off now, because the Claude Code login or plan changed, or could not be checked. A test run in progress can no longer use the browser. If /claude-test shows in the command list, type it to start again.";
var HELPER_OFF_UNAVAILABLE_TEXT =
  "Claude Test's browser helper is off because Claude Test is not available in this session right now. A test run in progress can no longer use the browser. If /claude-test shows again, for example a moment after a /login, type it to start again.";
//@ chunk-ae5g0zb5.js:107892-108012 placement
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
//@ chunk-ae5g0zb5.js:108012-108276 placement
/**
 * 浏览器助手控制器：start / mayRun / takeOut / mayConnect（登录未变化且未在停止时才允许连接）。
 */
function createBrowserHelperController(e, n = createHelperWatchState()) {
  return {
    start: () => describeHelperStop(e, n),
    mayRun: () => checkHelperMayRun(e, n),
    takeOut: () => void removeBrowserHelper(e, n),
    mayConnect: () => {
      let { watched } = n;
      let o = e.login();
      if (watched !== undefined && o === undefined) queueLoginRecheck(e, n);
      return (
        watched !== undefined &&
        n.stopsInFlight === 0 &&
        !n.isRemovalOwed &&
        e.isModuleLoaded() &&
        sameLogin(o, watched.login)
      );
    },
  };
}
//@ chunk-ae5g0zb5.js:108276-108286 placement
/**
 * 空串（无登录）
 */
var NO_LOGIN_ALIAS = "";
//@ chunk-ae5g0zb5.js:108286-108316 placement
/**
 * 登录等价比较
 */
function sameLogin(e, login) {
  return e === login;
}
//@ chunk-ae5g0zb5.js:108316-108788 placement
function describeHelperStop(e, n) {
  let r = e.login();
  let { watched } = n;
  if (n.stopsInFlight > 0 || n.isRemovalOwed) {
    stopLoginWatch_2(e, n);
    return "not_offered";
  }
  if (watched !== undefined && !sameLogin(r, watched.login)) {
    stopLoginWatch_2(e, n, HELPER_OFF_LOGIN_CHANGED_TEXT);
    return "login_changed";
  }
  if (watched === undefined) {
    if (r === undefined) {
      stopLoginWatch_2(e, n);
      return "failed";
    }
    try {
      n.watched = {
        login: r,
        stop: e.subscribe(() => queueLoginRecheck(e, n)),
      };
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "claude-test: could not watch who is signed in; stopping the browser helper",
        ),
      );
      stopLoginWatch_2(e, n);
      return "failed";
    }
  }
  if (!e.isOffered()) {
    stopLoginWatch_2(e, n);
    return "not_offered";
  }
  return "watching";
}
//@ chunk-ae5g0zb5.js:108788-109069 placement
/**
 * 判断助手能否运行：停止中或待移除时不提供；登录变化时停止并返回 login_changed。
 */
function checkHelperMayRun(e, n) {
  let { watched } = n;
  if (n.stopsInFlight > 0) return "not_offered";
  if (n.isRemovalOwed) {
    stopLoginWatch_2(e, n);
    return "not_offered";
  }
  if (watched !== undefined && !sameLogin(e.login(), watched.login)) {
    stopLoginWatch_2(e, n, HELPER_OFF_LOGIN_CHANGED_TEXT);
    return "login_changed";
  }
  if (e.isOffered()) return "yes";
  if (watched !== undefined || e.isRunning()) stopLoginWatch_2(e, n);
  return "not_offered";
}
//@ chunk-ae5g0zb5.js:109069-109164 placement
/**
 * 把“重新核对浏览器助手登录状态”排到微任务里，避免重复排队。
 */
function queueLoginRecheck(e, n) {
  if (n.isCheckQueued) return;
  n.isCheckQueued = true;
  queueMicrotask(() => void recheckHelperLogin(e, n));
}
//@ chunk-ae5g0zb5.js:109164-109443 placement
/**
 * 预热登录后重新核对：登录变了或插件不再提供时停止助手。
 */
async function recheckHelperLogin(e, n) {
  await Promise.resolve()
    .then(e.warmLogin)
    .catch(() => {});
  n.isCheckQueued = false;
  let { watched } = n;
  if (watched === undefined) return;
  if (n.stopsInFlight > 0) {
    n.isRecheckOwed = true;
    return;
  }
  let o = sameLogin(e.login(), watched.login);
  if (!n.isRemovalOwed && o && e.isOffered()) return;
  await stopLoginWatch_2(e, n, o ? HELPER_OFF_UNAVAILABLE_TEXT : HELPER_OFF_LOGIN_CHANGED_TEXT);
}
//@ chunk-ae5g0zb5.js:109443-109900 placement
async function stopLoginWatch_2(e, n, r) {
  let { watched } = n;
  if (r !== undefined && e.isRunning()) n.owedLine = r;
  n.stopsInFlight += 1;
  let s = await stopHelperServer(e);
  n.stopsInFlight -= 1;
  if (!s) {
    n.isRemovalOwed = true;
    if (n.isRecheckOwed && n.stopsInFlight === 0) {
      n.isRecheckOwed = false;
      queueLoginRecheck(e, n);
    }
    return;
  }
  n.isRecheckOwed = false;
  n.isRemovalOwed = false;
  let { owedLine } = n;
  n.owedLine = undefined;
  if (n.watched === watched) n.watched = undefined;
  if (watched !== undefined) runCleanupStep("end the login watch", watched.stop);
  stopLoginWatch(n);
  if (owedLine !== undefined) runCleanupStep("show the stop message", () => e.tell(owedLine));
}
//@ chunk-ae5g0zb5.js:109900-109999 placement
/**
 * 停掉当前登录监视并清空监视对象。
 */
function stopLoginWatch(e) {
  let { watched } = e;
  if (watched?.login === NO_LOGIN_ALIAS) {
    e.watched = undefined;
    runCleanupStep("end the login watch", watched.stop);
  }
}
//@ chunk-ae5g0zb5.js:109999-110574 placement
/**
 * 从会话中移除浏览器助手，失败时安排重试。
 */
async function removeBrowserHelper(e, n) {
  n.stopsInFlight += 1;
  let r = await stopHelperServer(e);
  n.stopsInFlight -= 1;
  if (r) {
    n.isRemovalOwed = false;
    stopLoginWatch(n);
    let { owedLine } = n;
    n.owedLine = undefined;
    if (owedLine !== undefined) runCleanupStep("show the stop message", () => e.tell(owedLine));
    if (n.isRecheckOwed && n.stopsInFlight === 0) {
      n.isRecheckOwed = false;
      queueLoginRecheck(e, n);
    }
    return;
  }
  n.isRemovalOwed = true;
  if (n.watched !== undefined) {
    if (n.isRecheckOwed && n.stopsInFlight === 0) {
      n.isRecheckOwed = false;
      queueLoginRecheck(e, n);
    }
    return;
  }
  try {
    n.watched = {
      login: NO_LOGIN_ALIAS,
      stop: e.subscribe(() => queueLoginRecheck(e, n)),
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
//@ chunk-ae5g0zb5.js:110574-110757 placement
/**
 * 停止浏览器助手 MCP 服务器，失败时记录并返回 false。
 */
async function stopHelperServer(e) {
  try {
    await e.stopServer();
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
//@ chunk-ae5g0zb5.js:110757-110866 placement
/**
 * 执行一步清理，失败时记录。
 */
function runCleanupStep(e, stop) {
  try {
    stop();
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), `claude-test: removed the browser helper, but could not ${e}`),
    );
  }
}
//@ chunk-ae5g0zb5.js:110866-110883 placement
/**
 * 按宿主保存浏览器助手的监视与重试状态。
 */
var helperWatchStateSlot = new HostScoped(createHelperWatchState);
//@ chunk-ae5g0zb5.js:110883-111071 placement
/**
 * 订阅会影响助手可用性的事件（会话、GrowthBook、策略、全局配置、合规污点），返回统一取消函数。
 */
function subscribeHelperInvalidation(rootSession, n) {
  let r = [];
  let o = () => {
    for (let s of r) s();
  };
  try {
    r.push(loginEventCounter.of(rootSession).subscribe(n));
    r.push(onGrowthBookRefresh(n));
    r.push(onPolicyVerdictChanged(n));
    r.push(subscribeGlobalConfigInstalled(n));
    r.push(onCredentialChange(n));
    r.push(onComplianceTaintsChanged(n));
  } catch (error) {
    o();
    throw error;
  }
  return o;
}
//@ chunk-ae5g0zb5.js:111071-111310 placement
/**
 * 清空助手状态、清插件缓存，从根会话移除浏览器 MCP 服务器。
 */
async function removeBrowserHelperServer() {
  claudeTestState.wantedSessions.clear();
  claudeTestState.hasStartedServer = false;
  try {
    clearPluginCache("claude-test: the browser helper stopped");
  } finally {
    let e = currentSurfaceBinding();
    if (e === undefined) throw Error("no session to remove the browser helper from");
    await e.removeMcpServer(HELPER_SERVER_NAME);
  }
}
//@ chunk-ae5g0zb5.js:111310-111322 placement
/**
 * 1000
 */
var HELPER_RECHECK_INTERVAL_MS = 1000;
//@ chunk-ae5g0zb5.js:111322-111612 placement
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
      subscribe: (n) => subscribeHelperInvalidation(rootSession, n),
      stopServer: removeBrowserHelperServer,
      tell: (n) => uiLog(CC_PLUGIN_CLAUDE_TEST, n),
    },
    helperWatchStateSlot.of(rootSession.host),
  );
}
//@ chunk-ae5g0zb5.js:111612-111748 placement
/**
 * 插件用的助手入口：start、mayRun、takeOut、mayConnectMcpServer。
 */
var browserHelperHooks = {
  start: () => getBrowserHelperController().start(),
  mayRun: () => getBrowserHelperController().mayRun(),
  takeOut: () => getBrowserHelperController().takeOut(),
  mayConnectMcpServer: (e) => e === BROWSER && getBrowserHelperController().mayConnect(),
};
//@ chunk-ae5g0zb5.js:111748-111777 placement
/**
 * Claude Test 需要的三个代理类型（explorer/author/runner），以及代理定义重读结果的缓存时长。
 */
var CLAUDE_TEST_AGENT_TYPES = [CLAUDE_TEST_EXPLORER, CLAUDE_TEST_AUTHOR, CLAUDE_TEST_RUNNER];
var AGENTS_REREAD_CACHE_MS = 5000;
//@ chunk-ae5g0zb5.js:111777-111862 placement
/**
 * 判断给定代理定义里 explorer/author/runner 是否都在。
 */
function hasAllTestAgents(e) {
  let n = new Set(e.map((r) => r.agentType));
  return CLAUDE_TEST_AGENT_TYPES.every((r) => n.has(r));
}
//@ chunk-ae5g0zb5.js:111862-111985 placement
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
//@ chunk-ae5g0zb5.js:111985-112211 placement
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
  let n = refreshAgentsAndDefinitions().finally(() => {
    if (claudeTestState.agentsReread?.read === n) claudeTestState.agentsReread = undefined;
  });
  claudeTestState.agentsReread = {
    read: n,
    at: Date.now(),
  };
  await n;
}
//@ chunk-ae5g0zb5.js:112211-112397 placement
async function seatOwnAgents(
  e = getActiveAgentDefinitions,
  n = rereadPluginAgents,
  r = AGENTS_REREAD_CACHE_MS,
) {
  try {
    if (hasAllTestAgents(e())) return "listed";
    let o = await withDeadline(
      n().then(() => true),
      r,
    );
    if (hasAllTestAgents(e())) return "listed";
    return o === undefined ? "reading" : "missing";
  } catch {
    return "missing";
  }
}
//@ chunk-ae5g0zb5.js:112397-112656 placement
var LOCAL_RUN_DESCRIPTION =
  "Claude Test, local (runs on this machine, not the claude.ai Claude Test connector): runs the plain-language specs in .claude-test/specs/ against your local dev server in a browser on this computer and reports PASS or FAIL per spec, with a screenshot";
//@ chunk-ae5g0zb5.js:112656-112879 placement
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
//@ chunk-ae5g0zb5.js:112879-112999 placement
var SPEC_PROPOSAL_EVENT_SCHEMA = DoctorLazy(() =>
  u({
    proposed: E().int().min(0).max(1000),
    firstTime: M(),
    filed: array(unknown()).max(1000),
    replaced: array(unknown()).max(1000),
  }),
);
//@ chunk-ae5g0zb5.js:112999-113190 placement
/**
 * 解析规格提议事件为遥测计数（proposed/filed/first_time）。
 */
function parseSpecProposalEvent(runResultsFile) {
  let n = SPEC_PROPOSAL_EVENT_SCHEMA().safeParse(runResultsFile);
  if (!n.success || n.data.proposed === 0) return;
  return {
    proposed: n.data.proposed,
    filed: n.data.filed.length + n.data.replaced.length,
    first_time: n.data.firstTime,
  };
}
//@ chunk-ae5g0zb5.js:113239-113265 placement
/**
 * HostScoped 的运行目录表
 */
var runFolderMapSlot = new HostScoped(() => new Map());
//@ chunk-ae5g0zb5.js:113265-113302 placement
/**
 * 取当前宿主的运行目录表
 */
function runFolderMap() {
  return runFolderMapSlot.of(getRootSession().host);
}
//@ chunk-ae5g0zb5.js:113302-113312 placement
/**
 * 64
 */
var MAX_REMEMBERED_RUN_FOLDERS = 64;
//@ chunk-ae5g0zb5.js:113312-113671 placement
function rememberRunFolder(e) {
  try {
    if (!isAbsolute(e)) return;
    let projectRoot = getProjectRoot();
    let r = resolve(e);
    let o = runFolderMap();
    if (!isSubpathOf(projectRoot, r, false) || isUntouchableSpelling(r) || o.has(r)) return;
    if (o.size >= MAX_REMEMBERED_RUN_FOLDERS) {
      let s = o.keys().next();
      if (s.done !== true) o.delete(s.value);
    }
    o.set(r, {
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
//@ chunk-ae5g0zb5.js:113700-113943 placement
var RUN_RESULTS_SCHEMA = DoctorLazy(() => {
  let e = E().int().min(0).max(1e4);
  return u({
    schema: literal("claude-test-results/1"),
    counts: u({
      specs: e,
      passed: e,
      failed: e,
      blocked: e,
    }),
    runnerSeconds: E().int().min(0).max(86400),
    hostsRefused: e,
    blockedWord: _enum(BLOCKED_STATES_2).optional().catch("other"),
  });
});
//@ chunk-ae5g0zb5.js:113943-114230 placement
/**
 * 解析 claude-test-results/1 结果，返回计数与错误码（没有通过也没有失败时取 blockedWord）。
 */
function parseRunResults(runResultsFile) {
  let n = RUN_RESULTS_SCHEMA().safeParse(runResultsFile);
  if (!n.success) return;
  let { counts, runnerSeconds, hostsRefused, blockedWord } = n.data;
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
//@ chunk-ae5g0zb5.js:114230-114952 placement
var countRunsFromUsageEvents = async () => {
  let e;
  try {
    e = runFolderMap();
  } catch (error) {
    logForDebugging(`Claude Test could not count runs in the usage events: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
  for (let [n, r] of e) {
    if (r.isRunSent || r.isBusy) continue;
    r.isBusy = true;
    try {
      if ((await readPluginFileSafe(r.root, n)) !== "ok") continue;
      let o = r.isDraftSent
        ? undefined
        : parseSpecProposalEvent(await readRunResultsFile(join(n, "saved.json")));
      if (o !== undefined) {
        await logFeatureOkAsync("claude_test_draft", o);
        r.isDraftSent = true;
      }
      let runResults = parseRunResults(await readRunResultsFile(join(n, "results.json")));
      if (runResults === undefined) continue;
      if (runResults.errorCode === undefined) await logFeatureOkAsync("claude_test_run", runResults.counts);
      else await logFeatureBadAsync("claude_test_run", runResults.errorCode, runResults.counts);
      r.isRunSent = true;
    } catch (error) {
      logForDebugging(
        `Claude Test could not count a run in the usage events; it is looked at again when the runner next stops: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    } finally {
      r.isBusy = false;
    }
  }
};
//@ chunk-ae5g0zb5.js:114952-115057 placement
/**
 * 读取并解析运行结果文件，失败返回 null。
 */
async function readRunResultsFile(e) {
  let n = await mcpAuthCacheContent(e);
  if (n === undefined) return null;
  try {
    return jsonParse(stripBom(n));
  } catch {
    return null;
  }
}
//@ chunk-ae5g0zb5.js:115057-115155 placement
/**
 * 以 claude_test_helper_start 打点记录助手启动成功或失败原因。
 */
function logHelperStart(e) {
  if (e === "listed") logFeatureOk("claude_test_helper_start");
  else logFeatureBad("claude_test_helper_start", e);
}
//@ chunk-ae5g0zb5.js:115223-115588 placement
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
//@ chunk-ae5g0zb5.js:115588-115883 placement
/**
 * /claude-test 参数补全：本地任务描述与 .claude-test/specs 下的规格名。
 */
async function completeSpecArgs(e, n) {
  let r = new Set(e);
  if (LOCAL_TASK_DESCRIPTIONS.some((s) => r.has(s.value))) return [];
  let o = await readdir(join(getCwd(), ".claude-test", "specs")).catch(() => []);
  return [
    ...(e.length === 0 ? LOCAL_TASK_DESCRIPTIONS : []),
    ...o
      .filter((s) => s.endsWith(".md"))
      .map((s) => ({
        value: s.slice(0, -3),
      })),
  ].filter((s) => s.value.startsWith(n) && !r.has(s.value));
}
//@ chunk-ae5g0zb5.js:115883-115918 placement
/**
 * 后台任务名占位
 */
var CLAUDE_TEST_BACKGROUND = "${CLAUDE_TEST_BACKGROUND}";
//@ chunk-ae5g0zb5.js:115918-116007 placement
/**
 * 判断当前会话是否允许后台 shell（禁用或 plan 模式为 none，否则 kept）。
 */
function backgroundShellPolicy(e) {
  if (isBackgroundShellDisabled()) return "none";
  if (alwaysFalseGateway() && alwaysFalseRefresh(getToolPermissionContext(e).mode)) return "none";
  return "kept";
}
export {
  isClaudeTestPluginEnabled,
  CLAUDE_TEST_BACKGROUND,
  BLOCKED_STATES_2,
  CLAUDE_TEST_RELOAD_TIMEOUT_MS,
  browserHelperHooks,
  helperWatchStateSlot,
  runFolderMapSlot,
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
};
