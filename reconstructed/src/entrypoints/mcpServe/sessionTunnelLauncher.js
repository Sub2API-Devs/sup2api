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
import { u, E, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { toolServerEnvAccessor } from "../../utils/subprocessEnvLoader.js";

//@ chunk-4r034kvt.js:372-602 placement
function handedOverBy(launcher) {
  switch (launcher.kind) {
    case "stdout-reader":
      return {
        authToken: undefined,
        tunnel: undefined,
      };
    case "bearer-minter":
      return {
        authToken: launcher.authToken,
        tunnel: undefined,
      };
    case "tool-container":
    case "runner":
      return {
        authToken: undefined,
        tunnel: launcher.tunnel,
      };
  }
}
//@ chunk-4r034kvt.js:602-690 placement
var SessionTunnelLauncherResponseSchema = DoctorLazy(() =>
  u({
    runner: u({
      pid: E().int().positive(),
      proc_start: string().min(1),
    }).optional(),
  }),
);
//@ chunk-4r034kvt.js:690-1592 placement
/**
 * --session-tunnel 启动时从标准输入读取交接信封，确定启动它的 runner 并取出工具服务器启动器。
 */
async function dialingLauncherFrom({ transport, port, line }) {
  let { parseSessionTunnelEnvelope, sessionTunnelRefusal } = await import("./chunk-e6a6pbbv.js");
  let sessionTunnelEnvelope = parseSessionTunnelEnvelope(line);
  let d = sessionTunnelRefusal(transport, port, sessionTunnelEnvelope);
  if (d !== undefined || sessionTunnelEnvelope === undefined)
    return {
      refusal: `--session-tunnel ${d ?? "needs an envelope on standard input"}`,
    };
  let handoverRunner = readHandoverRunner(line);
  if (handoverRunner === "unreadable")
    return {
      refusal: '--session-tunnel was handed a "runner" that is not a "pid" and its "proc_start"',
    };
  if (handoverRunner === undefined)
    return {
      kind: "tool-container",
      tunnel: sessionTunnelEnvelope,
    };
  let s = {
    pid: handoverRunner.pid,
    procStart: handoverRunner.proc_start,
  };
  if (env.CCR_AGENT_PROXY_ENABLED)
    return {
      refusal:
        "--session-tunnel does not serve a runner whose session routes git through the agent proxy: it cannot start that relay",
    };
  let { isRunnerSeen } = await import("./chunk-66nm9g6r.js");
  if (!(await isRunnerSeen(s)))
    return {
      refusal: `--session-tunnel cannot see the runner that started it (process ${s.pid}), so it could not tell when that runner is gone`,
    };
  return {
    kind: "runner",
    tunnel: sessionTunnelEnvelope,
    runner: s,
  };
}
//@ chunk-4r034kvt.js:1592-1728 placement
function readHandoverRunner(line) {
  if (line === undefined) return;
  try {
    let e = SessionTunnelLauncherResponseSchema().safeParse(jsonParse(line));
    return e.success ? e.data.runner : "unreadable";
  } catch {
    return "unreadable";
  }
}
//@ chunk-4r034kvt.js:1728-1930 placement
function takeToolServerLauncher(n) {
  let CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN = toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN;
  toolServerEnvAccessor.unset("CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN");
  if (n !== undefined) return n;
  return CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN === undefined
    ? {
        kind: "stdout-reader",
      }
    : {
        kind: "bearer-minter",
        authToken: CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN,
      };
}
export { handedOverBy };
