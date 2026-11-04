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
    let [, , first, ...rest] = argv.slice(2);
    let httpArgs =
      first === "--transport=http"
        ? rest
        : first === "--transport" && rest[0] === "http"
          ? rest.slice(1)
          : undefined;
    return (
      isRemoteMcpServeHost() &&
      httpArgs !== undefined &&
      httpArgs.every((arg) => HTTP_SERVE_ARG_PATTERN.test(arg))
    );
  }
  return false;
}
export { isHttpMcpServeInvocation, isRemoteMcpServeHost };
