/**
 * services/mcp/mcpServerEndpoint.ts
 *
 * 2.1.316 新增：MCP 端点描述与用户信息脱敏
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1wpnxx5r.js (6)
 * attribution: placement 6
 */
import { getServerUrl, getServerCommandArray, unwrapCcrProxyUrl } from "./config.js";
import { normalizeEnvRefs, maskEnvRefs } from "./envExpansion.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";

//@ chunk-1wpnxx5r.js:16647-16712 placement
function mcpTransportType(e) {
  return e.type ?? ("command" in e ? "stdio" : "unknown");
}
//@ chunk-1wpnxx5r.js:16712-17106 placement
function describeEndpointOrigin(e) {
  let { authoredUnexpanded, expanded, cliOwned } = e;
  let detail = e.detail ?? "endpoint";
  if (authoredUnexpanded) {
    let serverUrl = getServerUrl(authoredUnexpanded);
    if (serverUrl) {
      if (detail === "endpoint") return normalizeEnvRefs(serverUrl);
      if (authorityHasEnvRef(serverUrl)) return redactEndpointUserinfo(serverUrl);
      return originOfUrl(serverUrl) ?? redactEndpointUserinfo(serverUrl);
    }
    let serverCommandArray = getServerCommandArray(authoredUnexpanded);
    if (serverCommandArray)
      return detail === "endpoint" ? normalizeEnvRefs(serverCommandArray.join(" ")) : undefined;
    return detail === "endpoint" ? mcpTransportType(authoredUnexpanded) : undefined;
  }
  let url = getServerUrl(expanded);
  if (url) {
    let i = cliOwned && isSameOriginAsCcr(url) ? unwrapCcrProxyUrl(url) : url;
    let a = originOfUrl(i);
    if (a !== undefined) return a;
  }
  return detail === "endpoint" ? mcpTransportType(expanded) : undefined;
}
//@ chunk-1wpnxx5r.js:17106-17189 placement
/**
 * 取 URL 的 origin（无效或为 null 时 undefined）。
 */
function originOfUrl(e) {
  try {
    let origin = new URL(e).origin;
    return origin === "null" ? undefined : origin;
  } catch {
    return;
  }
}
//@ chunk-1wpnxx5r.js:17189-17482 placement
function splitSchemeAuthority(e, r = e) {
  let n = (i) => {
    let a = e.length;
    for (let l of ["/", "?", "#", "\\"]) {
      let index = r.indexOf(l, i);
      if (index !== -1 && index < a) a = index;
    }
    return a;
  };
  let index = r.indexOf("://");
  let s = index !== -1 && index < n(0) && /^[A-Za-z][A-Za-z0-9+.-]*$/.test(r.slice(0, index)) ? index + 3 : 0;
  let o = n(s);
  return {
    scheme: e.slice(0, s),
    authority: e.slice(s, o),
    rest: e.slice(o),
  };
}
//@ chunk-1wpnxx5r.js:17482-17543 placement
/**
 * 判断地址的 authority 部分是否含未展开的 ${...}。
 */
function authorityHasEnvRef(serverUrl) {
  return splitSchemeAuthority(serverUrl, maskEnvRefs(serverUrl)).authority.includes("${");
}
//@ chunk-1wpnxx5r.js:17543-17793 placement
function redactEndpointUserinfo(serverUrl) {
  let r = maskEnvRefs(serverUrl);
  let { scheme, authority } = splitSchemeAuthority(r);
  let s = scheme.length;
  let o = s + authority.length;
  if (r.includes("@", o)) return normalizeEnvRefs(serverUrl.slice(0, s)) + "[unparseable-authority]";
  let index = authority.lastIndexOf("@");
  let sliced = serverUrl.slice(index === -1 ? s : s + index + 1, o);
  if (sliced === "") return;
  return normalizeEnvRefs(serverUrl.slice(0, s) + sliced);
}
export { describeEndpointOrigin, mcpTransportType, splitSchemeAuthority };
