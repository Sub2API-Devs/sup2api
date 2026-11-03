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
import { isCliOwnedConfig } from "./cliOwnedClients.js";
import { mcpTransportType, describeEndpointOrigin, splitSchemeAuthority } from "./mcpServerEndpoint.js";
import { maskEnvRefs, splitAroundEnvRefs } from "./envExpansion.js";
import { redactMcpErrorText } from "./redactMcpErrors.js";

//@ chunk-h6jp5m72.js:397-477 placement
/**
 * 取配置里属于已知设置作用域的 scope。
 */
function settingsScopeOf(t) {
  if (!("scope" in t)) return;
  let scope = t.scope;
  return MCP_SETTINGS_SCOPES.find((n) => n === scope);
}
//@ chunk-h6jp5m72.js:477-653 placement
function describeMcpServerOrigin(name, config, n) {
  let cliOwned = isCliOwnedConfig(config);
  let originalConfig = findOriginalConfig(name, config);
  if (originalConfig === undefined && settingsScopeOf(config))
    return n?.detail === "origin" ? undefined : mcpTransportType(config);
  return describeEndpointOrigin({
    authoredUnexpanded: originalConfig,
    expanded: config,
    cliOwned,
    detail: n?.detail,
  });
}
//@ chunk-h6jp5m72.js:653-786 placement
function findOriginalConfig(t, expanded) {
  let n = settingsScopeOf(expanded);
  if (n === undefined) return;
  try {
    let original = getMcpConfigsByScope(n, {
      expandVars: false,
    }).servers[t];
    return original && matchesOriginalConfig(original, expanded) ? original : undefined;
  } catch {
    return;
  }
}
//@ chunk-h6jp5m72.js:786-912 placement
function isNetworkUrl(expandedUrl) {
  if (!URL.canParse(expandedUrl)) return false;
  let { protocol } = new URL(expandedUrl);
  return protocol === "http:" || protocol === "https:" || protocol === "ws:" || protocol === "wss:";
}
//@ chunk-h6jp5m72.js:912-1768 placement
/**
 * 判断一份展开后的 MCP 配置是否来自某份原始写法（含 ${VAR}）：类型相同，URL 按 scheme/认证信息/主机/其余部分分段做模板匹配，命令数组逐项匹配，headers 与 env 键值一一模板匹配。
 */
function matchesOriginalConfig(original, expanded) {
  if ((original.type ?? "stdio") !== (expanded.type ?? "stdio")) return false;
  let originalUrl = getServerUrl(original);
  let expandedUrl = getServerUrl(expanded);
  if (originalUrl !== null || expandedUrl !== null) {
    if (
      !(() => {
        if (originalUrl === null || expandedUrl === null) return false;
        let l = maskEnvRefs(originalUrl);
        let o = splitSchemeAuthority(originalUrl, l);
        let s = splitSchemeAuthority(expandedUrl);
        let g = (C) => splitAroundEnvRefs(C).every((y) => y === "");
        if (g(originalUrl)) return true;
        if (o.scheme === "" && g(o.authority)) return matchesEnvTemplate(originalUrl, expandedUrl);
        let index = splitSchemeAuthority(l).authority.lastIndexOf("@");
        let index_2 = s.authority.lastIndexOf("@");
        if ((index === -1) !== (index_2 === -1)) return false;
        if (o.scheme === "")
          return (
            s.scheme === "" && !isNetworkUrl(expandedUrl) && matchesEnvTemplate(originalUrl, expandedUrl)
          );
        if (s.scheme === "") return false;
        return (
          matchesEnvTemplate(o.scheme.toLowerCase(), s.scheme.toLowerCase()) &&
          (index === -1 || matchesEnvTemplate(o.authority.slice(0, index), s.authority.slice(0, index_2))) &&
          matchesEnvTemplate(o.authority.slice(index + 1), s.authority.slice(index_2 + 1)) &&
          matchesEnvTemplate(o.rest, s.rest)
        );
      })()
    )
      return false;
  }
  let originalCommand = getServerCommandArray(original);
  let expandedCommand = getServerCommandArray(expanded);
  if (originalCommand !== null || expandedCommand !== null) {
    if (
      originalCommand === null ||
      expandedCommand === null ||
      originalCommand.length !== expandedCommand.length ||
      !originalCommand.every((u, l) => matchesEnvTemplate(u, expandedCommand[l] ?? ""))
    )
      return false;
  }
  return (
    templateRecordsMatch(objectField(original, "headers"), objectField(expanded, "headers")) &&
    templateRecordsMatch(objectField(original, "env"), objectField(expanded, "env"))
  );
}
//@ chunk-h6jp5m72.js:1768-1834 placement
/**
 * 取对象上某字段（非对象返回 undefined）。
 */
function objectField(t, e) {
  let n = t[e];
  return n && typeof n === "object" ? n : undefined;
}
//@ chunk-h6jp5m72.js:1834-1990 placement
function templateRecordsMatch(t, e) {
  let entries = Object.entries(t ?? {});
  let r = e ?? {};
  if (entries.length !== Object.keys(r).length) return false;
  return entries.every(([i, c]) => typeof r[i] === "string" && matchesEnvTemplate(c, r[i]));
}
//@ chunk-h6jp5m72.js:1990-2278 placement
function matchesEnvTemplate(t, e) {
  let n = splitAroundEnvRefs(t);
  if (n.length === 1) return t === e;
  let r = n[0] ?? "";
  let i = n.at(-1) ?? "";
  if (!e.startsWith(r) || !e.endsWith(i)) return false;
  let c = r.length;
  let u = e.length - i.length;
  for (let j = 1; j < n.length - 1; j++) {
    let o = n[j] ?? "";
    let index = e.indexOf(o, c);
    if (index === -1 || index + o.length > u) return false;
    c = index + o.length;
  }
  return c <= u;
}
//@ chunk-h6jp5m72.js:2278-2422 placement
function redactMcpErrorDetail(t, config, n) {
  try {
    return redactMcpErrorText(
      n,
      config,
      describeMcpServerOrigin(t, config, {
        detail: "origin",
      }) ?? mcpTransportType(config),
      findOriginalConfig(t, config),
    );
  } catch {
    return "[mcp error detail unavailable: redaction failed]";
  }
}
export { redactMcpErrorDetail, describeMcpServerOrigin, matchesOriginalConfig };
