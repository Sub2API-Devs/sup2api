/**
 * services/mcp/mcpServerOrigin.ts
 *
 * 2.1.316 新增：MCP 服务器配置来源（作用域内原始写法）比对与错误详情脱敏入口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h6jp5m72.js (9)
 * attribution: placement 9
 */
import { MCP_SETTINGS_SCOPES, getMcpConfigsByScope, getServerUrl, getServerCommandArray } from "./config.js";
import { Zl } from "./cliOwnedClients.js";
import { mcpTransportType, describeEndpointOrigin, splitSchemeAuthority } from "./mcpServerEndpoint.js";
import { zOn, splitAroundEnvRefs } from "./envExpansion.js";
import { redactMcpErrorText } from "./redactMcpErrors.js";

//@ chunk-h6jp5m72.js:397-477 placement
function m(t) {
  if (!("scope" in t)) return;
  let scope = t.scope;
  return MCP_SETTINGS_SCOPES.find((n) => n === scope);
}
//@ chunk-h6jp5m72.js:477-653 placement
function describeMcpServerOrigin(t, e, n) {
  let r = Zl(e),
    i = findOriginalConfig(t, e);
  if (i === void 0 && m(e)) return n?.detail === "origin" ? void 0 : mcpTransportType(e);
  return describeEndpointOrigin({ authoredUnexpanded: i, expanded: e, cliOwned: r, detail: n?.detail });
}
//@ chunk-h6jp5m72.js:653-786 placement
function findOriginalConfig(t, e) {
  let n = m(e);
  if (n === void 0) return;
  try {
    let r = getMcpConfigsByScope(n, { expandVars: !1 }).servers[t];
    return r && matchesOriginalConfig(r, e) ? r : void 0;
  } catch {
    return;
  }
}
//@ chunk-h6jp5m72.js:786-912 placement
function isNetworkUrl(t) {
  if (!URL.canParse(t)) return !1;
  let { protocol: protocol } = new URL(t);
  return protocol === "http:" || protocol === "https:" || protocol === "ws:" || protocol === "wss:";
}
/**
 * 判断一份展开后的 MCP 配置是否来自某份原始写法（含 ${VAR}）：类型相同，URL 按 scheme/认证信息/主机/其余部分分段做模板匹配，命令数组逐项匹配，headers 与 env 键值一一模板匹配。
 */
//@ chunk-h6jp5m72.js:912-1768 placement
function matchesOriginalConfig(original, expanded) {
  if ((original.type ?? "stdio") !== (expanded.type ?? "stdio")) return !1;
  let originalUrl = getServerUrl(original),
    expandedUrl = getServerUrl(expanded);
  if (originalUrl !== null || expandedUrl !== null) {
    if (
      !(() => {
        if (originalUrl === null || expandedUrl === null) return !1;
        let l = zOn(originalUrl),
          o = splitSchemeAuthority(originalUrl, l),
          s = splitSchemeAuthority(expandedUrl),
          g = (C) => splitAroundEnvRefs(C).every((y) => y === "");
        if (g(originalUrl)) return !0;
        if (o.scheme === "" && g(o.authority)) return matchesEnvTemplate(originalUrl, expandedUrl);
        let index = splitSchemeAuthority(l).authority.lastIndexOf("@"),
          index_2 = s.authority.lastIndexOf("@");
        if ((index === -1) !== (index_2 === -1)) return !1;
        if (o.scheme === "")
          return (
            s.scheme === "" && !isNetworkUrl(expandedUrl) && matchesEnvTemplate(originalUrl, expandedUrl)
          );
        if (s.scheme === "") return !1;
        return (
          matchesEnvTemplate(o.scheme.toLowerCase(), s.scheme.toLowerCase()) &&
          (index === -1 || matchesEnvTemplate(o.authority.slice(0, index), s.authority.slice(0, index_2))) &&
          matchesEnvTemplate(o.authority.slice(index + 1), s.authority.slice(index_2 + 1)) &&
          matchesEnvTemplate(o.rest, s.rest)
        );
      })()
    )
      return !1;
  }
  let originalCommand = getServerCommandArray(original),
    expandedCommand = getServerCommandArray(expanded);
  if (originalCommand !== null || expandedCommand !== null) {
    if (
      originalCommand === null ||
      expandedCommand === null ||
      originalCommand.length !== expandedCommand.length ||
      !originalCommand.every((u, l) => matchesEnvTemplate(u, expandedCommand[l] ?? ""))
    )
      return !1;
  }
  return (
    templateRecordsMatch(p(original, "headers"), p(expanded, "headers")) &&
    templateRecordsMatch(p(original, "env"), p(expanded, "env"))
  );
}
//@ chunk-h6jp5m72.js:1768-1834 placement
function p(t, e) {
  let n = t[e];
  return n && typeof n === "object" ? n : void 0;
}
//@ chunk-h6jp5m72.js:1834-1990 placement
function templateRecordsMatch(t, e) {
  let entries = Object.entries(t ?? {}),
    r = e ?? {};
  if (entries.length !== Object.keys(r).length) return !1;
  return entries.every(([i, c]) => typeof r[i] === "string" && matchesEnvTemplate(c, r[i]));
}
//@ chunk-h6jp5m72.js:1990-2278 placement
function matchesEnvTemplate(t, e) {
  let n = splitAroundEnvRefs(t);
  if (n.length === 1) return t === e;
  let r = n[0] ?? "",
    i = n.at(-1) ?? "";
  if (!e.startsWith(r) || !e.endsWith(i)) return !1;
  let c = r.length,
    u = e.length - i.length;
  for (let l = 1; l < n.length - 1; l++) {
    let o = n[l] ?? "",
      index = e.indexOf(o, c);
    if (index === -1 || index + o.length > u) return !1;
    c = index + o.length;
  }
  return c <= u;
}
//@ chunk-h6jp5m72.js:2278-2422 placement
function redactMcpErrorDetail(t, e, n) {
  try {
    return redactMcpErrorText(
      n,
      e,
      describeMcpServerOrigin(t, e, { detail: "origin" }) ?? mcpTransportType(e),
      findOriginalConfig(t, e),
    );
  } catch {
    return "[mcp error detail unavailable: redaction failed]";
  }
}

export { redactMcpErrorDetail, describeMcpServerOrigin, matchesOriginalConfig };
