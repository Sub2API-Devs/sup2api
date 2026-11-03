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

//@ chunk-e38pv7hv.js:530-543 placement
class LineCounter {
  line;
}
//@ chunk-e38pv7hv.js:543-566 placement
var lineCounterSlot = new HostScoped(() => new LineCounter());
//@ chunk-e38pv7hv.js:566-1376 placement
/**
 * 读取 --session-tunnel 的标准输入行（OAuth 令牌、代理令牌与变量）。
 */
function readSessionTunnelInput(e = 0) {
  {
    if (!process.argv.includes("--session-tunnel") || !isHttpMcpServeInvocation()) return;
    disableCoreDumps((u) =>
      logForDebugging(`[session tunnel] ${u}`, {
        level: "warn",
      }),
    );
    let o = readFromInheritedDescriptor(e, "the session tunnel's line of JSON") ?? undefined;
    onProcessRootHost(lineCounterSlot).line = o;
    let f = openSync(devNull, "r");
    if (f !== e) closeSync(f);
    let n;
    try {
      n = jsonParseRaw(o ?? "null");
    } catch {
      n = null;
    }
    let r = typeof n?.oauth_token === "string" ? n.oauth_token.trim() : "";
    let i = typeof n?.agent_proxy_token === "string" ? n.agent_proxy_token.trim() : "";
    if (r !== "") {
      getOAuthTokenFromFileDescriptor();
      setOauthTokenFromFd(r);
      markDescriptorAnnouncementConsumed("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR");
    }
    let a =
      typeof n?.env === "object" && n.env !== null && !Array.isArray(n.env) ? Object.entries(n.env) : [];
    let s = {};
    for (let [u, m] of a) if (typeof m === "string") s[u] = m;
    setToolServerLaunchEnv(s);
    logForDebugging(
      `[session tunnel] the line has ${r === "" ? "no" : "an"} OAuth token, ${i === "" ? "no" : "an"} agent proxy token; variables: ${Object.keys(s).length} of ${a.length}`,
    );
    return i === "" ? undefined : i;
  }
  return;
}
//@ chunk-e38pv7hv.js:1376-1409 placement
function peekSessionTunnelInput() {
  return onProcessRootHost(lineCounterSlot).line;
}
//@ chunk-e38pv7hv.js:1409-1468 placement
function takeSessionTunnelInput() {
  let e = onProcessRootHost(lineCounterSlot);
  let line = e.line;
  e.line = undefined;
  return line;
}
export { takeSessionTunnelInput, readSessionTunnelInput };
