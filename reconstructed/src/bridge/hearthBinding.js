/**
 * bridge/hearthBinding.ts
 *
 * 2.1.316 新增。解析 hearth 工作者绑定（项目线程回复的 MCP 挂载信息），校验 id、服务名与地址来源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9wab212f.js (4)
 * attribution: placement 4
 */
import { Hcs, HEARTHBOT, Ncs, HEARTH_TOOL_NAMES } from "../services/mcp/ccrMetaMcp.js";
import { logForDebugging } from "../utils/debug.js";
import { originIfValid } from "../services/mcp/ccrMcpUrls.js";
import { parseMetaMcpTools } from "./metaMcpTools.js";
import { validateBridgeId } from "./sessionIdCompat.js";

//@ chunk-9wab212f.js:384-417 placement
var HEARTH_BINDING_CHANGED_HINT = "hearth_binding_changed";
/**
 * 解析 hearth 工作者绑定（项目线程回复的 MCP 挂载信息），校验 id、服务名与地址来源。
 */
//@ chunk-9wab212f.js:417-1942 placement
function decodeHearthWorkerBinding(e, n) {
  if (e === null || typeof e !== "object" || !("hearth" in e)) return { binding: null, reason: "not_joined" };
  let hearth = e.hearth;
  if (hearth === null || typeof hearth !== "object") return { binding: null, reason: "not_joined" };
  let i = hearth,
    l = typeof i.channel_id === "string" ? i.channel_id : "",
    u = typeof i.thread_id === "string" ? i.thread_id : "";
  if (!Hcs.test(l) || !Hcs.test(u))
    return (
      logForDebugging("[bridge:projects] binding ids are malformed \u2014 no mount", { level: "warn" }),
      { binding: null, reason: "bad_ids" }
    );
  let mcp_server = i.mcp_server;
  if (mcp_server === null || typeof mcp_server !== "object")
    return { binding: null, reason: "bad_server_name" };
  let o = mcp_server;
  if (o.name !== HEARTHBOT)
    return (
      logForDebugging("[bridge:projects] binding names an unexpected MCP server \u2014 no mount", {
        level: "warn",
      }),
      { binding: null, reason: "bad_server_name" }
    );
  if (o.type !== "http" || typeof o.url !== "string") return { binding: null, reason: "not_http" };
  let d = originIfValid(n.apiBaseUrl);
  if (d === null)
    return (
      logForDebugging("[bridge:projects] api base is not an approved ingress origin \u2014 no mount", {
        level: "warn",
      }),
      { binding: null, reason: "untrusted_origin" }
    );
  let c = `${d}${Ncs(n.sessionId)}`,
    r;
  try {
    r = new URL(o.url);
  } catch {
    return { binding: null, reason: "url_mismatch" };
  }
  if (
    r.origin !== d ||
    r.pathname !== Ncs(n.sessionId) ||
    r.search !== "" ||
    r.hash !== "" ||
    r.username !== "" ||
    r.password !== ""
  )
    return (
      logForDebugging(
        "[bridge:projects] binding url is not this session\u2019s hearthbot mount on our own api base \u2014 no mount",
        { level: "warn" },
      ),
      { binding: null, reason: "url_mismatch" }
    );
  let g = parseMetaMcpTools(o, HEARTHBOT);
  if (!g) return { binding: null, reason: "bad_tools" };
  let filtered = g.filter((_) => HEARTH_TOOL_NAMES.has(_));
  return { binding: { channelId: l, threadId: u, mountUrl: c, autoAllowTools: filtered } };
}
//@ chunk-9wab212f.js:1942-1988 placement
var p = /^(.*)\/v1\/code\/sessions\/([^/?#]+)$/;
//@ chunk-9wab212f.js:1988-2150 placement
function parseBridgeSdkUrl(e) {
  if (!e) return null;
  let match = p.exec(e);
  if (!match?.[1] || !match[2]) return null;
  try {
    validateBridgeId(match[2], "sessionId");
  } catch {
    return null;
  }
  return { apiBaseUrl: match[1], sessionId: match[2] };
}

export { decodeHearthWorkerBinding };
