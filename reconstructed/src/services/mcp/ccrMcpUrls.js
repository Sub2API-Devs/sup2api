/**
 * services/mcp/ccrMcpUrls.ts
 *
 * 2.1.316 新增：CCR（云会话）MCP 地址识别与解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1wpnxx5r.js (69)
 * attribution: placement 68, affinity 1
 */
import { posix } from "path";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { CCR_PROXY_PATH_MARKERS, CCR_SESSION_PATH_PREFIXES, CCR_MCP_PATH_PATTERNS } from "./config.js";
import { CLAUDE_CODE_REMOTE, CCR_META_MCP_PATH, BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A } from "./ccrMetaMcp.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import {
  MEMORY_SERVER_ID_2,
  derivedServerId,
  MEMORY,
  A471CAF9_E559_5AD8_836C_4E5972877185,
  CCR_EMAIL,
} from "./firstPartyServerIds.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../../utils/claudeInChrome/common.js";
import { isCliOwnedConfig } from "./cliOwnedClients.js";
import { uniq } from "../../utils/collections.js";
import {
  RESERVED_BROWSER_SERVER_IDS,
  isRemoteBrowserAllowed,
  REMOTE_BROWSER_SERVER_ID,
  REMOTE_BROWSER_SERVER_NAME,
} from "./remoteBrowserServer.js";
import { checkSdkUrl } from "../../cli/transports/sdkUrlValidation.js";
import { decodeTaggedUuid } from "./serverIdentity.js";
import { shortHash } from "../../utils/shortHash.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1wpnxx5r.js:3514-3650 placement
function ccrBridgeEnvVarNames() {
  return startupCcrEnv.bridgeCarrier
    ? ["CLAUDE_CODE_SESSION_ACCESS_TOKEN", "SESSION_INGRESS_URL", "CLAUDE_CODE_BRIDGE_PROMPT_SHA256"]
    : [];
}
//@ chunk-1wpnxx5r.js:3650-3907 placement
/**
 * 判断 URL 是否与启动时记录的 CCR（云端会话）地址同源。
 */
function isSameOriginAsCcr(url) {
  let atStartup = startupCcrEnv.atStartup;
  if (!atStartup) return false;
  let parsed;
  let startupUrl;
  try {
    parsed = new URL(url);
    startupUrl = new URL(atStartup);
  } catch {
    return false;
  }
  if (
    (parsed.protocol === "wss:"
      ? `https://${parsed.host}`
      : parsed.protocol === "ws:"
        ? `http://${parsed.host}`
        : parsed.origin) !== startupUrl.origin
  )
    return false;
  return CCR_PROXY_PATH_MARKERS.some((marker) => parsed.pathname.includes(marker));
}
//@ chunk-1wpnxx5r.js:3907-4130 placement
function isCcrInjectedMcpUrl(name, config) {
  if (!("url" in config) || typeof config.url !== "string") return false;
  if (!isSameOriginAsCcr(config.url)) return false;
  switch (startupCcrEnv.bridgeCarrier) {
    case undefined:
      return true;
    case "child":
      return "scope" in config && config.scope === "dynamic" && name === CLAUDE_CODE_REMOTE;
    case "descendant":
      return false;
  }
}
//@ chunk-1wpnxx5r.js:4130-4338 placement
function isCcrMetaOrProxyUrl(url, ccrOrigin) {
  let sameOriginUrl = parseSameOriginUrl(url, ccrOrigin);
  if (!sameOriginUrl) return false;
  if (sameOriginUrl.pathname === CCR_META_MCP_PATH) return sameOriginUrl.search === "";
  let all = sameOriginUrl.searchParams.getAll("toolbox_mcp_server_id");
  return (
    CCR_PROXY_PATH_MARKERS.some((marker) => sameOriginUrl.pathname.includes(marker)) &&
    all.length === 1 &&
    all[0] === BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A
  );
}
//@ chunk-1wpnxx5r.js:4338-4822 placement
function isCcrSessionMcpUrl(url) {
  let ccrOrigin = getCcrOrigin();
  if (ccrOrigin === null) return false;
  let sameOriginUrl = parseSameOriginUrl(url, ccrOrigin);
  if (!sameOriginUrl) return false;
  let sessionId = CCR_SESSION_MCP_PATH.exec(sameOriginUrl.pathname)?.[1];
  if (sessionId === undefined) return false;
  if (
    !startupCcrEnv.ownCcrSessionIds.some(
      (ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === sessionIdBody(sessionId),
    )
  )
    return false;
  let paramNames = [...sameOriginUrl.searchParams.keys()];
  let all = sameOriginUrl.searchParams.getAll("toolbox_mcp_server_id");
  let serverId = sameOriginUrl.searchParams.get("mcp_server_id");
  let mcpUrl = sameOriginUrl.searchParams.get("mcp_url");
  return (
    new Set(paramNames).size === paramNames.length &&
    paramNames.every((paramName) => CCR_MCP_QUERY_PARAMS.includes(paramName)) &&
    all.length === 1 &&
    all[0] === MEMORY_SERVER_ID_2 &&
    (serverId === null || ownCcrSessionIdSpellings().has(serverId)) &&
    (mcpUrl === null || parseSameOriginUrl(mcpUrl, ccrOrigin) !== null)
  );
}
//@ chunk-1wpnxx5r.js:4822-5533 placement
function hasOnlyAllowedCcrParams(url) {
  if (!isSameOriginAsCcr(url)) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  let ids = [
    ...parsed.searchParams.getAll("mcp_server_id"),
    ...parsed.searchParams.getAll("toolbox_mcp_server_id"),
  ];
  if (ids.length === 0) return false;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    return true;
  }
  let normalized = posix.normalize(decodedPath);
  let sessionId;
  for (let pattern of [
    CCR_SESSION_MCP_PATH,
    CODE_SESSION_MCP_PATH,
    SHTTP_MCP_PATH_REGEX,
    WS_MCP_PATH_REGEX,
  ]) {
    sessionId = pattern.exec(parsed.pathname)?.[1] ?? pattern.exec(normalized)?.[1];
    if (sessionId !== undefined) break;
  }
  if (
    sessionId === undefined &&
    [
      "/v2/ccr-sessions/",
      "/v1/code/sessions/",
      "/v2/session_ingress/shttp/mcp/",
      "/v2/session_ingress/mcp/ws/",
    ].some(
      (marker) =>
        parsed.pathname.includes(marker) || decodedPath.includes(marker) || normalized.includes(marker),
    )
  )
    return true;
  if (sessionId === SELF_SESSION_PLACEHOLDER && startupCcrEnv.ownCcrSessionIds.length === 0) return true;
  let ownIds = ownCcrSessionIdSpellings();
  let scopedIds = sessionId === undefined ? [] : sessionScopedServerIds(sessionIdBody(sessionId));
  return ids.some(
    (id) => ownIds.has(id) || scopedIds.includes(id) || id.toLowerCase() === CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  );
}
//@ chunk-1wpnxx5r.js:5533-5640 placement
function ownCcrSessionIdSpellings() {
  let ids = new Set([MEMORY_SERVER_ID_2]);
  for (let ownCcrSessionId of startupCcrEnv.ownCcrSessionIds)
    for (let id of sessionScopedServerIds(sessionIdBody(ownCcrSessionId))) ids.add(id);
  return ids;
}
//@ chunk-1wpnxx5r.js:5640-5669 placement
/**
 * 为裸会话 id 生成两种前缀下的作用域服务器 id。
 */
function sessionScopedServerIds(bareId) {
  return sessionScopedServerIds_2(bareId, CLAUDE_IN_CHROME_MCP_SERVER_NAME);
}
//@ chunk-1wpnxx5r.js:5669-5737 placement = toCompatSessionId (1)
/**
 * 为一个裸会话 ID 生成 cse_/session_ 两种前缀下的作用域服务器 ID。
 */
function sessionScopedServerIds_2(bareId, scope) {
  return [`cse_${bareId}`, `session_${bareId}`].map((base) => derivedServerId(base, scope));
}
//@ chunk-1wpnxx5r.js:5737-5796 placement
var CCR_MEMORY_MCP_PATH = /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/memory\/mcp$/;
//@ chunk-1wpnxx5r.js:5796-6163 placement
/**
 * 是否是云会话的 memory MCP 服务器（动态作用域、URL 指向 /v2/ccr-sessions/{id}/memory/mcp 或指定 toolbox 服务器）。
 */
function isCcrMemoryMcpServer(name, config) {
  if (
    name !== MEMORY ||
    config.scope !== "dynamic" ||
    isCliOwnedConfig(config) ||
    !("url" in config) ||
    typeof config.url !== "string" ||
    !isSameOriginAsCcr(config.url)
  )
    return false;
  let parsed;
  try {
    parsed = new URL(config.url);
  } catch {
    return false;
  }
  if (parsed.username !== "" || parsed.password !== "" || parsed.hash !== "") return false;
  if (CCR_MEMORY_MCP_PATH.test(parsed.pathname)) return parsed.search === "";
  let all = parsed.searchParams.getAll("toolbox_mcp_server_id");
  return (
    CCR_SESSION_MCP_PATH.test(parsed.pathname) &&
    all.length === 1 &&
    all[0] === A471CAF9_E559_5AD8_836C_4E5972877185
  );
}
//@ chunk-1wpnxx5r.js:6163-6538 placement
/**
 * MCP 服务器配置是否指向 toolbox（带 x-mcp-server-id 头的 URL 配置）。
 */
function isToolboxMcpServerConfig(config) {
  if (!("url" in config) || typeof config.url !== "string" || isCliOwnedConfig(config)) return false;
  let headers = "headers" in config ? config.headers : undefined;
  let entries = Object.entries(typeof headers === "object" && headers !== null ? headers : {});
  let extraValues = entries.flatMap(([headerName, headerValue]) =>
    normalizedAlnum(headerName) === "xmcpserverid" &&
    typeof headerValue === "string" &&
    headerValue.trim() !== ""
      ? [headerValue.trim()]
      : [],
  );
  if ("headersHelper" in config && config.headersHelper) return isSameOriginAsCcr(config.url);
  return isCcrProxiedUrl(
    config.url,
    extraValues,
    entries.flat().filter((value) => typeof value === "string"),
  );
}
//@ chunk-1wpnxx5r.js:6538-6658 placement = toCompatSessionId (1)
function memoryServerIdsForSessions(sessionIds) {
  return [
    A471CAF9_E559_5AD8_836C_4E5972877185,
    ...sessionIds.flatMap((sessionId) => {
      let bareId = sessionIdBody(sessionId);
      return [`cse_${bareId}`, `session_${bareId}`].map((derived) => derivedServerId(derived, MEMORY));
    }),
  ].map(normalizedAlnum);
}
//@ chunk-1wpnxx5r.js:6658-6858 placement
function mentionsCcrMarker(value, markers, { orItsName = true } = {}) {
  if (
    orItsName &&
    percentDecodingVariants(value).some((variant) => variant.replace(INVISIBLE_CHARS_RE, "") === MEMORY)
  )
    return true;
  let current = value;
  for (let i = 0; i <= 3; i++) {
    if (includesAnyMarker(current, markers)) return true;
    let decoded = lenientDecodeURIComponent(current);
    if (decoded === current) return false;
    if (i === 3) return true;
    current = decoded;
  }
  return false;
}
//@ chunk-1wpnxx5r.js:6858-6970 placement
function includesAnyMarker(value, markers) {
  let mapped = [value, value.replace(/%[0-9a-f]{2}/gi, "")].map(normalizedAlnum);
  return markers.some((marker) => mapped.some((candidate) => candidate.includes(marker)));
}
//@ chunk-1wpnxx5r.js:6970-7094 placement
var BACKSLASH_OR_CONTROL_REGEX = /[\\\p{Cc}]/u;
var UNSAFE_PATH_CHAR_REGEX = /[%?#\\\s\p{Cc}]/u;
var URL_AUTHORITY_REGEX = /^(?:https?|wss?):\/\/(?:[^/?#\\]*@)?[^/?#\\@:]+(?::[^/?#\\@]*)?(?=[/?#\\]|$)/i;
//@ chunk-1wpnxx5r.js:7094-7156 placement
/**
 * 去掉非字母数字并转小写。
 */
function normalizedAlnum(value) {
  return value.toLowerCase().replace(/[^0-9a-z]/g, "");
}
//@ chunk-1wpnxx5r.js:7156-8354 placement
function isCcrProxiedUrl(url, extraValues = [], headerValues = extraValues) {
  if (!isSameOriginAsCcr(url)) return false;
  if (url.length > 32768) return true;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if ([url, ...extraValues].some((value) => value.includes("${"))) return true;
  if (isMemoryProxyPath(parsed.pathname)) return true;
  let fragments = [
    ...[...parsed.searchParams].flat(),
    ...[parsed.hash, parsed.username, parsed.password].filter((part) => part !== ""),
    ...headerValues,
  ];
  if (fragments.length > 64 || parsed.pathname.length + fragments.join("").length > 8192) return true;
  let variants = uniq(fragments.flatMap(percentDecodingVariants));
  if (
    variants.some((candidate) => pathHasMemoryMcpTokens(candidate, MEMORY_MCP_PATH_PREFIXES)) ||
    queryValuesForKeys(parsed, ["mcp_url"]).some((mcpUrl) => hasUnsafeMemoryMcpUrl(mcpUrl, parsed.hostname))
  )
    return true;
  let valuesForKeys = queryValuesForKeys(parsed, ["mcp_server_id", "toolbox_mcp_server_id"]);
  let pathVariants = [parsed.pathname, posix.normalize(parsed.pathname)];
  let sessionSegment =
    firstMatchGroup(SHTTP_MCP_PATH_REGEX, pathVariants) ?? firstMatchGroup(WS_MCP_PATH_REGEX, pathVariants);
  let sessionId =
    firstMatchGroup(CCR_SESSION_MCP_PATH, pathVariants) ??
    firstMatchGroup(CODE_SESSION_MCP_PATH, pathVariants) ??
    sessionSegment;
  let { ownCcrSessionIds } = startupCcrEnv;
  let pathSessionIds = uniq(
    [...pathVariants, ...variants].flatMap((candidate) =>
      CCR_SESSION_PATHS.flatMap((prefix) => {
        let index = candidate.indexOf(prefix);
        let segment =
          index === -1
            ? undefined
            : /^[A-Za-z0-9_-]+(?=[/?#&;]|$)/.exec(candidate.slice(index + prefix.length))?.[0];
        return segment === undefined ? [] : [segment];
      }),
    ),
  );
  if (pathSessionIds.length > 8) return true;
  let memoryIds = memoryServerIdsForSessions(
    uniq([...ownCcrSessionIds, ...(sessionId === undefined ? [] : [sessionId]), ...pathSessionIds]),
  );
  if (
    [...variants, ...percentDecodingVariants(parsed.pathname + parsed.search + parsed.hash)].some(
      (candidate) => includesAnyMarker(candidate, memoryIds),
    )
  )
    return true;
  if (
    [...extraValues, ...(sessionSegment === undefined ? [] : [sessionSegment])].some((value) =>
      mentionsCcrMarker(value, memoryIds),
    ) ||
    parsed.pathname.split("/").some((segment) =>
      mentionsCcrMarker(segment, memoryIds, {
        orItsName: false,
      }),
    )
  )
    return true;
  let isSelfPlaceholder = sessionId === SELF_SESSION_PLACEHOLDER && ownCcrSessionIds.length === 0;
  if (extraValues.length > 0 && isSelfPlaceholder) return true;
  if (valuesForKeys.length === 0) return false;
  if (
    sessionId === undefined
      ? CCR_SESSION_PATHS.some((prefix) => pathVariants.some((candidate) => candidate.includes(prefix)))
      : isSelfPlaceholder
  )
    return true;
  return valuesForKeys.some((valuesForKey) => mentionsCcrMarker(valuesForKey, memoryIds));
}
//@ chunk-1wpnxx5r.js:8354-8474 placement
function queryValuesForKeys(url, keys) {
  let mapped = keys.map(normalizedAlnum);
  return [...url.searchParams]
    .filter(([name]) =>
      percentDecodingVariants(name).some((variant) => mapped.includes(normalizedAlnum(variant))),
    )
    .map(([, value]) => value);
}
//@ chunk-1wpnxx5r.js:8474-8557 placement
/**
 * 依次对多个正则取第一个匹配组。
 */
function firstMatchGroup(regex, candidates) {
  for (let candidate of candidates) {
    let group = regex.exec(candidate)?.[1];
    if (group !== undefined) return group;
  }
  return;
}
//@ chunk-1wpnxx5r.js:8557-8726 placement
/**
 * 可能承载记忆 MCP 的路径前缀。
 */
var CCR_SESSION_BASE_PATHS = ["/v2/ccr-sessions/", "/v1/code/sessions/"];
var CCR_SESSION_PATHS = [
  ...CCR_SESSION_BASE_PATHS,
  "/v2/session_ingress/shttp/mcp/",
  "/v2/session_ingress/mcp/ws/",
];
var MEMORY_MCP_PATH_PREFIXES = [...CCR_SESSION_PATHS, "/v1/code/local/", "/v1/code/mcp/"];
//@ chunk-1wpnxx5r.js:8726-8780 placement
/**
 * 判断 mcp_url 是否指向不安全（记忆类）的地址。
 */
function hasUnsafeMemoryMcpUrl(mcpUrl, hostname) {
  return (
    !isCcrToolportUrl(mcpUrl, hostname) &&
    (UNSAFE_PATH_CHAR_REGEX.test(mcpUrl) || pathHasMemoryMcpTokens(mcpUrl, CCR_PROXY_PATH_MARKERS))
  );
}
//@ chunk-1wpnxx5r.js:8780-8969 placement
function percentDecodingVariants(value) {
  if (!value.includes("%")) return [value];
  let results = [value];
  let current = [value];
  for (let k = 1; k <= 3; k++) {
    current = uniq(
      current.flatMap((variant) => [
        decodePercentRuns(variant),
        decodePercentRuns(
          variant.replace(PERCENT_RUN_RE, (whole, first, second) =>
            whole.length === 3 ? whole : `	%${first}${second}	`,
          ),
        ),
      ]),
    );
    results.push(...current);
  }
  return uniq(results);
}
//@ chunk-1wpnxx5r.js:8969-9064 placement
/**
 * 匹配带杂字符的百分号编码。
 */
var INVISIBLE_CHARS_RE = /[\s\p{Cc}\ufffd+]/gu;
var PERCENT_RUN_RE = /%[\s\p{Cc}\ufffd+]*([0-9a-f])[\s\p{Cc}\ufffd+]*([0-9a-f])/giu;
//@ chunk-1wpnxx5r.js:9064-9208 placement
function decodePercentRuns(value) {
  return value.replace(/(?:%[0-9a-f]{2})+/gi, (run) =>
    new TextDecoder().decode(Uint8Array.from(run.slice(1).split("%"), (hex) => parseInt(hex, 16))),
  );
}
//@ chunk-1wpnxx5r.js:9208-9444 placement
function pathHasMemoryMcpTokens(value, prefixes) {
  let tokens = splitPathTokens(value);
  if (!tokens.join("").includes("memory")) return false;
  return prefixes.some((prefix) => {
    let filtered = splitPathTokens(prefix).filter((token) => token !== "");
    return [
      [...filtered, "memory", "mcp"],
      [...filtered, "mcp", "memory"],
      ...(filtered.includes("mcp") ? [[...filtered, "memory"]] : []),
    ].some((sequence) => containsTokenSequence(tokens, sequence));
  });
}
//@ chunk-1wpnxx5r.js:9444-9573 placement
function splitPathTokens(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_\-\s\p{Cc}\ufffd+]+/u)
    .flatMap((segment) => [...segment.split(/[\s\p{Cc}\ufffd+]+/u), ""]);
}
//@ chunk-1wpnxx5r.js:9573-9791 placement
function containsTokenSequence(tokens, sequence) {
  let matched = 0;
  for (let k = 0; k < tokens.length && matched < sequence.length; k++) {
    let expected = sequence[matched] ?? "";
    let consumed = 0;
    for (let index = k; ; index++) {
      let token = tokens[index] ?? "";
      if (token === "" || !expected.startsWith(token, consumed)) break;
      consumed += token.length;
      if (consumed === expected.length) {
        matched++;
        k = index;
        break;
      }
    }
  }
  return matched === sequence.length;
}
//@ chunk-1wpnxx5r.js:9791-9959 placement
function isMemoryProxyPath(pathname) {
  if (UNSAFE_PATH_CHAR_REGEX.test(pathname) || pathHasMemoryMcpTokens(pathname, CCR_PROXY_PATH_MARKERS))
    return true;
  let lower = pathname.toLowerCase();
  return [lower, posix.normalize(lower)].some((candidate) =>
    CCR_PROXY_PATH_MARKERS.some((marker) => {
      let index = candidate.indexOf(marker);
      return index !== -1 && hasMemoryMcpSegments(candidate.slice(index));
    }),
  );
}
//@ chunk-1wpnxx5r.js:9959-10213 placement
function isCcrToolportUrl(value, hostname) {
  let authority = URL_AUTHORITY_REGEX.exec(value)?.[0];
  if (
    authority === undefined ||
    BACKSLASH_OR_CONTROL_REGEX.test(value) ||
    !URL.canParse(value) ||
    isCcrHost(value, hostname)
  )
    return false;
  for (let i = 0; i <= 3; i++) {
    let decoded = lenientDecodeURIComponent(authority);
    if (decoded === authority) return true;
    if (
      BACKSLASH_OR_CONTROL_REGEX.test(decoded) ||
      !URL_AUTHORITY_REGEX.test(decoded) ||
      decoded.toLowerCase().includes(stripTrailingDots(hostname)) ||
      (URL.canParse(decoded) && isCcrHost(decoded, hostname))
    )
      return false;
    authority = decoded;
  }
  return false;
}
//@ chunk-1wpnxx5r.js:10213-10278 placement
/**
 * 判断主机是否属于 CCR 主机。
 */
function isCcrHost(url, hostname) {
  return [stripTrailingDots(hostname), ""].includes(stripTrailingDots(new URL(url).hostname));
}
//@ chunk-1wpnxx5r.js:10278-10350 placement
/**
 * 去掉主机名结尾的点。
 */
function stripTrailingDots(value) {
  let length = value.length;
  while (value[length - 1] === ".") length--;
  return value.slice(0, length);
}
//@ chunk-1wpnxx5r.js:10350-10546 placement
function hasMemoryMcpSegments(value) {
  return [value, posix.normalize(value)].some((candidate) => {
    let filtered = candidate.split("/").filter((segment) => segment !== "");
    let index = filtered.indexOf("memory");
    return (
      (index !== -1 && filtered.includes("mcp", index + 1)) ||
      filtered.some((segment, index) => segment === "mcp" && filtered[index + 1] === "memory")
    );
  });
}
//@ chunk-1wpnxx5r.js:10546-10695 placement
function lenientDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/%[0-7][0-9a-f]/gi, (percentEscape) =>
      String.fromCharCode(Number.parseInt(percentEscape.slice(1), 16)),
    );
  }
}
//@ chunk-1wpnxx5r.js:10695-10799 placement
/**
 * /v1/code/sessions/<id>/mcp 路径正则。
 */
var CCR_SESSION_MCP_PATH = /^\/v2\/ccr-sessions\/([A-Za-z0-9_-]+)\/mcp$/;
var CODE_SESSION_MCP_PATH = /^\/v1\/code\/sessions\/([A-Za-z0-9_-]+)\/mcp$/;
//@ chunk-1wpnxx5r.js:10799-11105 placement
function ccrPathPrefixIndex(url) {
  let earliest = -1;
  for (let prefix of CCR_SESSION_PATH_PREFIXES) {
    let index = url.pathname.indexOf(prefix);
    if (index !== -1 && (earliest === -1 || index < earliest)) earliest = index;
  }
  if (earliest === -1) return false;
  let sliced = url.pathname.slice(earliest);
  let all = url.searchParams.getAll("toolbox_mcp_server_id");
  return (
    (all.length === 1 &&
      all.every((id) => RESERVED_BROWSER_SERVER_IDS.includes(id.toLowerCase())) &&
      (CCR_SESSION_MCP_PATH.test(sliced) || CODE_SESSION_MCP_PATH.test(sliced))) ||
    CCR_MCP_PATH_PATTERNS.some((pattern) => pattern.test(sliced))
  );
}
//@ chunk-1wpnxx5r.js:11105-11169 placement
function toolportPathFor(sessionId) {
  return `/internal/v2/ccr-sessions/${sessionId}/toolport/`;
}
//@ chunk-1wpnxx5r.js:11169-11219 placement
var regExp; // deferred: uses toolportPathFor of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1wpnxx5r.js:11169", () => {
  regExp = new RegExp(`^${toolportPathFor("[A-Za-z0-9_-]+")}mcp$`);
});
//@ chunk-1wpnxx5r.js:11219-11278 placement
function isCcrMcpPath(url) {
  return isSameOriginAsCcr(url) && regExp.test(new URL(url).pathname);
}
//@ chunk-1wpnxx5r.js:11448-11572 placement
var SHTTP_MCP_PATH_REGEX = /^\/v2\/session_ingress\/shttp\/mcp\/([A-Za-z0-9_-]+)$/;
var WS_MCP_PATH_REGEX = /^\/v2\/session_ingress\/mcp\/ws\/([A-Za-z0-9_-]+)$/;
var SELF_SESSION_PLACEHOLDER = "-";
//@ chunk-1wpnxx5r.js:11572-11735 placement
function parseCcrSessionMcpUrl(url, ccrOrigin, sessionId) {
  let sameOriginUrl = parseSameOriginUrl(url, ccrOrigin);
  if (!sameOriginUrl) return null;
  let match = CCR_SESSION_MCP_PATH.exec(sameOriginUrl.pathname);
  let ccrMcpQuery = parseCcrMcpQuery(sameOriginUrl, ccrOrigin);
  if (!match || match[1] !== sessionId || !ccrMcpQuery) return null;
  return `${ccrOrigin}/v2/ccr-sessions/${sessionId}/mcp?${ccrMcpQuery}`;
}
//@ chunk-1wpnxx5r.js:11735-11864 placement
/**
 * UUID 格式正则。
 */
var CCR_MCP_QUERY_PARAMS = ["mcp_url", "mcp_server_id", "toolbox_mcp_server_id"];
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-1wpnxx5r.js:11864-12366 placement
function parseCcrMcpQuery(sameOriginUrl, ccrOrigin) {
  let paramNames = [...sameOriginUrl.searchParams.keys()];
  if (
    new Set(paramNames).size !== paramNames.length ||
    paramNames.some((paramName) => !CCR_MCP_QUERY_PARAMS.includes(paramName)) ||
    sameOriginUrl.searchParams.get("toolbox_mcp_server_id") !== BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A
  )
    return null;
  let uRLSearchParams = new URLSearchParams();
  let mcpUrl = sameOriginUrl.searchParams.get("mcp_url");
  if (mcpUrl !== null) {
    let sameOriginUrl = parseSameOriginUrl(mcpUrl, ccrOrigin);
    if (!sameOriginUrl || sameOriginUrl.pathname !== CCR_META_MCP_PATH || sameOriginUrl.search !== "")
      return null;
    uRLSearchParams.set("mcp_url", `${ccrOrigin}${CCR_META_MCP_PATH}`);
  }
  let serverId = sameOriginUrl.searchParams.get("mcp_server_id");
  if (serverId !== null) {
    if (!UUID_RE.test(serverId)) return null;
    uRLSearchParams.set("mcp_server_id", serverId);
  }
  uRLSearchParams.set("toolbox_mcp_server_id", BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A);
  return uRLSearchParams.toString();
}
//@ chunk-1wpnxx5r.js:12366-12497 placement
function parseSameOriginUrl(url, ccrOrigin) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  return parsed.origin === ccrOrigin && parsed.username === "" && parsed.password === "" && parsed.hash === ""
    ? parsed
    : null;
}
//@ chunk-1wpnxx5r.js:12497-12597 placement
function getCcrOrigin() {
  let atStartup = startupCcrEnv.atStartup;
  if (!atStartup) return null;
  try {
    return new URL(atStartup).origin;
  } catch {
    return null;
  }
}
//@ chunk-1wpnxx5r.js:12597-12781 placement
function isCcrSessionScopedMcpUrl(url) {
  let ccrOrigin = getCcrOrigin();
  let parsed = ccrOrigin === null ? null : parseSameOriginUrl(url, ccrOrigin);
  if (!parsed) return false;
  let sessionSegment = (CCR_SESSION_MCP_PATH.exec(parsed.pathname) ??
    CODE_SESSION_MCP_PATH.exec(parsed.pathname))?.[1];
  return (
    sessionSegment !== undefined &&
    startupCcrEnv.ownCcrSessionIds.some(
      (ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === sessionIdBody(sessionSegment),
    )
  );
}
//@ chunk-1wpnxx5r.js:12781-12834 placement
function isCcrOriginUrl(url) {
  let ccrOrigin = getCcrOrigin();
  return ccrOrigin !== null && isCcrMetaOrProxyUrl(url, ccrOrigin);
}
//@ chunk-1wpnxx5r.js:12834-13286 placement
function ccrSessionIdFromMcpUrl(url) {
  let ccrOrigin = getCcrOrigin();
  let parsed = ccrOrigin === null ? null : parseSameOriginUrl(url, ccrOrigin);
  let sessionSegment = parsed ? CCR_SESSION_MCP_PATH.exec(parsed.pathname)?.[1] : undefined;
  if (!parsed || sessionSegment === undefined) return null;
  let paramNames = [...parsed.searchParams.keys()];
  let serverId = parsed.searchParams.get("mcp_server_id");
  let toolboxId = parsed.searchParams.get("toolbox_mcp_server_id");
  if (
    new Set(paramNames).size !== paramNames.length ||
    paramNames.some((paramName) => !CCR_MCP_QUERY_PARAMS.includes(paramName)) ||
    serverId === null ||
    !UUID_RE.test(serverId) ||
    toolboxId === null
  )
    return null;
  return {
    sessionSegment,
    mcpServerId: serverId,
    toolboxMcpServerId: toolboxId,
    upstreamUrl: parsed.searchParams.get("mcp_url") ?? undefined,
  };
}
//@ chunk-1wpnxx5r.js:13286-13358 placement
function originIfValid(candidate) {
  return candidate !== undefined && checkSdkUrl(candidate) === null ? new URL(candidate).origin : null;
}
//@ chunk-1wpnxx5r.js:13358-13454 placement
/**
 * hearthbot 在 v2 CCR 会话下的路径正则。
 */
var HEARTHBOT_MCP_PATH = "/v1/code/mcp/hearthbot";
var HEARTHBOT_CCR_PATH_RE = /^\/v2\/ccr-sessions\/(?:-|[A-Za-z0-9_-]+)\/hearthbot\/mcp$/;
//@ chunk-1wpnxx5r.js:13454-13635 placement
function isCcrUrlWithoutCredentials(url) {
  if (!isSameOriginAsCcr(url)) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.hash === "" &&
    parsed.search === "" &&
    (parsed.pathname === HEARTHBOT_MCP_PATH || HEARTHBOT_CCR_PATH_RE.test(parsed.pathname))
  );
}
//@ chunk-1wpnxx5r.js:13635-13699 placement
/**
 * CCR 邮件 MCP 路径正则。
 */
var CCR_EMAIL_MCP_PATH_RE = /^\/v2\/ccr-sessions\/(?:-|[A-Za-z0-9_-]+)\/email\/mcp$/;
//@ chunk-1wpnxx5r.js:13699-13947 placement
function isCcrDynamicServer(name, config) {
  if (
    name !== CCR_EMAIL ||
    config.scope !== "dynamic" ||
    isCliOwnedConfig(config) ||
    !("url" in config) ||
    typeof config.url !== "string" ||
    !isSameOriginAsCcr(config.url)
  )
    return false;
  let parsed;
  try {
    parsed = new URL(config.url);
  } catch {
    return false;
  }
  return (
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.hash === "" &&
    parsed.search === "" &&
    CCR_EMAIL_MCP_PATH_RE.test(parsed.pathname)
  );
}
//@ chunk-1wpnxx5r.js:13947-14014 placement
/**
 * CCR 远程浏览器 MCP 路径正则。
 */
var CCR_REMOTE_BROWSER_MCP_PATH_RE = /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/remote-browser\/mcp$/;
//@ chunk-1wpnxx5r.js:14014-14222 placement
function isHttpsCcrUrl(url) {
  if (!isSameOriginAsCcr(url)) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.hash === "" &&
    parsed.search === "" &&
    CCR_REMOTE_BROWSER_MCP_PATH_RE.test(parsed.pathname)
  );
}
//@ chunk-1wpnxx5r.js:14222-14485 placement
function isRemoteBrowserCcrUrl(url) {
  if (!isRemoteBrowserAllowed() || !isCcrSessionScopedMcpUrl(url)) return false;
  let parsed = new URL(url);
  let sessionSegment = CCR_SESSION_MCP_PATH.exec(parsed.pathname)?.[1];
  let serverId = parsed.searchParams.get("mcp_server_id");
  return (
    sessionSegment !== undefined &&
    [...parsed.searchParams.keys()].length === 2 &&
    parsed.searchParams.get("toolbox_mcp_server_id") === REMOTE_BROWSER_SERVER_ID &&
    sessionScopedServerIds_2(sessionIdBody(sessionSegment), REMOTE_BROWSER_SERVER_NAME).some(
      (candidate) => candidate === serverId,
    )
  );
}
//@ chunk-1wpnxx5r.js:14485-14899 placement
function matchesCcrMcpServerId(serverName, url) {
  if (!isRemoteBrowserAllowed() || !isSameOriginAsCcr(url)) return false;
  let parsed = new URL(url);
  let flattened = queryValuesForKeys(parsed, ["mcp_server_id", "toolbox_mcp_server_id"]).flatMap(
    percentDecodingVariants,
  );
  if (flattened.some(isRemoteBrowserAllowedUrl))
    return !(serverName === REMOTE_BROWSER_SERVER_NAME && isRemoteBrowserCcrUrl(url));
  let mapped = percentDecodingVariants(parsed.pathname).map((pathVariant) =>
    posix.normalize(pathVariant).replace(/\/+$/, ""),
  );
  let mapped_2 = [
    ...startupCcrEnv.ownCcrSessionIds,
    ...[CCR_SESSION_MCP_PATH, CODE_SESSION_MCP_PATH, SHTTP_MCP_PATH_REGEX, WS_MCP_PATH_REGEX].flatMap(
      (pattern) => firstMatchGroup(pattern, mapped) ?? [],
    ),
  ]
    .flatMap((sessionId) => sessionScopedServerIds_2(sessionIdBody(sessionId), REMOTE_BROWSER_SERVER_NAME))
    .map(normalizedUuidDigits);
  return (
    mapped.some((pathCandidate) => CCR_REMOTE_BROWSER_MCP_PATH_RE.test(pathCandidate)) ||
    flattened.some(
      (value) =>
        normalizedAlnum(value) === normalizedAlnum(REMOTE_BROWSER_SERVER_NAME) ||
        mapped_2.some((digits) => normalizeUuidDigits(value).includes(digits)),
    )
  );
}
//@ chunk-1wpnxx5r.js:14899-14925 placement
/**
 * 匹配非 ASCII 数字的正则。
 */
var HAS_DIGITS_RE = /(?![0-9])\p{Nd}/u;
//@ chunk-1wpnxx5r.js:14925-14989 placement
/**
 * 判断地址是否属于允许的远程浏览器地址。
 */
function isRemoteBrowserAllowedUrl(value) {
  return (
    isRemoteBrowserAllowed() &&
    (HAS_DIGITS_RE.test(value) ||
      normalizeUuidDigits(value).includes(normalizedUuidDigits(REMOTE_BROWSER_SERVER_ID)))
  );
}
//@ chunk-1wpnxx5r.js:14989-15034 placement
/**
 * 规范化 UUID 数字并去掉前导零。
 */
function normalizedUuidDigits(value) {
  return normalizeUuidDigits(value).replace(/^0+/, "");
}
//@ chunk-1wpnxx5r.js:15034-15189 placement
function normalizeUuidDigits(value) {
  let tagged = decodeTaggedUuid(value)?.replaceAll("-", "") ?? "";
  let replaced = value
    .toLowerCase()
    .replaceAll("urn:", "")
    .replaceAll("uuid:", "")
    .replace(/[^0-9a-f]/g, "");
  return `${tagged}${replaced}`;
}
//@ chunk-1wpnxx5r.js:15189-15294 placement
/**
 * 桥接设备 MCP 的路径。
 */
var BRIDGE_HOSTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BRIDGE_DEVICES_PATH;
deferInit("chunk-1wpnxx5r.js:15189", () => {
  BRIDGE_HOSTS = new Set(["bridge.claudeusercontent.com", "bridge-staging.claudeusercontent.com"]);
  BRIDGE_DEVICES_PATH = "/devices/mcp";
});
//@ chunk-1wpnxx5r.js:15294-15428 placement
function isBareWssUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "wss:" &&
    parsed.username === "" &&
    parsed.password === "" &&
    BRIDGE_HOSTS.has(parsed.hostname)
  );
}
//@ chunk-1wpnxx5r.js:15515-15619 affinity = unwrapCcrProxyUrl (0.858)
function getCcrProxyTargetUrl(url) {
  if (!isSameOriginAsCcr(url) || !URL.canParse(url)) return;
  return new URL(url).searchParams.get("mcp_url") || undefined;
}
//@ chunk-1wpnxx5r.js:15619-15667 placement
/**
 * 允许的 URL 协议集合。
 */
var WEB_SCHEMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1wpnxx5r.js:15619", () => {
  WEB_SCHEMES = new Set(["http:", "https:", "ws:", "wss:"]);
});
//@ chunk-1wpnxx5r.js:15667-15809 placement
function ccrProxyTargetHost(url) {
  let ccrProxyTargetUrl = getCcrProxyTargetUrl(url);
  if (ccrProxyTargetUrl === undefined || !URL.canParse(ccrProxyTargetUrl)) return;
  let target = new URL(ccrProxyTargetUrl);
  return WEB_SCHEMES.has(target.protocol) ? target.hostname.toLowerCase() : undefined;
}
//@ chunk-1wpnxx5r.js:15931-15976 placement
var BRIDGE_DEVICE_URL_PREFIXES; // deferred: uses BRIDGE_HOSTS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1wpnxx5r.js:15931", () => {
  BRIDGE_DEVICE_URL_PREFIXES = [...BRIDGE_HOSTS].map((host) => `https://${host}${BRIDGE_DEVICES_PATH}`);
});
//@ chunk-1wpnxx5r.js:16167-16204 placement
function safeOrigin(origin) {
  return origin ? shortHash(origin) : undefined;
}
//@ chunk-1wpnxx5r.js:16204-16374 placement
function urlPathOf(url) {
  if (!URL.canParse(url)) return;
  let parsed = new URL(url);
  if (parsed.origin === "null") return;
  return parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== ""
    ? `${parsed.origin}/\u2026`
    : parsed.origin;
}
export {
  isSameOriginAsCcr,
  originIfValid,
  parseCcrSessionMcpUrl,
  isToolboxMcpServerConfig,
  isCcrMemoryMcpServer,
  hasOnlyAllowedCcrParams,
  matchesCcrMcpServerId,
  urlPathOf,
  ccrSessionIdFromMcpUrl,
  UUID_RE,
  safeOrigin,
  ccrProxyTargetHost,
  isCcrInjectedMcpUrl,
  isCcrMcpPath,
  getCcrOrigin,
  CCR_SESSION_BASE_PATHS,
  BRIDGE_DEVICE_URL_PREFIXES,
  toolportPathFor,
  getCcrProxyTargetUrl,
  BRIDGE_HOSTS,
  BRIDGE_DEVICES_PATH,
  isCcrDynamicServer,
  ccrBridgeEnvVarNames,
  CCR_SESSION_MCP_PATH,
  isCcrUrlWithoutCredentials,
  isCcrSessionMcpUrl,
  isHttpsCcrUrl,
  isRemoteBrowserCcrUrl,
  isCcrOriginUrl,
  isCcrSessionScopedMcpUrl,
  CCR_MCP_QUERY_PARAMS,
  isBareWssUrl,
  ccrPathPrefixIndex,
};
