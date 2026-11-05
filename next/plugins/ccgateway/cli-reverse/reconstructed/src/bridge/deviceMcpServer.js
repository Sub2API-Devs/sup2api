/**
 * bridge/deviceMcpServer.ts
 *
 * 设备桥 MCP 服务器：工具调用分发、跨会话拒绝、identify 工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m4y440zq.js (8)
 * attribution: placement 8
 */
import {
  JSONRPCMessageSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { Server } from "../../vendor/@modelcontextprotocol/sdk/dist/esm/server/index.js";
import { sessionIdBody } from "./sessionIdCompat.js";
import { unknownAttestationResult } from "../services/remoteTools/toolHostAttestation.js";
import { logForDebugging } from "../utils/debug.js";
import { toError } from "../utils/errors.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { unattestedSenderMessage } from "../services/remoteTools/hostRefusals.js";
import { getPlatform } from "../utils/platform.js";

//@ chunk-m4y440zq.js:4059-4106 placement
var CLAUDE_CODE_DEVICE = "claude-code-device";
var GET_DEVICE_INFO = "get_device_info";
//@ chunk-m4y440zq.js:4106-4316 placement (2.1.88 match: renderToolUseMessage, 0.513)
/**
 * 从工具输入拆出 session_id，其余字段作为 toolArgs。
 */
function renderToolUseMessage(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return {
      sessionId: undefined,
      toolArgs: {},
    };
  let { session_id: sessionId, trigger_id: triggerId, ...toolArgs } = input;
  return {
    sessionId: typeof sessionId === "string" && sessionId.length > 0 ? sessionId : undefined,
    toolArgs,
  };
}
//@ chunk-m4y440zq.js:4316-4349 placement
function parseJsonRpcMessage(message) {
  return JSONRPCMessageSchema.parse(message);
}
//@ chunk-m4y440zq.js:4349-5290 placement
/**
 * 设备 MCP 服务器的工具调用分发；未知工具报错
 */
function handleDeviceToolCall(bridge) {
  let inFlight = 0;
  let idleResolvers = [];
  let flushIdleWaiters = () => {
    if (inFlight !== 0) return;
    let waiters = idleResolvers;
    idleResolvers = [];
    waiters.forEach((resolve) => resolve());
  };
  let server = new Server(
    {
      name: CLAUDE_CODE_DEVICE,
      version: bridge.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...bridge.registry.definitions()],
  }));
  server.setRequestHandler(
    CallToolRequestSchema,
    async ({ params: { name: toolName, arguments: args } }, extra) => {
      let tool = bridge.registry.get(toolName);
      if (!tool)
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${toolName}`,
            },
          ],
          isError: true,
        };
      let { sessionId, toolArgs } = renderToolUseMessage(args);
      if (sessionId !== undefined && sessionIdBody(sessionId) !== sessionIdBody(bridge.sessionId))
        return refuseCrossSessionDeviceCall(tool, sessionId, bridge.sessionId);
      if (tool.senderJudgedBy === "dispatch") {
        let attestation = unknownAttestationResult();
        if (attestation.heldBack) return refuseUntrustedDeviceToolCall(tool, attestation.attestation);
      }
      inFlight++;
      try {
        return await tool.call(toolArgs, {
          sessionId,
          signal: extra.signal,
        });
      } catch (error) {
        logForDebugging(`[deviceBridge] tool ${toolName} failed: ${toError(error).message}`);
        return {
          content: [
            {
              type: "text",
              text: `Tool ${toolName} failed: internal error`,
            },
          ],
          isError: true,
        };
      } finally {
        inFlight--;
        if (inFlight === 0) setTimeout(flushIdleWaiters, 0);
      }
    },
  );
  return {
    server,
    inFlightCalls: () => inFlight,
    whenIdle: () => {
      let promise = new Promise((resolve) => {
        idleResolvers.push(resolve);
      });
      if (inFlight === 0) setTimeout(flushIdleWaiters, 0);
      return promise;
    },
  };
}
//@ chunk-m4y440zq.js:5290-6025 placement
/**
 * 拒绝声明的会话与本设备所服务会话不一致的调用并上报 tengu_device_tool_refused
 */
function refuseCrossSessionDeviceCall(tool, sessionId, sessionId_2) {
  let toolName = tool.definition.name;
  logForDebugging(
    `[deviceBridge] refused ${toolName}: call asserted for session ${jsonStringify(sessionId.slice(0, 48))}, this device serves ${sessionId_2}`,
  );
  logEvent("tengu_device_tool_refused", {
    tool: tool.analyticsName,
    reason: lit("session_mismatch"),
  });
  return {
    content: [
      {
        type: "text",
        text: `${toolName} refused: the user's machine is currently connected on behalf of a different Claude Code cloud session (usually another session started from the same machine), so it cannot run device tools for this session and nothing was run. Tell the user, and continue with the tools in this cloud environment; if this session was also started with Claude Code on that machine, its device tools may work again once the other session ends. Do not retry in a loop.`,
      },
    ],
    isError: true,
  };
}
//@ chunk-m4y440zq.js:6025-6388 placement
/**
 * 设备桥工具调用被拒：发送方不满足可信设备策略时记日志与 tengu_device_tool_refused 事件，返回 isError 的文本结果（含状态 status）。
 */
function refuseUntrustedDeviceToolCall(tool, attestation) {
  let status = attestation?.status ?? "UNSPECIFIED";
  logForDebugging(
    `[deviceBridge] refused ${tool.definition.name}: its sender is held back under the trusted-device policy (${status})`,
  );
  logEvent("tengu_device_tool_refused", {
    tool: tool.analyticsName,
    reason: lit("unattested_request"),
  });
  return {
    content: [
      {
        type: "text",
        text: unattestedSenderMessage({
          targetName: "this machine",
          status,
          subtype: "remote_tool_call",
        }),
      },
    ],
    isError: true,
  };
}
//@ chunk-m4y440zq.js:6388-6465 placement
var DEVICE_IDLE_NOTICE = "This machine is attached but does not run commands for this session.";
//@ chunk-m4y440zq.js:6465-7334 placement
/**
 * 返回本设备运行环境信息（平台、架构）的 identify 工具定义
 */
function DEVICE_IDENTIFY_TOOL(bridge) {
  let now = bridge.now ?? (() => new Date());
  return {
    definition: {
      name: GET_DEVICE_INFO,
      description:
        "Returns runtime environment details for this device (platform, architecture, Claude Code version, and device name). Call this to confirm the device connection is live." +
        (bridge.idle ? ` ${DEVICE_IDLE_NOTICE}` : ""),
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    analyticsName: lit(GET_DEVICE_INFO),
    senderJudgedBy: {
      notJudged:
        "The bridge service's own identify probe, sent with no session. It takes no input, runs nothing and reads nothing here, and answers the name this machine dialed the bridge under plus platform, architecture, Claude Code version and the time. Refusing it would hide the machine from the bridge, not keep anything from a sender.",
    },
    call: async () => {
      let details = {
        platform: getPlatform(),
        arch: "x64",
        claudeCodeVersion: bridge.version,
        deviceName: bridge.getDeviceName(),
        timestamp: now().toISOString(),
      };
      return {
        content: [
          {
            type: "text",
            text: jsonStringify(details, null, 2),
          },
        ],
      };
    },
  };
}
export { handleDeviceToolCall, DEVICE_IDENTIFY_TOOL, parseJsonRpcMessage };
