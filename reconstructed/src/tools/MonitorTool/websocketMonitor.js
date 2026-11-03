/**
 * tools/MonitorTool/websocketMonitor.ts
 *
 * Monitor 的 WebSocket 事件源（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b91jfdd4.js (23)
 * attribution: placement 23
 */
import { isIP } from "net";
import { lookup } from "dns/promises";
import ws from "ws";
import { isBlockedAddress } from "../../utils/hooks/ssrfGuard.js";
import { toError } from "../../utils/errors.js";
import { guardTestWebSocket } from "../../utils/testNetworkGuard.js";
import { currentAgentId } from "../../services/remoteTools/backgroundCommands.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import {
  recordMonitorPlugin,
  createMonitorDelivery,
  enqueueMonitorEvent,
} from "../../tasks/MonitorTask/monitorDelivery.js";
import {
  isSameMonitorSocket,
  stopMonitorWsTasks,
  rememberMonitorSocket,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { getWebSocketProxyUrl } from "../../utils/proxy.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  monitorTimedOutMessage,
  MONITOR_DEFAULT_TIMEOUT_MS,
  MONITOR_ABSOLUTE_MAX_TIMEOUT_MS,
  monitorMaxTimeoutMs,
} from "./prompt.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { string, u, array, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { hasBackgroundBashStopAfterReply } from "../AgentTool/backgroundGates.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { count } from "../../utils/collections.js";
import {
  areCommandNetworkListsOffered_2,
  allowedDomainsInputSchema,
  getCommandNetworkLists,
  commandNetworkListsInput,
} from "../BashTool/sandboxNetwork.js";

//@ chunk-b91jfdd4.js:1510-1598 placement
class MonitorWsPreconditionError extends Error {
  constructor(message) {
    super(message);
    this.name = "MonitorWsPreconditionError";
  }
}
//@ chunk-b91jfdd4.js:1598-1816 placement
/**
 * 把 http(s)/ws(s) 地址规范为 ws:/wss: 协议，其他协议抛前置条件错误。
 */
function toWebSocketUrl(e) {
  switch (e.protocol) {
    case "wss:":
    case "https:":
      e.protocol = "wss:";
      break;
    case "ws:":
    case "http:":
      e.protocol = "ws:";
      break;
    default:
      throw new MonitorWsPreconditionError(`unsupported socket base scheme ${e.protocol}`);
  }
  return e.toString();
}
//@ chunk-b91jfdd4.js:1816-1862 placement
/**
 * 去掉主机名两端的方括号（IPv6 字面量）。
 */
function stripIpv6Brackets(hostname) {
  return hostname.replace(/^\[|\]$/g, "");
}
//@ chunk-b91jfdd4.js:1862-2557 placement
async function checkWebSocketHost(url, n) {
  let s = new URL(url);
  let r = stripIpv6Brackets(s.hostname);
  if (isIP(r)) {
    if (isBlockedAddress(r))
      throw new MonitorWsPreconditionError(`${r} is in a private, link-local, or cloud-metadata range`);
    return {
      url,
      tls: n.tls,
    };
  }
  let d;
  try {
    d = await lookup(r, {
      all: true,
    });
  } catch (error) {
    throw new MonitorWsPreconditionError(`could not resolve ${r}: ${toError(error).message}`);
  }
  if (d.length === 0) throw new MonitorWsPreconditionError(`could not resolve ${r}`);
  for (let { address } of d)
    if (isBlockedAddress(address))
      throw new MonitorWsPreconditionError(
        `${r} resolves to ${address}, which is in a private, link-local, or cloud-metadata range`,
      );
  if (n.proxy)
    return {
      url,
      tls: n.tls,
    };
  if (s.protocol === "wss:")
    return {
      url,
      tls: n.tls,
    };
  let g = d.find((v) => v.family === 4) ?? d[0];
  let Host = s.host;
  s.hostname = g.family === 6 ? `[${g.address}]` : g.address;
  return {
    url: s.toString(),
    headers: {
      Host,
    },
    tls: n.tls,
  };
}
//@ chunk-b91jfdd4.js:2557-2594 placement
/**
 * WebSocket 握手的默认超时（30 秒）。
 */
var DEFAULT_HANDSHAKE_TIMEOUT_MS = 30000;
var HANDSHAKE_TIMEOUT = "handshake_timeout";
//@ chunk-b91jfdd4.js:2594-2709 placement
function formatUpgradeRejection(statusCode, n) {
  let s = Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : 0;
  return `${n ? "cf_mitigated" : "upgrade_rejected"}_${s}`;
}
//@ chunk-b91jfdd4.js:2709-2875 placement
/**
 * 解析 "cf_mitigated_NNN" 或 "upgrade_rejected_NNN" 形式的拒绝原因，返回状态码与是否 Cloudflare 拦截。
 */
function parseUpgradeRejection(e) {
  let match = /^(cf_mitigated|upgrade_rejected)_(\d{1,3})$/.exec(e ?? "");
  if (match === null) return null;
  return {
    status: Number(match[2]),
    cfMitigated: match[1] === "cf_mitigated",
  };
}
//@ chunk-b91jfdd4.js:2875-2889 placement
/**
 * 单个 WebSocket 帧的上限（1 MiB），超过则丢弃并关闭。
 */
var MAX_WS_FRAME_BYTES = 1048576;
//@ chunk-b91jfdd4.js:2889-3025 placement
function messageByteLength(e) {
  if (Array.isArray(e)) return e.reduce((acc, s) => acc + s.length, 0);
  if (e instanceof ArrayBuffer) return e.byteLength;
  return e.length;
}
//@ chunk-b91jfdd4.js:3025-3223 placement
/**
 * 从工具上下文中挑出 Monitor 需要的字段（任务表、工具调用 id、代理 id、存储、凭证、钩子调用者）。
 */
function pickMonitorContext(e) {
  return {
    taskRegistry: e.taskRegistry,
    toolUseId: e.toolUseId,
    agentId: e.agentId,
    storageV5: e.storageV5,
    credentials: e.credentials,
    hookCaller: e.hookCaller,
    hookServesModel: e.hookServesModel,
  };
}
//@ chunk-b91jfdd4.js:3223-3298 placement = sendKeepalive (1)
function sendKeepalive(ws_2) {
  return (n) => {
    if (ws_2.readyState === ws.OPEN)
      try {
        ws_2.send(n);
      } catch {}
  };
}
//@ chunk-b91jfdd4.js:3298-7197 placement
/**
 * 用 WebSocket 订阅事件流作为 Monitor 事件源
 */
async function runWebSocketMonitor(e, context) {
  let s = pickMonitorContext(context);
  let { description, timeout_ms: timeoutMs, persistent } = e;
  let { url, protocols } = e.ws;
  guardTestWebSocket(url);
  let { toolUseId, taskRegistry } = s;
  let T = currentAgentId(s);
  let i = e.reuseTaskId ?? generateTaskId("monitor_ws");
  recordMonitorPlugin(i, s, taskRegistry);
  let monitorDelivery = createMonitorDelivery({
    description,
    agentId: T,
    taskRef: {
      id: i,
    },
    arm: e.quietLifecycle ? undefined : "ws",
    killTask: () => {
      if (!isSameMonitorSocket(i, m)) return false;
      stopMonitorWsTasks(i, taskRegistry, {
        quiet: true,
      });
      return true;
    },
  });
  let proxy = getWebSocketProxyUrl(url);
  let L = await checkWebSocketHost(url, {
    proxy,
    tls: getWebSocketTLSOptions(url),
  });
  let D = wi(e.headers ?? {}, (c, a) => a.toLowerCase() === "host");
  let m = new ws(L.url, protocols, {
    proxy,
    headers: {
      ...D,
      ...L.headers,
    },
    tls: L.tls,
  });
  let now = Date.now();
  let I;
  let R = () => isSameMonitorSocket(i, m);
  let now_2 = Date.now();
  m.on("open", () => {
    let c = taskRegistry.all()[i];
    if (c && c.status === "running" && R())
      try {
        e.onLifecycle?.("open", undefined, Date.now() - now);
      } catch {}
    let keepalive = e.keepalive;
    if (keepalive && c && c.status === "running" && R()) {
      for (let openFrame of keepalive.openFrames)
        try {
          m.send(openFrame);
        } catch {}
      now_2 = Date.now();
      let h = {
        lastAt: now_2,
      };
      I = setInterval(
        (y, _, k, ue, j, Y) => {
          let now = Date.now();
          if (k !== undefined && now - now_2 > k) {
            try {
              y.terminate();
            } catch {}
            return;
          }
          let G = j;
          try {
            G = ue?.() ?? j;
          } catch {}
          if (!(k !== undefined && now - now_2 > k - j * 2) && now - Y.lastAt < G - j / 2) return;
          Y.lastAt = now;
          for (let me of typeof _ === "function" ? _() : _)
            try {
              y.send(me);
            } catch {}
        },
        keepalive.intervalMs,
        m,
        typeof keepalive.frame === "string" ? [keepalive.frame] : keepalive.frame,
        keepalive.deadlineMs,
        keepalive.sendEveryMs,
        keepalive.intervalMs,
        h,
      );
      I.unref?.();
    }
    if (e.onSender && c && c.status === "running" && R())
      try {
        e.onSender(sendKeepalive(m));
      } catch {}
  });
  m.on("ping", () => {
    now_2 = Date.now();
  });
  m.on("message", (c, a) => {
    now_2 = Date.now();
    let h = taskRegistry.all()[i];
    if (!h || h.status !== "running" || !R()) return;
    let y = messageByteLength(c);
    if (y > MAX_WS_FRAME_BYTES) {
      enqueueMonitorEvent(
        description,
        `[Dropped ${y}-byte frame (exceeds ${MAX_WS_FRAME_BYTES}); closing]`,
        i,
        {
          isHousekeeping: true,
          agentId: T,
          turnAttribution: "none",
        },
      );
      stopMonitorWsTasks(i, taskRegistry, {
        quiet: true,
      });
      return;
    }
    if (a) {
      if (typeof e.transform === "function") return;
      monitorDelivery.onData(`[binary frame, ${y} bytes]
`);
      return;
    }
    let str = c.toString("utf8");
    if (typeof e.transform === "function") {
      let k;
      try {
        k = e.transform(str);
      } catch {
        k = null;
      }
      if (k === null) return;
      str = k;
    }
    monitorDelivery.onData(
      str +
        `
`,
    );
  });
  let z;
  m.on("unexpected-response", (c, a) => {
    let statusCode = a?.statusCode ?? 0;
    if (statusCode === 101) return;
    let headers = a?.headers ?? {};
    let _ = headers["cf-mitigated"] !== undefined;
    z = formatUpgradeRejection(statusCode, _);
    logForDebugging(
      `[callWs] upgrade rejected: status=${statusCode} cf-mitigated=${String(headers["cf-mitigated"])} cf-ray=${String(headers["cf-ray"])}`,
    );
    a?.resume?.();
    let k = taskRegistry.all()[i];
    if (!e.quietLifecycle && k?.status === "running" && R())
      enqueueMonitorEvent(description, `[WebSocket upgrade rejected: HTTP ${statusCode}]`, i, {
        isHousekeeping: true,
        agentId: T,
        turnAttribution: "none",
      });
    try {
      m.terminate();
    } catch {}
  });
  m.on("error", (c) => {
    clearInterval(I);
    try {
      e.onSenderClosed?.();
    } catch {}
    let a = taskRegistry.all()[i];
    if (!a || a.status !== "running" || !R()) return;
    logForDebugging(`[callWs] socket error: ${c.message}`);
    if (!e.quietLifecycle && z === undefined)
      enqueueMonitorEvent(description, `[WebSocket error: ${c.message}]`, i, {
        isHousekeeping: true,
        agentId: T,
        turnAttribution: "none",
      });
  });
  m.on("close", (c, a) => {
    clearInterval(I);
    monitorDelivery.flushAndClose();
    try {
      e.onSenderClosed?.();
    } catch {}
    let h = taskRegistry.all()[i];
    if (!h || h.status !== "running" || !R()) return;
    try {
      e.onLifecycle?.("close", z ?? String(c), Date.now() - now);
    } catch {}
    if (!e.quietLifecycle) {
      let y = a.length ? ` ${a.toString("utf8")}` : "";
      enqueueMonitorEvent(description, `[WebSocket closed: ${c}${y}]`, i, {
        isHousekeeping: true,
        agentId: T,
        turnAttribution: "none",
      });
    }
    stopMonitorWsTasks(i, taskRegistry, {
      quiet: true,
      connectionLost: true,
    });
  });
  let timeoutId = persistent
    ? undefined
    : setTimeout(
        (c, a, h, agentId, _, k) => {
          if (c.isClosed()) return;
          if (!k.quiet) {
            c.flush();
            if (c.isClosed()) return;
            enqueueMonitorEvent(a, monitorTimedOutMessage(k.timeoutMs, c.eventCount(), k.bounded), h, {
              isHousekeeping: true,
              agentId,
            });
          }
          stopMonitorWsTasks(h, _, {
            quiet: true,
          });
        },
        timeoutMs,
        monitorDelivery,
        description,
        i,
        T,
        taskRegistry,
        {
          timeoutMs,
          bounded: e.bounded === true,
          quiet: e.quietLifecycle,
        },
      );
  let U = {
    ...createTaskStateBase(i, "monitor_ws", description, toolUseId),
    type: "monitor_ws",
    status: "running",
    url,
    timeoutId,
    agentId: T,
    ...(e.ambient && {
      ambient: true,
    }),
    ...(e.autoReactArmed && {
      autoReactArmed: true,
    }),
    ...(e.autoReactSlug && {
      autoReactSlug: e.autoReactSlug,
    }),
    ...(e.frameLive && {
      frameLive: {
        ...e.frameLive,
        armedAt: Date.now(),
      },
    }),
  };
  taskRegistry.register(U);
  rememberMonitorSocket(i, m);
  addAgentKeepaliveReason(T, `monitor:${i}`, taskRegistry);
  if (e.ambient) {
    let timer = setTimeout(
      (a, h, y, _, k) => {
        if (a.readyState === 0 && isSameMonitorSocket(h, a)) {
          try {
            _.onLifecycle?.("close", HANDSHAKE_TIMEOUT, Date.now() - k);
          } catch {}
          stopMonitorWsTasks(h, y, {
            quiet: true,
            connectionLost: true,
          });
        }
      },
      e.handshakeDeadlineMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS,
      m,
      i,
      taskRegistry,
      e,
      now,
    );
    timer.unref?.();
    m.once("open", () => clearTimeout(timer));
    m.once("close", () => clearTimeout(timer));
  }
  return {
    data: {
      taskId: i,
      timeoutMs: persistent ? 0 : timeoutMs,
      persistent,
    },
  };
}
//@ chunk-b91jfdd4.js:7197-8187 placement
/**
 * 命令含控制字符时会隐藏真实内容，作为拒绝原因。
 */
var MONITOR_INPUT_DESCRIPTIONS =
  "Shell command or script. Each stdout line is an event; exit ends the watch.";
var CONTROL_CHARS_IN_COMMAND_REASON =
  "command contains control characters that would be hidden in the approval dialog";
var printableCommandSchema = () => string().refine(isAllPrintable, CONTROL_CHARS_IN_COMMAND_REASON);
var monitorWsInputSchema = () =>
  u({
    url: string()
      .refine(isAllPrintable, "url contains control characters that would be hidden in the approval dialog")
      .refine((e) => {
        try {
          let n = new URL(e);
          return (
            (n.protocol === "ws:" || n.protocol === "wss:") &&
            !n.username &&
            !n.password &&
            !/[\t\n\r]/.test(e) &&
            /^[\x00-\x7F]*$/.test(e)
          );
        } catch {
          return false;
        }
      }, "url must be a valid ASCII ws:// or wss:// URL with no userinfo or whitespace"),
    protocols: array(string().regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, "protocol must be an RFC 6455 token"))
      .refine((e) => new Set(e).size === e.length, "protocols must be unique")
      .optional(),
  }).describe(
    "WebSocket to open. Each text frame is an event; binary frames are reported as a placeholder line. Socket close ends the watch. Cannot be combined with command.",
  );
var MONITOR_DESCRIPTION_TEXT =
  "Short human-readable description of what you are monitoring (shown in notifications).";
//@ chunk-b91jfdd4.js:8187-8763 placement
/**
 * Monitor 输入字段（可选 persistent）：description、timeout_ms（默认值、上限）、persistent 说明随环境区分。
 */
function persistentMonitorInputFields() {
  return {
    description: string().describe(MONITOR_DESCRIPTION_TEXT),
    timeout_ms: E()
      .min(1000)
      .optional()
      .default(MONITOR_DEFAULT_TIMEOUT_MS)
      .describe(
        `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms, max ${MONITOR_ABSOLUTE_MAX_TIMEOUT_MS}ms. Ignored when persistent is true.`,
      ),
    persistent: M()
      .optional()
      .default(false)
      .describe(
        hasBackgroundBashStopAfterReply()
          ? `Run with no timeout until ${TASKSTOP}. In this session a monitor is likely stopped a few minutes after your reply, so persistent does not keep a watch running past your reply.`
          : "Run for the lifetime of the session (no timeout). Use for session-length watches like PR monitoring or log tails. Stop with TaskStop.",
      ),
  };
}
//@ chunk-b91jfdd4.js:8763-9075 placement
/**
 * Monitor 输入字段（无 persistent）：timeout_ms 有上限，超过上限会被截到上限并在到期时通知。
 */
function boundedMonitorInputFields() {
  let e = monitorMaxTimeoutMs();
  return {
    description: string().describe(MONITOR_DESCRIPTION_TEXT),
    timeout_ms: E()
      .min(1000)
      .max(MONITOR_ABSOLUTE_MAX_TIMEOUT_MS, `timeout_ms must be \u2264 ${MONITOR_ABSOLUTE_MAX_TIMEOUT_MS}`)
      .optional()
      .default(MONITOR_DEFAULT_TIMEOUT_MS)
      .describe(
        `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms. Deadlines above ${e}ms are capped to ${e}ms. You are notified at expiry and can re-arm.`,
      ),
  };
}
//@ chunk-b91jfdd4.js:9075-9147 placement
/**
 * timeout_ms 超过上限时的校验错误。
 */
var MONITOR_TIMEOUT_LIMIT_ERROR = {
  message: `timeout_ms must be \u2264 ${MONITOR_ABSOLUTE_MAX_TIMEOUT_MS}`,
  path: ["timeout_ms"],
};
//@ chunk-b91jfdd4.js:9147-9201 placement
/**
 * 超时是否合法（persistent 或不超过上限）。
 */
function isValidMonitorTimeout(e) {
  return e.persistent || e.timeout_ms <= MONITOR_ABSOLUTE_MAX_TIMEOUT_MS;
}
//@ chunk-b91jfdd4.js:9201-9243 placement
/**
 * 判断参数里恰好有一个为真。
 */
function exactlyOneSet(...e) {
  return count(e, Boolean) === 1;
}
//@ chunk-b91jfdd4.js:9243-9279 placement
/**
 * 会话允许命令级网络白名单时返回其输入字段，否则空对象。
 */
function allowedDomainsFieldsIfOffered() {
  return areCommandNetworkListsOffered_2() ? allowedDomainsInputSchema() : {};
}
//@ chunk-b91jfdd4.js:9279-9338 placement
/**
 * allowed_domains 只适用于命令 monitor 的提示。
 */
var ALLOWED_DOMAINS_COMMAND_ONLY = "allowed_domains applies only to a command monitor";
//@ chunk-b91jfdd4.js:9338-9396 placement
/**
 * 指定了命令，或没有网络白名单（两者不冲突）。
 */
function hasNoConflictingNetworkLists(e) {
  return e.command !== undefined || getCommandNetworkLists(e) === undefined;
}
//@ chunk-b91jfdd4.js:9396-9485 placement
/**
 * 把命令的网络白名单并入输入对象。
 */
function mergeCommandNetworkLists(e) {
  let n = commandNetworkListsInput(e);
  return n === undefined
    ? (e.command ?? "")
    : {
        command: e.command ?? "",
        ...n,
      };
}
//@ chunk-b91jfdd4.js:9485-9523 placement
/**
 * command 与 ws 必须恰好给一个的提示。
 */
var EXACTLY_ONE_SOURCE_MESSAGE = "exactly one of command or ws";
export {
  pickMonitorContext,
  runWebSocketMonitor,
  parseUpgradeRejection,
  MonitorWsPreconditionError,
  toWebSocketUrl,
  HANDSHAKE_TIMEOUT,
  printableCommandSchema,
  MONITOR_INPUT_DESCRIPTIONS,
  allowedDomainsFieldsIfOffered,
  monitorWsInputSchema,
  persistentMonitorInputFields,
  exactlyOneSet,
  EXACTLY_ONE_SOURCE_MESSAGE,
  hasNoConflictingNetworkLists,
  ALLOWED_DOMAINS_COMMAND_ONLY,
  isValidMonitorTimeout,
  MONITOR_TIMEOUT_LIMIT_ERROR,
  boundedMonitorInputFields,
  stripIpv6Brackets,
  mergeCommandNetworkLists,
};
