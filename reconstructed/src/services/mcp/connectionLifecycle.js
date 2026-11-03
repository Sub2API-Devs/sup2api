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
import { MONOTONIC_TIMER_RECHECK_MS } from "../../utils/abortController.js";
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
import { isClientWithoutTransport } from "./officialPluginPromptOverrides.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getErrnoCode } from "../../utils/errors.js";
import { count } from "../../utils/collections.js";
import { claimOnce } from "../api/verificationRequired.js";
import { getOauthAccountInfo, hasStoredOAuthToken, hasLoginManagedKey } from "../../utils/auth.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-29pqxdaf.js:3927-3960 placement
/**
 * 挂起后最多重连次数（10）。
 */
var CONNECT_SUSPENDED = "CONNECT_SUSPENDED";
var MAX_SUSPENDED_REDIALS = 10;
//@ chunk-29pqxdaf.js:3960-4038 placement
/**
 * 记录时钟快照（单调时间与墙钟起点）。
 */
function startClockSnapshot(clock) {
  return {
    clock,
    awakeStart: clock.monotonicNow(),
    wallStart: clock.now(),
  };
}
//@ chunk-29pqxdaf.js:4038-4171 placement
/**
 * 格式化连接耗时（总耗时与其中非睡眠时间）。
 */
function formatConnectElapsed({ clock, awakeStart, wallStart }) {
  return `${Math.round(clock.now() - wallStart)}ms, ${Math.round(clock.monotonicNow() - awakeStart)}ms of it awake`;
}
//@ chunk-29pqxdaf.js:4171-4428 placement
/**
 * 连接期间电脑睡眠或时钟变化导致超时时，返回对应提示（开关关闭时不处理）。
 */
function suspendedConnectMessage(name, { clock, awakeStart, wallStart }) {
  if (
    !(clock.now() - wallStart - (clock.monotonicNow() - awakeStart) > MONOTONIC_TIMER_RECHECK_MS) ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_suspend_redial", true)
  )
    return;
  return `MCP server "${name}" connection timed out. Your computer went to sleep or its clock changed while connecting.`;
}
//@ chunk-29pqxdaf.js:4428-4861 placement
/**
 * 因睡眠或时钟变化导致连接失败时重新拨号（有次数上限，身份未变时才重试），并记录特性状态。
 */
async function redialAfterSuspend(e, n, o) {
  let r = identityEpoch();
  let s = await e();
  let l = 0;
  while (
    l < MAX_SUSPENDED_REDIALS &&
    s.type === "failed" &&
    s.errorCode === CONNECT_SUSPENDED &&
    n() &&
    identityEpoch() === r
  ) {
    l++;
    logMCPDebug(
      s.name,
      `Connecting again after a sleep or a clock change (${l} of at most ${MAX_SUSPENDED_REDIALS})`,
    );
    s = await e();
  }
  if (l === 0) return s;
  if (s.type !== "failed") logFeatureOk("mcp_connect_suspend_redial");
  else if (s.errorCode !== CONNECT_SUSPENDED) logFeatureSad("mcp_connect_suspend_redial", "failed");
  else {
    logFeatureSad("mcp_connect_suspend_redial", "slept_again");
    if (l === MAX_SUSPENDED_REDIALS && n()) o();
  }
  return s;
}
//@ chunk-29pqxdaf.js:4861-4900 placement
/**
 * 杀进程树后的等待时间（600 毫秒）。
 */
var SIGINT_GRACE_MS = 100;
var SIGTERM_GRACE_MS = 400;
var SIGKILL_GRACE_MS = 100;
var STDIN_CLOSE_GRACE_MS = 300;
var TREE_KILL_GRACE_MS = 600;
//@ chunk-29pqxdaf.js:4900-5005 placement
/**
 * Claude Code 正在退出时拒绝启动新的 stdio MCP 服务器进程。
 */
function assertNotShuttingDown() {
  if (isCleanupStarted()) throw Error("Claude Code is shutting down; not starting this MCP server process");
}
//@ chunk-29pqxdaf.js:5005-5073 placement
/**
 * 登记孤儿 stdio 服务器并在退出时清理。
 */
function trackOrphanStdioServer(serverProcess) {
  let n = registerCleanup(() => signalOrphanStdioServer(serverProcess));
  serverProcess.once("exit", () => n());
  return n;
}
//@ chunk-29pqxdaf.js:5073-5133 placement
/**
 * 判断子进程是否已退出。
 */
function hasExited(e) {
  return e.exitCode !== null || e.signalCode !== null;
}
//@ chunk-29pqxdaf.js:5133-5588 placement
/**
 * 退出时处理尚未建立连接的 stdio MCP 服务器进程：Windows 下关 stdin；其他平台依次发 SIGINT、SIGTERM、SIGKILL，每次等待一段时间看是否退出。
 */
async function signalOrphanStdioServer(e) {
  let pid = e.pid;
  if (pid === undefined || hasExited(e)) return;
  if (getPlatform() === "windows") {
    logForDebugging(
      `[MCP] stdio server process ${pid} has no established connection at exit; closing its stdin`,
    );
    await closeStdioServer(e);
    return;
  }
  let promise = new Promise((resolve) => {
    e.once("exit", () => resolve());
  });
  let r = [
    ["SIGINT", SIGINT_GRACE_MS],
    ["SIGTERM", SIGTERM_GRACE_MS],
    ["SIGKILL", SIGKILL_GRACE_MS],
  ];
  for (let [s, l] of r) {
    if (hasExited(e)) return;
    logForDebugging(`[MCP] stdio server process ${pid} has no established connection at exit; sending ${s}`);
    try {
      e.kill(s);
    } catch {
      return;
    }
    await withDeadline(promise, l);
  }
}
//@ chunk-29pqxdaf.js:5588-5875 placement
/**
 * 关闭 stdio MCP 服务器进程：先关 stdin 等待退出，超时后终止其进程树。
 */
async function closeStdioServer(serverProcess) {
  let pid = serverProcess.pid;
  if (pid === undefined || hasExited(serverProcess)) return;
  let promise = new Promise((resolve) => {
    serverProcess.once("exit", () => resolve());
  });
  serverProcess.stdin?.end();
  await withDeadline(promise, STDIN_CLOSE_GRACE_MS);
  if (hasExited(serverProcess)) return;
  logForDebugging(
    `[MCP] stdio server process ${pid} is still running ${STDIN_CLOSE_GRACE_MS}ms after stdin closed; terminating its process tree`,
  );
  killProcessGroup(pid);
  await withDeadline(promise, TREE_KILL_GRACE_MS);
}
//@ chunk-29pqxdaf.js:5875-5938 placement
/**
 * 是否为启用了 tengu_eventual_noodle 的 claude.ai cowork 会话。
 */
function isEventualNoodleEnabled() {
  return isClaudeAiChatCowork() && getFeatureValue_SESSION_PINNED("tengu_eventual_noodle", false) === true;
}
//@ chunk-29pqxdaf.js:5938-6019 placement = extractErrorTypeFromData (1)
function isTextBlock(data) {
  return typeof data === "object" && data !== null && "type" in data && data.type === "text";
}
//@ chunk-29pqxdaf.js:6019-6296 placement
/**
 * 开关开启时把 MCP 结果的非文本内容排在文本前重新转换，结果全为空白文本时放弃。
 */
async function contentOverStructuredResult(content, n) {
  if (!isEventualNoodleEnabled()) return;
  let o = await n([...content.filter((r) => !isTextBlock(r)), ...content.filter(isTextBlock)]);
  if (o.content.every((r) => r.type === "text" && r.text.trim() === "")) {
    if (o.content.length > 0) logFeatureSad("mcp_content_over_structured", "blank_text");
    return;
  }
  logFeatureOk("mcp_content_over_structured");
  return o;
}
//@ chunk-29pqxdaf.js:6296-6351 placement
/**
 * 读 tengu_serene_teapot（默认开）。
 */
function isSereneTeapotEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_teapot", true) !== false;
}
//@ chunk-29pqxdaf.js:6351-6370 placement
var weakSet = new WeakSet();
//@ chunk-29pqxdaf.js:6370-6403 placement
/**
 * 判断该服务器是否曾跳过监听 GET。
 */
function wasListenGetSkipped(e) {
  return weakSet.has(e);
}
//@ chunk-29pqxdaf.js:6403-6942 placement
/**
 * 包装 MCP HTTP fetch：服务器上次回答的 Allow 头不含 GET 时，后续不带 Last-Event-ID 的监听流 GET 直接本地回 405，不再发到服务器。
 */
function wrapFetchSkipListenGet(fetchImpl, serverName, endpointUrl) {
  let endpointHref = new URL(endpointUrl).href;
  let getNotAllowed = false;
  return async (l, i) => {
    if (new URL(l).href !== endpointHref) return fetchImpl(l, i);
    if (getNotAllowed && i?.method === "GET" && !new Headers(i.headers).has("last-event-id")) {
      logMCPDebug(
        serverName,
        "Listen-stream GET not sent: the server's last answer had an Allow header that does not list GET, so Claude Code answered the GET with 405 itself",
      );
      let response = new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      });
      weakSet.add(response);
      return response;
    }
    let d = await fetchImpl(l, i);
    let p = d.headers.get("allow");
    getNotAllowed = p !== null && !p.split(",").some((u) => u.trim().toUpperCase() === "GET");
    return d;
  };
}
//@ chunk-29pqxdaf.js:6942-7063 placement
var LIST_CHANGED_MIN_INTERVAL_MS = 1000;
var LIST_CHANGED_MAX_INTERVAL_MS = 30000;
var DEFAULT_REFETCH_CLOCK = {
  now: () => performance.now(),
  arm: (e, n) => {
    let o = setTimeout(e, n).unref();
    return () => clearTimeout(o);
  },
};
//@ chunk-29pqxdaf.js:7063-7641 placement
/**
 * 合并 list_changed 通知的重拉调度器：同一时刻只有一个待处理请求，按最小间隔触发、连续触发时间隔翻倍到上限；连接已关闭时直接结算。返回接收通知的函数（返回等待重拉完成的 Promise）。
 */
function createListChangedRefetcher(connection, refetch, clock = DEFAULT_REFETCH_CLOCK) {
  let idle = true;
  let pending;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let intervalMs = LIST_CHANGED_MIN_INTERVAL_MS;
  let resetBackoff = () => {
    intervalMs = LIST_CHANGED_MIN_INTERVAL_MS;
    idle = true;
  };
  let runRefetch = () => {
    let w = pending;
    pending = undefined;
    if (w === undefined) {
      resetBackoff();
      return;
    }
    (async () => refetch(w.cause))()
      .catch((error) => {
        logMCPDebug(
          connection.name,
          `list_changed refetch failed: ${describeConnectError(error, connection.config)}`,
        );
      })
      .finally(() => {
        NEGATIVE_INFINITY = clock.now();
        w.settle();
        if (pending === undefined) {
          resetBackoff();
          return;
        }
        S();
        intervalMs = Math.min(intervalMs * 2, LIST_CHANGED_MAX_INTERVAL_MS);
      });
  };
  let u = () => {
    if (isClientWithoutTransport(connection)) {
      pending?.settle();
      pending = undefined;
      resetBackoff();
      return;
    }
    runRefetch();
  };
  let S = () => {
    idle = false;
    let w = NEGATIVE_INFINITY + intervalMs - clock.now();
    if (w > 0) clock.arm(u, w);
    else runRefetch();
  };
  return (cause) => {
    let y = pending;
    if (y === undefined) {
      let settle = () => {};
      let settled = new Promise((resolve) => (settle = resolve));
      y = pending = {
        cause,
        settled,
        settle,
      };
      if (idle) S();
    } else y.cause = cause;
    return y.settled;
  };
}
//@ chunk-29pqxdaf.js:7641-7667 placement
/**
 * 按宿主保存的并发槽位表。
 */
var overlapSlotsByHost = new HostScoped(() => new Map());
//@ chunk-29pqxdaf.js:7667-7704 placement
/**
 * 取当前宿主的并发槽位表。
 */
function getOverlapSlots() {
  return overlapSlotsByHost.of(getRootSession().host);
}
//@ chunk-29pqxdaf.js:7704-7899 placement
/**
 * 若工具在可重叠调用的列表中，给调用包上并发槽位控制。
 */
function withOverlapSlots(serverName, name, o) {
  let r = getOverlapSlots().get(serverName);
  if (r === undefined || !r.toolNames.has(name))
    return {
      mayOverlap: false,
      call: o,
    };
  return {
    mayOverlap: true,
    call: (s, l, ...i) => r.slots.run(l.abortController.signal, () => o(s, l, ...i)),
  };
}
//@ chunk-29pqxdaf.js:7899-8017 placement
/**
 * 表示请求根本没有发出的连接错误码集合。
 */
var NOTHING_SENT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ConnectionRefused",
  "ENOTFOUND",
  "EAI_AGAIN",
  "FailedToOpenSocket",
  "ERR_PROXY_TUNNEL",
]);
//@ chunk-29pqxdaf.js:8017-8697 placement
/**
 * 包装传输层 send：给 tools/call 计数，发送失败且错误表明根本没发出去（连接拒绝、DNS 失败等）时记为"未执行"，并同步到对应 toolUseId 的调用看门狗。
 */
function trackToolCallSends(transport, isNothingSentError, watchdogs) {
  let sends = {
    started: 0,
    ranNothing: [],
  };
  let originalSend = transport.send.bind(transport);
  transport.send = (l, i) => {
    if (typeof l !== "object" || l === null || !("method" in l) || l.method !== "tools/call")
      return originalSend(l, i);
    let d = ++sends.started;
    let params = "params" in l ? l.params : undefined;
    let _meta = typeof params === "object" && params !== null && "_meta" in params ? params._meta : undefined;
    let S =
      typeof _meta === "object" && _meta !== null && "claudecode/toolUseId" in _meta
        ? _meta["claudecode/toolUseId"]
        : undefined;
    let w = typeof S === "string" ? [...watchdogs].filter((watchdog) => watchdog.toolUseId === S) : [];
    for (let E of w) if (E.ownSends !== undefined) E.ownSends.started++;
    let ownSends = w.length === 1 ? w[0]?.ownSends : undefined;
    return originalSend(l, i).catch((error) => {
      if (
        NOTHING_SENT_ERROR_CODES.has(getErrnoCode(error) ?? "") ||
        (error instanceof Error && isNothingSentError(error))
      ) {
        sends.ranNothing.push(d);
        if (ownSends !== undefined) ownSends.ranNothing++;
      }
      throw error;
    });
  };
  return sends;
}
//@ chunk-29pqxdaf.js:8697-8870 placement
/**
 * 判断一次工具调用期间发生的连接尝试是否都没有发出任何请求。
 */
function didCallRunNothing(toolCallSends, started, ownSends) {
  if (ownSends !== undefined && ownSends.started > 0) return ownSends.ranNothing === ownSends.started;
  if (toolCallSends === undefined || started === undefined) return false;
  let r = toolCallSends.started - started;
  return r > 0 && count(toolCallSends.ranNothing, (s) => s > started) === r;
}
//@ chunk-29pqxdaf.js:8870-9148 placement
/**
 * 不编译 schema 的会话中使用的空校验器：输出 schema 不做校验，首次遇到时记录警告。
 */
var NO_OP_SCHEMA_VALIDATOR = {
  getValidator(e) {
    if (claimOnce().claim("mcp_output_schema_unchecked"))
      logForDebugging(
        "An MCP server listed a tool with an outputSchema in a session that compiles no schemas; that tool's results are not checked against it",
        {
          level: "warn",
        },
      );
    return (data) => ({
      valid: true,
      data,
      errorMessage: undefined,
    });
  },
};
//@ chunk-29pqxdaf.js:9148-9176 placement
/**
 * 按消息 id 记录记忆链值的容器。
 */
class MemoryChainByMessage {
  byMessageId = new Map();
}
//@ chunk-29pqxdaf.js:9176-9332 placement
/**
 * 生成工具调用请求的记忆链元数据（响应 id 与已记录的链值）。
 */
function memoryChainMeta(toolState, id) {
  if (!id) return {};
  let o = toolState.get(MemoryChainByMessage).byMessageId.get(id);
  return {
    ["anthropic/memory.response_id"]: id,
    ...(o !== undefined && {
      ["anthropic/memory.chain"]: o,
    }),
  };
}
//@ chunk-29pqxdaf.js:9332-9583 placement
/**
 * 从工具结果的元数据中记录记忆链值（按消息 id 保存最近若干条）。
 */
function rememberMemoryChain(toolState, id, o) {
  if (!id || !o || !("anthropic/memory.chain" in o)) return;
  let r = o["anthropic/memory.chain"];
  let byMessageId = toolState.get(MemoryChainByMessage).byMessageId;
  byMessageId.delete(id);
  if (typeof r !== "string" || r.length > 16384) return;
  byMessageId.set(id, r);
  for (let key of byMessageId.keys()) {
    if (byMessageId.size <= 8) break;
    byMessageId.delete(key);
  }
}
//@ chunk-29pqxdaf.js:9583-9851 placement
/**
 * 包装 fetch：重定向响应去掉 Location 头，避免跟随重定向。
 */
function stripRedirectLocation(fetchFn) {
  return async (n, o) => {
    let r = await fetchFn(n, o);
    if (![301, 302, 303, 307, 308].includes(r.status) || !r.headers.has("Location")) return r;
    let headers = new Headers(r.headers);
    headers.delete("Location");
    return new Response(r.body, {
      status: r.status,
      statusText: r.statusText,
      headers,
    });
  };
}
//@ chunk-29pqxdaf.js:9851-9992 placement
/**
 * 取当前 OAuth 账号身份（账号、组织与是否装有凭据），用于判断身份变化。
 */
function oauthAccountIdentity() {
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo) return;
  return {
    accountUuid: oauthAccountInfo.accountUuid,
    organizationUuid: oauthAccountInfo.organizationUuid,
    credentialInstalled: hasStoredOAuthToken() || hasLoginManagedKey(),
  };
}
//@ chunk-29pqxdaf.js:9992-10535 placement
/**
 * 给 MCP 工具挂上文件输入支持：包装 validateInput、call 与 askInputPreparer，调用前把文件引用参数替换为上传后的文件输入。
 */
function wireFileInputs(tool, listed, callToolFor) {
  let loadFileInputs = () => import("./chunk-gwvwj681.js");
  let fileInputContext = (input, u) => ({
    listed,
    input,
    toolPermissionContext: getToolPermissionContext(u),
    callTool: callToolFor(u),
    signal: u.abortController.signal,
    session: u.session,
  });
  let validateInput = tool.validateInput;
  tool.validateInput = async (p, u) =>
    (await loadFileInputs()).validateToolFileInputs(listed, validateInput, p, u);
  let i = tool.call;
  tool.call = async (p, u, ...S) => {
    let { argsWithFileInputs } = await loadFileInputs();
    let y = await argsWithFileInputs({
      ...fileInputContext(p ?? {}, u),
      toolUseId: u.toolUseId,
    });
    return i(y, u, ...S);
  };
  let askInputPreparer = tool.askInputPreparer;
  tool.askInputPreparer = async (p, u, S) =>
    (await loadFileInputs()).fileInputAskPreparer({
      ...fileInputContext(p, u),
      toolUseId: S,
    }) ?? askInputPreparer?.(p, u, S);
}
export {
  stripRedirectLocation,
  startClockSnapshot,
  wrapFetchSkipListenGet,
  isSereneTeapotEnabled,
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
  trackOrphanStdioServer,
  wasListenGetSkipped,
};
