/**
 * entrypoints/mcpServeArgs.ts
 *
 * 2.1.316 新增：mcp serve 的 HTTP/远程宿主判定参数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-daj7hxcs.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isEnvTruthy } from "../utils/envUtils.js";

//@ chunk-daj7hxcs.js:227-350 placement
function isRemoteMcpServeHost() {
  return (
    isEnvTruthy(process.env.CLAUDE_CODE_REMOTE) &&
    String(process.env.CLAUDE_CODE_ENVIRONMENT_KIND ?? "").trim() === ""
  );
}
//@ chunk-daj7hxcs.js:350-473 placement
var HTTP_SERVE_ARG_PATTERN =
  /^(?:--port(?:=\d+)?|\d+|--result-format(?:=(?:raw|rendered))?|raw|rendered|--session-tunnel|--debug|-d|--verbose)$/;
//@ chunk-daj7hxcs.js:473-710 placement
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
