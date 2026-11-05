/**
 * services/pluginEval/mocks/mockVerification.ts
 *
 * 2.1.316 新增：plugin eval 校验模拟替身注册与调用记录（与 trace 对照）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { rm as rm_2 } from "fs/promises";
import { EVAL_ABORTED_BY_MOCK, checkExpectGuards } from "../../../cli/handlers/pluginEval/mockGuards.js";
import { assistantContent, ToolResultBlockSchema } from "../runTrace.js";
import { readReadyMockServers, MAX_RELAY_LOG_BYTES } from "./mockRelayProtocol.js";
import { countWhere } from "../../../utils/collections.js";
import { replaceControlChars } from "../../../utils/resultError.js";

//@ chunk-af1hzzme.js:175483-176976 placement
function findMockServersInInit(mocks) {
  let mockedTools = new Set(mocks.mockedTools);
  let expectsByTool = new Map();
  for (let server of mocks.servers)
    for (let tool of server.tools) {
      let expect = server.expects[tool];
      if (expect)
        expectsByTool.set(server.toolFullNames[tool] ?? "", {
          server: server.dirName,
          tool,
          expect,
        });
    }
  let agentTools = new Set(
    mocks.servers.flatMap((server) =>
      server.tools
        .filter((tool) => server.responderKinds[tool] === "agent")
        .map((tool) => server.toolFullNames[tool] ?? ""),
    ),
  );
  let mockedCallIds = new Set();
  let agentCallIds = new Set();
  let agentResultCount = 0;
  let abortPrefix = `${EVAL_ABORTED_BY_MOCK} ${mocks.nonce}:`;
  return (message) => {
    if (message.type === "system" && message.subtype === "init") return checkMockRegistration(message, mocks);
    for (let block of assistantContent(message)) {
      let contentBlock = block;
      if (message.type === "assistant" && contentBlock?.type === "tool_use") {
        if (
          typeof contentBlock.id === "string" &&
          typeof contentBlock.name === "string" &&
          mockedTools.has(contentBlock.name)
        ) {
          mockedCallIds.add(contentBlock.id);
          if (agentTools.has(contentBlock.name)) agentCallIds.add(contentBlock.id);
          let expectEntry = expectsByTool.get(contentBlock.name);
          if (expectEntry) {
            let violation = checkExpectGuards(contentBlock.input, expectEntry.expect);
            if (violation !== null)
              return {
                kind: "abort",
                message: `stopped by harness: ${expectEntry.server}/${expectEntry.tool} \u2014 the model's call violates expect: ${violation}`,
                abort: {
                  server: expectEntry.server,
                  tool: expectEntry.tool,
                  reason: `the model's call violates expect: ${violation}`,
                },
              };
          }
        }
      } else if (message.type === "user") {
        let resultBlock = ToolResultBlockSchema().safeParse(block);
        if (
          resultBlock.success &&
          agentCallIds.has(resultBlock.data.tool_use_id) &&
          ++agentResultCount > 2 * mocks.agentCallBudget
        )
          return {
            kind: "integrity",
            message: `mocks: agent-served mock results in the trace exceeded twice the run budget (${mocks.agentCallBudget}) \u2014 the harness's own gate refuses at the budget, so this run's mocked calls were answered other than through it; the run is not graded`,
          };
        if (
          resultBlock.success &&
          resultBlock.data.is_error === true &&
          mockedCallIds.has(resultBlock.data.tool_use_id) &&
          toolResultText(resultBlock.data.content).startsWith(abortPrefix)
        ) {
          let reason = toolResultText(resultBlock.data.content).slice(abortPrefix.length).trim();
          return {
            kind: "abort",
            message: `stopped by mock: ${reason}`,
            abort: parseMockAbortReason(reason),
          };
        }
      }
    }
    return null;
  };
}
//@ chunk-af1hzzme.js:176976-178270 placement
/**
 * 确认每个模拟替身已注册进子会话的 MCP 服务器（可能被托管策略剔除）。
 */
async function checkMockRegistration(initMessage, mocks) {
  let mcpServers = Array.isArray(initMessage.mcp_servers) ? initMessage.mcp_servers : [];
  for (let server of mocks.servers) {
    let filtered = mcpServers.filter((mcpServer) => mcpServer.name === server.registeredName);
    if (filtered.length !== 1)
      return {
        kind: "registration",
        message:
          filtered.length === 0
            ? `mock stand-in for ${server.dirName} registered as "${server.registeredName}" is missing from the child's MCP servers \u2014 either a managed MCP policy dropped it (see stderr below) or the mocks/ directory name does not match a server this plugin registers`
            : `mock stand-in for ${server.dirName} registered as "${server.registeredName}" appears twice in the child's MCP servers`,
      };
    if (filtered[0]?.status !== "connected")
      return {
        kind: "registration",
        message: `mock stand-in for ${server.dirName} ("${server.registeredName}") did not connect (status: ${String(filtered[0]?.status)})`,
      };
  }
  let readyMockServers = await readReadyMockServers(mocks.callLogPath, mocks.nonce);
  for (let server of mocks.servers)
    if (!readyMockServers.has(server.dirName))
      return {
        kind: "identity",
        message: `the server connected as "${server.registeredName}" did not identify as this run's mock stand-in for ${server.dirName} \u2014 refusing to run against what may be the real server`,
      };
  let offeredTools = new Set(Array.isArray(initMessage.tools) ? initMessage.tools.map(String) : []);
  let filtered = mocks.mockedTools.filter((mockedTool) => !offeredTools.has(mockedTool));
  if (filtered.length > 0)
    return {
      kind: "tools_missing",
      message: `mocked tools not offered by the child: ${filtered.join(", ")}`,
    };
  await rm_2(mocks.configPath, {
    force: true,
  }).catch(() => {});
  return null;
}
//@ chunk-af1hzzme.js:178270-178429 placement
/**
 * 把工具结果内容（字符串或文本块数组）转换为文本。
 */
function toolResultText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((item) => (item && typeof item === "object" && "text" in item ? String(item.text) : ""))
      .join("");
  return "";
}
//@ chunk-af1hzzme.js:178429-178568 placement
function parseMockAbortReason(reason) {
  let match = /^([^/\s]+)\/(\S+) \u2014 (.*)$/s.exec(reason);
  return match
    ? {
        server: match[1],
        tool: match[2],
        reason: match[3],
      }
    : {
        server: "?",
        tool: "?",
        reason,
      };
}
//@ chunk-af1hzzme.js:178568-178930 placement
/**
 * 给 trace 里调用了模拟工具的条目标注应答者类型与结论（ok、tool_error、abort、no_result）。
 */
function annotateMockedToolCalls(toolCalls, mocks) {
  let abortPrefix = `${EVAL_ABORTED_BY_MOCK} ${mocks.nonce}:`;
  let responderKindByTool = new Map();
  for (let server of mocks.servers)
    for (let tool of server.tools) {
      let fullName = server.toolFullNames[tool];
      if (fullName !== undefined) responderKindByTool.set(fullName, server.responderKinds[tool] ?? "fixed");
    }
  for (let toolCall of toolCalls) {
    let responderKind = responderKindByTool.get(toolCall.name);
    if (responderKind === undefined) continue;
    toolCall.mock = {
      responder: responderKind,
      verdict:
        toolCall.isError === undefined
          ? "no_result"
          : !toolCall.isError
            ? "ok"
            : (toolCall.output ?? "").startsWith(abortPrefix)
              ? "abort"
              : "tool_error",
    };
  }
}
//@ chunk-af1hzzme.js:178930-180413 placement
/**
 * 把替身的调用日志与 trace 对照，超出大小上限时无法验证。
 */
function verifyMockCallLog(toolCalls, callLog, mocks, provocation) {
  if (callLog === null)
    return `the mock call log exceeded ${Math.round(MAX_RELAY_LOG_BYTES / 1048576)} MiB, so the stand-ins' records cannot be verified against the trace \u2014 reduce per-call payloads or split the case; the run is not graded`;
  let toolByFullName = new Map();
  for (let server of mocks.servers)
    for (let tool of server.tools)
      toolByFullName.set(server.toolFullNames[tool] ?? "", {
        server: server.dirName,
        tool,
      });
  let logCounts = new Map();
  for (let record of callLog) {
    let toolKey = `${record.server}/${record.tool}`;
    logCounts.set(toolKey, (logCounts.get(toolKey) ?? 0) + 1);
  }
  let traceCounts = new Map();
  let disconnectedTool = null;
  let lastIndex = toolCalls.findLastIndex((toolCall) => toolCall.isError !== undefined);
  let skippedServers = new Set();
  if (provocation !== null && mocks.agentRun !== null)
    for (let server of mocks.servers)
      for (let tool of server.tools) {
        if (server.responderKinds[tool] !== "agent") continue;
        let resultCount = countWhere(
          toolCalls,
          (toolCall) => toolCall.name === server.toolFullNames[tool] && toolCall.isError !== undefined,
        );
        if (mocks.agentRun.state.relaysReceived(server.dirName, tool) > resultCount)
          skippedServers.add(server.dirName);
      }
  for (let [toolIndex, toolCall] of toolCalls.entries()) {
    let mockedTool = toolByFullName.get(toolCall.name);
    if (mockedTool === undefined) continue;
    if (toolCall.isError === undefined) {
      if (provocation === "unprovokable" && toolIndex > lastIndex) continue;
      if (skippedServers.has(mockedTool.server)) continue;
    } else if (toolCall.deniedByChild) continue;
    let toolKey = `${mockedTool.server}/${mockedTool.tool}`;
    traceCounts.set(toolKey, (traceCounts.get(toolKey) ?? 0) + 1);
    if (disconnectedTool === null && toolCall.isError === true && isMcpDisconnectError(toolCall.output ?? ""))
      disconnectedTool = toolKey;
  }
  for (let [toolKey, traceCount] of traceCounts) {
    let logCount = logCounts.get(toolKey) ?? 0;
    if (logCount < traceCount)
      return disconnectedTool === toolKey
        ? `a call to mocked ${toolKey} was answered by the child's MCP client, not the stand-in \u2014 the stand-in died and could not be respawned; the run is not graded`
        : `mocked calls to ${toolKey} in the trace (${traceCount}) outnumber this run's stand-in records for it (${logCount}) \u2014 a stand-in died or stalled, something else answered, or the call log was altered; the run is not graded`;
  }
  return null;
}
//@ chunk-af1hzzme.js:180413-180535 placement
function isMcpDisconnectError(message) {
  return (
    /^MCP server "[^"\n]*" is not connected\b/.test(message) ||
    /^MCP error -32000: Connection closed\b/.test(message)
  );
}
//@ chunk-af1hzzme.js:180535-180968 placement
/**
 * 统计模拟工具调用次数与错误数，并列出调用了被测服务器但未被模拟的工具及次数。
 */
function summarizeMockUsage(toolCalls, mocks) {
  let mockedTools = new Set(mocks.mockedTools);
  let mapped = mocks.servers.map((server) => ({
    prefix: `mcp__${server.segment}__`,
    dirName: server.dirName,
  }));
  let total = 0;
  let errors = 0;
  let unmockedCounts = new Map();
  for (let toolCall of toolCalls) {
    if (mockedTools.has(toolCall.name)) {
      total++;
      if (toolCall.mock?.verdict === "tool_error") errors++;
      continue;
    }
    let found = mapped.find((serverPrefix) => toolCall.name.startsWith(serverPrefix.prefix));
    if (found) {
      let toolKey = replaceControlChars(`${found.dirName}/${toolCall.name.slice(found.prefix.length)}`);
      unmockedCounts.set(toolKey, (unmockedCounts.get(toolKey) ?? 0) + 1);
    }
  }
  return {
    total,
    errors,
    unmocked: [...unmockedCounts].map(([toolKey, count]) => ({
      tool: toolKey,
      count,
    })),
  };
}
export {
  findMockServersInInit,
  annotateMockedToolCalls,
  verifyMockCallLog,
  summarizeMockUsage,
  toolResultText,
};
