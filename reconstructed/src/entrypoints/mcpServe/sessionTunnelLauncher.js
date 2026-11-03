/**
 * entrypoints/mcpServe/sessionTunnelLauncher.ts
 *
 * 2.1.316 新增。--session-tunnel 启动时从标准输入读取交接信封，确定启动它的 runner 并取出工具服务器启动器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4r034kvt.js (5)
 * attribution: placement 5
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { nk } from "../../utils/subprocessEnvLoader.js";

//@ chunk-4r034kvt.js:372-602 placement
function handedOverBy(n) {
  switch (n.kind) {
    case "stdout-reader":
      return { authToken: void 0, tunnel: void 0 };
    case "bearer-minter":
      return { authToken: n.authToken, tunnel: void 0 };
    case "tool-container":
    case "runner":
      return { authToken: void 0, tunnel: n.tunnel };
  }
}
//@ chunk-4r034kvt.js:602-690 placement
var h = DoctorLazy(() => u({ runner: u({ pid: E().int().positive(), proc_start: o().min(1) }).optional() }));
/**
 * --session-tunnel 启动时从标准输入读取交接信封，确定启动它的 runner 并取出工具服务器启动器。
 */
//@ chunk-4r034kvt.js:690-1592 placement
async function dialingLauncherFrom({ transport: transport, port: port, line: line }) {
  let { parseSessionTunnelEnvelope: parseSessionTunnelEnvelope, sessionTunnelRefusal: sessionTunnelRefusal } =
      await import("./chunk-e6a6pbbv.js"),
    r = parseSessionTunnelEnvelope(line),
    d = sessionTunnelRefusal(transport, port, r);
  if (d !== void 0 || r === void 0)
    return { refusal: `--session-tunnel ${d ?? "needs an envelope on standard input"}` };
  let t = readHandoverRunner(line);
  if (t === "unreadable")
    return { refusal: '--session-tunnel was handed a "runner" that is not a "pid" and its "proc_start"' };
  if (t === void 0) return { kind: "tool-container", tunnel: r };
  let s = { pid: t.pid, procStart: t.proc_start };
  if (env.CCR_AGENT_PROXY_ENABLED)
    return {
      refusal:
        "--session-tunnel does not serve a runner whose session routes git through the agent proxy: it cannot start that relay",
    };
  let { isRunnerSeen: isRunnerSeen } = await import("./chunk-66nm9g6r.js");
  if (!(await isRunnerSeen(s)))
    return {
      refusal: `--session-tunnel cannot see the runner that started it (process ${s.pid}), so it could not tell when that runner is gone`,
    };
  return { kind: "runner", tunnel: r, runner: s };
}
//@ chunk-4r034kvt.js:1592-1728 placement
function readHandoverRunner(n) {
  if (n === void 0) return;
  try {
    let safeParse = h().safeParse(jsonParse(n));
    return safeParse.success ? safeParse.data.runner : "unreadable";
  } catch {
    return "unreadable";
  }
}
//@ chunk-4r034kvt.js:1728-1930 placement
function takeToolServerLauncher(n) {
  let CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN = nk.CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN;
  if ((nk.unset("CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN"), n !== void 0)) return n;
  return CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN === void 0
    ? { kind: "stdout-reader" }
    : { kind: "bearer-minter", authToken: CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN };
}

export { handedOverBy };
