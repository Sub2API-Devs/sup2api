/**
 * services/mcp/mcpServerOrigin.ts
 *
 * 2.1.316 新增：MCP 服务器配置来源（作用域内原始写法）比对与错误详情脱敏入口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0dnre9n4.js (8), chunk-hfc4cfnt.js (3)
 * attribution: placement 11
 */
import { splitSchemeAuthority, mcpTransportType, describeEndpointOrigin } from "./mcpServerEndpoint.js";
import { maskEnvRefs, splitAroundEnvRefs } from "./envExpansion.js";
import { MCP_SETTINGS_SCOPES, getMcpConfigsByScope, getServerUrl, getServerCommandArray } from "./config.js";
import { isCliOwnedConfig } from "./cliOwnedClients.js";
import { redactMcpErrorText } from "./redactMcpErrors.js";

//@ chunk-hfc4cfnt.js:18314-18392 placement
function originOf(url) {
  return url.origin === "null" || url.protocol === "blob:" ? undefined : url.origin;
}
//@ chunk-hfc4cfnt.js:18392-18493 placement (2.1.88 match: getTransportForUrl, 0.738)
function isNetworkUrl(url) {
  let protocol = URL.parse(url)?.protocol;
  return protocol === "http:" || protocol === "https:" || protocol === "ws:" || protocol === "wss:";
}
//@ chunk-hfc4cfnt.js:18493-18729 placement
function isNetworkReference(url, reference) {
  if (!isNetworkUrl(reference)) return false;
  let referenceParts = splitSchemeAuthority(reference);
  if (URL.parse(referenceParts.scheme + referenceParts.authority)?.host !== URL.parse(reference)?.host)
    return false;
  if (URL.canParse(url) && !isNetworkUrl(url)) return false;
  let serverParts = splitSchemeAuthority(url, maskEnvRefs(url));
  return (
    serverParts.scheme !== "" || splitAroundEnvRefs(serverParts.authority).every((piece) => piece === "")
  );
}
//@ chunk-0dnre9n4.js:401-481 placement
/**
 * 取配置里属于已知设置作用域的 scope。
 */
function settingsScopeOf(config) {
  if (!("scope" in config)) return;
  let scope = config.scope;
  return MCP_SETTINGS_SCOPES.find((candidate) => candidate === scope);
}
//@ chunk-0dnre9n4.js:481-657 placement
function describeMcpServerOrigin(name, config, options) {
  let cliOwned = isCliOwnedConfig(config);
  let originalConfig = findOriginalConfig(name, config);
  if (originalConfig === undefined && settingsScopeOf(config))
    return options?.detail === "origin" ? undefined : mcpTransportType(config);
  return describeEndpointOrigin({
    authoredUnexpanded: originalConfig,
    expanded: config,
    cliOwned,
    detail: options?.detail,
  });
}
//@ chunk-0dnre9n4.js:657-790 placement
function findOriginalConfig(name, serverConfig) {
  let scope = settingsScopeOf(serverConfig);
  if (scope === undefined) return;
  try {
    let original = getMcpConfigsByScope(scope, {
      expandVars: false,
    }).servers[name];
    return original && matchesOriginalConfig(original, serverConfig) ? original : undefined;
  } catch {
    return;
  }
}
//@ chunk-0dnre9n4.js:790-1648 placement
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
        let maskedOriginalUrl = maskEnvRefs(originalUrl);
        let originalParts = splitSchemeAuthority(originalUrl, maskedOriginalUrl);
        let expandedParts = splitSchemeAuthority(expandedUrl);
        let isOnlyEnvRefs = (text) => splitAroundEnvRefs(text).every((part) => part === "");
        if (isOnlyEnvRefs(originalUrl)) return true;
        if (originalParts.scheme === "" && isOnlyEnvRefs(originalParts.authority))
          return matchesEnvTemplate(originalUrl, expandedUrl);
        let index = splitSchemeAuthority(maskedOriginalUrl).authority.lastIndexOf("@");
        let index_2 = expandedParts.authority.lastIndexOf("@");
        if ((index === -1) !== (index_2 === -1)) return false;
        if (originalParts.scheme === "")
          return (
            expandedParts.scheme === "" &&
            !isNetworkUrl(expandedUrl) &&
            matchesEnvTemplate(originalUrl, expandedUrl)
          );
        if (expandedParts.scheme === "") return false;
        return (
          matchesEnvTemplate(originalParts.scheme.toLowerCase(), expandedParts.scheme.toLowerCase()) &&
          (index === -1 ||
            matchesEnvTemplate(
              originalParts.authority.slice(0, index),
              expandedParts.authority.slice(0, index_2),
            )) &&
          matchesEnvTemplate(
            originalParts.authority.slice(index + 1),
            expandedParts.authority.slice(index_2 + 1),
          ) &&
          matchesEnvTemplate(originalParts.rest, expandedParts.rest)
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
      !originalCommand.every((part, index) => matchesEnvTemplate(part, expandedCommand[index] ?? ""))
    )
      return false;
  }
  return (
    templateRecordsMatch(objectField(original, "headers"), objectField(expanded, "headers")) &&
    templateRecordsMatch(objectField(original, "env"), objectField(expanded, "env"))
  );
}
//@ chunk-0dnre9n4.js:1648-1714 placement
/**
 * 取对象上某字段（非对象返回 undefined）。
 */
function objectField(config, field) {
  let value = config[field];
  return value && typeof value === "object" ? value : undefined;
}
//@ chunk-0dnre9n4.js:1714-1870 placement
function templateRecordsMatch(original, expanded) {
  let entries = Object.entries(original ?? {});
  let expandedRecord = expanded ?? {};
  if (entries.length !== Object.keys(expandedRecord).length) return false;
  return entries.every(
    ([key, value]) =>
      typeof expandedRecord[key] === "string" && matchesEnvTemplate(value, expandedRecord[key]),
  );
}
//@ chunk-0dnre9n4.js:1870-2158 placement
function matchesEnvTemplate(template, value) {
  let segments = splitAroundEnvRefs(template);
  if (segments.length === 1) return template === value;
  let head = segments[0] ?? "";
  let tail = segments.at(-1) ?? "";
  if (!value.startsWith(head) || !value.endsWith(tail)) return false;
  let cursor = head.length;
  let tailStart = value.length - tail.length;
  for (let j = 1; j < segments.length - 1; j++) {
    let segment = segments[j] ?? "";
    let index = value.indexOf(segment, cursor);
    if (index === -1 || index + segment.length > tailStart) return false;
    cursor = index + segment.length;
  }
  return cursor <= tailStart;
}
//@ chunk-0dnre9n4.js:2158-2302 placement
function redactMcpErrorDetail(name, config, text) {
  try {
    return redactMcpErrorText(
      text,
      config,
      describeMcpServerOrigin(name, config, {
        detail: "origin",
      }) ?? mcpTransportType(config),
      findOriginalConfig(name, config),
    );
  } catch {
    return "[mcp error detail unavailable: redaction failed]";
  }
}
export { redactMcpErrorDetail, describeMcpServerOrigin, originOf, isNetworkReference, matchesOriginalConfig };
