/**
 * services/mcp/connectionLifecycle.ts
 *
 * 2.1.316 新增：MCP 连接生命周期
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-323717f6.js (34)
 * attribution: placement 33, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
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
import { getRootSession, isDiskless } from "../../bootstrap/state.js";
import { getErrnoCode } from "../../utils/errors.js";
import { countWhere } from "../../utils/collections.js";
import { claimOnce } from "../api/verificationRequired.js";
import { getOauthAccountInfo, hasStoredOAuthToken, hasLoginManagedKey } from "../../utils/auth.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import {
  liftedAsksInAcceptEdits,
  makeAskDecision,
  mcpPolicyAskRule,
} from "../../utils/permissions/mcpPolicyAsks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-323717f6.js:4274-4307 placement
/**
 * 挂起后最多重连次数（10）。
 */
var CONNECT_SUSPENDED = "CONNECT_SUSPENDED";
var MAX_SUSPENDED_REDIALS = 10;
//@ chunk-323717f6.js:4307-4385 placement
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
//@ chunk-323717f6.js:4385-4518 placement
/**
 * 格式化连接耗时（总耗时与其中非睡眠时间）。
 */
function formatConnectElapsed({ clock, awakeStart, wallStart }) {
  return `${Math.round(clock.now() - wallStart)}ms, ${Math.round(clock.monotonicNow() - awakeStart)}ms of it awake`;
}
//@ chunk-323717f6.js:4518-4775 placement
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
//@ chunk-323717f6.js:4775-5208 placement
/**
 * 因睡眠或时钟变化导致连接失败时重新拨号（有次数上限，身份未变时才重试），并记录特性状态。
 */
async function redialAfterSuspend(dial, stillCurrent, onGiveUp) {
  let epochAtStart = identityEpoch();
  let result = await dial();
  let attemptCount = 0;
  while (
    attemptCount < MAX_SUSPENDED_REDIALS &&
    result.type === "failed" &&
    result.errorCode === CONNECT_SUSPENDED &&
    stillCurrent() &&
    identityEpoch() === epochAtStart
  ) {
    attemptCount++;
    logMCPDebug(
      result.name,
      `Connecting again after a sleep or a clock change (${attemptCount} of at most ${MAX_SUSPENDED_REDIALS})`,
    );
    result = await dial();
  }
  if (attemptCount === 0) return result;
  if (result.type !== "failed") logFeatureOk("mcp_connect_suspend_redial");
  else if (result.errorCode !== CONNECT_SUSPENDED) logFeatureSad("mcp_connect_suspend_redial", "failed");
  else {
    logFeatureSad("mcp_connect_suspend_redial", "slept_again");
    if (attemptCount === MAX_SUSPENDED_REDIALS && stillCurrent()) onGiveUp();
  }
  return result;
}
//@ chunk-323717f6.js:5208-5247 placement
/**
 * 杀进程树后的等待时间（600 毫秒）。
 */
var SIGINT_GRACE_MS = 100;
var SIGTERM_GRACE_MS = 400;
var SIGKILL_GRACE_MS = 100;
var STDIN_CLOSE_GRACE_MS = 300;
var TREE_KILL_GRACE_MS = 600;
//@ chunk-323717f6.js:5247-5352 placement
/**
 * Claude Code 正在退出时拒绝启动新的 stdio MCP 服务器进程。
 */
function assertNotShuttingDown() {
  if (isCleanupStarted()) throw Error("Claude Code is shutting down; not starting this MCP server process");
}
//@ chunk-323717f6.js:5352-5420 placement
/**
 * 登记孤儿 stdio 服务器并在退出时清理。
 */
function trackOrphanStdioServer(child) {
  let unregister = registerCleanup(() => signalOrphanStdioServer(child));
  child.once("exit", () => unregister());
  return unregister;
}
//@ chunk-323717f6.js:5420-5480 placement
/**
 * 判断子进程是否已退出。
 */
function hasExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}
//@ chunk-323717f6.js:5480-5935 placement
/**
 * 退出时处理尚未建立连接的 stdio MCP 服务器进程：Windows 下关 stdin；其他平台依次发 SIGINT、SIGTERM、SIGKILL，每次等待一段时间看是否退出。
 */
async function signalOrphanStdioServer(child) {
  let pid = child.pid;
  if (pid === undefined || hasExited(child)) return;
  if (getPlatform() === "windows") {
    logForDebugging(
      `[MCP] stdio server process ${pid} has no established connection at exit; closing its stdin`,
    );
    await closeStdioServer(child);
    return;
  }
  let promise = new Promise((resolve) => {
    child.once("exit", () => resolve());
  });
  let signals = [
    ["SIGINT", SIGINT_GRACE_MS],
    ["SIGTERM", SIGTERM_GRACE_MS],
    ["SIGKILL", SIGKILL_GRACE_MS],
  ];
  for (let [signal, graceMs] of signals) {
    if (hasExited(child)) return;
    logForDebugging(
      `[MCP] stdio server process ${pid} has no established connection at exit; sending ${signal}`,
    );
    try {
      child.kill(signal);
    } catch {
      return;
    }
    await withDeadline(promise, graceMs);
  }
}
//@ chunk-323717f6.js:5935-6222 placement
/**
 * 关闭 stdio MCP 服务器进程：先关 stdin 等待退出，超时后终止其进程树。
 */
async function closeStdioServer(childProcess) {
  let pid = childProcess.pid;
  if (pid === undefined || hasExited(childProcess)) return;
  let promise = new Promise((resolve) => {
    childProcess.once("exit", () => resolve());
  });
  childProcess.stdin?.end();
  await withDeadline(promise, STDIN_CLOSE_GRACE_MS);
  if (hasExited(childProcess)) return;
  logForDebugging(
    `[MCP] stdio server process ${pid} is still running ${STDIN_CLOSE_GRACE_MS}ms after stdin closed; terminating its process tree`,
  );
  killProcessGroup(pid);
  await withDeadline(promise, TREE_KILL_GRACE_MS);
}
//@ chunk-323717f6.js:6222-6285 placement
/**
 * 是否为启用了 tengu_eventual_noodle 的 claude.ai cowork 会话。
 */
function isEventualNoodleEnabled() {
  return isClaudeAiChatCowork() && getFeatureValue_SESSION_PINNED("tengu_eventual_noodle", false) === true;
}
//@ chunk-323717f6.js:6285-6366 placement (2.1.88 match: extractErrorTypeFromData, 1)
function isTextBlock(data) {
  return typeof data === "object" && data !== null && "type" in data && data.type === "text";
}
//@ chunk-323717f6.js:6366-6643 placement
/**
 * 开关开启时把 MCP 结果的非文本内容排在文本前重新转换，结果全为空白文本时放弃。
 */
async function contentOverStructuredResult(content, transform) {
  if (!isEventualNoodleEnabled()) return;
  let transformed = await transform([
    ...content.filter((block) => !isTextBlock(block)),
    ...content.filter(isTextBlock),
  ]);
  if (transformed.content.every((block) => block.type === "text" && block.text.trim() === "")) {
    if (transformed.content.length > 0) logFeatureSad("mcp_content_over_structured", "blank_text");
    return;
  }
  logFeatureOk("mcp_content_over_structured");
  return transformed;
}
//@ chunk-323717f6.js:6643-6698 placement
/**
 * 读 tengu_serene_teapot（默认开）。
 */
function isSereneTeapotEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_teapot", true) !== false;
}
//@ chunk-323717f6.js:6698-6717 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-323717f6.js:6698", () => {
  weakSet = new WeakSet();
});
//@ chunk-323717f6.js:6717-6750 placement
/**
 * 判断该服务器是否曾跳过监听 GET。
 */
function wasListenGetSkipped(response) {
  return weakSet.has(response);
}
//@ chunk-323717f6.js:6750-7289 placement
/**
 * 包装 MCP HTTP fetch：服务器上次回答的 Allow 头不含 GET 时，后续不带 Last-Event-ID 的监听流 GET 直接本地回 405，不再发到服务器。
 */
function wrapFetchSkipListenGet(fetchImpl, serverName, endpointUrl) {
  let endpointHref = new URL(endpointUrl).href;
  let getNotAllowed = false;
  return async (input, init) => {
    if (new URL(input).href !== endpointHref) return fetchImpl(input, init);
    if (getNotAllowed && init?.method === "GET" && !new Headers(init.headers).has("last-event-id")) {
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
    let response = await fetchImpl(input, init);
    let allowHeader = response.headers.get("allow");
    getNotAllowed =
      allowHeader !== null && !allowHeader.split(",").some((method) => method.trim().toUpperCase() === "GET");
    return response;
  };
}
//@ chunk-323717f6.js:7289-7410 placement
var LIST_CHANGED_MIN_INTERVAL_MS = 1000;
var LIST_CHANGED_MAX_INTERVAL_MS = 30000;
var DEFAULT_REFETCH_CLOCK = {
  now: () => performance.now(),
  arm: (callback, delayMs) => {
    let timer = setTimeout(callback, delayMs).unref();
    return () => clearTimeout(timer);
  },
};
//@ chunk-323717f6.js:7410-7988 placement
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
    let request = pending;
    pending = undefined;
    if (request === undefined) {
      resetBackoff();
      return;
    }
    (async () => refetch(request.cause))()
      .catch((error) => {
        logMCPDebug(
          connection.name,
          `list_changed refetch failed: ${describeConnectError(error, connection.config)}`,
        );
      })
      .finally(() => {
        NEGATIVE_INFINITY = clock.now();
        request.settle();
        if (pending === undefined) {
          resetBackoff();
          return;
        }
        scheduleRefetch();
        intervalMs = Math.min(intervalMs * 2, LIST_CHANGED_MAX_INTERVAL_MS);
      });
  };
  let fireDueRefetch = () => {
    if (isClientWithoutTransport(connection)) {
      pending?.settle();
      pending = undefined;
      resetBackoff();
      return;
    }
    runRefetch();
  };
  let scheduleRefetch = () => {
    idle = false;
    let delayMs = NEGATIVE_INFINITY + intervalMs - clock.now();
    if (delayMs > 0) clock.arm(fireDueRefetch, delayMs);
    else runRefetch();
  };
  return (cause) => {
    let existing = pending;
    if (existing === undefined) {
      let settle = () => {};
      let settled = new Promise((resolve) => (settle = resolve));
      existing = pending = {
        cause,
        settled,
        settle,
      };
      if (idle) scheduleRefetch();
    } else existing.cause = cause;
    return existing.settled;
  };
}
//@ chunk-323717f6.js:7988-8014 placement
/**
 * 按宿主保存的并发槽位表。
 */
var overlapSlotsByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-323717f6.js:7988", () => {
  overlapSlotsByHost = new HostScoped(() => new Map());
});
//@ chunk-323717f6.js:8014-8051 placement
/**
 * 取当前宿主的并发槽位表。
 */
function getOverlapSlots() {
  return overlapSlotsByHost.of(getRootSession().host);
}
//@ chunk-323717f6.js:8051-8246 placement
/**
 * 若工具在可重叠调用的列表中，给调用包上并发槽位控制。
 */
function withOverlapSlots(serverName, name, call) {
  let slots = getOverlapSlots().get(serverName);
  if (slots === undefined || !slots.toolNames.has(name))
    return {
      mayOverlap: false,
      call,
    };
  return {
    mayOverlap: true,
    call: (input, context, ...rest) =>
      slots.slots.run(context.abortController.signal, () => call(input, context, ...rest)),
  };
}
//@ chunk-323717f6.js:8295-8422 placement
/**
 * 表示请求根本没有发出的连接错误码集合。
 */
var NOTHING_SENT_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SERVER_NEVER_SENT_ERROR_CODES;
deferInit("chunk-323717f6.js:8295", () => {
  NOTHING_SENT_ERROR_CODES = new Set([
    "ECONNREFUSED",
    "ConnectionRefused",
    "ENOTFOUND",
    "EAI_AGAIN",
    "FailedToOpenSocket",
    "ERR_PROXY_TUNNEL",
  ]);
  SERVER_NEVER_SENT_ERROR_CODES = new AsyncLocalStorage();
});
//@ chunk-323717f6.js:8500-9405 placement
/**
 * 包装传输层 send：给 tools/call 计数，发送失败且错误表明根本没发出去（连接拒绝、DNS 失败等）时记为"未执行"，并同步到对应 toolUseId 的调用看门狗。
 */
function trackToolCallSends(transport, isNothingSentError, watchdogs) {
  let sends = {
    started: 0,
    ranNothing: [],
  };
  let originalSend = transport.send.bind(transport);
  transport.send = (message, requestOptions) => {
    if (
      typeof message !== "object" ||
      message === null ||
      !("method" in message) ||
      message.method !== "tools/call"
    )
      return originalSend(message, requestOptions);
    let sendId = ++sends.started;
    let params = "params" in message ? message.params : undefined;
    let _meta = typeof params === "object" && params !== null && "_meta" in params ? params._meta : undefined;
    let toolUseId =
      typeof _meta === "object" && _meta !== null && "claudecode/toolUseId" in _meta
        ? _meta["claudecode/toolUseId"]
        : undefined;
    let matchingWatchdogs =
      typeof toolUseId === "string"
        ? [...watchdogs].filter((watchdog) => watchdog.toolUseId === toolUseId)
        : [];
    for (let watchdog of matchingWatchdogs) if (watchdog.ownSends !== undefined) watchdog.ownSends.started++;
    let ownSends = matchingWatchdogs.length === 1 ? matchingWatchdogs[0]?.ownSends : undefined;
    let storedToolUse = toolUseId === undefined ? SERVER_NEVER_SENT_ERROR_CODES.getStore() : undefined;
    let withToolUseId =
      storedToolUse === undefined ||
      typeof params !== "object" ||
      params === null ||
      !("name" in params) ||
      params.name !== storedToolUse.tool
        ? message
        : Object.assign({}, message, {
            params: Object.assign({}, params, {
              _meta: Object.assign({}, _meta, {
                "claudecode/toolUseId": storedToolUse.toolUseId,
              }),
            }),
          });
    return originalSend(withToolUseId, requestOptions).catch((error) => {
      if (
        NOTHING_SENT_ERROR_CODES.has(getErrnoCode(error) ?? "") ||
        (error instanceof Error && isNothingSentError(error))
      ) {
        sends.ranNothing.push(sendId);
        if (ownSends !== undefined) ownSends.ranNothing++;
      }
      throw error;
    });
  };
  return sends;
}
//@ chunk-323717f6.js:9405-9578 placement
/**
 * 判断一次工具调用期间发生的连接尝试是否都没有发出任何请求。
 */
function didCallRunNothing(toolCallSends, started, ownSends) {
  if (ownSends !== undefined && ownSends.started > 0) return ownSends.ranNothing === ownSends.started;
  if (toolCallSends === undefined || started === undefined) return false;
  let startedSince = toolCallSends.started - started;
  return (
    startedSince > 0 && countWhere(toolCallSends.ranNothing, (sendId) => sendId > started) === startedSince
  );
}
//@ chunk-323717f6.js:9578-9856 placement
/**
 * 不编译 schema 的会话中使用的空校验器：输出 schema 不做校验，首次遇到时记录警告。
 */
var NO_OP_SCHEMA_VALIDATOR = {
  getValidator(schema) {
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
//@ chunk-323717f6.js:9856-9884 placement
/**
 * 按消息 id 记录记忆链值的容器。
 */
class MemoryChainByMessage {
  byMessageId = new Map();
}
//@ chunk-323717f6.js:9884-10040 placement
/**
 * 生成工具调用请求的记忆链元数据（响应 id 与已记录的链值）。
 */
function memoryChainMeta(toolState, id) {
  if (!id) return {};
  let chain = toolState.get(MemoryChainByMessage).byMessageId.get(id);
  return {
    ["anthropic/memory.response_id"]: id,
    ...(chain !== undefined && {
      ["anthropic/memory.chain"]: chain,
    }),
  };
}
//@ chunk-323717f6.js:10040-10291 placement
/**
 * 从工具结果的元数据中记录记忆链值（按消息 id 保存最近若干条）。
 */
function rememberMemoryChain(toolState, id, meta) {
  if (!id || !meta || !("anthropic/memory.chain" in meta)) return;
  let chain = meta["anthropic/memory.chain"];
  let byMessageId = toolState.get(MemoryChainByMessage).byMessageId;
  byMessageId.delete(id);
  if (typeof chain !== "string" || chain.length > 16384) return;
  byMessageId.set(id, chain);
  for (let key of byMessageId.keys()) {
    if (byMessageId.size <= 8) break;
    byMessageId.delete(key);
  }
}
//@ chunk-323717f6.js:10291-10559 placement
/**
 * 包装 fetch：重定向响应去掉 Location 头，避免跟随重定向。
 */
function stripRedirectLocation(fetchFn) {
  return async (input, init) => {
    let response = await fetchFn(input, init);
    if (![301, 302, 303, 307, 308].includes(response.status) || !response.headers.has("Location"))
      return response;
    let headers = new Headers(response.headers);
    headers.delete("Location");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
//@ chunk-323717f6.js:10559-10700 placement
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
//@ chunk-323717f6.js:10700-11723 placement
/**
 * 给 MCP 工具挂上文件输入支持：包装 validateInput、call 与 askInputPreparer，调用前把文件引用参数替换为上传后的文件输入。
 */
function wireFileInputs(tool, listed, callToolFor) {
  let loadFileInputs = () => import("./argsWithFileInputs.lazy.js");
  let fileInputContext = (input, context) => ({
    listed,
    input,
    toolPermissionContext: getToolPermissionContext(context),
    callTool: callToolFor(context),
    signal: context.abortController.signal,
    session: context.session,
  });
  let validateInput = tool.validateInput;
  tool.validateInput = async (input, context) =>
    (await loadFileInputs()).validateToolFileInputs(listed, validateInput, input, context);
  let checkName = buildMcpToolName(listed.client.name, listed.name);
  let isListedMcpTool = (context) =>
    liftedAsksInAcceptEdits(getToolPermissionContext(context)).has(checkName);
  let allowByRule = () => makeAskDecision(tool, checkName);
  let checkPermissions = tool.checkPermissions;
  tool.checkPermissions = async (input, context) => {
    let decision = await checkPermissions.call(tool, input, context);
    if (decision.behavior === "deny" || !isListedMcpTool(context)) return decision;
    if (decision.behavior !== "ask") return allowByRule();
    let { suggestions, ...decisionRest } = decision;
    return {
      ...decisionRest,
      matchedAskRule: mcpPolicyAskRule(checkName),
    };
  };
  let permissionCheckFailureDecision = tool.permissionCheckFailureDecision;
  tool.permissionCheckFailureDecision = (input, context) => {
    let decision = permissionCheckFailureDecision?.call(tool, input, context);
    return decision?.behavior !== "deny" && isListedMcpTool(context) ? allowByRule() : decision;
  };
  let call = tool.call;
  tool.call = async (input, context, ...rest) => {
    let { argsWithFileInputs } = await loadFileInputs();
    let expandedInput = await argsWithFileInputs({
      ...fileInputContext(input ?? {}, context),
      toolUseId: context.toolUseId,
    });
    return call(expandedInput, context, ...rest);
  };
  let askInputPreparer = tool.askInputPreparer;
  tool.askInputPreparer = async (input, context, toolUseId) =>
    (await loadFileInputs()).fileInputAskPreparer({
      ...fileInputContext(input, context),
      toolUseId,
    }) ?? askInputPreparer?.(input, context, toolUseId);
  if (isDiskless()) artifactModule()?.applyArtifactFileCard(tool, listed.meta, listed.client);
}
//@ chunk-323717f6.js:11723-11775 affinity
function artifactModule() {
  return require("./applyArtifactFileCard.lazy.js");
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
  SERVER_NEVER_SENT_ERROR_CODES,
  assertNotShuttingDown,
  trackOrphanStdioServer,
  wasListenGetSkipped,
};
