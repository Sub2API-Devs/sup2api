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
import { Do } from "../../utils/git/gitSafeEnv.js";
import {
  McpSessionExpiredError,
  refreshMcpServerTools,
  McpAuthError,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  vF,
} from "../mcp/client.js";
import { kA } from "../policyLimits/coldStartWaiter.js";
import { t1e } from "../../utils/settings/managedPluginTiers.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { isMcpServerAllowedByPolicy } from "../mcp/config.js";
import { isToolFromMcpServer, buildMcpToolName } from "../mcp/mcpStringUtils.js";
import { ZQo, qvn, withinDepth } from "../../remote/tools/protocolSchemas.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { stripAnthropicMeta } from "../mcp/anthropicMeta.js";
import { i7o, Clr, FXr, xlr, Rlr } from "../../remote/tools/toolDescriptors.js";
import { we } from "./deviceMcpConsent.js";
import { _Y, tMn, isOrgConnectorName } from "../mcp/normalization.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import {
  isServiceReservedToolName,
  mayBePassthroughTool,
  PASSTHROUGH_ANNOUNCE_FORMAT_VERSION,
  PASSTHROUGH_MARKER_KEY,
} from "./passthroughMarker.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { Lrn } from "../remoteTools/pathMapping.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { TOOL_META_KEYS } from "../../bridge/deviceRegistration.js";

//@ chunk-weh04swb.js:1665-1690 placement
var Ue = 1e4,
  Ve = 3,
  ze = 60000;
//@ chunk-weh04swb.js:1690-1812 placement
class PassthroughMcpUnavailableError extends Error {
  unavailable;
  name = "PassthroughMcpUnavailableError";
  constructor(e, n, i) {
    super(n, i);
    this.unavailable = e;
  }
}
/**
 * 设备桥：把本机 MCP 服务器的工具"直通"给云会话调用：列出/刷新服务器、重名与保留名检查、托管策略拒绝、调用转发与错误包装。
 */
//@ chunk-weh04swb.js:1812-9043 placement
function createPassthroughMcpBridge(e) {
  let n = e.ops ?? createPassthroughMcpDeps(),
    i = e.dialLatch ?? createDialFailureLatch(),
    keys = Object.keys(e.configs),
    s = new Map(),
    c = new Map(),
    weakSet = new WeakSet(),
    P = createSignal(),
    now = Date.now(),
    g,
    M = !1,
    k = () => {},
    promise = new Promise((r) => {
      k = r;
    }),
    O,
    now_2 = Date.now(),
    E = () => g !== void 0;
  function B() {
    if (M) return;
    if (((M = !0), O !== void 0)) (clearTimeout(O), (O = void 0));
    let r = [...c.values()],
      a = (f) => count(r, (h) => h === f);
    (k({
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
    }),
      re([...s].filter(([, f]) => f.handle.type === "cached").map(([f]) => f)));
  }
  async function re(r) {
    let a = async (S) => {
        q();
        let D = s.get(S);
        if (D && !E()) (await se(S, D).catch(() => {}), q());
      },
      f = (S) => n.dialConcurrency(e.configs[S]),
      filtered = r.filter((S) => s.has(S));
    await Promise.all(
      SS(filtered, (S) => f(S).kind === "local")
        .filter((S) => S.length > 0)
        .map((S) => pMap(S, a, { concurrency: f(S[0]).limit })),
    );
  }
  function W() {
    try {
      P.emit();
    } catch (error) {
      logError(error);
    }
  }
  function x(r, a) {
    let f = s.get(r);
    if (f) s.set(r, { ...f, ...a });
  }
  function Re(r, a) {
    let f = s.get(r.name),
      h = pe(r.name, a);
    if (
      (s.set(r.name, {
        handle: r,
        tools: h,
        dialing: f?.dialing,
        listing: void 0,
        consecutiveDialFailures: 0,
        everConnected: f?.everConnected === !0 || r.type === "connected",
      }),
      r.type === "connected")
    ) {
      if (h.length === 0) x(r.name, { listing: G(r.name, r) });
      ie(r.name, r);
    } else if (M) re([r.name]);
    if (f !== void 0 || M) W();
  }
  function ie(r, a) {
    let f = s.get(r);
    if (!f || E()) return;
    if (f.handle !== a) (x(r, { handle: a, everConnected: !0 }), x(r, { listing: G(r, a) }), W());
    if (!weakSet.has(a) && a.capabilities?.tools?.listChanged)
      (weakSet.add(a),
        n.onToolListChanged(a, async () => {
          await G(r, a);
        }));
  }
  function G(r, a) {
    let f = !1;
    return n
      .refreshTools(
        a,
        (h, S) => {
          if (s.get(r)?.handle === a && !E()) (x(r, { tools: pe(r, S), listing: void 0 }), (f = !0), W());
        },
        e.storageV5,
      )
      .then(
        () => f,
        (h) => (
          logForDebugging(
            `[deviceBridge] passthrough MCP tools refresh failed for ${r}: ${toError(h).message}`,
          ),
          !1
        ),
      );
  }
  function H(r, a) {
    let f = s.get(r);
    if (!f || E()) return;
    (s.delete(r),
      n.dispose(r, f.handle.config),
      n.cleanup([f.handle]),
      logForDebugging(`[deviceBridge] passthrough MCP server ${r} left the pool (${a})`),
      W());
  }
  function q() {
    let now = Date.now();
    if (now - now_2 >= ze) ((now_2 = now), n.refreshPolicy());
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
        if ((ae(r, f), i.recordSuccess(r), E() || !s.has(r)))
          throw (
            n.cleanup([h]),
            new PassthroughMcpUnavailableError("server", "MCP server is no longer offered by this machine")
          );
        return (x(r, { consecutiveDialFailures: 0 }), ie(r, h), h);
      },
      (h) => {
        if ((ae(r, f), isMcpAuthError(h))) throw (H(r, "needs authentication"), h);
        i.recordFailure(r);
        let S = s.get(r),
          D = (S?.consecutiveDialFailures ?? 0) + 1;
        if ((x(r, { consecutiveDialFailures: D }), D >= Ve && S?.everConnected !== !0))
          H(r, "repeated dial failures");
        else if (s.has(r)) n.dispose(r, a.handle.config);
        throw h;
      },
    );
    return (x(r, { dialing: f }), f);
  }
  function ae(r, a) {
    if (s.get(r)?.dialing === a) x(r, { dialing: void 0 });
  }
  async function Oe(r, { signal: signal, deadline: deadline }) {
    let h = s.get(r)?.listing;
    while (h !== void 0) {
      let S = await boundDial(h, {
          signal: signal,
          timeoutMs: Math.max(0, deadline - Date.now()),
          serverName: r,
          context: "device tool call",
        }).catch((R) => {
          if (isAbortError(R)) throw R;
          throw new PassthroughMcpUnavailableError("server", "MCP server connected too late for this call", {
            cause: R,
          });
        }),
        D = s.get(r);
      if (S || D?.listing === void 0) return;
      if (D.listing !== h) {
        h = D.listing;
        continue;
      }
      if (D.handle.type === "connected") x(r, { listing: G(r, D.handle) });
      throw new PassthroughMcpUnavailableError("server", "MCP server did not list its tools");
    }
  }
  async function Ne(r, { signal: signal, timeoutMs: timeoutMs }) {
    let h = s.get(r);
    if (E() || !h)
      throw new PassthroughMcpUnavailableError("server", "MCP server is not available on this machine");
    try {
      return await boundDial(se(r, h), {
        signal: signal,
        timeoutMs: timeoutMs,
        serverName: r,
        context: "device tool call",
      });
    } catch (error) {
      if (isAbortError(error) || error instanceof PassthroughMcpUnavailableError) throw error;
      if (isMcpAuthError(error)) throw ue(error);
      throw (
        logForDebugging(`[deviceBridge] passthrough MCP dial failed for ${r}: ${toError(error).message}`),
        new PassthroughMcpUnavailableError("server", "MCP server could not be reached for this call", {
          cause: error,
        })
      );
    }
  }
  function ce(r, a) {
    q();
    let f = s.get(r);
    if (!f || E())
      throw new PassthroughMcpUnavailableError("server", "MCP server is not available on this machine");
    let found = f.tools.find((tool) => le(tool) === a);
    if (!found) throw new PassthroughMcpUnavailableError("tool", "MCP tool is not offered by this machine");
    if (found.mcpInfo?.effectiveMaxPermission === "blocked")
      throw new PassthroughMcpUnavailableError(
        "tool",
        "MCP tool is blocked on this machine by the organization",
      );
  }
  async function xe(r, a, { signal: signal, deadline: deadline }) {
    ce(r, a);
    let S = await Ne(r, { signal: signal, timeoutMs: Math.max(0, deadline - Date.now()) });
    if ((await Oe(r, { signal: signal, deadline: deadline }), ce(r, a), s.get(r)?.handle !== S))
      throw new PassthroughMcpUnavailableError(
        "server",
        "MCP server was reconnected during this call; retry",
      );
    if (deadline - Date.now() <= 0)
      throw new PassthroughMcpUnavailableError("server", "MCP server connected too late for this call");
    return S;
  }
  async function ke(r, a, f, { signal: signal, deadline: deadline, imageLimits: imageLimits }) {
    let R = createCombinedAbortSignal(signal, {
        timeoutMs: Math.max(0, deadline - Date.now()),
        refTimer: !0,
      }),
      X = (L) =>
        signal.aborted
          ? new AbortError(`MCP tool call on '${r}' aborted`)
          : R.signal.aborted
            ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `MCP server "${r}" did not answer the call within its deadline`,
                "MCP passthrough call deadline",
              )
            : L;
    try {
      let L = await n.callTool(a, f, { signal: R.signal, imageLimits: imageLimits }).catch((V) => {
        throw X(V);
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
      R.cleanup();
    }
  }
  function Ie(r, a) {
    if (!isMcpAuthError(a)) return a;
    return (H(r, "needs authentication"), ue(a));
  }
  function He({ client: client, tools: tools }) {
    if (E() || c.get(client.name) === "dropped") {
      n.cleanup([client]);
      return;
    }
    if (!Object.hasOwn(e.configs, client.name)) return;
    switch (client.type) {
      case "connected":
      case "cached":
        (c.set(client.name, client.type), Re(client, tools));
        break;
      case "failed":
        (c.set(client.name, client.type), H(client.name, "failed"));
        break;
      case "needs-auth":
        (c.set(client.name, client.type), H(client.name, "needs authentication"));
        break;
      case "disabled":
        (c.set(client.name, client.type), H(client.name, "disabled"));
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
      O = setTimeout(B, e.settleTimeoutMs ?? Ue);
      let r = Do(e.configs, (a, f) => {
        if (c.get(f) === "dropped") return !1;
        if (n.needsLocalPrompts(a)) return (c.set(f, "excluded"), !1);
        let allowedByPolicy = n.allowedByPolicy(f, a);
        if (!allowedByPolicy) c.set(f, "blocked");
        return allowedByPolicy;
      });
      return n.discover(He, r, e.storageV5);
    })
    .catch((r) => {
      logForDebugging(`[deviceBridge] passthrough MCP discovery failed: ${toError(r).message}`);
    })
    .finally(() => {
      (B(), de((r) => E() || c.get(r) === "dropped"));
    });
  function de(r = () => !0) {
    for (let a of keys.filter(r)) n.dispose(a, e.configs[a]);
  }
  return {
    settled: promise,
    servers() {
      return (
        q(),
        keys.flatMap((r) => {
          let a = s.get(r);
          return a ? [{ name: r, scope: a.handle.config.scope, tools: a.tools, status: a.handle.type }] : [];
        })
      );
    },
    subscribe: P.subscribe,
    async callTool(r, a, { signal: f, timeout: h, imageLimits: S }) {
      let D = Date.now() + h,
        R = async (X) => {
          let L = await xe(r, a.name, { signal: f, deadline: D });
          try {
            return await ke(r, L, a, { signal: f, deadline: D, imageLimits: S });
          } catch (error) {
            let Fe = a.name;
            if (
              X &&
              error instanceof McpSessionExpiredError &&
              (!error.mayHaveRun || s.get(r)?.tools.find((Be) => le(Be) === Fe)?.readOnlyHint === !0)
            )
              return R(!1);
            throw Ie(r, error);
          }
        };
      return R(!0);
    },
    toolTimeoutMs: (r) => n.toolTimeoutMs(e.configs[r]),
    dropServer(r) {
      if (E() || !Object.hasOwn(e.configs, r)) return;
      if ((c.set(r, "dropped"), s.has(r))) H(r, "dropped by the caller");
      else n.dispose(r, e.configs[r]);
      if (c.size >= keys.length) B();
    },
    stop() {
      return (
        (g ??= (async () => {
          if (O !== void 0) (clearTimeout(O), (O = void 0));
          P.clear();
          let mapped = [...s.values()].map((a) => a.handle);
          (s.clear(), B(), de(), await n.cleanup(mapped));
        })()),
        g
      );
    },
  };
}
/**
 * 构造设备桥接透传 MCP 的依赖对象：策略就绪、发现工具、确保连接、监听工具列表变化、刷新工具、调用工具、清理/释放连接、策略判定、是否需要本地提示、按本地/远程决定拨号并发、工具超时。
 */
//@ chunk-weh04swb.js:9043-9961 placement
function createPassthroughMcpDeps() {
  let mcpClient = require("./chunk-asne9cp8.js").mcpClientModule();
  return {
    policySettled: () =>
      Promise.all([kA(), t1e()]).then(() => {
        return;
      }),
    discover: (n, i, m) => mcpClient.getMcpToolsCommandsAndResources(n, i, m),
    ensureConnected: (n) => mcpClient.ensureConnectedClient(n),
    onToolListChanged: (n, i) => mcpClient.onMcpToolListChanged(n, i),
    refreshTools: refreshMcpServerTools,
    callTool: (n, i, { signal: signal, imageLimits: imageLimits }) =>
      mcpClient.callMCPTool({
        client: n,
        tool: i.name,
        args: i.arguments ?? {},
        meta: i._meta,
        signal: signal,
        imageLimits: imageLimits,
        hasResultSizeAnnotation: !0,
        storageV5: void 0,
        credentials: void 0,
      }),
    cleanup: (n) => mcpClient.cleanupConnectedMcpClients(n),
    dispose: (n, i) => mcpClient.disposeServerConnectionDetached(n, i),
    refreshPolicy: or,
    allowedByPolicy: isMcpServerAllowedByPolicy,
    needsLocalPrompts: (n) => mcpClient.isFirstPartyDesignServerConfig(n),
    dialConcurrency: (n) =>
      mcpClient.isLocalMcpServer(n)
        ? { kind: "local", limit: mcpClient.getMcpServerConnectionBatchSize() }
        : { kind: "remote", limit: mcpClient.getRemoteMcpServerConnectionBatchSize() },
    toolTimeoutMs: (n) => mcpClient.getMcpToolTimeoutMs(n),
  };
}
//@ chunk-weh04swb.js:9961-10011 placement
function le(e) {
  return e.mcpInfo?.toolName ?? e.name;
}
//@ chunk-weh04swb.js:10011-10133 placement
function isMcpAuthError(e) {
  return (
    e instanceof McpAuthError ||
    (e !== null && typeof e === "object" && "mcpErrorSource" in e && e.mcpErrorSource === "user_auth")
  );
}
//@ chunk-weh04swb.js:10133-10231 placement
function ue(e) {
  return new PassthroughMcpUnavailableError("server", "MCP server needs authentication on this machine", {
    cause: e,
  });
}
//@ chunk-weh04swb.js:10231-10298 placement
function pe(e, n) {
  return n.filter((i) => i.mcpInfo !== void 0 && isToolFromMcpServer(i, e));
}
//@ chunk-weh04swb.js:10298-10315 placement
var fe = ZQo,
  J = qvn;
//@ chunk-weh04swb.js:10315-10427 placement
class PassthroughCallError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  verdict;
  constructor(e, n, i) {
    super(n, i, e.code);
    this.verdict = e;
    this.name = "PassthroughCallError";
  }
}
/**
 * 透传工具未提供时的校验失败结果，并通知工具判定回调。
 */
//@ chunk-weh04swb.js:10427-10559 placement
function refuseNotServedValidation(e, n) {
  return (
    e?.onToolVerdict?.({ kind: "refused", code: "not_served" }, n.message),
    { result: !1, message: n.message, errorCode: 1 }
  );
}
/**
 * 抛出"工具未提供"的透传调用错误，并通知工具判定回调。
 */
//@ chunk-weh04swb.js:10559-10679 placement
function throwNotServed(e, n, i) {
  let m = new PassthroughCallError({ kind: "refused", code: "not_served" }, n, i);
  throw (e?.onToolVerdict?.(m.verdict, m.message), m);
}
/**
 * 生成透传 MCP 工具的 call 函数：只接受远程调用，去掉保留参数后调用本机 MCP 服务器（带超时与图片限制），把错误转成透传错误并回报判定；返回内容与 _meta/structuredContent。
 */
//@ chunk-weh04swb.js:10679-11311 placement
function makePassthroughCall(deps, serverName, toolName, argRenames) {
  let s = new Set(argRenames.values()),
    filtered = J.filter((input) => !s.has(input));
  return async (v, context) => {
    if (context.remoteCall === void 0)
      throw new PassthroughCallError({ kind: "refused", code: "invalid_request" }, me, me);
    let toolTimeoutMs = deps.toolTimeoutMs(serverName),
      { onToolVerdict: onToolVerdict } = context.remoteCall,
      result = await deps
        .callTool(
          serverName,
          { name: toolName, arguments: Uo(v, filtered) },
          {
            signal: context.abortController.signal,
            timeout: toolTimeoutMs,
            imageLimits: { ...imageLimitsForModel(context.options.mainLoopModel), allowWebp: !1 },
          },
        )
        .catch((k) => {
          let I = toPassthroughError(k, serverName);
          if (I instanceof PassthroughCallError) onToolVerdict?.(I.verdict, I.message);
          throw I;
        });
    return {
      data: result.content,
      ...((result._meta || result.structuredContent) && {
        mcpMeta: {
          ...(result._meta && { _meta: stripAnthropicMeta(result._meta) }),
          ...(result.structuredContent && { structuredContent: result.structuredContent }),
        },
      }),
    };
  };
}
//@ chunk-weh04swb.js:11311-11396 placement
var me = "MCP passthrough tools run only for a remote tool call; the call did not run";
/**
 * 把透传 MCP 调用的失败转成给远端的错误：工具自身返回错误（可能已有副作用）、需要浏览器同意（-32042）、服务器不可用、其他（超时/断连/协议错误，可能已执行）。
 */
//@ chunk-weh04swb.js:11396-12367 placement
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
      { kind: "refused", code: "not_served" },
      `MCP server "${serverName}" on this machine needs a consent step in a browser there before this tool can run; the call did not run`,
      "MCP passthrough call needs URL consent on this machine",
    );
  if (error instanceof PassthroughMcpUnavailableError)
    return new PassthroughCallError(
      { kind: "refused", code: "not_served" },
      `MCP server "${serverName}" on this machine: ${error.message}; the call did not run`,
      error.message,
    );
  return (
    logForDebugging(`[deviceBridge] passthrough MCP call on ${serverName} failed: ${toError(error).message}`),
    new PassthroughCallError(
      { kind: "failed", code: "tool_error" },
      `MCP server "${serverName}" on this machine gave no usable result for the call (timeout, lost connection, or a protocol-level error); it may have run and had effects`,
      "MCP tool call failed on this machine",
    )
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
var Je = i7o;
/**
 * 透传 MCP 工具公告的限制：总字节预算、工具数、单个定义大小、标题与搜索提示长度，以及作用域优先级与管理员作用域集合。
 */
//@ chunk-weh04swb.js:12469-12636 placement
var ANNOUNCE_BYTE_BUDGET = Clr - 262144,
  MAX_ANNOUNCED_TOOLS = FXr,
  MAX_DEFINITION_BYTES = 65536,
  MAX_TITLE_CHARS = 256,
  MAX_SEARCH_HINT_CHARS = 512,
  SCOPE_RANK = {
    enterprise: 0,
    managed: 1,
    local: 2,
    user: 3,
    dynamic: 4,
    project: 5,
    claudeai: 6,
    agent: 7,
  },
  ADMIN_SCOPES = new Set(["enterprise", "managed"]);
/**
 * 为设备桥接构造透传工具公告：按作用域排序服务器，描述每个工具，检测名称冲突（服务器/工具层面、管理员优先），过滤权限上限、deny 规则与各种限制，返回可公告工具、丢弃原因与按服务器分组的定义。
 */
//@ chunk-weh04swb.js:12636-13041 placement
async function buildPassthroughAnnouncement(servers, options) {
  let i = sortServersByScope(servers),
    results = await Promise.all(
      i.map((y) => Promise.all(y.tools.map((tool) => describePassthroughTool(y.name, tool, options.target)))),
    ),
    s = buildCollisionChecker(i, results, options.configured),
    {
      tools: tools,
      dropped: dropped,
      byServer: byServer,
    } = i.reduce(
      (y, g, M) => {
        let k = we(g.scope) ? { reason: "enterprise_scope" } : s.server(g);
        return (results[M] ?? []).reduce((I, O) => admitTool(I, O, k, s, options), y);
      },
      { announced: new Set(), bytes: 0, tools: [], dropped: [], byServer: new Map() },
    );
  return { tools: tools, dropped: dropped, byServer: byServer };
}
/**
 * 构造服务器名与工具名的冲突判定：与保留名/内置名冲突、与管理员服务器前缀重叠、规范化后同名（无管理员时为 alias_collision）。
 */
//@ chunk-weh04swb.js:13041-13810 placement
function buildCollisionChecker(servers, toolGroups, extraServers) {
  let allServers = sortServersByScope([
      ...servers,
      ...extraServers.filter((g) => !servers.some((M) => M.name === g.name)),
    ]),
    adminServers = new Set(allServers.filter((g) => ADMIN_SCOPES.has(g.scope)).map((g) => g.name)),
    adminPrefixes = [...adminServers].map((g) => `${_Y(getPrefixServerKey(g))}_`),
    shadowsAdminPrefix = (g, M) => !adminServers.has(g) && adminPrefixes.some((k) => `${M}_`.startsWith(k)),
    serversByKey = groupByAlias(
      allServers.map((g) => [
        _Y(getPrefixServerKey(g.name)),
        { server: g.name, admin: adminServers.has(g.name) },
      ]),
    ),
    toolsByKey = groupByAlias(
      toolGroups
        .flat()
        .map((g) => [
          _Y(g.name),
          { server: g.server, admin: adminServers.has(g.server), rawName: g.rawName },
        ]),
    );
  return {
    server: (g) =>
      tMn(g.name) || isOrgConnectorName(g.name) || shadowsAdminPrefix(g.name, _Y(getPrefixServerKey(g.name)))
        ? { reason: "collision" }
        : resolveAliasGroup(
            serversByKey.get(_Y(getPrefixServerKey(g.name))) ?? [],
            g.name,
            (M) => M.server === g.name,
          ),
    tool: (g) =>
      isServiceReservedToolName(g.name)
        ? { reason: "service_reserved" }
        : !mayBePassthroughTool(g.name) ||
            tMn(g.name) ||
            isOrgConnectorName(g.name) ||
            shadowsAdminPrefix(g.server, _Y(g.name))
          ? { reason: "collision" }
          : resolveAliasGroup(
              toolsByKey.get(_Y(g.name)) ?? [],
              g.server,
              (M) => M.server === g.server && M.rawName === g.rawName,
            ),
  };
}
//@ chunk-weh04swb.js:13810-14022 placement
function resolveAliasGroup(e, n, i) {
  let m = e.find((s) => s.admin) ?? (e.length === 1 ? e[0] : void 0);
  if (m === void 0)
    return { reason: "alias_collision", contenders: e.map((s) => s.server).filter((s) => s !== n) };
  return i(m) ? void 0 : { reason: "collision" };
}
//@ chunk-weh04swb.js:14022-14158 placement
function groupByAlias(e) {
  return e.reduce((n, [i, m]) => {
    let s = n.get(i) ?? [];
    if (!s.some((c) => c.server === m.server)) n.set(i, [...s, m]);
    return n;
  }, new Map());
}
/**
 * 决定是否把一个设备 MCP 工具透传给会话：权限上限阻止、命中拒绝规则或描述失败时记入丢弃列表；否则累加大小并加入工具列表和按服务器分组。
 */
//@ chunk-weh04swb.js:14158-14647 placement
function admitTool(e, n, i, m, { isDenied: isDenied, serve: serve }) {
  let v =
    i ??
    m.tool(n) ??
    (n.tool.mcpInfo?.effectiveMaxPermission === "blocked"
      ? { reason: "permission_ceiling" }
      : isDenied(n.tool)
        ? { reason: "deny_rule" }
        : checkToolLimits(n, e));
  if ("reason" in v) return (e.dropped.push({ server: n.server, tool: n.rawName, ...v }), e);
  (e.announced.add(n.name),
    (e.bytes += v.bytes),
    e.tools.push(serve({ ...n, definition: v.definition, wireArguments: v.wireArguments })));
  let P = e.byServer.get(n.server);
  if (P === void 0) ((P = []), e.byServer.set(n.server, P));
  return (P.push(v.definition), e);
}
/**
 * 检查一个透传工具能否公告：保留参数、名称过长、重名、定义缺失、定义过大、schema 嵌套过深、总字节预算或数量上限；通过则返回定义与字节数。
 */
//@ chunk-weh04swb.js:14647-15175 placement
function checkToolLimits(
  { name: candidate, definition: definition, wireArguments: wireArguments },
  { announced: announced, bytes: bytes },
) {
  if (wireArguments === "reserved_argument") return { reason: "reserved_argument" };
  if (candidate.length > Je) return { reason: "name_length" };
  if (announced.has(candidate)) return { reason: "collision" };
  if (definition === void 0) return { reason: "definition_error" };
  let byteLength = Buffer.byteLength(jsonStringify(definition));
  if (byteLength > MAX_DEFINITION_BYTES) return { reason: "definition_size" };
  if (!withinDepth(definition.inputSchema, xlr)) return { reason: "schema_depth" };
  if (bytes + byteLength > ANNOUNCE_BYTE_BUDGET) return { reason: "announce_budget" };
  if (announced.size >= MAX_ANNOUNCED_TOOLS) return { reason: "announce_count" };
  return { definition: definition, bytes: byteLength, wireArguments: wireArguments };
}
//@ chunk-weh04swb.js:15175-15312 placement
function sortServersByScope(e) {
  return e
    .map((n, i) => ({ server: n, index: i, rank: at(n.scope) }))
    .sort((n, i) => n.rank - i.rank || n.index - i.index)
    .map((n) => n.server);
}
//@ chunk-weh04swb.js:15312-15365 placement
function at(e) {
  return SCOPE_RANK[e] ?? Number.MAX_SAFE_INTEGER;
}
/**
 * 生成透传工具的描述：名称、原始名、定义与参数改写信息；定义生成失败时记日志并返回空定义。
 */
//@ chunk-weh04swb.js:15365-15756 placement
async function describePassthroughTool(e, n, i) {
  let m = n.mcpInfo?.toolName ?? n.name,
    s = dt(e, m),
    c = planArgumentRenames(n.inputJSONSchema),
    v = c === "reserved_argument" ? Lrn() : c;
  try {
    return {
      server: e,
      rawName: m,
      name: s,
      tool: n,
      definition: await buildToolDefinition(s, n, i, v),
      wireArguments: c,
    };
  } catch (error) {
    return (
      logForDebugging(`[deviceBridge] passthrough cannot describe '${s}': ${toError(error).message}`, {
        level: "error",
      }),
      { server: e, rawName: m, name: s, tool: n, definition: void 0, wireArguments: c }
    );
  }
}
//@ chunk-weh04swb.js:15756-15797 placement
function dt(e, n) {
  return buildMcpToolName(e, n).slice(5);
}
//@ chunk-weh04swb.js:15797-15829 placement
function ve(e) {
  return `${e}_arg`;
}
/**
 * 透传工具 JSON Schema 中允许保留的关键字集合。
 */
//@ chunk-weh04swb.js:15829-16146 placement
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
  ]),
  REF_SCHEMA_KEYS = new Set([
    "$ref",
    "$dynamicRef",
    "$recursiveRef",
    "$anchor",
    "$dynamicAnchor",
    "$recursiveAnchor",
    "$id",
  ]);
/**
 * 检查工具输入 schema 是否用到保留参数名：无法安全改名时返回 reserved_argument，没有冲突时返回空映射，否则返回 改后名 → 原名 的映射。
 */
//@ chunk-weh04swb.js:16146-16758 placement
function planArgumentRenames(schema) {
  let properties = schema?.properties,
    i = schema?.required,
    m = new Set([
      ...(typeof properties === "object" && properties !== null ? Object.keys(properties) : []),
      ...(Array.isArray(i) ? i.filter((y) => typeof y === "string") : []),
    ]),
    s = J,
    c = fe;
  if (c.some((y) => m.has(ve(y)))) return "reserved_argument";
  let conflicting = s.filter((y) => m.has(y));
  if (conflicting.length === 0) return Lrn();
  if (
    conflicting.some((y) => !c.includes(y)) ||
    schema === void 0 ||
    !Pe(schema.type) ||
    Object.keys(schema).some((y) => !ALLOWED_SCHEMA_KEYS.has(y)) ||
    hasRefKeywords(schema) ||
    conflicting.some(
      (y) =>
        typeof properties === "object" &&
        properties !== null &&
        Object.hasOwn(properties, y) &&
        !Me(Reflect.get(properties, y)),
    )
  )
    return "reserved_argument";
  let P = new Map(conflicting.map((y) => [ve(y), y]));
  return [...P.keys()].some((y) => s.includes(y)) ? "reserved_argument" : P;
}
//@ chunk-weh04swb.js:16758-16971 placement
function hasRefKeywords(e) {
  let n = (i, m) => {
    if (m > xlr) return !0;
    if (Array.isArray(i)) return i.some((s) => n(s, m + 1));
    if (typeof i !== "object" || i === null) return !1;
    return Object.entries(i).some(([s, c]) => REF_SCHEMA_KEYS.has(s) || n(c, m + 1));
  };
  return n(e, 0);
}
//@ chunk-weh04swb.js:16971-17250 placement
async function buildToolDefinition(e, n, i, m) {
  let description = await n.description(
      {},
      { isNonInteractiveSession: !1, toolPermissionContext: getEmptyToolPermissionContext(), tools: [] },
    ),
    c = buildToolAnnotations(n),
    v = vF();
  return {
    name: e,
    description:
      description.length <= Math.min(v, Rlr) ? description : Q(description, Math.min(v, Rlr - Ce.length)),
    inputSchema: buildInputSchema(n, m),
    ...(c && { annotations: c }),
    _meta: buildToolMeta(n, i),
  };
}
//@ chunk-weh04swb.js:17250-17278 placement
var Ce = "\u2026 [truncated]";
//@ chunk-weh04swb.js:17278-17325 placement
function Q(e, n) {
  return e.length > n ? truncateToLength(e, n) + Ce : e;
}
//@ chunk-weh04swb.js:17325-17584 placement
function buildInputSchema(e, n) {
  let inputJSONSchema = e.inputJSONSchema;
  if (inputJSONSchema === void 0 || !Pe(inputJSONSchema.type)) return { type: "object", properties: {} };
  let m =
    typeof inputJSONSchema.properties === "object" &&
    inputJSONSchema.properties !== null &&
    !Array.isArray(inputJSONSchema.properties)
      ? keepValidProperties(inputJSONSchema.properties)
      : {};
  return applyArgumentRenames({ ...inputJSONSchema, type: "object", properties: m }, n);
}
/**
 * 在 schema 中应用参数重命名：改写属性名与 required，并在描述中注明原参数名。
 */
//@ chunk-weh04swb.js:17584-17892 placement
function applyArgumentRenames(e, n) {
  if (n.size === 0) return e;
  let i = new Map([...n].map(([c, v]) => [v, c])),
    m = xr(
      identityMap(e.properties, (c, v) => i.get(v) ?? v),
      (c, v) => {
        let P = n.get(v);
        return P === void 0 ? c : { ...c, description: describeRenamedParam(P, c) };
      },
    ),
    s = Array.isArray(e.required) ? e.required.map((c) => i.get(c) ?? c) : void 0;
  return { ...e, properties: m, ...(s && { required: s }) };
}
//@ chunk-weh04swb.js:17892-18056 placement
function describeRenamedParam(e, n) {
  let i = Reflect.get(n, "description"),
    m = `(The tool's own "${e}" parameter, passed under this name.)`;
  return typeof i === "string" && i !== "" ? `${i} ${m}` : m;
}
//@ chunk-weh04swb.js:18056-18143 placement
function Pe(e) {
  return e === void 0 || e === "object" || (Array.isArray(e) && e.includes("object"));
}
//@ chunk-weh04swb.js:18143-18248 placement
function keepValidProperties(e) {
  return Object.fromEntries(Object.entries(e).flatMap(([n, i]) => (Me(i) ? [[n, i === !0 ? {} : i]] : [])));
}
//@ chunk-weh04swb.js:18248-18327 placement
function Me(e) {
  return e === !0 || (typeof e === "object" && e !== null && !Array.isArray(e));
}
//@ chunk-weh04swb.js:18327-18598 placement
function buildToolAnnotations(e) {
  let n = e.mcpInfo?.title,
    i = {
      ...(n !== void 0 && { title: Q(n, MAX_TITLE_CHARS) }),
      ...(e.readOnlyHint !== void 0 && { readOnlyHint: e.readOnlyHint }),
      ...(e.isDestructive?.({}) === !0 && { destructiveHint: !0 }),
      ...(e.isOpenWorld?.({}) === !0 && { openWorldHint: !0 }),
    };
  return Object.keys(i).length > 0 ? i : void 0;
}
/**
 * 构造透传工具的 _meta：透传标记（版本、工具名、目标），以及搜索提示、始终加载、结果大小上限与需要用户交互等元信息。
 */
//@ chunk-weh04swb.js:18598-18955 placement
function buildToolMeta(e, n) {
  let { inventory: inventory, ...m } = n,
    s = { v: PASSTHROUGH_ANNOUNCE_FORMAT_VERSION, tool: e.name, target: m };
  return {
    [PASSTHROUGH_MARKER_KEY]: s,
    ...(e.searchHint !== void 0 && { [TOOL_META_KEYS.searchHint]: Q(e.searchHint, MAX_SEARCH_HINT_CHARS) }),
    ...(e.alwaysLoad === !0 && { [TOOL_META_KEYS.alwaysLoad]: !0 }),
    ...(e.persistenceThresholdCeiling !== void 0 && {
      [TOOL_META_KEYS.maxResultSizeChars]: e.maxResultSizeChars,
    }),
    ...(e.requiresUserInteraction?.() === !0 && { [TOOL_META_KEYS.requiresUserInteraction]: !0 }),
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
