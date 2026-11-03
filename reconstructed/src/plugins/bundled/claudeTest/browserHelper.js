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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  resolve,
  resolve as resolve_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
} from "path";
import { readdir, readdir as readdir_2 } from "fs/promises";
import { Oe } from "./commandHook.js";
import { isSyntheticOutputToolEnabled } from "../../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { withDeadline } from "../../../utils/sleep.js";
import { getBuiltinPlugins, isBuiltinPluginAvailable } from "../../builtinPlugins.js";
import {
  CC_PLUGIN_CLAUDE_TEST,
  IZ,
  BROWSER,
  CLAUDE_TEST_EXPLORER,
  CLAUDE_TEST_AUTHOR,
  CLAUDE_TEST_RUNNER,
} from "./constants.js";
import { sgn } from "../../functionHooks/devModsWatch.js";
import { claudeTestState } from "./appFacts.js";
import { isFrozenMarker } from "../../../utils/frozenMarkers.js";
import { _N } from "../../../utils/promptSubmissionOrigin.js";
import { logError } from "../../../utils/log.js";
import { withTelemetryMessage, toError, errorMessage } from "../../../utils/errors.js";
import { HostScoped } from "../../../utils/hostScoped.js";
import { KV } from "../../../services/oauth/loginEvents.js";
import { onGrowthBookRefresh } from "../../../services/analytics/growthbook.js";
import { onPolicyVerdictChanged } from "../../../services/policyLimits/policyState.js";
import { subscribeGlobalConfigInstalled } from "../../../utils/config.js";
import { W3t } from "../../../utils/auth/credentialEpoch.js";
import { onComplianceTaintsChanged } from "../../../services/policyLimits/complianceTaints.js";
import { clearPluginCache } from "../../../utils/plugins/pluginLoader.js";
import { lp } from "../../functionHooks/surfaceBinding.js";
import { getRootSession, getProjectRoot } from "../../../bootstrap/state.js";
import { readSignedInAccount } from "./consent.js";
import { IT } from "../../hooksModules/loadedModuleFilters.js";
import { getClaudeAIOAuthTokensAsync } from "../../../utils/auth.js";
import { uiLog } from "../../functionHooks/hooksWorkerClient.js";
import { clearPluginAgents } from "../../../utils/plugins/pluginLoadState.js";
import { P3n } from "../../functionHooks/hooksModuleLoader.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, E, M, A, oe, T, U } from "../../../../vendor/zod/v4/classic/schemas.js";
import { hm } from "../../../utils/pathPrefix.js";
import { hl } from "../../../utils/networkPaths.js";
import { logForDebugging } from "../../../utils/debug.js";
import { readPluginFileSafe, ZB } from "../../../utils/plugins/safeFileRead.js";
import {
  logFeatureOkAsync,
  logFeatureBadAsync,
  logFeatureOk,
  logFeatureBad,
} from "../../../services/analytics/featureTelemetry.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import { Wo } from "../../../utils/json.js";
import { getCwd } from "../../../utils/cwd.js";
import { isBackgroundShellDisabled } from "../../../tools/AgentTool/backgroundGates.js";
import { dfi, kYe } from "../../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";

//@ chunk-ae5g0zb5.js:106307-106319 placement
var ha = 5000;
/**
 * 确保 Claude Test 模块已重新加载（带超时），返回 not-tried/loaded/held/slow/failed。
 */
//@ chunk-ae5g0zb5.js:106319-106549 placement
async function ensureClaudeTestReloaded(e, n = ha) {
  try {
    let r = Oe();
    if (r.reload === void 0) {
      if (!isSyntheticOutputToolEnabled(e)) return "not-tried";
      r.reload = reloadClaudeTestModule().then((s) => ((r.outcome = s), s));
    }
    let o = (await withDeadline(r.reload, n)) ?? "slow";
    return o === "loaded" && !To(e)() ? "failed" : o;
  } catch {
    return "failed";
  }
}
//@ chunk-ae5g0zb5.js:106549-106591 placement
function wa() {
  return Oe().reload !== void 0;
}
//@ chunk-ae5g0zb5.js:106591-106661 placement
function Ea() {
  let e = Oe();
  return e.reload !== void 0 && e.outcome === void 0;
}
//@ chunk-ae5g0zb5.js:106661-106735 placement
function To(e) {
  let { signal: signal } = e.abortController;
  return () => !signal.aborted && Sa();
}
//@ chunk-ae5g0zb5.js:106735-106792 placement
function Sa() {
  return getBuiltinPlugins().enabled.some((e) => e.name === CC_PLUGIN_CLAUDE_TEST);
}
/**
 * 重新加载插件模块，返回 held/loaded/failed。
 */
//@ chunk-ae5g0zb5.js:106956-107081 placement
async function reloadClaudeTestModule() {
  try {
    if ((await sgn()) === "held") return "held";
    return claudeTestState.isModuleLoaded ? "loaded" : "failed";
  } catch {
    return "failed";
  }
}
//@ chunk-ae5g0zb5.js:107081-107176 placement
function bo(e) {
  let submittedFromComposer = e.submittedFromComposer;
  return isFrozenMarker(submittedFromComposer) && !_N(e) && e.agentId === void 0
    ? submittedFromComposer
    : void 0;
}
//@ chunk-ae5g0zb5.js:107176-107263 placement
function Ta(e, n) {
  try {
    let r = bo(n);
    Oe().mark = r === void 0 ? void 0 : { args: e, marker: r };
  } catch {}
}
/**
 * 取出并清除提交标记，判断本次调用是否由 composer 直接提交同样参数触发。
 */
//@ chunk-ae5g0zb5.js:107263-107400 placement
function consumeComposerMark(e, n) {
  let r = Oe(),
    mark = r.mark;
  return (
    (r.mark = void 0),
    mark !== void 0 && mark.args === e && n.agentId === void 0 && n.submittedFromComposer === mark.marker
  );
}
//@ chunk-ae5g0zb5.js:107400-107892 placement
var HELPER_OFF_LOGIN_CHANGED_TEXT =
    "Claude Test's browser helper is off now, because the Claude Code login or plan changed, or could not be checked. A test run in progress can no longer use the browser. If /claude-test shows in the command list, type it to start again.",
  Ro =
    "Claude Test's browser helper is off because Claude Test is not available in this session right now. A test run in progress can no longer use the browser. If /claude-test shows again, for example a moment after a /login, type it to start again.";
/**
 * 浏览器助手登录监视的初始状态。
 */
//@ chunk-ae5g0zb5.js:107892-108012 placement
function createHelperWatchState() {
  return {
    watched: void 0,
    isCheckQueued: !1,
    stopsInFlight: 0,
    isRecheckOwed: !1,
    isRemovalOwed: !1,
    owedLine: void 0,
  };
}
/**
 * 浏览器助手控制器：start / mayRun / takeOut / mayConnect（登录未变化且未在停止时才允许连接）。
 */
//@ chunk-ae5g0zb5.js:108012-108276 placement
function createBrowserHelperController(e, n = createHelperWatchState()) {
  return {
    start: () => describeHelperStop(e, n),
    mayRun: () => checkHelperMayRun(e, n),
    takeOut: () => void removeBrowserHelper(e, n),
    mayConnect: () => {
      let { watched: watched } = n,
        login = e.login();
      if (watched !== void 0 && login === void 0) ft(e, n);
      return (
        watched !== void 0 &&
        n.stopsInFlight === 0 &&
        !n.isRemovalOwed &&
        e.isModuleLoaded() &&
        zn(login, watched.login)
      );
    },
  };
}
//@ chunk-ae5g0zb5.js:108276-108286 placement
var xa = "";
//@ chunk-ae5g0zb5.js:108286-108316 placement
function zn(e, n) {
  return e === n;
}
//@ chunk-ae5g0zb5.js:108316-108788 placement
function describeHelperStop(e, n) {
  let login = e.login(),
    { watched: watched } = n;
  if (n.stopsInFlight > 0 || n.isRemovalOwed) return (stopLoginWatch(e, n), "not_offered");
  if (watched !== void 0 && !zn(login, watched.login))
    return (stopLoginWatch(e, n, HELPER_OFF_LOGIN_CHANGED_TEXT), "login_changed");
  if (watched === void 0) {
    if (login === void 0) return (stopLoginWatch(e, n), "failed");
    try {
      n.watched = { login: login, stop: e.subscribe(() => ft(e, n)) };
    } catch (error) {
      return (
        logError(
          withTelemetryMessage(
            toError(error),
            "claude-test: could not watch who is signed in; stopping the browser helper",
          ),
        ),
        stopLoginWatch(e, n),
        "failed"
      );
    }
  }
  if (!e.isOffered()) return (stopLoginWatch(e, n), "not_offered");
  return "watching";
}
/**
 * 判断助手能否运行：停止中或待移除时不提供；登录变化时停止并返回 login_changed。
 */
//@ chunk-ae5g0zb5.js:108788-109069 placement
function checkHelperMayRun(e, n) {
  let { watched: watched } = n;
  if (n.stopsInFlight > 0) return "not_offered";
  if (n.isRemovalOwed) return (stopLoginWatch(e, n), "not_offered");
  if (watched !== void 0 && !zn(e.login(), watched.login))
    return (stopLoginWatch(e, n, HELPER_OFF_LOGIN_CHANGED_TEXT), "login_changed");
  if (e.isOffered()) return "yes";
  if (watched !== void 0 || e.isRunning()) stopLoginWatch(e, n);
  return "not_offered";
}
//@ chunk-ae5g0zb5.js:109069-109164 placement
function ft(e, n) {
  if (n.isCheckQueued) return;
  ((n.isCheckQueued = !0), queueMicrotask(() => void recheckHelperLogin(e, n)));
}
/**
 * 预热登录后重新核对：登录变了或插件不再提供时停止助手。
 */
//@ chunk-ae5g0zb5.js:109164-109443 placement
async function recheckHelperLogin(e, n) {
  (await Promise.resolve()
    .then(e.warmLogin)
    .catch(() => {}),
    (n.isCheckQueued = !1));
  let { watched: watched } = n;
  if (watched === void 0) return;
  if (n.stopsInFlight > 0) {
    n.isRecheckOwed = !0;
    return;
  }
  let o = zn(e.login(), watched.login);
  if (!n.isRemovalOwed && o && e.isOffered()) return;
  await stopLoginWatch(e, n, o ? Ro : HELPER_OFF_LOGIN_CHANGED_TEXT);
}
//@ chunk-ae5g0zb5.js:109443-109900 placement
async function stopLoginWatch(e, n, r) {
  let { watched: watched } = n;
  if (r !== void 0 && e.isRunning()) n.owedLine = r;
  n.stopsInFlight += 1;
  let s = await stopHelperServer(e);
  if (((n.stopsInFlight -= 1), !s)) {
    if (((n.isRemovalOwed = !0), n.isRecheckOwed && n.stopsInFlight === 0))
      ((n.isRecheckOwed = !1), ft(e, n));
    return;
  }
  ((n.isRecheckOwed = !1), (n.isRemovalOwed = !1));
  let { owedLine: owedLine } = n;
  if (((n.owedLine = void 0), n.watched === watched)) n.watched = void 0;
  if (watched !== void 0) runCleanupStep("end the login watch", watched.stop);
  if ((Pa(n), owedLine !== void 0)) runCleanupStep("show the stop message", () => e.tell(owedLine));
}
//@ chunk-ae5g0zb5.js:109900-109999 placement
function Pa(e) {
  let { watched: watched } = e;
  if (watched?.login === xa) ((e.watched = void 0), runCleanupStep("end the login watch", watched.stop));
}
/**
 * 从会话中移除浏览器助手，失败时安排重试。
 */
//@ chunk-ae5g0zb5.js:109999-110574 placement
async function removeBrowserHelper(e, n) {
  n.stopsInFlight += 1;
  let r = await stopHelperServer(e);
  if (((n.stopsInFlight -= 1), r)) {
    ((n.isRemovalOwed = !1), Pa(n));
    let { owedLine: owedLine } = n;
    if (((n.owedLine = void 0), owedLine !== void 0))
      runCleanupStep("show the stop message", () => e.tell(owedLine));
    if (n.isRecheckOwed && n.stopsInFlight === 0) ((n.isRecheckOwed = !1), ft(e, n));
    return;
  }
  if (((n.isRemovalOwed = !0), n.watched !== void 0)) {
    if (n.isRecheckOwed && n.stopsInFlight === 0) ((n.isRecheckOwed = !1), ft(e, n));
    return;
  }
  try {
    n.watched = { login: xa, stop: e.subscribe(() => ft(e, n)) };
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "claude-test: could not set up a retry of removing the browser helper; the next /claude-test tries again",
      ),
    );
  }
}
/**
 * 停止浏览器助手 MCP 服务器，失败时记录并返回 false。
 */
//@ chunk-ae5g0zb5.js:110574-110757 placement
async function stopHelperServer(e) {
  try {
    return (await e.stopServer(), !0);
  } catch (error) {
    return (
      logError(
        withTelemetryMessage(
          toError(error),
          "claude-test: could not remove the browser helper from the session; it may still be connected",
        ),
      ),
      !1
    );
  }
}
/**
 * 执行一步清理，失败时记录。
 */
//@ chunk-ae5g0zb5.js:110757-110866 placement
function runCleanupStep(e, n) {
  try {
    n();
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), `claude-test: removed the browser helper, but could not ${e}`),
    );
  }
}
//@ chunk-ae5g0zb5.js:110866-110883 placement
var Oa = new HostScoped(createHelperWatchState);
/**
 * 订阅会影响助手可用性的事件（会话、GrowthBook、策略、全局配置、合规污点），返回统一取消函数。
 */
//@ chunk-ae5g0zb5.js:110883-111071 placement
function subscribeHelperInvalidation(e, n) {
  let r = [],
    o = () => {
      for (let s of r) s();
    };
  try {
    (r.push(KV.of(e).subscribe(n)),
      r.push(onGrowthBookRefresh(n)),
      r.push(onPolicyVerdictChanged(n)),
      r.push(subscribeGlobalConfigInstalled(n)),
      r.push(W3t(n)),
      r.push(onComplianceTaintsChanged(n)));
  } catch (error) {
    throw (o(), error);
  }
  return o;
}
/**
 * 清空助手状态、清插件缓存，从根会话移除浏览器 MCP 服务器。
 */
//@ chunk-ae5g0zb5.js:111071-111310 placement
async function removeBrowserHelperServer() {
  (claudeTestState.wantedSessions.clear(), (claudeTestState.hasStartedServer = !1));
  try {
    clearPluginCache("claude-test: the browser helper stopped");
  } finally {
    let e = lp();
    if (e === void 0) throw Error("no session to remove the browser helper from");
    await e.removeMcpServer(IZ);
  }
}
//@ chunk-ae5g0zb5.js:111310-111322 placement
var rc = 1000;
/**
 * 以根会话为上下文构造浏览器助手控制器。
 */
//@ chunk-ae5g0zb5.js:111322-111612 placement
function getBrowserHelperController() {
  let e = getRootSession();
  return createBrowserHelperController(
    {
      login: readSignedInAccount,
      isOffered: () => isBuiltinPluginAvailable(CC_PLUGIN_CLAUDE_TEST),
      isRunning: () => claudeTestState.hasStartedServer || claudeTestState.wantedSessions.size > 0,
      isModuleLoaded: () => IT(CC_PLUGIN_CLAUDE_TEST) !== void 0,
      warmLogin: () =>
        withDeadline(
          getClaudeAIOAuthTokensAsync().then(
            () => {},
            () => {},
          ),
          rc,
        ).then(() => {}),
      subscribe: (n) => subscribeHelperInvalidation(e, n),
      stopServer: removeBrowserHelperServer,
      tell: (n) => uiLog(CC_PLUGIN_CLAUDE_TEST, n),
    },
    Oa.of(e.host),
  );
}
/**
 * 插件用的助手入口：start、mayRun、takeOut、mayConnectMcpServer。
 */
//@ chunk-ae5g0zb5.js:111612-111748 placement
var browserHelperHooks = {
  start: () => getBrowserHelperController().start(),
  mayRun: () => getBrowserHelperController().mayRun(),
  takeOut: () => getBrowserHelperController().takeOut(),
  mayConnectMcpServer: (e) => e === BROWSER && getBrowserHelperController().mayConnect(),
};
//@ chunk-ae5g0zb5.js:111748-111777 placement
var ka = [CLAUDE_TEST_EXPLORER, CLAUDE_TEST_AUTHOR, CLAUDE_TEST_RUNNER],
  xo = 5000;
//@ chunk-ae5g0zb5.js:111777-111862 placement
function qt(e) {
  let n = new Set(e.map((r) => r.agentType));
  return ka.every((r) => n.has(r));
}
/**
 * 根会话当前激活的 agent 定义，失败返回空数组。
 */
//@ chunk-ae5g0zb5.js:111862-111985 placement
function getActiveAgentDefinitions() {
  try {
    return lp()?.toolContext(new AbortController())?.options.agentDefinitions.activeAgents ?? [];
  } catch {
    return [];
  }
}
/**
 * 清空插件 agent 缓存并重新读取（短时间内复用同一次读取）。
 */
//@ chunk-ae5g0zb5.js:111985-112211 placement
async function rereadPluginAgents() {
  let agentsReread = claudeTestState.agentsReread;
  if (agentsReread !== void 0 && Date.now() - agentsReread.at <= xo) {
    await agentsReread.read;
    return;
  }
  clearPluginAgents();
  let n = P3n().finally(() => {
    if (claudeTestState.agentsReread?.read === n) claudeTestState.agentsReread = void 0;
  });
  ((claudeTestState.agentsReread = { read: n, at: Date.now() }), await n);
}
//@ chunk-ae5g0zb5.js:112211-112397 placement
async function seatOwnAgents(e = getActiveAgentDefinitions, n = rereadPluginAgents, r = xo) {
  try {
    if (qt(e())) return "listed";
    let o = await withDeadline(
      n().then(() => !0),
      r,
    );
    if (qt(e())) return "listed";
    return o === void 0 ? "reading" : "missing";
  } catch {
    return "missing";
  }
}
//@ chunk-ae5g0zb5.js:112397-112656 placement
var LOCAL_RUN_DESCRIPTION =
  "Claude Test, local (runs on this machine, not the claude.ai Claude Test connector): runs the plain-language specs in .claude-test/specs/ against your local dev server in a browser on this computer and reports PASS or FAIL per spec, with a screenshot";
//@ chunk-ae5g0zb5.js:112656-112879 placement
var BLOCKED_STATES = [
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
    filed: A(oe()).max(1000),
    replaced: A(oe()).max(1000),
  }),
);
/**
 * 解析规格提议事件为遥测计数（proposed/filed/first_time）。
 */
//@ chunk-ae5g0zb5.js:112999-113190 placement
function parseSpecProposalEvent(e) {
  let safeParse = SPEC_PROPOSAL_EVENT_SCHEMA().safeParse(e);
  if (!safeParse.success || safeParse.data.proposed === 0) return;
  return {
    proposed: safeParse.data.proposed,
    filed: safeParse.data.filed.length + safeParse.data.replaced.length,
    first_time: safeParse.data.firstTime,
  };
}
//@ chunk-ae5g0zb5.js:113239-113265 placement
var Ia = new HostScoped(() => new Map());
//@ chunk-ae5g0zb5.js:113265-113302 placement
function Jt() {
  return Ia.of(getRootSession().host);
}
//@ chunk-ae5g0zb5.js:113302-113312 placement
var cc = 64;
//@ chunk-ae5g0zb5.js:113312-113671 placement
function rememberRunFolder(e) {
  try {
    if (!isAbsolute_4(e)) return;
    let n = getProjectRoot(),
      r = resolve_2(e),
      o = Jt();
    if (!hm(n, r, !1) || hl(r) || o.has(r)) return;
    if (o.size >= cc) {
      let s = o.keys().next();
      if (s.done !== !0) o.delete(s.value);
    }
    o.set(r, { root: n, isDraftSent: !1, isRunSent: !1, isBusy: !1 });
  } catch (error) {
    logForDebugging(
      `Claude Test could not remember a run folder, so that run is not counted in the usage events: ${errorMessage(error)}`,
      { level: "error" },
    );
  }
}
//@ chunk-ae5g0zb5.js:113700-113943 placement
var RUN_RESULTS_SCHEMA = DoctorLazy(() => {
  let max = E().int().min(0).max(1e4);
  return u({
    schema: T("claude-test-results/1"),
    counts: u({ specs: max, passed: max, failed: max, blocked: max }),
    runnerSeconds: E().int().min(0).max(86400),
    hostsRefused: max,
    blockedWord: U(BLOCKED_STATES).optional().catch("other"),
  });
});
/**
 * 解析 claude-test-results/1 结果，返回计数与错误码（没有通过也没有失败时取 blockedWord）。
 */
//@ chunk-ae5g0zb5.js:113943-114230 placement
function parseRunResults(e) {
  let safeParse = RUN_RESULTS_SCHEMA().safeParse(e);
  if (!safeParse.success) return;
  let {
    counts: counts,
    runnerSeconds: runnerSeconds,
    hostsRefused: hostsRefused,
    blockedWord: blockedWord,
  } = safeParse.data;
  return {
    errorCode: counts.passed + counts.failed > 0 ? void 0 : (blockedWord ?? "other"),
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
    e = Jt();
  } catch (error) {
    logForDebugging(`Claude Test could not count runs in the usage events: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
  for (let [n, r] of e) {
    if (r.isRunSent || r.isBusy) continue;
    r.isBusy = !0;
    try {
      if ((await readPluginFileSafe(r.root, n)) !== "ok") continue;
      let o = r.isDraftSent
        ? void 0
        : parseSpecProposalEvent(await readRunResultsFile(join_6(n, "saved.json")));
      if (o !== void 0) (await logFeatureOkAsync("claude_test_draft", o), (r.isDraftSent = !0));
      let s = parseRunResults(await readRunResultsFile(join_6(n, "results.json")));
      if (s === void 0) continue;
      if (s.errorCode === void 0) await logFeatureOkAsync("claude_test_run", s.counts);
      else await logFeatureBadAsync("claude_test_run", s.errorCode, s.counts);
      r.isRunSent = !0;
    } catch (error) {
      logForDebugging(
        `Claude Test could not count a run in the usage events; it is looked at again when the runner next stops: ${errorMessage(error)}`,
        { level: "error" },
      );
    } finally {
      r.isBusy = !1;
    }
  }
};
/**
 * 读取并解析运行结果文件，失败返回 null。
 */
//@ chunk-ae5g0zb5.js:114952-115057 placement
async function readRunResultsFile(e) {
  let n = await ZB(e);
  if (n === void 0) return null;
  try {
    return jsonParse(Wo(n));
  } catch {
    return null;
  }
}
//@ chunk-ae5g0zb5.js:115057-115155 placement
function Ho(e) {
  if (e === "listed") logFeatureOk("claude_test_helper_start");
  else logFeatureBad("claude_test_helper_start", e);
}
//@ chunk-ae5g0zb5.js:115223-115588 placement
var LOCAL_TASK_DESCRIPTIONS = [
  {
    value: "fix",
    description: "Local, on this machine: do the fix the last local run recommended",
    isFinal: !0,
  },
  {
    value: "onboard",
    description: "Local, on this machine: set up this computer and repository (not the claude.ai connector)",
    isFinal: !0,
  },
  {
    value: "all",
    description: "Local, on this machine: run every test, not only those that cover what changed",
    isFinal: !0,
  },
];
/**
 * /claude-test 参数补全：本地任务描述与 .claude-test/specs 下的规格名。
 */
//@ chunk-ae5g0zb5.js:115588-115883 placement
async function completeSpecArgs(e, n) {
  let r = new Set(e);
  if (LOCAL_TASK_DESCRIPTIONS.some((s) => r.has(s.value))) return [];
  let o = await readdir_2(join_7(getCwd(), ".claude-test", "specs")).catch(() => []);
  return [
    ...(e.length === 0 ? LOCAL_TASK_DESCRIPTIONS : []),
    ...o.filter((s) => s.endsWith(".md")).map((s) => ({ value: s.slice(0, -3) })),
  ].filter((s) => s.value.startsWith(n) && !r.has(s.value));
}
//@ chunk-ae5g0zb5.js:115883-115918 placement
var Go = "${CLAUDE_TEST_BACKGROUND}";
//@ chunk-ae5g0zb5.js:115918-116007 placement
function Uo(e) {
  if (isBackgroundShellDisabled()) return "none";
  if (dfi() && kYe(getToolPermissionContext(e).mode)) return "none";
  return "kept";
}

export {
  Sa,
  Go,
  BLOCKED_STATES,
  ha,
  browserHelperHooks,
  Oa,
  Ia,
  ka,
  LOCAL_RUN_DESCRIPTION,
  xo,
  HELPER_OFF_LOGIN_CHANGED_TEXT,
  Ro,
  qt,
  completeSpecArgs,
  Uo,
  createBrowserHelperController,
  parseSpecProposalEvent,
  Ea,
  wa,
  getActiveAgentDefinitions,
  ensureClaudeTestReloaded,
  createHelperWatchState,
  rememberRunFolder,
  Ta,
  Jt,
  bo,
  countRunsFromUsageEvents,
  Ho,
  parseRunResults,
  seatOwnAgents,
  To,
  consumeComposerMark,
};
