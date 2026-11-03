/**
 * bridge/deviceMcpServer.ts
 *
 * 设备桥 MCP 服务器：工具调用分发、跨会话拒绝、identify 工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zethn0a3.js (8)
 * attribution: placement 8
 */
import {
  JSONRPCMessageSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { Server } from "../../vendor/@modelcontextprotocol/sdk/dist/esm/server/index.js";
import { sessionIdBody } from "./sessionIdCompat.js";
import { BBn } from "../services/remoteTools/toolHostAttestation.js";
import { logForDebugging } from "../utils/debug.js";
import { toError } from "../utils/errors.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { unattestedSenderMessage } from "../services/remoteTools/hostRefusals.js";
import { getPlatform } from "../utils/platform.js";

//@ chunk-zethn0a3.js:3750-3797 placement
var CLAUDE_CODE_DEVICE = "claude-code-device",
  GET_DEVICE_INFO = "get_device_info";
/**
 * 从工具输入拆出 session_id，其余字段作为 toolArgs。
 */
//@ chunk-zethn0a3.js:3797-4007 placement = renderToolUseMessage (0.513)
function renderToolUseMessage(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return { sessionId: void 0, toolArgs: {} };
  let { session_id: session_id, trigger_id: trigger_id, ...s } = input;
  return {
    sessionId: typeof session_id === "string" && session_id.length > 0 ? session_id : void 0,
    toolArgs: s,
  };
}
//@ chunk-zethn0a3.js:4007-4040 placement
function A(e) {
  return JSONRPCMessageSchema.parse(e);
}
/**
 * 设备 MCP 服务器的工具调用分发；未知工具报错
 */
//@ chunk-zethn0a3.js:4040-4980 placement
function handleDeviceToolCall(e) {
  let o = 0,
    n = [],
    s = () => {
      if (o !== 0) return;
      let i = n;
      ((n = []), i.forEach((r) => r()));
    },
    l = new Server({ name: CLAUDE_CODE_DEVICE, version: e.version }, { capabilities: { tools: {} } });
  return (
    l.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...e.registry.definitions()] })),
    l.setRequestHandler(CallToolRequestSchema, async ({ params: { name: i, arguments: r } }, f) => {
      let d = e.registry.get(i);
      if (!d) return { content: [{ type: "text", text: `Unknown tool: ${i}` }], isError: !0 };
      let { sessionId: sessionId, toolArgs: toolArgs } = renderToolUseMessage(r);
      if (sessionId !== void 0 && sessionIdBody(sessionId) !== sessionIdBody(e.sessionId))
        return refuseCrossSessionDeviceCall(d, sessionId, e.sessionId);
      if (d.senderJudgedBy === "dispatch") {
        let u = BBn();
        if (u.heldBack) return refuseUntrustedDeviceToolCall(d, u.attestation);
      }
      o++;
      try {
        return await d.call(toolArgs, { sessionId: sessionId, signal: f.signal });
      } catch (error) {
        return (
          logForDebugging(`[deviceBridge] tool ${i} failed: ${toError(error).message}`),
          { content: [{ type: "text", text: `Tool ${i} failed: internal error` }], isError: !0 }
        );
      } finally {
        if ((o--, o === 0)) setTimeout(s, 0);
      }
    }),
    {
      server: l,
      inFlightCalls: () => o,
      whenIdle: () => {
        let promise = new Promise((r) => {
          n.push(r);
        });
        if (o === 0) setTimeout(s, 0);
        return promise;
      },
    }
  );
}
/**
 * 拒绝声明的会话与本设备所服务会话不一致的调用并上报 tengu_device_tool_refused
 */
//@ chunk-zethn0a3.js:4980-5715 placement
function refuseCrossSessionDeviceCall(e, o, n) {
  let s = e.definition.name;
  return (
    logForDebugging(
      `[deviceBridge] refused ${s}: call asserted for session ${jsonStringify(o.slice(0, 48))}, this device serves ${n}`,
    ),
    logEvent("tengu_device_tool_refused", { tool: e.analyticsName, reason: lit("session_mismatch") }),
    {
      content: [
        {
          type: "text",
          text: `${s} refused: the user's machine is currently connected on behalf of a different Claude Code cloud session (usually another session started from the same machine), so it cannot run device tools for this session and nothing was run. Tell the user, and continue with the tools in this cloud environment; if this session was also started with Claude Code on that machine, its device tools may work again once the other session ends. Do not retry in a loop.`,
        },
      ],
      isError: !0,
    }
  );
}
/**
 * 设备桥工具调用被拒：发送方不满足可信设备策略时记日志与 tengu_device_tool_refused 事件，返回 isError 的文本结果（含状态 status）。
 */
//@ chunk-zethn0a3.js:5715-6078 placement
function refuseUntrustedDeviceToolCall(tool, attestation) {
  let n = attestation?.status ?? "UNSPECIFIED";
  return (
    logForDebugging(
      `[deviceBridge] refused ${tool.definition.name}: its sender is held back under the trusted-device policy (${n})`,
    ),
    logEvent("tengu_device_tool_refused", { tool: tool.analyticsName, reason: lit("unattested_request") }),
    {
      content: [
        {
          type: "text",
          text: unattestedSenderMessage({
            targetName: "this machine",
            status: n,
            subtype: "remote_tool_call",
          }),
        },
      ],
      isError: !0,
    }
  );
}
//@ chunk-zethn0a3.js:6078-6155 placement
var T = "This machine is attached but does not run commands for this session.";
/**
 * 返回本设备运行环境信息（平台、架构）的 identify 工具定义
 */
//@ chunk-zethn0a3.js:6155-7024 placement
function DEVICE_IDENTIFY_TOOL(e) {
  let o = e.now ?? (() => new Date());
  return {
    definition: {
      name: GET_DEVICE_INFO,
      description:
        "Returns runtime environment details for this device (platform, architecture, Claude Code version, and device name). Call this to confirm the device connection is live." +
        (e.idle ? ` ${T}` : ""),
      inputSchema: { type: "object", properties: {} },
    },
    analyticsName: lit(GET_DEVICE_INFO),
    senderJudgedBy: {
      notJudged:
        "The bridge service's own identify probe, sent with no session. It takes no input, runs nothing and reads nothing here, and answers the name this machine dialed the bridge under plus platform, architecture, Claude Code version and the time. Refusing it would hide the machine from the bridge, not keep anything from a sender.",
    },
    call: async () => {
      let n = {
        platform: getPlatform(),
        arch: "x64",
        claudeCodeVersion: e.version,
        deviceName: e.getDeviceName(),
        timestamp: o().toISOString(),
      };
      return { content: [{ type: "text", text: jsonStringify(n, null, 2) }] };
    },
  };
}
