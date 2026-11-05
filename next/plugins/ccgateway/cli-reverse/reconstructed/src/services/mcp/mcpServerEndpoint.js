/**
 * services/mcp/mcpServerEndpoint.ts
 *
 * 2.1.316 新增：MCP 端点描述与用户信息脱敏
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hfc4cfnt.js (6)
 * attribution: placement 5, layout 1
 */
import { getServerUrl, getServerCommandArray, firstMcpUrlOrDefault } from "./config.js";
import { normalizeEnvRefs, maskEnvRefs, containsEnvRef, splitAroundEnvRefs } from "./envExpansion.js";
import { isNetworkReference, originOf } from "./mcpServerOrigin.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";

//@ chunk-hfc4cfnt.js:16812-16877 placement
function mcpTransportType(config) {
  return config.type ?? ("command" in config ? "stdio" : "unknown");
}
//@ chunk-hfc4cfnt.js:16877-17303 placement
function describeEndpointOrigin(params) {
  let { authoredUnexpanded, expanded, cliOwned } = params;
  let detail = params.detail ?? "endpoint";
  if (authoredUnexpanded) {
    let serverUrl = getServerUrl(authoredUnexpanded);
    if (serverUrl) {
      if (detail === "endpoint") return normalizeEnvRefs(serverUrl);
      if (!isNetworkReference(serverUrl, getServerUrl(expanded) ?? "")) return;
      if (authorityHasEnvRef(serverUrl)) return redactEndpointUserinfo(serverUrl);
      return originOfUrl_2(serverUrl) ?? redactEndpointUserinfo(serverUrl);
    }
    let serverCommandArray = getServerCommandArray(authoredUnexpanded);
    if (serverCommandArray)
      return detail === "endpoint" ? normalizeEnvRefs(serverCommandArray.join(" ")) : undefined;
    return detail === "endpoint" ? mcpTransportType(authoredUnexpanded) : undefined;
  }
  let url = getServerUrl(expanded);
  if (url) {
    let effectiveUrl = cliOwned && isSameOriginAsCcr(url) ? firstMcpUrlOrDefault(url) : url;
    let origin = originOfUrl_2(effectiveUrl);
    if (origin !== undefined) return origin;
  }
  return detail === "endpoint" ? mcpTransportType(expanded) : undefined;
}
//@ chunk-hfc4cfnt.js:17303-17360 placement
/**
 * 取 URL 的 origin（无效或为 null 时 undefined）。
 */
function originOfUrl_2(url) {
  let parsed = URL.parse(url);
  return parsed ? originOf(parsed) : undefined;
}
//@ chunk-hfc4cfnt.js:17360-17653 placement
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
//@ chunk-hfc4cfnt.js:17653-17714 layout
function authorityHasEnvRef(serverUrl) {
  return splitSchemeAuthority(serverUrl, maskEnvRefs(serverUrl)).authority.includes("${");
}
//@ chunk-hfc4cfnt.js:17714-18314 placement
function redactEndpointUserinfo(serverUrl) {
  let masked = maskEnvRefs(serverUrl);
  let { scheme, authority } = splitSchemeAuthority(masked);
  let schemeEnd = scheme.length;
  let authorityStart = schemeEnd + authority.length;
  if (masked.includes("@", authorityStart))
    return normalizeEnvRefs(serverUrl.slice(0, schemeEnd)) + "[unparseable-authority]";
  let index = authority.lastIndexOf("@");
  let atIndex = index === -1 ? schemeEnd : schemeEnd + index + 1;
  let sliced = serverUrl.slice(atIndex, authorityStart);
  if (sliced === "") return;
  let userinfoStart = serverUrl.slice(0, schemeEnd) + sliced;
  if (!containsEnvRef(userinfoStart)) return originOfUrl_2(userinfoStart);
  let sliced_2 = masked.slice(atIndex, authorityStart);
  if (/[\u0000-\u0020\u007f]/.test(sliced_2)) return;
  let maskedAuthority = sliced_2.replace(/:[^:\]]*$/, "").length;
  let hostLength = splitAroundEnvRefs(sliced.slice(0, maskedAuthority));
  let sliced_3 = hostLength.slice(0, -1);
  if (
    sliced_3.some((label) => /[^.]/.test(label)) ||
    (sliced_3.length > 0 && /^[^.]/.test(hostLength.at(-1) ?? ""))
  )
    return;
  let joined = hostLength.join("x");
  if (/[^!-~]/.test(joined) || URL.parse(`https://${joined}`)?.hostname !== joined.toLowerCase()) return;
  return normalizeEnvRefs(userinfoStart);
}
export { splitSchemeAuthority, mcpTransportType, describeEndpointOrigin, originOfUrl_2 };
