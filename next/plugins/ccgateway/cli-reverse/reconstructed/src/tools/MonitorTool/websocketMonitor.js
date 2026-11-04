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
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  monitorTimedOutMessage,
  MONITOR_DEFAULT_TIMEOUT_MS,
  MONITOR_ABSOLUTE_MAX_TIMEOUT_MS,
  monitorMaxTimeoutMs,
} from "./prompt.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import {
  stringSchema,
  objectSchema,
  array,
  numberSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
function toWebSocketUrl(parsedUrl) {
  switch (parsedUrl.protocol) {
    case "wss:":
    case "https:":
      parsedUrl.protocol = "wss:";
      break;
    case "ws:":
    case "http:":
      parsedUrl.protocol = "ws:";
      break;
    default:
      throw new MonitorWsPreconditionError(`unsupported socket base scheme ${parsedUrl.protocol}`);
  }
  return parsedUrl.toString();
}
//@ chunk-b91jfdd4.js:1816-1862 placement
/**
 * 去掉主机名两端的方括号（IPv6 字面量）。
 */
function stripIpv6Brackets(hostname) {
  return hostname.replace(/^\[|\]$/g, "");
}
//@ chunk-b91jfdd4.js:1862-2557 placement
async function checkWebSocketHost(url, options) {
  let parsedUrl = new URL(url);
  let hostname = stripIpv6Brackets(parsedUrl.hostname);
  if (isIP(hostname)) {
    if (isBlockedAddress(hostname))
      throw new MonitorWsPreconditionError(
        `${hostname} is in a private, link-local, or cloud-metadata range`,
      );
    return {
      url,
      tls: options.tls,
    };
  }
  let addresses;
  try {
    addresses = await lookup(hostname, {
      all: true,
    });
  } catch (error) {
    throw new MonitorWsPreconditionError(`could not resolve ${hostname}: ${toError(error).message}`);
  }
  if (addresses.length === 0) throw new MonitorWsPreconditionError(`could not resolve ${hostname}`);
  for (let { address } of addresses)
    if (isBlockedAddress(address))
      throw new MonitorWsPreconditionError(
        `${hostname} resolves to ${address}, which is in a private, link-local, or cloud-metadata range`,
      );
  if (options.proxy)
    return {
      url,
      tls: options.tls,
    };
  if (parsedUrl.protocol === "wss:")
    return {
      url,
      tls: options.tls,
    };
  let chosenAddress = addresses.find((addressEntry) => addressEntry.family === 4) ?? addresses[0];
  let Host = parsedUrl.host;
  parsedUrl.hostname = chosenAddress.family === 6 ? `[${chosenAddress.address}]` : chosenAddress.address;
  return {
    url: parsedUrl.toString(),
    headers: {
      Host,
    },
    tls: options.tls,
  };
}
//@ chunk-b91jfdd4.js:2557-2594 placement
/**
 * WebSocket 握手的默认超时（30 秒）。
 */
var DEFAULT_HANDSHAKE_TIMEOUT_MS = 30000;
var HANDSHAKE_TIMEOUT = "handshake_timeout";
//@ chunk-b91jfdd4.js:2594-2709 placement
function formatUpgradeRejection(statusCode, cfMitigated) {
  let status = Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : 0;
  return `${cfMitigated ? "cf_mitigated" : "upgrade_rejected"}_${status}`;
}
//@ chunk-b91jfdd4.js:2709-2875 placement
/**
 * 解析 "cf_mitigated_NNN" 或 "upgrade_rejected_NNN" 形式的拒绝原因，返回状态码与是否 Cloudflare 拦截。
 */
function parseUpgradeRejection(reasonCode) {
  let match = /^(cf_mitigated|upgrade_rejected)_(\d{1,3})$/.exec(reasonCode ?? "");
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
function messageByteLength(data) {
  if (Array.isArray(data)) return data.reduce((acc, chunk) => acc + chunk.length, 0);
  if (data instanceof ArrayBuffer) return data.byteLength;
  return data.length;
}
//@ chunk-b91jfdd4.js:3025-3223 placement
/**
 * 从工具上下文中挑出 Monitor 需要的字段（任务表、工具调用 id、代理 id、存储、凭证、钩子调用者）。
 */
function pickMonitorContext(toolContext) {
  return {
    taskRegistry: toolContext.taskRegistry,
    toolUseId: toolContext.toolUseId,
    agentId: toolContext.agentId,
    storageV5: toolContext.storageV5,
    credentials: toolContext.credentials,
    hookCaller: toolContext.hookCaller,
    hookServesModel: toolContext.hookServesModel,
  };
}
//@ chunk-b91jfdd4.js:3223-3298 placement = sendKeepalive (1)
function sendKeepalive(ws_2) {
  return (frame) => {
    if (ws_2.readyState === ws.OPEN)
      try {
        ws_2.send(frame);
      } catch {}
  };
}
//@ chunk-b91jfdd4.js:3298-7197 placement
/**
 * 用 WebSocket 订阅事件流作为 Monitor 事件源
 */
async function runWebSocketMonitor(input, context) {
  let monitorContext = pickMonitorContext(context);
  let { description, timeout_ms: timeoutMs, persistent } = input;
  let { url, protocols } = input.ws;
  guardTestWebSocket(url);
  let { toolUseId, taskRegistry } = monitorContext;
  let agentId = currentAgentId(monitorContext);
  let taskId = input.reuseTaskId ?? generateTaskId("monitor_ws");
  recordMonitorPlugin(taskId, monitorContext, taskRegistry);
  let monitorDelivery = createMonitorDelivery({
    description,
    agentId,
    taskRef: {
      id: taskId,
    },
    arm: input.quietLifecycle ? undefined : "ws",
    killTask: () => {
      if (!isSameMonitorSocket(taskId, socket)) return false;
      stopMonitorWsTasks(taskId, taskRegistry, {
        quiet: true,
      });
      return true;
    },
  });
  let proxy = getWebSocketProxyUrl(url);
  let connectionTarget = await checkWebSocketHost(url, {
    proxy,
    tls: getWebSocketTLSOptions(url),
  });
  let headersWithoutHost = import_reject(
    input.headers ?? {},
    (headerValue, headerName) => headerName.toLowerCase() === "host",
  );
  let socket = new ws(connectionTarget.url, protocols, {
    proxy,
    headers: {
      ...headersWithoutHost,
      ...connectionTarget.headers,
    },
    tls: connectionTarget.tls,
  });
  let now = Date.now();
  let keepaliveTimer;
  let isCurrentSocket = () => isSameMonitorSocket(taskId, socket);
  let now_2 = Date.now();
  socket.on("open", () => {
    let task = taskRegistry.all()[taskId];
    if (task && task.status === "running" && isCurrentSocket())
      try {
        input.onLifecycle?.("open", undefined, Date.now() - now);
      } catch {}
    let keepalive = input.keepalive;
    if (keepalive && task && task.status === "running" && isCurrentSocket()) {
      for (let openFrame of keepalive.openFrames)
        try {
          socket.send(openFrame);
        } catch {}
      now_2 = Date.now();
      let keepaliveState = {
        lastAt: now_2,
      };
      keepaliveTimer = setInterval(
        (ws, frames, deadlineMs, sendEveryMs, intervalMs, state) => {
          let now = Date.now();
          if (deadlineMs !== undefined && now - now_2 > deadlineMs) {
            try {
              ws.terminate();
            } catch {}
            return;
          }
          let sendInterval = intervalMs;
          try {
            sendInterval = sendEveryMs?.() ?? intervalMs;
          } catch {}
          if (
            !(deadlineMs !== undefined && now - now_2 > deadlineMs - intervalMs * 2) &&
            now - state.lastAt < sendInterval - intervalMs / 2
          )
            return;
          state.lastAt = now;
          for (let keepaliveFrame of typeof frames === "function" ? frames() : frames)
            try {
              ws.send(keepaliveFrame);
            } catch {}
        },
        keepalive.intervalMs,
        socket,
        typeof keepalive.frame === "string" ? [keepalive.frame] : keepalive.frame,
        keepalive.deadlineMs,
        keepalive.sendEveryMs,
        keepalive.intervalMs,
        keepaliveState,
      );
      keepaliveTimer.unref?.();
    }
    if (input.onSender && task && task.status === "running" && isCurrentSocket())
      try {
        input.onSender(sendKeepalive(socket));
      } catch {}
  });
  socket.on("ping", () => {
    now_2 = Date.now();
  });
  socket.on("message", (data, isBinary) => {
    now_2 = Date.now();
    let task = taskRegistry.all()[taskId];
    if (!task || task.status !== "running" || !isCurrentSocket()) return;
    let frameBytes = messageByteLength(data);
    if (frameBytes > MAX_WS_FRAME_BYTES) {
      enqueueMonitorEvent(
        description,
        `[Dropped ${frameBytes}-byte frame (exceeds ${MAX_WS_FRAME_BYTES}); closing]`,
        taskId,
        {
          isHousekeeping: true,
          agentId,
          turnAttribution: "none",
        },
      );
      stopMonitorWsTasks(taskId, taskRegistry, {
        quiet: true,
      });
      return;
    }
    if (isBinary) {
      if (typeof input.transform === "function") return;
      monitorDelivery.onData(`[binary frame, ${frameBytes} bytes]
`);
      return;
    }
    let str = data.toString("utf8");
    if (typeof input.transform === "function") {
      let transformed;
      try {
        transformed = input.transform(str);
      } catch {
        transformed = null;
      }
      if (transformed === null) return;
      str = transformed;
    }
    monitorDelivery.onData(
      str +
        `
`,
    );
  });
  let upgradeRejection;
  socket.on("unexpected-response", (request, response) => {
    let statusCode = response?.statusCode ?? 0;
    if (statusCode === 101) return;
    let headers = response?.headers ?? {};
    let isCfMitigated = headers["cf-mitigated"] !== undefined;
    upgradeRejection = formatUpgradeRejection(statusCode, isCfMitigated);
    logForDebugging(
      `[callWs] upgrade rejected: status=${statusCode} cf-mitigated=${String(headers["cf-mitigated"])} cf-ray=${String(headers["cf-ray"])}`,
    );
    response?.resume?.();
    let task = taskRegistry.all()[taskId];
    if (!input.quietLifecycle && task?.status === "running" && isCurrentSocket())
      enqueueMonitorEvent(description, `[WebSocket upgrade rejected: HTTP ${statusCode}]`, taskId, {
        isHousekeeping: true,
        agentId,
        turnAttribution: "none",
      });
    try {
      socket.terminate();
    } catch {}
  });
  socket.on("error", (error) => {
    clearInterval(keepaliveTimer);
    try {
      input.onSenderClosed?.();
    } catch {}
    let task = taskRegistry.all()[taskId];
    if (!task || task.status !== "running" || !isCurrentSocket()) return;
    logForDebugging(`[callWs] socket error: ${error.message}`);
    if (!input.quietLifecycle && upgradeRejection === undefined)
      enqueueMonitorEvent(description, `[WebSocket error: ${error.message}]`, taskId, {
        isHousekeeping: true,
        agentId,
        turnAttribution: "none",
      });
  });
  socket.on("close", (code, reasonBuffer) => {
    clearInterval(keepaliveTimer);
    monitorDelivery.flushAndClose();
    try {
      input.onSenderClosed?.();
    } catch {}
    let task = taskRegistry.all()[taskId];
    if (!task || task.status !== "running" || !isCurrentSocket()) return;
    try {
      input.onLifecycle?.("close", upgradeRejection ?? String(code), Date.now() - now);
    } catch {}
    if (!input.quietLifecycle) {
      let reasonSuffix = reasonBuffer.length ? ` ${reasonBuffer.toString("utf8")}` : "";
      enqueueMonitorEvent(description, `[WebSocket closed: ${code}${reasonSuffix}]`, taskId, {
        isHousekeeping: true,
        agentId,
        turnAttribution: "none",
      });
    }
    stopMonitorWsTasks(taskId, taskRegistry, {
      quiet: true,
      connectionLost: true,
    });
  });
  let timeoutId = persistent
    ? undefined
    : setTimeout(
        (delivery, taskDescription, id, agentId, registry, timeoutInfo) => {
          if (delivery.isClosed()) return;
          if (!timeoutInfo.quiet) {
            delivery.flush();
            if (delivery.isClosed()) return;
            enqueueMonitorEvent(
              taskDescription,
              monitorTimedOutMessage(timeoutInfo.timeoutMs, delivery.eventCount(), timeoutInfo.bounded),
              id,
              {
                isHousekeeping: true,
                agentId,
              },
            );
          }
          stopMonitorWsTasks(id, registry, {
            quiet: true,
          });
        },
        timeoutMs,
        monitorDelivery,
        description,
        taskId,
        agentId,
        taskRegistry,
        {
          timeoutMs,
          bounded: input.bounded === true,
          quiet: input.quietLifecycle,
        },
      );
  let taskState = {
    ...createTaskStateBase(taskId, "monitor_ws", description, toolUseId),
    type: "monitor_ws",
    status: "running",
    url,
    timeoutId,
    agentId,
    ...(input.ambient && {
      ambient: true,
    }),
    ...(input.autoReactArmed && {
      autoReactArmed: true,
    }),
    ...(input.autoReactSlug && {
      autoReactSlug: input.autoReactSlug,
    }),
    ...(input.frameLive && {
      frameLive: {
        ...input.frameLive,
        armedAt: Date.now(),
      },
    }),
  };
  taskRegistry.register(taskState);
  rememberMonitorSocket(taskId, socket);
  addAgentKeepaliveReason(agentId, `monitor:${taskId}`, taskRegistry);
  if (input.ambient) {
    let timer = setTimeout(
      (ws, handle, registry, lifecycle, startedAt) => {
        if (ws.readyState === 0 && isSameMonitorSocket(handle, ws)) {
          try {
            lifecycle.onLifecycle?.("close", HANDSHAKE_TIMEOUT, Date.now() - startedAt);
          } catch {}
          stopMonitorWsTasks(handle, registry, {
            quiet: true,
            connectionLost: true,
          });
        }
      },
      input.handshakeDeadlineMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS,
      socket,
      taskId,
      taskRegistry,
      input,
      now,
    );
    timer.unref?.();
    socket.once("open", () => clearTimeout(timer));
    socket.once("close", () => clearTimeout(timer));
  }
  return {
    data: {
      taskId,
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
var printableCommandSchema = () => stringSchema().refine(isAllPrintable, CONTROL_CHARS_IN_COMMAND_REASON);
var monitorWsInputSchema = () =>
  objectSchema({
    url: stringSchema()
      .refine(isAllPrintable, "url contains control characters that would be hidden in the approval dialog")
      .refine((url) => {
        try {
          let parsedUrl = new URL(url);
          return (
            (parsedUrl.protocol === "ws:" || parsedUrl.protocol === "wss:") &&
            !parsedUrl.username &&
            !parsedUrl.password &&
            !/[\t\n\r]/.test(url) &&
            /^[\x00-\x7F]*$/.test(url)
          );
        } catch {
          return false;
        }
      }, "url must be a valid ASCII ws:// or wss:// URL with no userinfo or whitespace"),
    protocols: array(
      stringSchema().regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, "protocol must be an RFC 6455 token"),
    )
      .refine(
        (protocolList) => new Set(protocolList).size === protocolList.length,
        "protocols must be unique",
      )
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
    description: stringSchema().describe(MONITOR_DESCRIPTION_TEXT),
    timeout_ms: numberSchema()
      .min(1000)
      .optional()
      .default(MONITOR_DEFAULT_TIMEOUT_MS)
      .describe(
        `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms, max ${MONITOR_ABSOLUTE_MAX_TIMEOUT_MS}ms. Ignored when persistent is true.`,
      ),
    persistent: booleanSchema()
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
  let maxTimeoutMs = monitorMaxTimeoutMs();
  return {
    description: stringSchema().describe(MONITOR_DESCRIPTION_TEXT),
    timeout_ms: numberSchema()
      .min(1000)
      .max(MONITOR_ABSOLUTE_MAX_TIMEOUT_MS, `timeout_ms must be \u2264 ${MONITOR_ABSOLUTE_MAX_TIMEOUT_MS}`)
      .optional()
      .default(MONITOR_DEFAULT_TIMEOUT_MS)
      .describe(
        `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms. Deadlines above ${maxTimeoutMs}ms are capped to ${maxTimeoutMs}ms. You are notified at expiry and can re-arm.`,
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
function isValidMonitorTimeout(input) {
  return input.persistent || input.timeout_ms <= MONITOR_ABSOLUTE_MAX_TIMEOUT_MS;
}
//@ chunk-b91jfdd4.js:9201-9243 placement
/**
 * 判断参数里恰好有一个为真。
 */
function exactlyOneSet(...values) {
  return count(values, Boolean) === 1;
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
function hasNoConflictingNetworkLists(input) {
  return input.command !== undefined || getCommandNetworkLists(input) === undefined;
}
//@ chunk-b91jfdd4.js:9396-9485 placement
/**
 * 把命令的网络白名单并入输入对象。
 */
function mergeCommandNetworkLists(input) {
  let networkLists = commandNetworkListsInput(input);
  return networkLists === undefined
    ? (input.command ?? "")
    : {
        command: input.command ?? "",
        ...networkLists,
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
