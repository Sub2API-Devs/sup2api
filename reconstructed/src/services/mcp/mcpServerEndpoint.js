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
import { M1e, zOn } from "./envExpansion.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";

//@ chunk-1wpnxx5r.js:16647-16712 placement
function mcpTransportType(e) {
  return e.type ?? ("command" in e ? "stdio" : "unknown");
}
//@ chunk-1wpnxx5r.js:16712-17106 placement
function describeEndpointOrigin(e) {
  let { authoredUnexpanded: authoredUnexpanded, expanded: expanded, cliOwned: cliOwned } = e,
    s = e.detail ?? "endpoint";
  if (authoredUnexpanded) {
    let i = getServerUrl(authoredUnexpanded);
    if (i) {
      if (s === "endpoint") return M1e(i);
      if (Le(i)) return redactEndpointUserinfo(i);
      return K(i) ?? redactEndpointUserinfo(i);
    }
    let a = getServerCommandArray(authoredUnexpanded);
    if (a) return s === "endpoint" ? M1e(a.join(" ")) : void 0;
    return s === "endpoint" ? mcpTransportType(authoredUnexpanded) : void 0;
  }
  let o = getServerUrl(expanded);
  if (o) {
    let i = cliOwned && isSameOriginAsCcr(o) ? unwrapCcrProxyUrl(o) : o,
      a = K(i);
    if (a !== void 0) return a;
  }
  return s === "endpoint" ? mcpTransportType(expanded) : void 0;
}
//@ chunk-1wpnxx5r.js:17106-17189 placement
function K(e) {
  try {
    let origin = new URL(e).origin;
    return origin === "null" ? void 0 : origin;
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
    },
    index = r.indexOf("://"),
    s = index !== -1 && index < n(0) && /^[A-Za-z][A-Za-z0-9+.-]*$/.test(r.slice(0, index)) ? index + 3 : 0,
    o = n(s);
  return { scheme: e.slice(0, s), authority: e.slice(s, o), rest: e.slice(o) };
}
//@ chunk-1wpnxx5r.js:17482-17543 placement
function Le(e) {
  return splitSchemeAuthority(e, zOn(e)).authority.includes("${");
}
//@ chunk-1wpnxx5r.js:17543-17793 placement
function redactEndpointUserinfo(e) {
  let r = zOn(e),
    { scheme: scheme, authority: authority } = splitSchemeAuthority(r),
    s = scheme.length,
    o = s + authority.length;
  if (r.includes("@", o)) return M1e(e.slice(0, s)) + "[unparseable-authority]";
  let index = authority.lastIndexOf("@"),
    sliced = e.slice(index === -1 ? s : s + index + 1, o);
  if (sliced === "") return;
  return M1e(e.slice(0, s) + sliced);
}

export { describeEndpointOrigin, mcpTransportType, splitSchemeAuthority };
