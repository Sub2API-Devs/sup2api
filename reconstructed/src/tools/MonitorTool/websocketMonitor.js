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
import { isIP, isIP as isIP_2 } from "net";
import { lookup } from "dns/promises";
import ws from "ws";
import { isBlockedAddress } from "../../utils/hooks/ssrfGuard.js";
import { toError } from "../../utils/errors.js";
import { guardTestWebSocket } from "../../utils/testNetworkGuard.js";
import { aie } from "../../services/remoteTools/backgroundCommands.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import {
  recordMonitorPlugin,
  createMonitorDelivery,
  enqueueMonitorEvent,
} from "../../tasks/MonitorTask/monitorDelivery.js";
import { LLr, stopMonitorWsTasks, jBs } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { getWebSocketProxyUrl } from "../../utils/proxy.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { monitorTimedOutMessage, MONITOR_DEFAULT_TIMEOUT_MS, jbn, monitorMaxTimeoutMs } from "./prompt.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { o, u, A, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { T_ } from "../AgentTool/backgroundGates.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { count } from "../../utils/collections.js";
import {
  areCommandNetworkListsOffered,
  allowedDomainsInputSchema,
  getCommandNetworkLists,
  Tjt,
} from "../BashTool/sandboxNetwork.js";

//@ chunk-b91jfdd4.js:1510-1598 placement
class MonitorWsPreconditionError extends Error {
  constructor(e) {
    super(e);
    this.name = "MonitorWsPreconditionError";
  }
}
/**
 * 把 http(s)/ws(s) 地址规范为 ws:/wss: 协议，其他协议抛前置条件错误。
 */
//@ chunk-b91jfdd4.js:1598-1816 placement
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
function J(e) {
  return e.replace(/^\[|\]$/g, "");
}
//@ chunk-b91jfdd4.js:1862-2557 placement
async function checkWebSocketHost(e, n) {
  let s = new URL(e),
    r = J(s.hostname);
  if (isIP_2(r)) {
    if (isBlockedAddress(r))
      throw new MonitorWsPreconditionError(`${r} is in a private, link-local, or cloud-metadata range`);
    return { url: e, tls: n.tls };
  }
  let d;
  try {
    d = await lookup(r, { all: !0 });
  } catch (error) {
    throw new MonitorWsPreconditionError(`could not resolve ${r}: ${toError(error).message}`);
  }
  if (d.length === 0) throw new MonitorWsPreconditionError(`could not resolve ${r}`);
  for (let { address: address } of d)
    if (isBlockedAddress(address))
      throw new MonitorWsPreconditionError(
        `${r} resolves to ${address}, which is in a private, link-local, or cloud-metadata range`,
      );
  if (n.proxy) return { url: e, tls: n.tls };
  if (s.protocol === "wss:") return { url: e, tls: n.tls };
  let g = d.find((v) => v.family === 4) ?? d[0],
    host = s.host;
  return (
    (s.hostname = g.family === 6 ? `[${g.address}]` : g.address),
    { url: s.toString(), headers: { Host: host }, tls: n.tls }
  );
}
//@ chunk-b91jfdd4.js:2557-2594 placement
var ge = 30000,
  HANDSHAKE_TIMEOUT = "handshake_timeout";
//@ chunk-b91jfdd4.js:2594-2709 placement
function formatUpgradeRejection(e, n) {
  let s = Number.isInteger(e) && e >= 100 && e <= 599 ? e : 0;
  return `${n ? "cf_mitigated" : "upgrade_rejected"}_${s}`;
}
/**
 * 解析 "cf_mitigated_NNN" 或 "upgrade_rejected_NNN" 形式的拒绝原因，返回状态码与是否 Cloudflare 拦截。
 */
//@ chunk-b91jfdd4.js:2709-2875 placement
function parseUpgradeRejection(e) {
  let match = /^(cf_mitigated|upgrade_rejected)_(\d{1,3})$/.exec(e ?? "");
  if (match === null) return null;
  return { status: Number(match[2]), cfMitigated: match[1] === "cf_mitigated" };
}
//@ chunk-b91jfdd4.js:2875-2889 placement
var Z = 1048576;
//@ chunk-b91jfdd4.js:2889-3025 placement
function messageByteLength(e) {
  if (Array.isArray(e)) return e.reduce((n, s) => n + s.length, 0);
  if (e instanceof ArrayBuffer) return e.byteLength;
  return e.length;
}
/**
 * 从工具上下文中挑出 Monitor 需要的字段（任务表、工具调用 id、代理 id、存储、凭证、钩子调用者）。
 */
//@ chunk-b91jfdd4.js:3025-3223 placement
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
/**
 * 用 WebSocket 订阅事件流作为 Monitor 事件源
 */
//@ chunk-b91jfdd4.js:3298-7197 placement
async function runWebSocketMonitor(e, n) {
  let s = pickMonitorContext(n),
    { description: description, timeout_ms: timeout_ms, persistent: persistent } = e,
    { url: url, protocols: protocols } = e.ws;
  guardTestWebSocket(url);
  let { toolUseId: toolUseId, taskRegistry: taskRegistry } = s,
    T = aie(s),
    i = e.reuseTaskId ?? generateTaskId("monitor_ws");
  recordMonitorPlugin(i, s, taskRegistry);
  let O = createMonitorDelivery({
      description: description,
      agentId: T,
      taskRef: { id: i },
      arm: e.quietLifecycle ? void 0 : "ws",
      killTask: () => {
        if (!LLr(i, m)) return !1;
        return (stopMonitorWsTasks(i, taskRegistry, { quiet: !0 }), !0);
      },
    }),
    P = getWebSocketProxyUrl(url),
    L = await checkWebSocketHost(url, { proxy: P, tls: getWebSocketTLSOptions(url) }),
    D = wi(e.headers ?? {}, (c, a) => a.toLowerCase() === "host"),
    m = new ws(L.url, protocols, { proxy: P, headers: { ...D, ...L.headers }, tls: L.tls }),
    now = Date.now(),
    I,
    R = () => LLr(i, m),
    now_2 = Date.now();
  (m.on("open", () => {
    let c = taskRegistry.all()[i];
    if (c && c.status === "running" && R())
      try {
        e.onLifecycle?.("open", void 0, Date.now() - now);
      } catch {}
    let keepalive = e.keepalive;
    if (keepalive && c && c.status === "running" && R()) {
      for (let openFrame of keepalive.openFrames)
        try {
          m.send(openFrame);
        } catch {}
      now_2 = Date.now();
      let h = { lastAt: now_2 };
      ((I = setInterval(
        (y, _, k, ue, j, Y) => {
          let now = Date.now();
          if (k !== void 0 && now - now_2 > k) {
            try {
              y.terminate();
            } catch {}
            return;
          }
          let G = j;
          try {
            G = ue?.() ?? j;
          } catch {}
          if (!(k !== void 0 && now - now_2 > k - j * 2) && now - Y.lastAt < G - j / 2) return;
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
      )),
        I.unref?.());
    }
    if (e.onSender && c && c.status === "running" && R())
      try {
        e.onSender(sendKeepalive(m));
      } catch {}
  }),
    m.on("ping", () => {
      now_2 = Date.now();
    }),
    m.on("message", (c, a) => {
      now_2 = Date.now();
      let h = taskRegistry.all()[i];
      if (!h || h.status !== "running" || !R()) return;
      let y = messageByteLength(c);
      if (y > Z) {
        (enqueueMonitorEvent(description, `[Dropped ${y}-byte frame (exceeds ${Z}); closing]`, i, {
          isHousekeeping: !0,
          agentId: T,
          turnAttribution: "none",
        }),
          stopMonitorWsTasks(i, taskRegistry, { quiet: !0 }));
        return;
      }
      if (a) {
        if (typeof e.transform === "function") return;
        O.onData(`[binary frame, ${y} bytes]
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
      O.onData(
        str +
          `
`,
      );
    }));
  let z;
  (m.on("unexpected-response", (c, a) => {
    let h = a?.statusCode ?? 0;
    if (h === 101) return;
    let y = a?.headers ?? {},
      _ = y["cf-mitigated"] !== void 0;
    ((z = formatUpgradeRejection(h, _)),
      logForDebugging(
        `[callWs] upgrade rejected: status=${h} cf-mitigated=${String(y["cf-mitigated"])} cf-ray=${String(y["cf-ray"])}`,
      ),
      a?.resume?.());
    let k = taskRegistry.all()[i];
    if (!e.quietLifecycle && k?.status === "running" && R())
      enqueueMonitorEvent(description, `[WebSocket upgrade rejected: HTTP ${h}]`, i, {
        isHousekeeping: !0,
        agentId: T,
        turnAttribution: "none",
      });
    try {
      m.terminate();
    } catch {}
  }),
    m.on("error", (c) => {
      clearInterval(I);
      try {
        e.onSenderClosed?.();
      } catch {}
      let a = taskRegistry.all()[i];
      if (!a || a.status !== "running" || !R()) return;
      if ((logForDebugging(`[callWs] socket error: ${c.message}`), !e.quietLifecycle && z === void 0))
        enqueueMonitorEvent(description, `[WebSocket error: ${c.message}]`, i, {
          isHousekeeping: !0,
          agentId: T,
          turnAttribution: "none",
        });
    }),
    m.on("close", (c, a) => {
      (clearInterval(I), O.flushAndClose());
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
          isHousekeeping: !0,
          agentId: T,
          turnAttribution: "none",
        });
      }
      stopMonitorWsTasks(i, taskRegistry, { quiet: !0, connectionLost: !0 });
    }));
  let q = persistent
      ? void 0
      : setTimeout(
          (c, a, h, y, _, k) => {
            if (c.isClosed()) return;
            if (!k.quiet) {
              if ((c.flush(), c.isClosed())) return;
              enqueueMonitorEvent(a, monitorTimedOutMessage(k.timeoutMs, c.eventCount(), k.bounded), h, {
                isHousekeeping: !0,
                agentId: y,
              });
            }
            stopMonitorWsTasks(h, _, { quiet: !0 });
          },
          timeout_ms,
          O,
          description,
          i,
          T,
          taskRegistry,
          { timeoutMs: timeout_ms, bounded: e.bounded === !0, quiet: e.quietLifecycle },
        ),
    U = {
      ...createTaskStateBase(i, "monitor_ws", description, toolUseId),
      type: "monitor_ws",
      status: "running",
      url: url,
      timeoutId: q,
      agentId: T,
      ...(e.ambient && { ambient: !0 }),
      ...(e.autoReactArmed && { autoReactArmed: !0 }),
      ...(e.autoReactSlug && { autoReactSlug: e.autoReactSlug }),
      ...(e.frameLive && { frameLive: { ...e.frameLive, armedAt: Date.now() } }),
    };
  if (
    (taskRegistry.register(U), jBs(i, m), addAgentKeepaliveReason(T, `monitor:${i}`, taskRegistry), e.ambient)
  ) {
    let c = setTimeout(
      (a, h, y, _, k) => {
        if (a.readyState === 0 && LLr(h, a)) {
          try {
            _.onLifecycle?.("close", HANDSHAKE_TIMEOUT, Date.now() - k);
          } catch {}
          stopMonitorWsTasks(h, y, { quiet: !0, connectionLost: !0 });
        }
      },
      e.handshakeDeadlineMs ?? ge,
      m,
      i,
      taskRegistry,
      e,
      now,
    );
    (c.unref?.(), m.once("open", () => clearTimeout(c)), m.once("close", () => clearTimeout(c)));
  }
  return { data: { taskId: i, timeoutMs: persistent ? 0 : timeout_ms, persistent: persistent } };
}
//@ chunk-b91jfdd4.js:7197-8187 placement
var MONITOR_INPUT_DESCRIPTIONS =
    "Shell command or script. Each stdout line is an event; exit ends the watch.",
  ke = "command contains control characters that would be hidden in the approval dialog",
  te = () => o().refine(isAllPrintable, ke),
  we = () =>
    u({
      url: o()
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
            return !1;
          }
        }, "url must be a valid ASCII ws:// or wss:// URL with no userinfo or whitespace"),
      protocols: A(o().regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, "protocol must be an RFC 6455 token"))
        .refine((e) => new Set(e).size === e.length, "protocols must be unique")
        .optional(),
    }).describe(
      "WebSocket to open. Each text frame is an event; binary frames are reported as a placeholder line. Socket close ends the watch. Cannot be combined with command.",
    ),
  oe = "Short human-readable description of what you are monitoring (shown in notifications).";
/**
 * Monitor 输入字段（可选 persistent）：description、timeout_ms（默认值、上限）、persistent 说明随环境区分。
 */
//@ chunk-b91jfdd4.js:8187-8763 placement
function persistentMonitorInputFields() {
  return {
    description: o().describe(oe),
    timeout_ms: E()
      .min(1000)
      .optional()
      .default(MONITOR_DEFAULT_TIMEOUT_MS)
      .describe(
        `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms, max ${jbn}ms. Ignored when persistent is true.`,
      ),
    persistent: M()
      .optional()
      .default(!1)
      .describe(
        T_()
          ? `Run with no timeout until ${TASKSTOP}. In this session a monitor is likely stopped a few minutes after your reply, so persistent does not keep a watch running past your reply.`
          : "Run for the lifetime of the session (no timeout). Use for session-length watches like PR monitoring or log tails. Stop with TaskStop.",
      ),
  };
}
/**
 * Monitor 输入字段（无 persistent）：timeout_ms 有上限，超过上限会被截到上限并在到期时通知。
 */
//@ chunk-b91jfdd4.js:8763-9075 placement
function boundedMonitorInputFields() {
  let e = monitorMaxTimeoutMs();
  return {
    description: o().describe(oe),
    timeout_ms: E()
      .min(1000)
      .max(jbn, `timeout_ms must be \u2264 ${jbn}`)
      .optional()
      .default(MONITOR_DEFAULT_TIMEOUT_MS)
      .describe(
        `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms. Deadlines above ${e}ms are capped to ${e}ms. You are notified at expiry and can re-arm.`,
      ),
  };
}
//@ chunk-b91jfdd4.js:9075-9147 placement
var Ce = { message: `timeout_ms must be \u2264 ${jbn}`, path: ["timeout_ms"] };
//@ chunk-b91jfdd4.js:9147-9201 placement
function Te(e) {
  return e.persistent || e.timeout_ms <= jbn;
}
//@ chunk-b91jfdd4.js:9201-9243 placement
function re(...e) {
  return count(e, Boolean) === 1;
}
//@ chunk-b91jfdd4.js:9243-9279 placement
function Ie() {
  return areCommandNetworkListsOffered() ? allowedDomainsInputSchema() : {};
}
//@ chunk-b91jfdd4.js:9279-9338 placement
var se = "allowed_domains applies only to a command monitor";
//@ chunk-b91jfdd4.js:9338-9396 placement
function ie(e) {
  return e.command !== void 0 || getCommandNetworkLists(e) === void 0;
}
//@ chunk-b91jfdd4.js:9396-9485 placement
function _e(e) {
  let n = Tjt(e);
  return n === void 0 ? (e.command ?? "") : { command: e.command ?? "", ...n };
}
//@ chunk-b91jfdd4.js:9485-9523 placement
var le = "exactly one of command or ws";

export {
  pickMonitorContext,
  runWebSocketMonitor,
  parseUpgradeRejection,
  MonitorWsPreconditionError,
  toWebSocketUrl,
  HANDSHAKE_TIMEOUT,
  te,
  MONITOR_INPUT_DESCRIPTIONS,
  Ie,
  we,
  persistentMonitorInputFields,
  re,
  le,
  ie,
  se,
  Te,
  Ce,
  boundedMonitorInputFields,
  J,
  _e,
};
