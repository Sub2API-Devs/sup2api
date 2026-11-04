/**
 * entrypoints/sessionTunnelInput.ts
 *
 * 2.1.316 新增。读取 --session-tunnel 的标准输入行（OAuth 令牌、代理令牌与变量）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e38pv7hv.js (5)
 * attribution: placement 5
 */
import { openSync, closeSync } from "fs";
import { devNull } from "os";
import { HostScoped } from "../utils/hostScoped.js";
import { isHttpMcpServeInvocation } from "./mcpServeArgs.js";
import { disableCoreDumps } from "../utils/processHardening.js";
import { logForDebugging } from "../utils/debug.js";
import { readFromInheritedDescriptor, getOAuthTokenFromFileDescriptor } from "../utils/authFileDescriptor.js";
import {
  onProcessRootHost,
  setOauthTokenFromFd,
  markDescriptorAnnouncementConsumed,
} from "../bootstrap/state.js";
import { jsonParseRaw } from "../utils/slowOperations.js";
import { setToolServerLaunchEnv } from "../utils/managedEnvApply.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e38pv7hv.js:530-543 placement
class LineCounter {
  line;
}
//@ chunk-e38pv7hv.js:543-566 placement
var lineCounterSlot; // deferred: uses LineCounter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e38pv7hv.js:543", () => {
  lineCounterSlot = new HostScoped(() => new LineCounter());
});
//@ chunk-e38pv7hv.js:566-1376 placement
/**
 * 读取 --session-tunnel 的标准输入行（OAuth 令牌、代理令牌与变量）。
 */
function readSessionTunnelInput(fd = 0) {
  {
    if (!process.argv.includes("--session-tunnel") || !isHttpMcpServeInvocation()) return;
    disableCoreDumps((message) =>
      logForDebugging(`[session tunnel] ${message}`, {
        level: "warn",
      }),
    );
    let line = readFromInheritedDescriptor(fd, "the session tunnel's line of JSON") ?? undefined;
    onProcessRootHost(lineCounterSlot).line = line;
    let nullFd = openSync(devNull, "r");
    if (nullFd !== fd) closeSync(nullFd);
    let payload;
    try {
      payload = jsonParseRaw(line ?? "null");
    } catch {
      payload = null;
    }
    let oauthToken = typeof payload?.oauth_token === "string" ? payload.oauth_token.trim() : "";
    let agentProxyToken =
      typeof payload?.agent_proxy_token === "string" ? payload.agent_proxy_token.trim() : "";
    if (oauthToken !== "") {
      getOAuthTokenFromFileDescriptor();
      setOauthTokenFromFd(oauthToken);
      markDescriptorAnnouncementConsumed("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR");
    }
    let envPairs =
      typeof payload?.env === "object" && payload.env !== null && !Array.isArray(payload.env)
        ? Object.entries(payload.env)
        : [];
    let env = {};
    for (let [key, value] of envPairs) if (typeof value === "string") env[key] = value;
    setToolServerLaunchEnv(env);
    logForDebugging(
      `[session tunnel] the line has ${oauthToken === "" ? "no" : "an"} OAuth token, ${agentProxyToken === "" ? "no" : "an"} agent proxy token; variables: ${Object.keys(env).length} of ${envPairs.length}`,
    );
    return agentProxyToken === "" ? undefined : agentProxyToken;
  }
  return;
}
//@ chunk-e38pv7hv.js:1376-1409 placement
function peekSessionTunnelInput() {
  return onProcessRootHost(lineCounterSlot).line;
}
//@ chunk-e38pv7hv.js:1409-1468 placement
function takeSessionTunnelInput() {
  let state = onProcessRootHost(lineCounterSlot);
  let line = state.line;
  state.line = undefined;
  return line;
}
export { takeSessionTunnelInput, readSessionTunnelInput, peekSessionTunnelInput };
