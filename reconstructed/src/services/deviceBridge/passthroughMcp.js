/**
 * services/deviceBridge/passthroughMcp.ts
 *
 * 2.1.316 新增：设备桥 MCP 直通：把本机 MCP 服务器工具提供给云会话调用，含重名处理、schema 改写与策略拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-weh04swb.js (44)
 * attribution: placement 44
 */
import { createDialFailureLatch, boundDial } from "../mcp/dialFailureLatch.js";
import { createSignal } from "../../utils/signal.js";
import { count } from "../../utils/collections.js";
import { SS, xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  toError,
  isAbortError,
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import {
  McpSessionExpiredError,
  refreshMcpServerTools,
  McpAuthError,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  maxDescriptionLength,
} from "../mcp/client.js";
import { awaitPolicyColdStartWaiter } from "../policyLimits/coldStartWaiter.js";
import { ensureMdmLoaded } from "../../utils/settings/managedPluginTiers.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { isMcpServerAllowedByPolicy } from "../mcp/config.js";
import { isToolFromMcpServer, buildMcpToolName } from "../mcp/mcpStringUtils.js";
import { BASE_CALLER_FIELDS, CALLER_FIELDS, withinDepth } from "../../remote/tools/protocolSchemas.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { stripAnthropicMeta } from "../mcp/anthropicMeta.js";
import {
  MAX_PREFIXED_TOOL_NAME,
  MAX_RESULT_SIZE_HINT,
  MAX_PASSTHROUGH_TOOLS,
  MAX_INPUT_SCHEMA_DEPTH,
  MAX_TOOL_DESCRIPTION_CHARS,
} from "../../remote/tools/toolDescriptors.js";
import { isAdminScope } from "./deviceMcpConsent.js";
import { normalizedKey, isClaudeAiServerName, isOrgConnectorName } from "../mcp/normalization.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import {
  isServiceReservedToolName,
  mayBePassthroughTool,
  PASSTHROUGH_ANNOUNCE_FORMAT_VERSION,
  PASSTHROUGH_MARKER_KEY,
} from "./passthroughMarker.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { renamedFieldCacheMap } from "../remoteTools/pathMapping.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { TOOL_META_KEYS } from "../../bridge/deviceRegistration.js";

//@ chunk-weh04swb.js:1665-1690 placement
/**
 * 策略重新读取的最小间隔（60 秒）。
 */
var DEFAULT_SETTLE_TIMEOUT_MS = 1e4;
var MAX_CONSECUTIVE_DIAL_FAILURES = 3;
var POLICY_REFRESH_INTERVAL_MS = 60000;
//@ chunk-weh04swb.js:1690-1812 placement
class PassthroughMcpUnavailableError extends Error {
  unavailable;
  name = "PassthroughMcpUnavailableError";
  constructor(unavailable, n, i) {
    super(n, i);
    this.unavailable = unavailable;
  }
}
//@ chunk-weh04swb.js:1812-9043 placement
/**
 * 设备桥：把本机 MCP 服务器的工具"直通"给云会话调用：列出/刷新服务器、重名与保留名检查、托管策略拒绝、调用转发与错误包装。
 */
function createPassthroughMcpBridge(e) {
  let n = e.ops ?? createPassthroughMcpDeps();
  let i = e.dialLatch ?? createDialFailureLatch();
  let keys = Object.keys(e.configs);
  let s = new Map();
  let c = new Map();
  let weakSet = new WeakSet();
  let signal = createSignal();
  let now = Date.now();
  let g;
  let M = false;
  let k = () => {};
  let settled = new Promise((resolve) => {
    k = resolve;
  });
  let O;
  let now_2 = Date.now();
  let E = () => g !== undefined;
  function B() {
    if (M) return;
    M = true;
    if (O !== undefined) {
      clearTimeout(O);
      O = undefined;
    }
    let r = [...c.values()];
    let a = (f) => count(r, (h) => h === f);
    k({
      configured: keys.length,
      connected: a("connected"),
      cached: a("cached"),
      failed: a("failed"),
      needsAuth: a("needs-auth"),
      disabled: a("disabled"),
      blocked: a("blocked"),
      excluded: a("excluded"),
      unreported: keys.length - c.size,
      settleMs: Date.now() - now,
    });
    re([...s].filter(([, f]) => f.handle.type === "cached").map(([f]) => f));
  }
  async function re(r) {
    let a = async (S) => {
      q();
      let D = s.get(S);
      if (D && !E()) {
        await se(S, D).catch(() => {});
        q();
      }
    };
    let f = (S) => n.dialConcurrency(e.configs[S]);
    let filtered = r.filter((S) => s.has(S));
    await Promise.all(
      SS(filtered, (S) => f(S).kind === "local")
        .filter((S) => S.length > 0)
        .map((S) =>
          pMap(S, a, {
            concurrency: f(S[0]).limit,
          }),
        ),
    );
  }
  function W() {
    try {
      signal.emit();
    } catch (error) {
      logError(error);
    }
  }
  function x(r, a) {
    let f = s.get(r);
    if (f)
      s.set(r, {
        ...f,
        ...a,
      });
  }
  function Re(client, tools) {
    let f = s.get(client.name);
    let h = serverTools(client.name, tools);
    s.set(client.name, {
      handle: client,
      tools: h,
      dialing: f?.dialing,
      listing: undefined,
      consecutiveDialFailures: 0,
      everConnected: f?.everConnected === true || client.type === "connected",
    });
    if (client.type === "connected") {
      if (h.length === 0)
        x(client.name, {
          listing: G(client.name, client),
        });
      ie(client.name, client);
    } else if (M) re([client.name]);
    if (f !== undefined || M) W();
  }
  function ie(r, a) {
    let f = s.get(r);
    if (!f || E()) return;
    if (f.handle !== a) {
      x(r, {
        handle: a,
        everConnected: true,
      });
      x(r, {
        listing: G(r, a),
      });
      W();
    }
    if (!weakSet.has(a) && a.capabilities?.tools?.listChanged) {
      weakSet.add(a);
      n.onToolListChanged(a, async () => {
        await G(r, a);
      });
    }
  }
  function G(r, a) {
    let f = false;
    return n
      .refreshTools(
        a,
        (h, S) => {
          if (s.get(r)?.handle === a && !E()) {
            x(r, {
              tools: serverTools(r, S),
              listing: undefined,
            });
            f = true;
            W();
          }
        },
        e.storageV5,
      )
      .then(
        () => f,
        (error) => {
          logForDebugging(
            `[deviceBridge] passthrough MCP tools refresh failed for ${r}: ${toError(error).message}`,
          );
          return false;
        },
      );
  }
  function H(r, a) {
    let f = s.get(r);
    if (!f || E()) return;
    s.delete(r);
    n.dispose(r, f.handle.config);
    n.cleanup([f.handle]);
    logForDebugging(`[deviceBridge] passthrough MCP server ${r} left the pool (${a})`);
    W();
  }
  function q() {
    let now = Date.now();
    if (now - now_2 >= POLICY_REFRESH_INTERVAL_MS) {
      now_2 = now;
      n.refreshPolicy();
    }
    for (let [a, f] of s) if (!n.allowedByPolicy(a, f.handle.config)) H(a, "denied by managed policy");
  }
  function se(r, a) {
    if (a.dialing) return a.dialing;
    if (i.shouldSkip(r))
      return Promise.reject(
        new PassthroughMcpUnavailableError(
          "server",
          "MCP server failed to connect recently; not retrying yet",
        ),
      );
    let f = n.ensureConnected(a.handle).then(
      (h) => {
        ae(r, f);
        i.recordSuccess(r);
        if (E() || !s.has(r)) {
          n.cleanup([h]);
          throw new PassthroughMcpUnavailableError(
            "server",
            "MCP server is no longer offered by this machine",
          );
        }
        x(r, {
          consecutiveDialFailures: 0,
        });
        ie(r, h);
        return h;
      },
      (error) => {
        ae(r, f);
        if (isMcpAuthError(error)) {
          H(r, "needs authentication");
          throw error;
        }
        i.recordFailure(r);
        let S = s.get(r);
        let D = (S?.consecutiveDialFailures ?? 0) + 1;
        x(r, {
          consecutiveDialFailures: D,
        });
        if (D >= MAX_CONSECUTIVE_DIAL_FAILURES && S?.everConnected !== true) H(r, "repeated dial failures");
        else if (s.has(r)) n.dispose(r, a.handle.config);
        throw error;
      },
    );
    x(r, {
      dialing: f,
    });
    return f;
  }
  function ae(r, a) {
    if (s.get(r)?.dialing === a)
      x(r, {
        dialing: undefined,
      });
  }
  async function Oe(r, { signal, deadline }) {
    let listing = s.get(r)?.listing;
    while (listing !== undefined) {
      let S = await boundDial(listing, {
        signal,
        timeoutMs: Math.max(0, deadline - Date.now()),
        serverName: r,
        context: "device tool call",
      }).catch((error) => {
        if (isAbortError(error)) throw error;
        throw new PassthroughMcpUnavailableError("server", "MCP server connected too late for this call", {
          cause: error,
        });
      });
      let D = s.get(r);
      if (S || D?.listing === undefined) return;
      if (D.listing !== listing) {
        listing = D.listing;
        continue;
      }
      if (D.handle.type === "connected")
        x(r, {
          listing: G(r, D.handle),
        });
      throw new PassthroughMcpUnavailableError("server", "MCP server did not list its tools");
    }
  }
  async function Ne(r, { signal, timeoutMs }) {
    let h = s.get(r);
    if (E() || !h)
      throw new PassthroughMcpUnavailableError("server", "MCP server is not available on this machine");
    try {
      return await boundDial(se(r, h), {
        signal,
        timeoutMs,
        serverName: r,
        context: "device tool call",
      });
    } catch (error) {
      if (isAbortError(error) || error instanceof PassthroughMcpUnavailableError) throw error;
      if (isMcpAuthError(error)) throw needsAuthError(error);
      logForDebugging(`[deviceBridge] passthrough MCP dial failed for ${r}: ${toError(error).message}`);
      throw new PassthroughMcpUnavailableError("server", "MCP server could not be reached for this call", {
        cause: error,
      });
    }
  }
  function ce(r, a) {
    q();
    let f = s.get(r);
    if (!f || E())
      throw new PassthroughMcpUnavailableError("server", "MCP server is not available on this machine");
    let found = f.tools.find((tool) => toolNameOf(tool) === a);
    if (!found) throw new PassthroughMcpUnavailableError("tool", "MCP tool is not offered by this machine");
    if (found.mcpInfo?.effectiveMaxPermission === "blocked")
      throw new PassthroughMcpUnavailableError(
        "tool",
        "MCP tool is blocked on this machine by the organization",
      );
  }
  async function xe(r, name, { signal, deadline }) {
    ce(r, name);
    let S = await Ne(r, {
      signal,
      timeoutMs: Math.max(0, deadline - Date.now()),
    });
    await Oe(r, {
      signal,
      deadline,
    });
    ce(r, name);
    if (s.get(r)?.handle !== S)
      throw new PassthroughMcpUnavailableError(
        "server",
        "MCP server was reconnected during this call; retry",
      );
    if (deadline - Date.now() <= 0)
      throw new PassthroughMcpUnavailableError("server", "MCP server connected too late for this call");
    return S;
  }
  async function ke(r, a, f, { signal, deadline, imageLimits }) {
    let combinedAbortSignal = createCombinedAbortSignal(signal, {
      timeoutMs: Math.max(0, deadline - Date.now()),
      refTimer: true,
    });
    let X = (error) =>
      signal.aborted
        ? new AbortError(`MCP tool call on '${r}' aborted`)
        : combinedAbortSignal.signal.aborted
          ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP server "${r}" did not answer the call within its deadline`,
              "MCP passthrough call deadline",
            )
          : error;
    try {
      let L = await n
        .callTool(a, f, {
          signal: combinedAbortSignal.signal,
          imageLimits,
        })
        .catch((error) => {
          throw X(error);
        });
      if (L.isError)
        throw "urlElicitationDeclined" in L
          ? new PassthroughMcpUnavailableError(
              "tool",
              "MCP tool needs a consent step in a browser on this machine, which a served call cannot show",
            )
          : X(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                "MCP tool call on this machine ended without a result",
                "MCP passthrough call ended without a result",
              ),
            );
      return L;
    } finally {
      combinedAbortSignal.cleanup();
    }
  }
  function Ie(r, cause) {
    if (!isMcpAuthError(cause)) return cause;
    H(r, "needs authentication");
    return needsAuthError(cause);
  }
  function He({ client, tools }) {
    if (E() || c.get(client.name) === "dropped") {
      n.cleanup([client]);
      return;
    }
    if (!Object.hasOwn(e.configs, client.name)) return;
    switch (client.type) {
      case "connected":
      case "cached":
        c.set(client.name, client.type);
        Re(client, tools);
        break;
      case "failed":
        c.set(client.name, client.type);
        H(client.name, "failed");
        break;
      case "needs-auth":
        c.set(client.name, client.type);
        H(client.name, "needs authentication");
        break;
      case "disabled":
        c.set(client.name, client.type);
        H(client.name, "disabled");
        break;
      case "pending":
        break;
      default:
    }
    if (c.size >= keys.length) B();
  }
  n.policySettled()
    .then(() => {
      if (E()) return;
      O = setTimeout(B, e.settleTimeoutMs ?? DEFAULT_SETTLE_TIMEOUT_MS);
      let r = pickByHelper(e.configs, (a, f) => {
        if (c.get(f) === "dropped") return false;
        if (n.needsLocalPrompts(a)) {
          c.set(f, "excluded");
          return false;
        }
        let h = n.allowedByPolicy(f, a);
        if (!h) c.set(f, "blocked");
        return h;
      });
      return n.discover(He, r, e.storageV5);
    })
    .catch((error) => {
      logForDebugging(`[deviceBridge] passthrough MCP discovery failed: ${toError(error).message}`);
    })
    .finally(() => {
      B();
      de((r) => E() || c.get(r) === "dropped");
    });
  function de(r = () => true) {
    for (let a of keys.filter(r)) n.dispose(a, e.configs[a]);
  }
  return {
    settled,
    servers() {
      q();
      return keys.flatMap((r) => {
        let a = s.get(r);
        return a
          ? [
              {
                name: r,
                scope: a.handle.config.scope,
                tools: a.tools,
                status: a.handle.type,
              },
            ]
          : [];
      });
    },
    subscribe: signal.subscribe,
    async callTool(r, a, { signal, timeout, imageLimits }) {
      let deadline = Date.now() + timeout;
      let R = async (X) => {
        let L = await xe(r, a.name, {
          signal,
          deadline,
        });
        try {
          return await ke(r, L, a, {
            signal,
            deadline,
            imageLimits,
          });
        } catch (error) {
          let Fe = a.name;
          if (
            X &&
            error instanceof McpSessionExpiredError &&
            (!error.mayHaveRun ||
              s.get(r)?.tools.find((tool) => toolNameOf(tool) === Fe)?.readOnlyHint === true)
          )
            return R(false);
          throw Ie(r, error);
        }
      };
      return R(true);
    },
    toolTimeoutMs: (r) => n.toolTimeoutMs(e.configs[r]),
    dropServer(r) {
      if (E() || !Object.hasOwn(e.configs, r)) return;
      c.set(r, "dropped");
      if (s.has(r)) H(r, "dropped by the caller");
      else n.dispose(r, e.configs[r]);
      if (c.size >= keys.length) B();
    },
    stop() {
      g ??= (async () => {
        if (O !== undefined) {
          clearTimeout(O);
          O = undefined;
        }
        signal.clear();
        let mapped = [...s.values()].map((a) => a.handle);
        s.clear();
        B();
        de();
        await n.cleanup(mapped);
      })();
      return g;
    },
  };
}
//@ chunk-weh04swb.js:9043-9961 placement
/**
 * 构造设备桥接透传 MCP 的依赖对象：策略就绪、发现工具、确保连接、监听工具列表变化、刷新工具、调用工具、清理/释放连接、策略判定、是否需要本地提示、按本地/远程决定拨号并发、工具超时。
 */
function createPassthroughMcpDeps() {
  let mcpClient = require("./chunk-asne9cp8.js").mcpClientModule();
  return {
    policySettled: () =>
      Promise.all([awaitPolicyColdStartWaiter(), ensureMdmLoaded()]).then(() => {
        return;
      }),
    discover: (n, i, m) => mcpClient.getMcpToolsCommandsAndResources(n, i, m),
    ensureConnected: (n) => mcpClient.ensureConnectedClient(n),
    onToolListChanged: (n, i) => mcpClient.onMcpToolListChanged(n, i),
    refreshTools: refreshMcpServerTools,
    callTool: (client, i, { signal, imageLimits }) =>
      mcpClient.callMCPTool({
        client,
        tool: i.name,
        args: i.arguments ?? {},
        meta: i._meta,
        signal,
        imageLimits,
        hasResultSizeAnnotation: true,
        storageV5: undefined,
        credentials: undefined,
      }),
    cleanup: (n) => mcpClient.cleanupConnectedMcpClients(n),
    dispose: (n, i) => mcpClient.disposeServerConnectionDetached(n, i),
    refreshPolicy: invalidateCommandNames,
    allowedByPolicy: isMcpServerAllowedByPolicy,
    needsLocalPrompts: (n) => mcpClient.isFirstPartyDesignServerConfig(n),
    dialConcurrency: (n) =>
      mcpClient.isLocalMcpServer(n)
        ? {
            kind: "local",
            limit: mcpClient.getMcpServerConnectionBatchSize(),
          }
        : {
            kind: "remote",
            limit: mcpClient.getRemoteMcpServerConnectionBatchSize(),
          },
    toolTimeoutMs: (n) => mcpClient.getMcpToolTimeoutMs(n),
  };
}
//@ chunk-weh04swb.js:9961-10011 placement
/**
 * 取工具对外发布的工具名（mcpInfo.toolName 优先）。
 */
function toolNameOf(tool) {
  return tool.mcpInfo?.toolName ?? tool.name;
}
//@ chunk-weh04swb.js:10011-10133 placement
function isMcpAuthError(error) {
  return (
    error instanceof McpAuthError ||
    (error !== null &&
      typeof error === "object" &&
      "mcpErrorSource" in error &&
      error.mcpErrorSource === "user_auth")
  );
}
//@ chunk-weh04swb.js:10133-10231 placement
/**
 * 把 MCP 认证错误包装成“本机需要认证”的透传不可用错误。
 */
function needsAuthError(cause) {
  return new PassthroughMcpUnavailableError("server", "MCP server needs authentication on this machine", {
    cause,
  });
}
//@ chunk-weh04swb.js:10231-10298 placement
/**
 * 取某服务器提供的全部 MCP 工具。
 */
function serverTools(e, n) {
  return n.filter((i) => i.mcpInfo !== undefined && isToolFromMcpServer(i, e));
}
//@ chunk-weh04swb.js:10298-10315 placement
/**
 * 默认的服务器列表引用。
 */
var defaultListHandler = BASE_CALLER_FIELDS;
var defaultList = CALLER_FIELDS;
//@ chunk-weh04swb.js:10315-10427 placement
class PassthroughCallError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  verdict;
  constructor(e, n, i) {
    super(n, i, e.code);
    this.verdict = e;
    this.name = "PassthroughCallError";
  }
}
//@ chunk-weh04swb.js:10427-10559 placement
/**
 * 透传工具未提供时的校验失败结果，并通知工具判定回调。
 */
function refuseNotServedValidation(remoteCall, n) {
  remoteCall?.onToolVerdict?.(
    {
      kind: "refused",
      code: "not_served",
    },
    n.message,
  );
  return {
    result: false,
    message: n.message,
    errorCode: 1,
  };
}
//@ chunk-weh04swb.js:10559-10679 placement
/**
 * 抛出"工具未提供"的透传调用错误，并通知工具判定回调。
 */
function throwNotServed(remoteCall, message, telemetry) {
  let m = new PassthroughCallError(
    {
      kind: "refused",
      code: "not_served",
    },
    message,
    telemetry,
  );
  remoteCall?.onToolVerdict?.(m.verdict, m.message);
  throw m;
}
//@ chunk-weh04swb.js:10679-11311 placement
/**
 * 生成透传 MCP 工具的 call 函数：只接受远程调用，去掉保留参数后调用本机 MCP 服务器（带超时与图片限制），把错误转成透传错误并回报判定；返回内容与 _meta/structuredContent。
 */
function makePassthroughCall(deps, serverName, toolName, argRenames) {
  let s = new Set(argRenames.values());
  let filtered = defaultList.filter((input) => !s.has(input));
  return async (v, context) => {
    if (context.remoteCall === undefined)
      throw new PassthroughCallError(
        {
          kind: "refused",
          code: "invalid_request",
        },
        NO_REMOTE_CALL_MESSAGE,
        NO_REMOTE_CALL_MESSAGE,
      );
    let timeout = deps.toolTimeoutMs(serverName);
    let { onToolVerdict } = context.remoteCall;
    let result = await deps
      .callTool(
        serverName,
        {
          name: toolName,
          arguments: Uo(v, filtered),
        },
        {
          signal: context.abortController.signal,
          timeout,
          imageLimits: {
            ...imageLimitsForModel(context.options.mainLoopModel),
            allowWebp: false,
          },
        },
      )
      .catch((error) => {
        let passthroughError = toPassthroughError(error, serverName);
        if (passthroughError instanceof PassthroughCallError)
          onToolVerdict?.(passthroughError.verdict, passthroughError.message);
        throw passthroughError;
      });
    return {
      data: result.content,
      ...((result._meta || result.structuredContent) && {
        mcpMeta: {
          ...(result._meta && {
            _meta: stripAnthropicMeta(result._meta),
          }),
          ...(result.structuredContent && {
            structuredContent: result.structuredContent,
          }),
        },
      }),
    };
  };
}
//@ chunk-weh04swb.js:11311-11396 placement
/**
 * 非远端调用时透传工具拒绝执行的说明。
 */
var NO_REMOTE_CALL_MESSAGE = "MCP passthrough tools run only for a remote tool call; the call did not run";
//@ chunk-weh04swb.js:11396-12367 placement
/**
 * 把透传 MCP 调用的失败转成给远端的错误：工具自身返回错误（可能已有副作用）、需要浏览器同意（-32042）、服务器不可用、其他（超时/断连/协议错误，可能已执行）。
 */
function toPassthroughError(error, serverName) {
  if (isAbortError(error) || error instanceof PassthroughCallError) return error;
  if (error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
    return new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${serverName}" on this machine returned an error for the call (it reached the server and may have had effects): ${error.message}`,
      "MCP passthrough tool returned an error",
      error.mcpMeta,
    );
  if (isJsonRpcErrorCode32042(error))
    return new PassthroughCallError(
      {
        kind: "refused",
        code: "not_served",
      },
      `MCP server "${serverName}" on this machine needs a consent step in a browser there before this tool can run; the call did not run`,
      "MCP passthrough call needs URL consent on this machine",
    );
  if (error instanceof PassthroughMcpUnavailableError)
    return new PassthroughCallError(
      {
        kind: "refused",
        code: "not_served",
      },
      `MCP server "${serverName}" on this machine: ${error.message}; the call did not run`,
      error.message,
    );
  logForDebugging(`[deviceBridge] passthrough MCP call on ${serverName} failed: ${toError(error).message}`);
  return new PassthroughCallError(
    {
      kind: "failed",
      code: "tool_error",
    },
    `MCP server "${serverName}" on this machine gave no usable result for the call (timeout, lost connection, or a protocol-level error); it may have run and had effects`,
    "MCP tool call failed on this machine",
  );
}
//@ chunk-weh04swb.js:12367-12381 placement
var URL_ELICITATION_REQUIRED_CODE = -32042;
//@ chunk-weh04swb.js:12381-12458 placement = isConnectionError (1)
function isJsonRpcErrorCode32042(err) {
  return (
    err !== null && typeof err === "object" && "code" in err && err.code === URL_ELICITATION_REQUIRED_CODE
  );
}
//@ chunk-weh04swb.js:12458-12469 placement
/**
 * 提交给远端的工具名长度上限。
 */
var MAX_TOOL_NAME_CHARS = MAX_PREFIXED_TOOL_NAME;
//@ chunk-weh04swb.js:12469-12636 placement
/**
 * 透传 MCP 工具公告的限制：总字节预算、工具数、单个定义大小、标题与搜索提示长度，以及作用域优先级与管理员作用域集合。
 */
var ANNOUNCE_BYTE_BUDGET = MAX_RESULT_SIZE_HINT - 262144;
var MAX_ANNOUNCED_TOOLS = MAX_PASSTHROUGH_TOOLS;
var MAX_DEFINITION_BYTES = 65536;
var MAX_TITLE_CHARS = 256;
var MAX_SEARCH_HINT_CHARS = 512;
var SCOPE_RANK = {
  enterprise: 0,
  managed: 1,
  local: 2,
  user: 3,
  dynamic: 4,
  project: 5,
  claudeai: 6,
  agent: 7,
};
var ADMIN_SCOPES = new Set(["enterprise", "managed"]);
//@ chunk-weh04swb.js:12636-13041 placement
/**
 * 为设备桥接构造透传工具公告：按作用域排序服务器，描述每个工具，检测名称冲突（服务器/工具层面、管理员优先），过滤权限上限、deny 规则与各种限制，返回可公告工具、丢弃原因与按服务器分组的定义。
 */
async function buildPassthroughAnnouncement(servers, options) {
  let servers_2 = sortServersByScope(servers);
  let results = await Promise.all(
    servers_2.map((y) =>
      Promise.all(y.tools.map((tool) => describePassthroughTool(y.name, tool, options.target))),
    ),
  );
  let collisionChecker = buildCollisionChecker(servers_2, results, options.configured);
  let { tools, dropped, byServer } = servers_2.reduce(
    (acc, g, M) => {
      let k = isAdminScope(g.scope)
        ? {
            reason: "enterprise_scope",
          }
        : collisionChecker.server(g);
      return (results[M] ?? []).reduce((acc, O) => admitTool(acc, O, k, collisionChecker, options), acc);
    },
    {
      announced: new Set(),
      bytes: 0,
      tools: [],
      dropped: [],
      byServer: new Map(),
    },
  );
  return {
    tools,
    dropped,
    byServer,
  };
}
//@ chunk-weh04swb.js:13041-13810 placement
/**
 * 构造服务器名与工具名的冲突判定：与保留名/内置名冲突、与管理员服务器前缀重叠、规范化后同名（无管理员时为 alias_collision）。
 */
function buildCollisionChecker(servers, toolGroups, extraServers) {
  let allServers = sortServersByScope([
    ...servers,
    ...extraServers.filter((extraServer) => !servers.some((server) => server.name === extraServer.name)),
  ]);
  let adminServers = new Set(
    allServers.filter((server) => ADMIN_SCOPES.has(server.scope)).map((server) => server.name),
  );
  let adminPrefixes = [...adminServers].map(
    (adminServer) => `${normalizedKey(getPrefixServerKey(adminServer))}_`,
  );
  let shadowsAdminPrefix = (g, M) =>
    !adminServers.has(g) && adminPrefixes.some((adminPrefix) => `${M}_`.startsWith(adminPrefix));
  let serversByKey = groupByAlias(
    allServers.map((server) => [
      normalizedKey(getPrefixServerKey(server.name)),
      {
        server: server.name,
        admin: adminServers.has(server.name),
      },
    ]),
  );
  let toolsByKey = groupByAlias(
    toolGroups.flat().map((g) => [
      normalizedKey(g.name),
      {
        server: g.server,
        admin: adminServers.has(g.server),
        rawName: g.rawName,
      },
    ]),
  );
  return {
    server: (g) =>
      isClaudeAiServerName(g.name) ||
      isOrgConnectorName(g.name) ||
      shadowsAdminPrefix(g.name, normalizedKey(getPrefixServerKey(g.name)))
        ? {
            reason: "collision",
          }
        : resolveAliasGroup(
            serversByKey.get(normalizedKey(getPrefixServerKey(g.name))) ?? [],
            g.name,
            (M) => M.server === g.name,
          ),
    tool: (g) =>
      isServiceReservedToolName(g.name)
        ? {
            reason: "service_reserved",
          }
        : !mayBePassthroughTool(g.name) ||
            isClaudeAiServerName(g.name) ||
            isOrgConnectorName(g.name) ||
            shadowsAdminPrefix(g.server, normalizedKey(g.name))
          ? {
              reason: "collision",
            }
          : resolveAliasGroup(
              toolsByKey.get(normalizedKey(g.name)) ?? [],
              g.server,
              (M) => M.server === g.server && M.rawName === g.rawName,
            ),
  };
}
//@ chunk-weh04swb.js:13810-14022 placement
function resolveAliasGroup(e, n, i) {
  let m = e.find((s) => s.admin) ?? (e.length === 1 ? e[0] : undefined);
  if (m === undefined)
    return {
      reason: "alias_collision",
      contenders: e.map((s) => s.server).filter((s) => s !== n),
    };
  return i(m)
    ? undefined
    : {
        reason: "collision",
      };
}
//@ chunk-weh04swb.js:14022-14158 placement
function groupByAlias(e) {
  return e.reduce((acc, [i, m]) => {
    let s = acc.get(i) ?? [];
    if (!s.some((c) => c.server === m.server)) acc.set(i, [...s, m]);
    return acc;
  }, new Map());
}
//@ chunk-weh04swb.js:14158-14647 placement
/**
 * 决定是否把一个设备 MCP 工具透传给会话：权限上限阻止、命中拒绝规则或描述失败时记入丢弃列表；否则累加大小并加入工具列表和按服务器分组。
 */
function admitTool(e, n, i, collisionChecker, { isDenied, serve }) {
  let v =
    i ??
    collisionChecker.tool(n) ??
    (n.tool.mcpInfo?.effectiveMaxPermission === "blocked"
      ? {
          reason: "permission_ceiling",
        }
      : isDenied(n.tool)
        ? {
            reason: "deny_rule",
          }
        : checkToolLimits(n, e));
  if ("reason" in v) {
    e.dropped.push({
      server: n.server,
      tool: n.rawName,
      ...v,
    });
    return e;
  }
  e.announced.add(n.name);
  e.bytes += v.bytes;
  e.tools.push(
    serve({
      ...n,
      definition: v.definition,
      wireArguments: v.wireArguments,
    }),
  );
  let P = e.byServer.get(n.server);
  if (P === undefined) {
    P = [];
    e.byServer.set(n.server, P);
  }
  P.push(v.definition);
  return e;
}
//@ chunk-weh04swb.js:14647-15175 placement
/**
 * 检查一个透传工具能否公告：保留参数、名称过长、重名、定义缺失、定义过大、schema 嵌套过深、总字节预算或数量上限；通过则返回定义与字节数。
 */
function checkToolLimits({ name: candidate, definition, wireArguments }, { announced, bytes }) {
  if (wireArguments === "reserved_argument")
    return {
      reason: "reserved_argument",
    };
  if (candidate.length > MAX_TOOL_NAME_CHARS)
    return {
      reason: "name_length",
    };
  if (announced.has(candidate))
    return {
      reason: "collision",
    };
  if (definition === undefined)
    return {
      reason: "definition_error",
    };
  let byteLength = Buffer.byteLength(jsonStringify(definition));
  if (byteLength > MAX_DEFINITION_BYTES)
    return {
      reason: "definition_size",
    };
  if (!withinDepth(definition.inputSchema, MAX_INPUT_SCHEMA_DEPTH))
    return {
      reason: "schema_depth",
    };
  if (bytes + byteLength > ANNOUNCE_BYTE_BUDGET)
    return {
      reason: "announce_budget",
    };
  if (announced.size >= MAX_ANNOUNCED_TOOLS)
    return {
      reason: "announce_count",
    };
  return {
    definition,
    bytes: byteLength,
    wireArguments,
  };
}
//@ chunk-weh04swb.js:15175-15312 placement
function sortServersByScope(servers) {
  return servers
    .map((n, index) => ({
      server: n,
      index,
      rank: scopeRank(n.scope),
    }))
    .sort((n, i) => n.rank - i.rank || n.index - i.index)
    .map((n) => n.server);
}
//@ chunk-weh04swb.js:15312-15365 placement
/**
 * 作用域优先级序号（未知排最后）。
 */
function scopeRank(scope) {
  return SCOPE_RANK[scope] ?? Number.MAX_SAFE_INTEGER;
}
//@ chunk-weh04swb.js:15365-15756 placement
/**
 * 生成透传工具的描述：名称、原始名、定义与参数改写信息；定义生成失败时记日志并返回空定义。
 */
async function describePassthroughTool(name, tool, target) {
  let m = tool.mcpInfo?.toolName ?? tool.name;
  let name_2 = strippedMcpToolName(name, m);
  let c = planArgumentRenames(tool.inputJSONSchema);
  let v = c === "reserved_argument" ? renamedFieldCacheMap() : c;
  try {
    return {
      server: name,
      rawName: m,
      name: name_2,
      tool,
      definition: await buildToolDefinition(name_2, tool, target, v),
      wireArguments: c,
    };
  } catch (error) {
    logForDebugging(`[deviceBridge] passthrough cannot describe '${name_2}': ${toError(error).message}`, {
      level: "error",
    });
    return {
      server: name,
      rawName: m,
      name: name_2,
      tool,
      definition: undefined,
      wireArguments: c,
    };
  }
}
//@ chunk-weh04swb.js:15756-15797 placement
/**
 * 去掉 mcp__ 前缀的工具名。
 */
function strippedMcpToolName(e, n) {
  return buildMcpToolName(e, n).slice(5);
}
//@ chunk-weh04swb.js:15797-15829 placement
/**
 * 参数冲突检查用的键名（<名字>_arg）。
 */
function argKey(e) {
  return `${e}_arg`;
}
//@ chunk-weh04swb.js:15829-16146 placement
/**
 * 透传工具 JSON Schema 中允许保留的关键字集合。
 */
var ALLOWED_SCHEMA_KEYS = new Set([
  "$schema",
  "$comment",
  "type",
  "title",
  "description",
  "properties",
  "required",
  "additionalProperties",
  "unevaluatedProperties",
  "$defs",
  "definitions",
  "default",
  "examples",
  "minProperties",
  "maxProperties",
]);
var REF_SCHEMA_KEYS = new Set([
  "$ref",
  "$dynamicRef",
  "$recursiveRef",
  "$anchor",
  "$dynamicAnchor",
  "$recursiveAnchor",
  "$id",
]);
//@ chunk-weh04swb.js:16146-16758 placement
/**
 * 检查工具输入 schema 是否用到保留参数名：无法安全改名时返回 reserved_argument，没有冲突时返回空映射，否则返回 改后名 → 原名 的映射。
 */
function planArgumentRenames(schema) {
  let properties = schema?.properties;
  let required = schema?.required;
  let m = new Set([
    ...(typeof properties === "object" && properties !== null ? Object.keys(properties) : []),
    ...(Array.isArray(required) ? required.filter((y) => typeof y === "string") : []),
  ]);
  let s = defaultList;
  let c = defaultListHandler;
  if (c.some((y) => m.has(argKey(y)))) return "reserved_argument";
  let conflicting = s.filter((y) => m.has(y));
  if (conflicting.length === 0) return renamedFieldCacheMap();
  if (
    conflicting.some((y) => !c.includes(y)) ||
    schema === undefined ||
    !isObjectSchemaType(schema.type) ||
    Object.keys(schema).some((key) => !ALLOWED_SCHEMA_KEYS.has(key)) ||
    hasRefKeywords(schema) ||
    conflicting.some(
      (y) =>
        typeof properties === "object" &&
        properties !== null &&
        Object.hasOwn(properties, y) &&
        !isPropertySchemaObject(Reflect.get(properties, y)),
    )
  )
    return "reserved_argument";
  let P = new Map(conflicting.map((y) => [argKey(y), y]));
  return [...P.keys()].some((key) => s.includes(key)) ? "reserved_argument" : P;
}
//@ chunk-weh04swb.js:16758-16971 placement
function hasRefKeywords(schema) {
  let n = (i, m) => {
    if (m > MAX_INPUT_SCHEMA_DEPTH) return true;
    if (Array.isArray(i)) return i.some((s) => n(s, m + 1));
    if (typeof i !== "object" || i === null) return false;
    return Object.entries(i).some(([key, value]) => REF_SCHEMA_KEYS.has(key) || n(value, m + 1));
  };
  return n(schema, 0);
}
//@ chunk-weh04swb.js:16971-17250 placement
async function buildToolDefinition(name, n, i, m) {
  let s = await n.description(
    {},
    {
      isNonInteractiveSession: false,
      toolPermissionContext: getEmptyToolPermissionContext(),
      tools: [],
    },
  );
  let toolAnnotations = buildToolAnnotations(n);
  let v = maxDescriptionLength();
  return {
    name,
    description:
      s.length <= Math.min(v, MAX_TOOL_DESCRIPTION_CHARS)
        ? s
        : truncateSuffix(s, Math.min(v, MAX_TOOL_DESCRIPTION_CHARS - TRUNCATION_SUFFIX.length)),
    inputSchema: buildInputSchema(n, m),
    ...(toolAnnotations && {
      annotations: toolAnnotations,
    }),
    _meta: buildToolMeta(n, i),
  };
}
//@ chunk-weh04swb.js:17250-17278 placement
/**
 * 描述被截断时追加的后缀。
 */
var TRUNCATION_SUFFIX = "\u2026 [truncated]";
//@ chunk-weh04swb.js:17278-17325 placement
/**
 * 超长则截断并加截断后缀。
 */
function truncateSuffix(e, n) {
  return e.length > n ? truncateToLength(e, n) + TRUNCATION_SUFFIX : e;
}
//@ chunk-weh04swb.js:17325-17584 placement
function buildInputSchema(e, n) {
  let inputJSONSchema = e.inputJSONSchema;
  if (inputJSONSchema === undefined || !isObjectSchemaType(inputJSONSchema.type))
    return {
      type: "object",
      properties: {},
    };
  let properties =
    typeof inputJSONSchema.properties === "object" &&
    inputJSONSchema.properties !== null &&
    !Array.isArray(inputJSONSchema.properties)
      ? keepValidProperties(inputJSONSchema.properties)
      : {};
  return applyArgumentRenames(
    {
      ...inputJSONSchema,
      type: "object",
      properties,
    },
    n,
  );
}
//@ chunk-weh04swb.js:17584-17892 placement
/**
 * 在 schema 中应用参数重命名：改写属性名与 required，并在描述中注明原参数名。
 */
function applyArgumentRenames(e, n) {
  if (n.size === 0) return e;
  let i = new Map([...n].map(([c, v]) => [v, c]));
  let properties = xr(
    identityMap(e.properties, (c, v) => i.get(v) ?? v),
    (c, v) => {
      let P = n.get(v);
      return P === undefined
        ? c
        : {
            ...c,
            description: describeRenamedParam(P, c),
          };
    },
  );
  let s = Array.isArray(e.required) ? e.required.map((c) => i.get(c) ?? c) : undefined;
  return {
    ...e,
    properties,
    ...(s && {
      required: s,
    }),
  };
}
//@ chunk-weh04swb.js:17892-18056 placement
function describeRenamedParam(e, n) {
  let i = Reflect.get(n, "description");
  let m = `(The tool's own "${e}" parameter, passed under this name.)`;
  return typeof i === "string" && i !== "" ? `${i} ${m}` : m;
}
//@ chunk-weh04swb.js:18056-18143 placement
/**
 * 判断 JSON Schema 的 type 是否表示对象。
 */
function isObjectSchemaType(type) {
  return type === undefined || type === "object" || (Array.isArray(type) && type.includes("object"));
}
//@ chunk-weh04swb.js:18143-18248 placement
function keepValidProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).flatMap(([key, value]) =>
      isPropertySchemaObject(value) ? [[key, value === true ? {} : value]] : [],
    ),
  );
}
//@ chunk-weh04swb.js:18248-18327 placement
/**
 * 判断属性 schema 是否为对象（true 或普通对象）。
 */
function isPropertySchemaObject(e) {
  return e === true || (typeof e === "object" && e !== null && !Array.isArray(e));
}
//@ chunk-weh04swb.js:18327-18598 placement
function buildToolAnnotations(e) {
  let title = e.mcpInfo?.title;
  let i = {
    ...(title !== undefined && {
      title: truncateSuffix(title, MAX_TITLE_CHARS),
    }),
    ...(e.readOnlyHint !== undefined && {
      readOnlyHint: e.readOnlyHint,
    }),
    ...(e.isDestructive?.({}) === true && {
      destructiveHint: true,
    }),
    ...(e.isOpenWorld?.({}) === true && {
      openWorldHint: true,
    }),
  };
  return Object.keys(i).length > 0 ? i : undefined;
}
//@ chunk-weh04swb.js:18598-18955 placement
/**
 * 构造透传工具的 _meta：透传标记（版本、工具名、目标），以及搜索提示、始终加载、结果大小上限与需要用户交互等元信息。
 */
function buildToolMeta(e, n) {
  let { inventory, ...m } = n;
  let s = {
    v: PASSTHROUGH_ANNOUNCE_FORMAT_VERSION,
    tool: e.name,
    target: m,
  };
  return {
    [PASSTHROUGH_MARKER_KEY]: s,
    ...(e.searchHint !== undefined && {
      [TOOL_META_KEYS.searchHint]: truncateSuffix(e.searchHint, MAX_SEARCH_HINT_CHARS),
    }),
    ...(e.alwaysLoad === true && {
      [TOOL_META_KEYS.alwaysLoad]: true,
    }),
    ...(e.persistenceThresholdCeiling !== undefined && {
      [TOOL_META_KEYS.maxResultSizeChars]: e.maxResultSizeChars,
    }),
    ...(e.requiresUserInteraction?.() === true && {
      [TOOL_META_KEYS.requiresUserInteraction]: true,
    }),
  };
}
export {
  ADMIN_SCOPES,
  createPassthroughMcpBridge,
  buildPassthroughAnnouncement,
  makePassthroughCall,
  refuseNotServedValidation,
  throwNotServed,
};
