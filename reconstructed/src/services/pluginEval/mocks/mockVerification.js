/**
 * services/pluginEval/mocks/mockVerification.ts
 *
 * 2.1.316 新增：plugin eval 校验模拟替身注册与调用记录（与 trace 对照）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (8)
 * attribution: placement 8
 */
import { rm as rm_2 } from "fs/promises";
import { EVAL_ABORTED_BY_MOCK, checkExpectGuards } from "../../../cli/handlers/pluginEval/mockGuards.js";
import { assistantContent, ToolResultBlockSchema } from "../runTrace.js";
import { readReadyMockServers, MAX_RELAY_LOG_BYTES } from "./mockRelayProtocol.js";
import { count } from "../../../utils/collections.js";
import { replaceControlChars } from "../../../utils/resultError.js";

//@ chunk-qchp9vrd.js:174088-175581 placement
function findMockServersInInit(mocks) {
  let n = new Set(mocks.mockedTools);
  let r = new Map();
  for (let server of mocks.servers)
    for (let tool of server.tools) {
      let S = server.expects[tool];
      if (S)
        r.set(server.toolFullNames[tool] ?? "", {
          server: server.dirName,
          tool,
          expect: S,
        });
    }
  let a = new Set(
    mocks.servers.flatMap((server) =>
      server.tools
        .filter((tool) => server.responderKinds[tool] === "agent")
        .map((tool) => server.toolFullNames[tool] ?? ""),
    ),
  );
  let s = new Set();
  let h = new Set();
  let w = 0;
  let b = `${EVAL_ABORTED_BY_MOCK} ${mocks.nonce}:`;
  return (y) => {
    if (y.type === "system" && y.subtype === "init") return checkMockRegistration(y, mocks);
    for (let R of assistantContent(y)) {
      let S = R;
      if (y.type === "assistant" && S?.type === "tool_use") {
        if (typeof S.id === "string" && typeof S.name === "string" && n.has(S.name)) {
          s.add(S.id);
          if (a.has(S.name)) h.add(S.id);
          let T = r.get(S.name);
          if (T) {
            let N = checkExpectGuards(S.input, T.expect);
            if (N !== null)
              return {
                kind: "abort",
                message: `stopped by harness: ${T.server}/${T.tool} \u2014 the model's call violates expect: ${N}`,
                abort: {
                  server: T.server,
                  tool: T.tool,
                  reason: `the model's call violates expect: ${N}`,
                },
              };
          }
        }
      } else if (y.type === "user") {
        let T = ToolResultBlockSchema().safeParse(R);
        if (T.success && h.has(T.data.tool_use_id) && ++w > 2 * mocks.agentCallBudget)
          return {
            kind: "integrity",
            message: `mocks: agent-served mock results in the trace exceeded twice the run budget (${mocks.agentCallBudget}) \u2014 the harness's own gate refuses at the budget, so this run's mocked calls were answered other than through it; the run is not graded`,
          };
        if (
          T.success &&
          T.data.is_error === true &&
          s.has(T.data.tool_use_id) &&
          toolResultText(T.data.content).startsWith(b)
        ) {
          let trimmed = toolResultText(T.data.content).slice(b.length).trim();
          return {
            kind: "abort",
            message: `stopped by mock: ${trimmed}`,
            abort: parseMockAbortReason(trimmed),
          };
        }
      }
    }
    return null;
  };
}
//@ chunk-qchp9vrd.js:175581-176875 placement
/**
 * 确认每个模拟替身已注册进子会话的 MCP 服务器（可能被托管策略剔除）。
 */
async function checkMockRegistration(e, n) {
  let mcpServers = Array.isArray(e.mcp_servers) ? e.mcp_servers : [];
  for (let server of n.servers) {
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
  let readyMockServers = await readReadyMockServers(n.callLogPath, n.nonce);
  for (let server of n.servers)
    if (!readyMockServers.has(server.dirName))
      return {
        kind: "identity",
        message: `the server connected as "${server.registeredName}" did not identify as this run's mock stand-in for ${server.dirName} \u2014 refusing to run against what may be the real server`,
      };
  let s = new Set(Array.isArray(e.tools) ? e.tools.map(String) : []);
  let filtered = n.mockedTools.filter((mockedTool) => !s.has(mockedTool));
  if (filtered.length > 0)
    return {
      kind: "tools_missing",
      message: `mocked tools not offered by the child: ${filtered.join(", ")}`,
    };
  await rm_2(n.configPath, {
    force: true,
  }).catch(() => {});
  return null;
}
//@ chunk-qchp9vrd.js:176875-177034 placement
/**
 * 把工具结果内容（字符串或文本块数组）转换为文本。
 */
function toolResultText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content.map((n) => (n && typeof n === "object" && "text" in n ? String(n.text) : "")).join("");
  return "";
}
//@ chunk-qchp9vrd.js:177034-177173 placement
function parseMockAbortReason(e) {
  let match = /^([^/\s]+)\/(\S+) \u2014 (.*)$/s.exec(e);
  return match
    ? {
        server: match[1],
        tool: match[2],
        reason: match[3],
      }
    : {
        server: "?",
        tool: "?",
        reason: e,
      };
}
//@ chunk-qchp9vrd.js:177173-177535 placement
/**
 * 给 trace 里调用了模拟工具的条目标注应答者类型与结论（ok、tool_error、abort、no_result）。
 */
function annotateMockedToolCalls(toolCalls, mocks) {
  let r = `${EVAL_ABORTED_BY_MOCK} ${mocks.nonce}:`;
  let a = new Map();
  for (let server of mocks.servers)
    for (let tool of server.tools) {
      let w = server.toolFullNames[tool];
      if (w !== undefined) a.set(w, server.responderKinds[tool] ?? "fixed");
    }
  for (let s of toolCalls) {
    let h = a.get(s.name);
    if (h === undefined) continue;
    s.mock = {
      responder: h,
      verdict:
        s.isError === undefined
          ? "no_result"
          : !s.isError
            ? "ok"
            : (s.output ?? "").startsWith(r)
              ? "abort"
              : "tool_error",
    };
  }
}
//@ chunk-qchp9vrd.js:177535-179018 placement
/**
 * 把替身的调用日志与 trace 对照，超出大小上限时无法验证。
 */
function verifyMockCallLog(toolCalls, n, mocks, a) {
  if (n === null)
    return `the mock call log exceeded ${Math.round(MAX_RELAY_LOG_BYTES / 1048576)} MiB, so the stand-ins' records cannot be verified against the trace \u2014 reduce per-call payloads or split the case; the run is not graded`;
  let s = new Map();
  for (let server of mocks.servers)
    for (let tool of server.tools)
      s.set(server.toolFullNames[tool] ?? "", {
        server: server.dirName,
        tool,
      });
  let h = new Map();
  for (let S of n) {
    let T = `${S.server}/${S.tool}`;
    h.set(T, (h.get(T) ?? 0) + 1);
  }
  let w = new Map();
  let b = null;
  let lastIndex = toolCalls.findLastIndex((S) => S.isError !== undefined);
  let R = new Set();
  if (a !== null && mocks.agentRun !== null)
    for (let server of mocks.servers)
      for (let tool of server.tools) {
        if (server.responderKinds[tool] !== "agent") continue;
        let N = count(toolCalls, (x) => x.name === server.toolFullNames[tool] && x.isError !== undefined);
        if (mocks.agentRun.state.relaysReceived(server.dirName, tool) > N) R.add(server.dirName);
      }
  for (let [S, T] of toolCalls.entries()) {
    let N = s.get(T.name);
    if (N === undefined) continue;
    if (T.isError === undefined) {
      if (a === "unprovokable" && S > lastIndex) continue;
      if (R.has(N.server)) continue;
    } else if (T.deniedByChild) continue;
    let x = `${N.server}/${N.tool}`;
    w.set(x, (w.get(x) ?? 0) + 1);
    if (b === null && T.isError === true && isMcpDisconnectError(T.output ?? "")) b = x;
  }
  for (let [S, T] of w) {
    let N = h.get(S) ?? 0;
    if (N < T)
      return b === S
        ? `a call to mocked ${S} was answered by the child's MCP client, not the stand-in \u2014 the stand-in died and could not be respawned; the run is not graded`
        : `mocked calls to ${S} in the trace (${T}) outnumber this run's stand-in records for it (${N}) \u2014 a stand-in died or stalled, something else answered, or the call log was altered; the run is not graded`;
  }
  return null;
}
//@ chunk-qchp9vrd.js:179018-179140 placement
function isMcpDisconnectError(e) {
  return (
    /^MCP server "[^"\n]*" is not connected\b/.test(e) || /^MCP error -32000: Connection closed\b/.test(e)
  );
}
//@ chunk-qchp9vrd.js:179140-179573 placement
/**
 * 统计模拟工具调用次数与错误数，并列出调用了被测服务器但未被模拟的工具及次数。
 */
function summarizeMockUsage(toolCalls, mocks) {
  let r = new Set(mocks.mockedTools);
  let mapped = mocks.servers.map((server) => ({
    prefix: `mcp__${server.segment}__`,
    dirName: server.dirName,
  }));
  let s = 0;
  let h = 0;
  let w = new Map();
  for (let b of toolCalls) {
    if (r.has(b.name)) {
      s++;
      if (b.mock?.verdict === "tool_error") h++;
      continue;
    }
    let found = mapped.find((R) => b.name.startsWith(R.prefix));
    if (found) {
      let R = replaceControlChars(`${found.dirName}/${b.name.slice(found.prefix.length)}`);
      w.set(R, (w.get(R) ?? 0) + 1);
    }
  }
  return {
    total: s,
    errors: h,
    unmocked: [...w].map(([b, y]) => ({
      tool: b,
      count: y,
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
