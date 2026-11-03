/**
 * services/mcp/connectionLifecycle.ts
 *
 * 2.1.316 新增：MCP 连接生命周期
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-29pqxdaf.js (33)
 * attribution: placement 33
 */
import { Phr } from "../../utils/abortController.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../analytics/growthbook.js";
import { identityEpoch } from "./identityChange.js";
import { logMCPDebug } from "../../utils/log.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isCleanupStarted, registerCleanup } from "../../utils/cleanupRegistry.js";
import { getPlatform } from "../../utils/platform.js";
import { logForDebugging } from "../../utils/debug.js";
import { withDeadline } from "../../utils/sleep.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";
import { isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";
import { describeConnectError } from "./auth.js";
import { $Ae } from "./officialPluginPromptOverrides.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getErrnoCode } from "../../utils/errors.js";
import { count } from "../../utils/collections.js";
import { claimOnce } from "../api/verificationRequired.js";
import { getOauthAccountInfo, hasStoredOAuthToken, hasLoginManagedKey } from "../../utils/auth.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-29pqxdaf.js:3927-3960 placement
var CONNECT_SUSPENDED = "CONNECT_SUSPENDED",
  G = 10;
//@ chunk-29pqxdaf.js:3960-4038 placement
function pBt(e) {
  return { clock: e, awakeStart: e.monotonicNow(), wallStart: e.now() };
}
/**
 * 格式化连接耗时（总耗时与其中非睡眠时间）。
 */
//@ chunk-29pqxdaf.js:4038-4171 placement
function formatConnectElapsed({ clock: clock, awakeStart: awakeStart, wallStart: wallStart }) {
  return `${Math.round(clock.now() - wallStart)}ms, ${Math.round(clock.monotonicNow() - awakeStart)}ms of it awake`;
}
/**
 * 连接期间电脑睡眠或时钟变化导致超时时，返回对应提示（开关关闭时不处理）。
 */
//@ chunk-29pqxdaf.js:4171-4428 placement
function suspendedConnectMessage(e, { clock: clock, awakeStart: awakeStart, wallStart: wallStart }) {
  if (
    !(clock.now() - wallStart - (clock.monotonicNow() - awakeStart) > Phr) ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_suspend_redial", !0)
  )
    return;
  return `MCP server "${e}" connection timed out. Your computer went to sleep or its clock changed while connecting.`;
}
/**
 * 因睡眠或时钟变化导致连接失败时重新拨号（有次数上限，身份未变时才重试），并记录特性状态。
 */
//@ chunk-29pqxdaf.js:4428-4861 placement
async function redialAfterSuspend(e, n, o) {
  let r = identityEpoch(),
    s = await e(),
    l = 0;
  while (l < G && s.type === "failed" && s.errorCode === CONNECT_SUSPENDED && n() && identityEpoch() === r)
    (l++,
      logMCPDebug(s.name, `Connecting again after a sleep or a clock change (${l} of at most ${G})`),
      (s = await e()));
  if (l === 0) return s;
  if (s.type !== "failed") logFeatureOk("mcp_connect_suspend_redial");
  else if (s.errorCode !== CONNECT_SUSPENDED) logFeatureSad("mcp_connect_suspend_redial", "failed");
  else if ((logFeatureSad("mcp_connect_suspend_redial", "slept_again"), l === G && n())) o();
  return s;
}
//@ chunk-29pqxdaf.js:4861-4900 placement
var ve = 100,
  Ae = 400,
  Te = 100,
  de = 300,
  Re = 600;
/**
 * Claude Code 正在退出时拒绝启动新的 stdio MCP 服务器进程。
 */
//@ chunk-29pqxdaf.js:4900-5005 placement
function assertNotShuttingDown() {
  if (isCleanupStarted()) throw Error("Claude Code is shutting down; not starting this MCP server process");
}
//@ chunk-29pqxdaf.js:5005-5073 placement
function gBt(e) {
  let n = registerCleanup(() => signalOrphanStdioServer(e));
  return (e.once("exit", () => n()), n);
}
//@ chunk-29pqxdaf.js:5073-5133 placement
function j(e) {
  return e.exitCode !== null || e.signalCode !== null;
}
/**
 * 退出时处理尚未建立连接的 stdio MCP 服务器进程：Windows 下关 stdin；其他平台依次发 SIGINT、SIGTERM、SIGKILL，每次等待一段时间看是否退出。
 */
//@ chunk-29pqxdaf.js:5133-5588 placement
async function signalOrphanStdioServer(e) {
  let pid = e.pid;
  if (pid === void 0 || j(e)) return;
  if (getPlatform() === "windows") {
    (logForDebugging(
      `[MCP] stdio server process ${pid} has no established connection at exit; closing its stdin`,
    ),
      await closeStdioServer(e));
    return;
  }
  let promise = new Promise((s) => {
      e.once("exit", () => s());
    }),
    r = [
      ["SIGINT", ve],
      ["SIGTERM", Ae],
      ["SIGKILL", Te],
    ];
  for (let [s, l] of r) {
    if (j(e)) return;
    logForDebugging(`[MCP] stdio server process ${pid} has no established connection at exit; sending ${s}`);
    try {
      e.kill(s);
    } catch {
      return;
    }
    await withDeadline(promise, l);
  }
}
/**
 * 关闭 stdio MCP 服务器进程：先关 stdin 等待退出，超时后终止其进程树。
 */
//@ chunk-29pqxdaf.js:5588-5875 placement
async function closeStdioServer(e) {
  let pid = e.pid;
  if (pid === void 0 || j(e)) return;
  let promise = new Promise((r) => {
    e.once("exit", () => r());
  });
  if ((e.stdin?.end(), await withDeadline(promise, de), j(e))) return;
  (logForDebugging(
    `[MCP] stdio server process ${pid} is still running ${de}ms after stdin closed; terminating its process tree`,
  ),
    killProcessGroup(pid),
    await withDeadline(promise, Re));
}
//@ chunk-29pqxdaf.js:5875-5938 placement
function Me() {
  return isClaudeAiChatCowork() && getFeatureValue_SESSION_PINNED("tengu_eventual_noodle", !1) === !0;
}
//@ chunk-29pqxdaf.js:5938-6019 placement = extractErrorTypeFromData (1)
function isTextBlock(data) {
  return typeof data === "object" && data !== null && "type" in data && data.type === "text";
}
/**
 * 开关开启时把 MCP 结果的非文本内容排在文本前重新转换，结果全为空白文本时放弃。
 */
//@ chunk-29pqxdaf.js:6019-6296 placement
async function contentOverStructuredResult(e, n) {
  if (!Me()) return;
  let o = await n([...e.filter((r) => !isTextBlock(r)), ...e.filter(isTextBlock)]);
  if (o.content.every((r) => r.type === "text" && r.text.trim() === "")) {
    if (o.content.length > 0) logFeatureSad("mcp_content_over_structured", "blank_text");
    return;
  }
  return (logFeatureOk("mcp_content_over_structured"), o);
}
//@ chunk-29pqxdaf.js:6296-6351 placement
function t4n() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_teapot", !0) !== !1;
}
//@ chunk-29pqxdaf.js:6351-6370 placement
var weakSet = new WeakSet();
//@ chunk-29pqxdaf.js:6370-6403 placement
function JGs(e) {
  return weakSet.has(e);
}
/**
 * 包装 MCP HTTP fetch：服务器上次回答的 Allow 头不含 GET 时，后续不带 Last-Event-ID 的监听流 GET 直接本地回 405，不再发到服务器。
 */
//@ chunk-29pqxdaf.js:6403-6942 placement
function wrapFetchSkipListenGet(fetchImpl, serverName, endpointUrl) {
  let endpointHref = new URL(endpointUrl).href,
    getNotAllowed = !1;
  return async (l, i) => {
    if (new URL(l).href !== endpointHref) return fetchImpl(l, i);
    if (getNotAllowed && i?.method === "GET" && !new Headers(i.headers).has("last-event-id")) {
      logMCPDebug(
        serverName,
        "Listen-stream GET not sent: the server's last answer had an Allow header that does not list GET, so Claude Code answered the GET with 405 itself",
      );
      let response = new Response(null, { status: 405, statusText: "Method Not Allowed" });
      return (weakSet.add(response), response);
    }
    let d = await fetchImpl(l, i),
      p = d.headers.get("allow");
    return ((getNotAllowed = p !== null && !p.split(",").some((u) => u.trim().toUpperCase() === "GET")), d);
  };
}
//@ chunk-29pqxdaf.js:6942-7063 placement
var LIST_CHANGED_MIN_INTERVAL_MS = 1000,
  LIST_CHANGED_MAX_INTERVAL_MS = 30000,
  DEFAULT_REFETCH_CLOCK = {
    now: () => performance.now(),
    arm: (e, n) => {
      let unref = setTimeout(e, n).unref();
      return () => clearTimeout(unref);
    },
  };
/**
 * 合并 list_changed 通知的重拉调度器：同一时刻只有一个待处理请求，按最小间隔触发、连续触发时间隔翻倍到上限；连接已关闭时直接结算。返回接收通知的函数（返回等待重拉完成的 Promise）。
 */
//@ chunk-29pqxdaf.js:7063-7641 placement
function createListChangedRefetcher(connection, refetch, clock = DEFAULT_REFETCH_CLOCK) {
  let idle = !0,
    pending,
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
    intervalMs = LIST_CHANGED_MIN_INTERVAL_MS,
    resetBackoff = () => {
      ((intervalMs = LIST_CHANGED_MIN_INTERVAL_MS), (idle = !0));
    },
    runRefetch = () => {
      let w = pending;
      if (((pending = void 0), w === void 0)) {
        resetBackoff();
        return;
      }
      (async () => refetch(w.cause))()
        .catch((y) => {
          logMCPDebug(
            connection.name,
            `list_changed refetch failed: ${describeConnectError(y, connection.config)}`,
          );
        })
        .finally(() => {
          if (((NEGATIVE_INFINITY = clock.now()), w.settle(), pending === void 0)) {
            resetBackoff();
            return;
          }
          (S(), (intervalMs = Math.min(intervalMs * 2, LIST_CHANGED_MAX_INTERVAL_MS)));
        });
    },
    u = () => {
      if ($Ae(connection)) {
        (pending?.settle(), (pending = void 0), resetBackoff());
        return;
      }
      runRefetch();
    },
    S = () => {
      idle = !1;
      let w = NEGATIVE_INFINITY + intervalMs - clock.now();
      if (w > 0) clock.arm(u, w);
      else runRefetch();
    };
  return (w) => {
    let y = pending;
    if (y === void 0) {
      let E = () => {},
        promise = new Promise((x) => (E = x));
      if (((y = pending = { cause: w, settled: promise, settle: E }), idle)) S();
    } else y.cause = w;
    return y.settled;
  };
}
//@ chunk-29pqxdaf.js:7641-7667 placement
var Oe = new HostScoped(() => new Map());
//@ chunk-29pqxdaf.js:7667-7704 placement
function Le() {
  return Oe.of(getRootSession().host);
}
/**
 * 若工具在可重叠调用的列表中，给调用包上并发槽位控制。
 */
//@ chunk-29pqxdaf.js:7704-7899 placement
function withOverlapSlots(e, n, o) {
  let r = Le().get(e);
  if (r === void 0 || !r.toolNames.has(n)) return { mayOverlap: !1, call: o };
  return { mayOverlap: !0, call: (s, l, ...i) => r.slots.run(l.abortController.signal, () => o(s, l, ...i)) };
}
/**
 * 表示请求根本没有发出的连接错误码集合。
 */
//@ chunk-29pqxdaf.js:7899-8017 placement
var NOTHING_SENT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ConnectionRefused",
  "ENOTFOUND",
  "EAI_AGAIN",
  "FailedToOpenSocket",
  "ERR_PROXY_TUNNEL",
]);
/**
 * 包装传输层 send：给 tools/call 计数，发送失败且错误表明根本没发出去（连接拒绝、DNS 失败等）时记为"未执行"，并同步到对应 toolUseId 的调用看门狗。
 */
//@ chunk-29pqxdaf.js:8017-8697 placement
function trackToolCallSends(transport, isNothingSentError, watchdogs) {
  let sends = { started: 0, ranNothing: [] },
    originalSend = transport.send.bind(transport);
  return (
    (transport.send = (l, i) => {
      if (typeof l !== "object" || l === null || !("method" in l) || l.method !== "tools/call")
        return originalSend(l, i);
      let d = ++sends.started,
        p = "params" in l ? l.params : void 0,
        u = typeof p === "object" && p !== null && "_meta" in p ? p._meta : void 0,
        S =
          typeof u === "object" && u !== null && "claudecode/toolUseId" in u
            ? u["claudecode/toolUseId"]
            : void 0,
        w = typeof S === "string" ? [...watchdogs].filter((E) => E.toolUseId === S) : [];
      for (let E of w) if (E.ownSends !== void 0) E.ownSends.started++;
      let y = w.length === 1 ? w[0]?.ownSends : void 0;
      return originalSend(l, i).catch((E) => {
        if (
          NOTHING_SENT_ERROR_CODES.has(getErrnoCode(E) ?? "") ||
          (E instanceof Error && isNothingSentError(E))
        ) {
          if ((sends.ranNothing.push(d), y !== void 0)) y.ranNothing++;
        }
        throw E;
      });
    }),
    sends
  );
}
/**
 * 判断一次工具调用期间发生的连接尝试是否都没有发出任何请求。
 */
//@ chunk-29pqxdaf.js:8697-8870 placement
function didCallRunNothing(e, n, o) {
  if (o !== void 0 && o.started > 0) return o.ranNothing === o.started;
  if (e === void 0 || n === void 0) return !1;
  let r = e.started - n;
  return r > 0 && count(e.ranNothing, (s) => s > n) === r;
}
/**
 * 不编译 schema 的会话中使用的空校验器：输出 schema 不做校验，首次遇到时记录警告。
 */
//@ chunk-29pqxdaf.js:8870-9148 placement
var NO_OP_SCHEMA_VALIDATOR = {
  getValidator(e) {
    if (claimOnce().claim("mcp_output_schema_unchecked"))
      logForDebugging(
        "An MCP server listed a tool with an outputSchema in a session that compiles no schemas; that tool's results are not checked against it",
        { level: "warn" },
      );
    return (n) => ({ valid: !0, data: n, errorMessage: void 0 });
  },
};
//@ chunk-29pqxdaf.js:9148-9176 placement
class K {
  byMessageId = new Map();
}
/**
 * 生成工具调用请求的记忆链元数据（响应 id 与已记录的链值）。
 */
//@ chunk-29pqxdaf.js:9176-9332 placement
function memoryChainMeta(e, n) {
  if (!n) return {};
  let o = e.get(K).byMessageId.get(n);
  return { ["anthropic/memory.response_id"]: n, ...(o !== void 0 && { ["anthropic/memory.chain"]: o }) };
}
/**
 * 从工具结果的元数据中记录记忆链值（按消息 id 保存最近若干条）。
 */
//@ chunk-29pqxdaf.js:9332-9583 placement
function rememberMemoryChain(e, n, o) {
  if (!n || !o || !("anthropic/memory.chain" in o)) return;
  let r = o["anthropic/memory.chain"],
    byMessageId = e.get(K).byMessageId;
  if ((byMessageId.delete(n), typeof r !== "string" || r.length > 16384)) return;
  byMessageId.set(n, r);
  for (let l of byMessageId.keys()) {
    if (byMessageId.size <= 8) break;
    byMessageId.delete(l);
  }
}
/**
 * 包装 fetch：重定向响应去掉 Location 头，避免跟随重定向。
 */
//@ chunk-29pqxdaf.js:9583-9851 placement
function stripRedirectLocation(e) {
  return async (n, o) => {
    let r = await e(n, o);
    if (![301, 302, 303, 307, 308].includes(r.status) || !r.headers.has("Location")) return r;
    let headers = new Headers(r.headers);
    return (
      headers.delete("Location"),
      new Response(r.body, { status: r.status, statusText: r.statusText, headers: headers })
    );
  };
}
/**
 * 取当前 OAuth 账号身份（账号、组织与是否装有凭据），用于判断身份变化。
 */
//@ chunk-29pqxdaf.js:9851-9992 placement
function oauthAccountIdentity() {
  let e = getOauthAccountInfo();
  if (!e) return;
  return {
    accountUuid: e.accountUuid,
    organizationUuid: e.organizationUuid,
    credentialInstalled: hasStoredOAuthToken() || hasLoginManagedKey(),
  };
}
/**
 * 给 MCP 工具挂上文件输入支持：包装 validateInput、call 与 askInputPreparer，调用前把文件引用参数替换为上传后的文件输入。
 */
//@ chunk-29pqxdaf.js:9992-10535 placement
function wireFileInputs(tool, listed, callToolFor) {
  let loadFileInputs = () => import("./chunk-gwvwj681.js"),
    fileInputContext = (p, u) => ({
      listed: listed,
      input: p,
      toolPermissionContext: getToolPermissionContext(u),
      callTool: callToolFor(u),
      signal: u.abortController.signal,
      session: u.session,
    }),
    validateInput = tool.validateInput;
  tool.validateInput = async (p, u) =>
    (await loadFileInputs()).validateToolFileInputs(listed, validateInput, p, u);
  let i = tool.call;
  tool.call = async (p, u, ...S) => {
    let { argsWithFileInputs: argsWithFileInputs } = await loadFileInputs(),
      y = await argsWithFileInputs({ ...fileInputContext(p ?? {}, u), toolUseId: u.toolUseId });
    return i(y, u, ...S);
  };
  let askInputPreparer = tool.askInputPreparer;
  tool.askInputPreparer = async (p, u, S) =>
    (await loadFileInputs()).fileInputAskPreparer({ ...fileInputContext(p, u), toolUseId: S }) ??
    askInputPreparer?.(p, u, S);
}

export {
  stripRedirectLocation,
  pBt,
  wrapFetchSkipListenGet,
  t4n,
  NO_OP_SCHEMA_VALIDATOR,
  formatConnectElapsed,
  NOTHING_SENT_ERROR_CODES,
  trackToolCallSends,
  closeStdioServer,
  suspendedConnectMessage,
  CONNECT_SUSPENDED,
  redialAfterSuspend,
  oauthAccountIdentity,
  createListChangedRefetcher,
  withOverlapSlots,
  memoryChainMeta,
  rememberMemoryChain,
  wireFileInputs,
  contentOverStructuredResult,
  didCallRunNothing,
  assertNotShuttingDown,
  gBt,
  JGs,
};
