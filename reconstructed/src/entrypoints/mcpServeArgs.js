/**
 * entrypoints/mcpServeArgs.ts
 *
 * 2.1.316 新增：mcp serve 的 HTTP/远程宿主判定参数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xvx41pwz.js (3)
 * attribution: placement 3
 */
import { isEnvTruthy } from "../utils/envUtils.js";

//@ chunk-xvx41pwz.js:227-350 placement
function isRemoteMcpServeHost() {
  return (
    isEnvTruthy(process.env.CLAUDE_CODE_REMOTE) &&
    String(process.env.CLAUDE_CODE_ENVIRONMENT_KIND ?? "").trim() === ""
  );
}
//@ chunk-xvx41pwz.js:350-473 placement
var HTTP_SERVE_ARG_PATTERN =
  /^(?:--port(?:=\d+)?|\d+|--result-format(?:=(?:raw|rendered))?|raw|rendered|--session-tunnel|--debug|-d|--verbose)$/;
//@ chunk-xvx41pwz.js:473-710 placement
function isHttpMcpServeInvocation() {
  {
    let argv = process.argv;
    if (argv[2] !== "mcp" || argv[3] !== "serve") return false;
    let [, , t, ...r] = argv.slice(2);
    let n = t === "--transport=http" ? r : t === "--transport" && r[0] === "http" ? r.slice(1) : undefined;
    return isRemoteMcpServeHost() && n !== undefined && n.every((o) => HTTP_SERVE_ARG_PATTERN.test(o));
  }
  return false;
}
export { isHttpMcpServeInvocation, isRemoteMcpServeHost };
