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
import { rm as rm_2, rm as rm_2_2, rm as rm_3, rm as rm_4, rm as rm_5 } from "fs/promises";
import { Brn, checkExpectGuards } from "../../../cli/handlers/pluginEval/mockGuards.js";
import { Po, Hi } from "../runTrace.js";
import { readReadyMockServers, ko } from "./mockRelayProtocol.js";
import { count } from "../../../utils/collections.js";
import { replaceControlChars } from "../../../utils/resultError.js";

//@ chunk-qchp9vrd.js:174088-175581 placement
function findMockServersInInit(e) {
  let n = new Set(e.mockedTools),
    r = new Map();
  for (let server of e.servers)
    for (let tool of server.tools) {
      let S = server.expects[tool];
      if (S) r.set(server.toolFullNames[tool] ?? "", { server: server.dirName, tool: tool, expect: S });
    }
  let a = new Set(
      e.servers.flatMap((server) =>
        server.tools
          .filter((tool) => server.responderKinds[tool] === "agent")
          .map((R) => server.toolFullNames[R] ?? ""),
      ),
    ),
    s = new Set(),
    h = new Set(),
    w = 0,
    b = `${Brn} ${e.nonce}:`;
  return (y) => {
    if (y.type === "system" && y.subtype === "init") return checkMockRegistration(y, e);
    for (let R of Po(y)) {
      let S = R;
      if (y.type === "assistant" && S?.type === "tool_use") {
        if (typeof S.id === "string" && typeof S.name === "string" && n.has(S.name)) {
          if ((s.add(S.id), a.has(S.name))) h.add(S.id);
          let T = r.get(S.name);
          if (T) {
            let N = checkExpectGuards(S.input, T.expect);
            if (N !== null)
              return {
                kind: "abort",
                message: `stopped by harness: ${T.server}/${T.tool} \u2014 the model's call violates expect: ${N}`,
                abort: { server: T.server, tool: T.tool, reason: `the model's call violates expect: ${N}` },
              };
          }
        }
      } else if (y.type === "user") {
        let safeParse = Hi().safeParse(R);
        if (safeParse.success && h.has(safeParse.data.tool_use_id) && ++w > 2 * e.agentCallBudget)
          return {
            kind: "integrity",
            message: `mocks: agent-served mock results in the trace exceeded twice the run budget (${e.agentCallBudget}) \u2014 the harness's own gate refuses at the budget, so this run's mocked calls were answered other than through it; the run is not graded`,
          };
        if (
          safeParse.success &&
          safeParse.data.is_error === !0 &&
          s.has(safeParse.data.tool_use_id) &&
          toolResultText(safeParse.data.content).startsWith(b)
        ) {
          let trimmed = toolResultText(safeParse.data.content).slice(b.length).trim();
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
/**
 * 确认每个模拟替身已注册进子会话的 MCP 服务器（可能被托管策略剔除）。
 */
//@ chunk-qchp9vrd.js:175581-176875 placement
async function checkMockRegistration(e, n) {
  let r = Array.isArray(e.mcp_servers) ? e.mcp_servers : [];
  for (let server of n.servers) {
    let filtered = r.filter((y) => y.name === server.registeredName);
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
  let a = await readReadyMockServers(n.callLogPath, n.nonce);
  for (let server of n.servers)
    if (!a.has(server.dirName))
      return {
        kind: "identity",
        message: `the server connected as "${server.registeredName}" did not identify as this run's mock stand-in for ${server.dirName} \u2014 refusing to run against what may be the real server`,
      };
  let s = new Set(Array.isArray(e.tools) ? e.tools.map(String) : []),
    filtered = n.mockedTools.filter((mockedTool) => !s.has(mockedTool));
  if (filtered.length > 0)
    return {
      kind: "tools_missing",
      message: `mocked tools not offered by the child: ${filtered.join(", ")}`,
    };
  return (await rm_4(n.configPath, { force: !0 }).catch(() => {}), null);
}
/**
 * 把工具结果内容（字符串或文本块数组）转换为文本。
 */
//@ chunk-qchp9vrd.js:176875-177034 placement
function toolResultText(e) {
  if (typeof e === "string") return e;
  if (Array.isArray(e))
    return e.map((n) => (n && typeof n === "object" && "text" in n ? String(n.text) : "")).join("");
  return "";
}
//@ chunk-qchp9vrd.js:177034-177173 placement
function parseMockAbortReason(e) {
  let match = /^([^/\s]+)\/(\S+) \u2014 (.*)$/s.exec(e);
  return match
    ? { server: match[1], tool: match[2], reason: match[3] }
    : { server: "?", tool: "?", reason: e };
}
/**
 * 给 trace 里调用了模拟工具的条目标注应答者类型与结论（ok、tool_error、abort、no_result）。
 */
//@ chunk-qchp9vrd.js:177173-177535 placement
function annotateMockedToolCalls(e, n) {
  let r = `${Brn} ${n.nonce}:`,
    a = new Map();
  for (let server of n.servers)
    for (let tool of server.tools) {
      let w = server.toolFullNames[tool];
      if (w !== void 0) a.set(w, server.responderKinds[tool] ?? "fixed");
    }
  for (let s of e) {
    let h = a.get(s.name);
    if (h === void 0) continue;
    s.mock = {
      responder: h,
      verdict:
        s.isError === void 0
          ? "no_result"
          : !s.isError
            ? "ok"
            : (s.output ?? "").startsWith(r)
              ? "abort"
              : "tool_error",
    };
  }
}
/**
 * 把替身的调用日志与 trace 对照，超出大小上限时无法验证。
 */
//@ chunk-qchp9vrd.js:177535-179018 placement
function verifyMockCallLog(e, n, r, a) {
  if (n === null)
    return `the mock call log exceeded ${Math.round(ko / 1048576)} MiB, so the stand-ins' records cannot be verified against the trace \u2014 reduce per-call payloads or split the case; the run is not graded`;
  let s = new Map();
  for (let server of r.servers)
    for (let tool of server.tools)
      s.set(server.toolFullNames[tool] ?? "", { server: server.dirName, tool: tool });
  let h = new Map();
  for (let S of n) {
    let T = `${S.server}/${S.tool}`;
    h.set(T, (h.get(T) ?? 0) + 1);
  }
  let w = new Map(),
    b = null,
    lastIndex = e.findLastIndex((S) => S.isError !== void 0),
    R = new Set();
  if (a !== null && r.agentRun !== null)
    for (let server of r.servers)
      for (let tool of server.tools) {
        if (server.responderKinds[tool] !== "agent") continue;
        let N = count(e, (x) => x.name === server.toolFullNames[tool] && x.isError !== void 0);
        if (r.agentRun.state.relaysReceived(server.dirName, tool) > N) R.add(server.dirName);
      }
  for (let [S, T] of e.entries()) {
    let N = s.get(T.name);
    if (N === void 0) continue;
    if (T.isError === void 0) {
      if (a === "unprovokable" && S > lastIndex) continue;
      if (R.has(N.server)) continue;
    } else if (T.deniedByChild) continue;
    let x = `${N.server}/${N.tool}`;
    if (
      (w.set(x, (w.get(x) ?? 0) + 1), b === null && T.isError === !0 && isMcpDisconnectError(T.output ?? ""))
    )
      b = x;
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
/**
 * 统计模拟工具调用次数与错误数，并列出调用了被测服务器但未被模拟的工具及次数。
 */
//@ chunk-qchp9vrd.js:179140-179573 placement
function summarizeMockUsage(e, n) {
  let r = new Set(n.mockedTools),
    mapped = n.servers.map((server) => ({ prefix: `mcp__${server.segment}__`, dirName: server.dirName })),
    s = 0,
    h = 0,
    w = new Map();
  for (let b of e) {
    if (r.has(b.name)) {
      if ((s++, b.mock?.verdict === "tool_error")) h++;
      continue;
    }
    let found = mapped.find((R) => b.name.startsWith(R.prefix));
    if (found) {
      let R = replaceControlChars(`${found.dirName}/${b.name.slice(found.prefix.length)}`);
      w.set(R, (w.get(R) ?? 0) + 1);
    }
  }
  return { total: s, errors: h, unmocked: [...w].map(([b, y]) => ({ tool: b, count: y })) };
}

export {
  findMockServersInInit,
  annotateMockedToolCalls,
  verifyMockCallLog,
  summarizeMockUsage,
  toolResultText,
};
