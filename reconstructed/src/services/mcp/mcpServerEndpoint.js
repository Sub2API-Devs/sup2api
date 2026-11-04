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
function mcpTransportType(config) {
  return config.type ?? ("command" in config ? "stdio" : "unknown");
}
//@ chunk-1wpnxx5r.js:16712-17106 placement
function describeEndpointOrigin(params) {
  let { authoredUnexpanded, expanded, cliOwned } = params;
  let detail = params.detail ?? "endpoint";
  if (authoredUnexpanded) {
    let url = getServerUrl(authoredUnexpanded);
    if (url) {
      if (detail === "endpoint") return normalizeEnvRefs(url);
      if (authorityHasEnvRef(url)) return redactEndpointUserinfo(url);
      return originOfUrl(url) ?? redactEndpointUserinfo(url);
    }
    let serverCommandArray = getServerCommandArray(authoredUnexpanded);
    if (serverCommandArray)
      return detail === "endpoint" ? normalizeEnvRefs(serverCommandArray.join(" ")) : undefined;
    return detail === "endpoint" ? mcpTransportType(authoredUnexpanded) : undefined;
  }
  let url = getServerUrl(expanded);
  if (url) {
    let effectiveUrl = cliOwned && isSameOriginAsCcr(url) ? unwrapCcrProxyUrl(url) : url;
    let origin = originOfUrl(effectiveUrl);
    if (origin !== undefined) return origin;
  }
  return detail === "endpoint" ? mcpTransportType(expanded) : undefined;
}
//@ chunk-1wpnxx5r.js:17106-17189 placement
/**
 * 取 URL 的 origin（无效或为 null 时 undefined）。
 */
function originOfUrl(url) {
  try {
    let origin = new URL(url).origin;
    return origin === "null" ? undefined : origin;
  } catch {
    return;
  }
}
//@ chunk-1wpnxx5r.js:17189-17482 placement
function splitSchemeAuthority(text, masked = text) {
  let authorityEnd = (fromIndex) => {
    let endIndex = text.length;
    for (let delimiter of ["/", "?", "#", "\\"]) {
      let index = masked.indexOf(delimiter, fromIndex);
      if (index !== -1 && index < endIndex) endIndex = index;
    }
    return endIndex;
  };
  let index = masked.indexOf("://");
  let authorityStart =
    index !== -1 && index < authorityEnd(0) && /^[A-Za-z][A-Za-z0-9+.-]*$/.test(masked.slice(0, index))
      ? index + 3
      : 0;
  let authorityEndIndex = authorityEnd(authorityStart);
  return {
    scheme: text.slice(0, authorityStart),
    authority: text.slice(authorityStart, authorityEndIndex),
    rest: text.slice(authorityEndIndex),
  };
}
//@ chunk-1wpnxx5r.js:17482-17543 placement
/**
 * 判断地址的 authority 部分是否含未展开的 ${...}。
 */
function authorityHasEnvRef(text) {
  return splitSchemeAuthority(text, maskEnvRefs(text)).authority.includes("${");
}
//@ chunk-1wpnxx5r.js:17543-17793 placement
function redactEndpointUserinfo(text) {
  let masked = maskEnvRefs(text);
  let { scheme, authority } = splitSchemeAuthority(masked);
  let schemeEnd = scheme.length;
  let authorityEnd = schemeEnd + authority.length;
  if (masked.includes("@", authorityEnd))
    return normalizeEnvRefs(text.slice(0, schemeEnd)) + "[unparseable-authority]";
  let index = authority.lastIndexOf("@");
  let sliced = text.slice(index === -1 ? schemeEnd : schemeEnd + index + 1, authorityEnd);
  if (sliced === "") return;
  return normalizeEnvRefs(text.slice(0, schemeEnd) + sliced);
}
export { describeEndpointOrigin, mcpTransportType, splitSchemeAuthority };
