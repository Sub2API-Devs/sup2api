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
  let n;
  let t;
  try {
    n = new URL(url);
    t = new URL(atStartup);
  } catch {
    return false;
  }
  if (
    (n.protocol === "wss:" ? `https://${n.host}` : n.protocol === "ws:" ? `http://${n.host}` : n.origin) !==
    t.origin
  )
    return false;
  return CCR_PROXY_PATH_MARKERS.some((o) => n.pathname.includes(o));
}
//@ chunk-1wpnxx5r.js:3907-4130 placement
function isCcrInjectedMcpUrl(name, r) {
  if (!("url" in r) || typeof r.url !== "string") return false;
  if (!isSameOriginAsCcr(r.url)) return false;
  switch (startupCcrEnv.bridgeCarrier) {
    case undefined:
      return true;
    case "child":
      return "scope" in r && r.scope === "dynamic" && name === CLAUDE_CODE_REMOTE;
    case "descendant":
      return false;
  }
}
//@ chunk-1wpnxx5r.js:4130-4338 placement
function isCcrMetaOrProxyUrl(e, ccrOrigin) {
  let sameOriginUrl = parseSameOriginUrl(e, ccrOrigin);
  if (!sameOriginUrl) return false;
  if (sameOriginUrl.pathname === CCR_META_MCP_PATH) return sameOriginUrl.search === "";
  let all = sameOriginUrl.searchParams.getAll("toolbox_mcp_server_id");
  return (
    CCR_PROXY_PATH_MARKERS.some((s) => sameOriginUrl.pathname.includes(s)) &&
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
  let t = CCR_SESSION_MCP_PATH.exec(sameOriginUrl.pathname)?.[1];
  if (t === undefined) return false;
  if (
    !startupCcrEnv.ownCcrSessionIds.some(
      (ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === sessionIdBody(t),
    )
  )
    return false;
  let s = [...sameOriginUrl.searchParams.keys()];
  let all = sameOriginUrl.searchParams.getAll("toolbox_mcp_server_id");
  let i = sameOriginUrl.searchParams.get("mcp_server_id");
  let a = sameOriginUrl.searchParams.get("mcp_url");
  return (
    new Set(s).size === s.length &&
    s.every((l) => CCR_MCP_QUERY_PARAMS.includes(l)) &&
    all.length === 1 &&
    all[0] === MEMORY_SERVER_ID_2 &&
    (i === null || ownCcrSessionIdSpellings().has(i)) &&
    (a === null || parseSameOriginUrl(a, ccrOrigin) !== null)
  );
}
//@ chunk-1wpnxx5r.js:4822-5533 placement
function hasOnlyAllowedCcrParams(url) {
  if (!isSameOriginAsCcr(url)) return false;
  let r;
  try {
    r = new URL(url);
  } catch {
    return false;
  }
  let n = [...r.searchParams.getAll("mcp_server_id"), ...r.searchParams.getAll("toolbox_mcp_server_id")];
  if (n.length === 0) return false;
  let t;
  try {
    t = decodeURIComponent(r.pathname);
  } catch {
    return true;
  }
  let normalized = posix.normalize(t);
  let o;
  for (let u of [CCR_SESSION_MCP_PATH, CODE_SESSION_MCP_PATH, SHTTP_MCP_PATH_REGEX, WS_MCP_PATH_REGEX]) {
    o = u.exec(r.pathname)?.[1] ?? u.exec(normalized)?.[1];
    if (o !== undefined) break;
  }
  if (
    o === undefined &&
    [
      "/v2/ccr-sessions/",
      "/v1/code/sessions/",
      "/v2/session_ingress/shttp/mcp/",
      "/v2/session_ingress/mcp/ws/",
    ].some((u) => r.pathname.includes(u) || t.includes(u) || normalized.includes(u))
  )
    return true;
  if (o === SELF_SESSION_PLACEHOLDER && startupCcrEnv.ownCcrSessionIds.length === 0) return true;
  let a = ownCcrSessionIdSpellings();
  let l = o === undefined ? [] : sessionScopedServerIds(sessionIdBody(o));
  return n.some((u) => a.has(u) || l.includes(u) || u.toLowerCase() === CLAUDE_IN_CHROME_MCP_SERVER_NAME);
}
//@ chunk-1wpnxx5r.js:5533-5640 placement
function ownCcrSessionIdSpellings() {
  let e = new Set([MEMORY_SERVER_ID_2]);
  for (let ownCcrSessionId of startupCcrEnv.ownCcrSessionIds)
    for (let n of sessionScopedServerIds(sessionIdBody(ownCcrSessionId))) e.add(n);
  return e;
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
  return [`cse_${bareId}`, `session_${bareId}`].map((n) => derivedServerId(n, scope));
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
  let n;
  try {
    n = new URL(config.url);
  } catch {
    return false;
  }
  if (n.username !== "" || n.password !== "" || n.hash !== "") return false;
  if (CCR_MEMORY_MCP_PATH.test(n.pathname)) return n.search === "";
  let all = n.searchParams.getAll("toolbox_mcp_server_id");
  return (
    CCR_SESSION_MCP_PATH.test(n.pathname) &&
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
  let flattened = entries.flatMap(([s, o]) =>
    normalizedAlnum(s) === "xmcpserverid" && typeof o === "string" && o.trim() !== "" ? [o.trim()] : [],
  );
  if ("headersHelper" in config && config.headersHelper) return isSameOriginAsCcr(config.url);
  return isCcrProxiedUrl(
    config.url,
    flattened,
    entries.flat().filter((s) => typeof s === "string"),
  );
}
//@ chunk-1wpnxx5r.js:6538-6658 placement = toCompatSessionId (1)
function memoryServerIdsForSessions(sessionIds) {
  return [
    A471CAF9_E559_5AD8_836C_4E5972877185,
    ...sessionIds.flatMap((sessionId) => {
      let n = sessionIdBody(sessionId);
      return [`cse_${n}`, `session_${n}`].map((t) => derivedServerId(t, MEMORY));
    }),
  ].map(normalizedAlnum);
}
//@ chunk-1wpnxx5r.js:6658-6858 placement
function mentionsCcrMarker(e, r, { orItsName: n = true } = {}) {
  if (n && percentDecodingVariants(e).some((s) => s.replace(INVISIBLE_CHARS_RE, "") === MEMORY)) return true;
  let t = e;
  for (let i = 0; i <= 3; i++) {
    if (includesAnyMarker(t, r)) return true;
    let o = lenientDecodeURIComponent(t);
    if (o === t) return false;
    if (i === 3) return true;
    t = o;
  }
  return false;
}
//@ chunk-1wpnxx5r.js:6858-6970 placement
function includesAnyMarker(e, r) {
  let mapped = [e, e.replace(/%[0-9a-f]{2}/gi, "")].map(normalizedAlnum);
  return r.some((t) => mapped.some((s) => s.includes(t)));
}
//@ chunk-1wpnxx5r.js:6970-7094 placement
var BACKSLASH_OR_CONTROL_REGEX = /[\\\p{Cc}]/u;
var UNSAFE_PATH_CHAR_REGEX = /[%?#\\\s\p{Cc}]/u;
var URL_AUTHORITY_REGEX = /^(?:https?|wss?):\/\/(?:[^/?#\\]*@)?[^/?#\\@:]+(?::[^/?#\\@]*)?(?=[/?#\\]|$)/i;
//@ chunk-1wpnxx5r.js:7094-7156 placement
/**
 * 去掉非字母数字并转小写。
 */
function normalizedAlnum(e) {
  return e.toLowerCase().replace(/[^0-9a-z]/g, "");
}
//@ chunk-1wpnxx5r.js:7156-8354 placement
function isCcrProxiedUrl(url, r = [], n = r) {
  if (!isSameOriginAsCcr(url)) return false;
  if (url.length > 32768) return true;
  let t;
  try {
    t = new URL(url);
  } catch {
    return false;
  }
  if ([url, ...r].some((c) => c.includes("${"))) return true;
  if (isMemoryProxyPath(t.pathname)) return true;
  let s = [...[...t.searchParams].flat(), ...[t.hash, t.username, t.password].filter((c) => c !== ""), ...n];
  if (s.length > 64 || t.pathname.length + s.join("").length > 8192) return true;
  let o = uniq(s.flatMap(percentDecodingVariants));
  if (
    o.some((c) => pathHasMemoryMcpTokens(c, MEMORY_MCP_PATH_PREFIXES)) ||
    queryValuesForKeys(t, ["mcp_url"]).some((c) => hasUnsafeMemoryMcpUrl(c, t.hostname))
  )
    return true;
  let valuesForKeys = queryValuesForKeys(t, ["mcp_server_id", "toolbox_mcp_server_id"]);
  let a = [t.pathname, posix.normalize(t.pathname)];
  let l = firstMatchGroup(SHTTP_MCP_PATH_REGEX, a) ?? firstMatchGroup(WS_MCP_PATH_REGEX, a);
  let u = firstMatchGroup(CCR_SESSION_MCP_PATH, a) ?? firstMatchGroup(CODE_SESSION_MCP_PATH, a) ?? l;
  let { ownCcrSessionIds } = startupCcrEnv;
  let N = uniq(
    [...a, ...o].flatMap((c) =>
      CCR_SESSION_PATHS.flatMap((S) => {
        let index = c.indexOf(S);
        let V =
          index === -1 ? undefined : /^[A-Za-z0-9_-]+(?=[/?#&;]|$)/.exec(c.slice(index + S.length))?.[0];
        return V === undefined ? [] : [V];
      }),
    ),
  );
  if (N.length > 8) return true;
  let R = memoryServerIdsForSessions(uniq([...ownCcrSessionIds, ...(u === undefined ? [] : [u]), ...N]));
  if ([...o, ...percentDecodingVariants(t.pathname + t.search + t.hash)].some((c) => includesAnyMarker(c, R)))
    return true;
  if (
    [...r, ...(l === undefined ? [] : [l])].some((c) => mentionsCcrMarker(c, R)) ||
    t.pathname.split("/").some((c) =>
      mentionsCcrMarker(c, R, {
        orItsName: false,
      }),
    )
  )
    return true;
  let B = u === SELF_SESSION_PLACEHOLDER && ownCcrSessionIds.length === 0;
  if (r.length > 0 && B) return true;
  if (valuesForKeys.length === 0) return false;
  if (u === undefined ? CCR_SESSION_PATHS.some((c) => a.some((S) => S.includes(c))) : B) return true;
  return valuesForKeys.some((valuesForKey) => mentionsCcrMarker(valuesForKey, R));
}
//@ chunk-1wpnxx5r.js:8354-8474 placement
function queryValuesForKeys(e, r) {
  let mapped = r.map(normalizedAlnum);
  return [...e.searchParams]
    .filter(([t]) => percentDecodingVariants(t).some((s) => mapped.includes(normalizedAlnum(s))))
    .map(([, t]) => t);
}
//@ chunk-1wpnxx5r.js:8474-8557 placement
/**
 * 依次对多个正则取第一个匹配组。
 */
function firstMatchGroup(e, r) {
  for (let n of r) {
    let t = e.exec(n)?.[1];
    if (t !== undefined) return t;
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
function hasUnsafeMemoryMcpUrl(e, hostname) {
  return (
    !isCcrToolportUrl(e, hostname) &&
    (UNSAFE_PATH_CHAR_REGEX.test(e) || pathHasMemoryMcpTokens(e, CCR_PROXY_PATH_MARKERS))
  );
}
//@ chunk-1wpnxx5r.js:8780-8969 placement
function percentDecodingVariants(e) {
  if (!e.includes("%")) return [e];
  let r = [e];
  let n = [e];
  for (let k = 1; k <= 3; k++) {
    n = uniq(
      n.flatMap((s) => [
        decodePercentRuns(s),
        decodePercentRuns(s.replace(PERCENT_RUN_RE, (o, i, a) => (o.length === 3 ? o : `	%${i}${a}	`))),
      ]),
    );
    r.push(...n);
  }
  return uniq(r);
}
//@ chunk-1wpnxx5r.js:8969-9064 placement
/**
 * 匹配带杂字符的百分号编码。
 */
var INVISIBLE_CHARS_RE = /[\s\p{Cc}\ufffd+]/gu;
var PERCENT_RUN_RE = /%[\s\p{Cc}\ufffd+]*([0-9a-f])[\s\p{Cc}\ufffd+]*([0-9a-f])/giu;
//@ chunk-1wpnxx5r.js:9064-9208 placement
function decodePercentRuns(e) {
  return e.replace(/(?:%[0-9a-f]{2})+/gi, (r) =>
    new TextDecoder().decode(Uint8Array.from(r.slice(1).split("%"), (n) => parseInt(n, 16))),
  );
}
//@ chunk-1wpnxx5r.js:9208-9444 placement
function pathHasMemoryMcpTokens(e, r) {
  let n = splitPathTokens(e);
  if (!n.join("").includes("memory")) return false;
  return r.some((t) => {
    let filtered = splitPathTokens(t).filter((o) => o !== "");
    return [
      [...filtered, "memory", "mcp"],
      [...filtered, "mcp", "memory"],
      ...(filtered.includes("mcp") ? [[...filtered, "memory"]] : []),
    ].some((o) => containsTokenSequence(n, o));
  });
}
//@ chunk-1wpnxx5r.js:9444-9573 placement
function splitPathTokens(e) {
  return e
    .toLowerCase()
    .split(/[^a-z0-9_\-\s\p{Cc}\ufffd+]+/u)
    .flatMap((r) => [...r.split(/[\s\p{Cc}\ufffd+]+/u), ""]);
}
//@ chunk-1wpnxx5r.js:9573-9791 placement
function containsTokenSequence(e, r) {
  let n = 0;
  for (let k = 0; k < e.length && n < r.length; k++) {
    let s = r[n] ?? "";
    let o = 0;
    for (let i = k; ; i++) {
      let a = e[i] ?? "";
      if (a === "" || !s.startsWith(a, o)) break;
      o += a.length;
      if (o === s.length) {
        n++;
        k = i;
        break;
      }
    }
  }
  return n === r.length;
}
//@ chunk-1wpnxx5r.js:9791-9959 placement
function isMemoryProxyPath(pathname) {
  if (UNSAFE_PATH_CHAR_REGEX.test(pathname) || pathHasMemoryMcpTokens(pathname, CCR_PROXY_PATH_MARKERS))
    return true;
  let lower = pathname.toLowerCase();
  return [lower, posix.normalize(lower)].some((n) =>
    CCR_PROXY_PATH_MARKERS.some((t) => {
      let index = n.indexOf(t);
      return index !== -1 && hasMemoryMcpSegments(n.slice(index));
    }),
  );
}
//@ chunk-1wpnxx5r.js:9959-10213 placement
function isCcrToolportUrl(e, r) {
  let n = URL_AUTHORITY_REGEX.exec(e)?.[0];
  if (n === undefined || BACKSLASH_OR_CONTROL_REGEX.test(e) || !URL.canParse(e) || isCcrHost(e, r))
    return false;
  for (let i = 0; i <= 3; i++) {
    let s = lenientDecodeURIComponent(n);
    if (s === n) return true;
    if (
      BACKSLASH_OR_CONTROL_REGEX.test(s) ||
      !URL_AUTHORITY_REGEX.test(s) ||
      s.toLowerCase().includes(stripTrailingDots(r)) ||
      (URL.canParse(s) && isCcrHost(s, r))
    )
      return false;
    n = s;
  }
  return false;
}
//@ chunk-1wpnxx5r.js:10213-10278 placement
/**
 * 判断主机是否属于 CCR 主机。
 */
function isCcrHost(e, r) {
  return [stripTrailingDots(r), ""].includes(stripTrailingDots(new URL(e).hostname));
}
//@ chunk-1wpnxx5r.js:10278-10350 placement
/**
 * 去掉主机名结尾的点。
 */
function stripTrailingDots(e) {
  let r = e.length;
  while (e[r - 1] === ".") r--;
  return e.slice(0, r);
}
//@ chunk-1wpnxx5r.js:10350-10546 placement
function hasMemoryMcpSegments(e) {
  return [e, posix.normalize(e)].some((r) => {
    let filtered = r.split("/").filter((s) => s !== "");
    let index = filtered.indexOf("memory");
    return (
      (index !== -1 && filtered.includes("mcp", index + 1)) ||
      filtered.some((s, o) => s === "mcp" && filtered[o + 1] === "memory")
    );
  });
}
//@ chunk-1wpnxx5r.js:10546-10695 placement
function lenientDecodeURIComponent(e) {
  try {
    return decodeURIComponent(e);
  } catch {
    return e.replace(/%[0-7][0-9a-f]/gi, (r) => String.fromCharCode(Number.parseInt(r.slice(1), 16)));
  }
}
//@ chunk-1wpnxx5r.js:10695-10799 placement
/**
 * /v1/code/sessions/<id>/mcp 路径正则。
 */
var CCR_SESSION_MCP_PATH = /^\/v2\/ccr-sessions\/([A-Za-z0-9_-]+)\/mcp$/;
var CODE_SESSION_MCP_PATH = /^\/v1\/code\/sessions\/([A-Za-z0-9_-]+)\/mcp$/;
//@ chunk-1wpnxx5r.js:10799-11105 placement
function ccrPathPrefixIndex(e) {
  let r = -1;
  for (let s of CCR_SESSION_PATH_PREFIXES) {
    let index = e.pathname.indexOf(s);
    if (index !== -1 && (r === -1 || index < r)) r = index;
  }
  if (r === -1) return false;
  let sliced = e.pathname.slice(r);
  let all = e.searchParams.getAll("toolbox_mcp_server_id");
  return (
    (all.length === 1 &&
      all.every((s) => RESERVED_BROWSER_SERVER_IDS.includes(s.toLowerCase())) &&
      (CCR_SESSION_MCP_PATH.test(sliced) || CODE_SESSION_MCP_PATH.test(sliced))) ||
    CCR_MCP_PATH_PATTERNS.some((s) => s.test(sliced))
  );
}
//@ chunk-1wpnxx5r.js:11105-11169 placement
function toolportPathFor(e) {
  return `/internal/v2/ccr-sessions/${e}/toolport/`;
}
//@ chunk-1wpnxx5r.js:11169-11219 placement
var regExp = new RegExp(`^${toolportPathFor("[A-Za-z0-9_-]+")}mcp$`);
//@ chunk-1wpnxx5r.js:11219-11278 placement
function isCcrMcpPath(url) {
  return isSameOriginAsCcr(url) && regExp.test(new URL(url).pathname);
}
//@ chunk-1wpnxx5r.js:11448-11572 placement
var SHTTP_MCP_PATH_REGEX = /^\/v2\/session_ingress\/shttp\/mcp\/([A-Za-z0-9_-]+)$/;
var WS_MCP_PATH_REGEX = /^\/v2\/session_ingress\/mcp\/ws\/([A-Za-z0-9_-]+)$/;
var SELF_SESSION_PLACEHOLDER = "-";
//@ chunk-1wpnxx5r.js:11572-11735 placement
function parseCcrSessionMcpUrl(url, r, sessionId) {
  let sameOriginUrl = parseSameOriginUrl(url, r);
  if (!sameOriginUrl) return null;
  let match = CCR_SESSION_MCP_PATH.exec(sameOriginUrl.pathname);
  let ccrMcpQuery = parseCcrMcpQuery(sameOriginUrl, r);
  if (!match || match[1] !== sessionId || !ccrMcpQuery) return null;
  return `${r}/v2/ccr-sessions/${sessionId}/mcp?${ccrMcpQuery}`;
}
//@ chunk-1wpnxx5r.js:11735-11864 placement
/**
 * UUID 格式正则。
 */
var CCR_MCP_QUERY_PARAMS = ["mcp_url", "mcp_server_id", "toolbox_mcp_server_id"];
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-1wpnxx5r.js:11864-12366 placement
function parseCcrMcpQuery(sameOriginUrl, r) {
  let n = [...sameOriginUrl.searchParams.keys()];
  if (
    new Set(n).size !== n.length ||
    n.some((i) => !CCR_MCP_QUERY_PARAMS.includes(i)) ||
    sameOriginUrl.searchParams.get("toolbox_mcp_server_id") !== BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A
  )
    return null;
  let uRLSearchParams = new URLSearchParams();
  let s = sameOriginUrl.searchParams.get("mcp_url");
  if (s !== null) {
    let sameOriginUrl = parseSameOriginUrl(s, r);
    if (!sameOriginUrl || sameOriginUrl.pathname !== CCR_META_MCP_PATH || sameOriginUrl.search !== "")
      return null;
    uRLSearchParams.set("mcp_url", `${r}${CCR_META_MCP_PATH}`);
  }
  let o = sameOriginUrl.searchParams.get("mcp_server_id");
  if (o !== null) {
    if (!UUID_RE.test(o)) return null;
    uRLSearchParams.set("mcp_server_id", o);
  }
  uRLSearchParams.set("toolbox_mcp_server_id", BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A);
  return uRLSearchParams.toString();
}
//@ chunk-1wpnxx5r.js:12366-12497 placement
function parseSameOriginUrl(e, ccrOrigin) {
  let n;
  try {
    n = new URL(e);
  } catch {
    return null;
  }
  return n.origin === ccrOrigin && n.username === "" && n.password === "" && n.hash === "" ? n : null;
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
  let n = ccrOrigin === null ? null : parseSameOriginUrl(url, ccrOrigin);
  if (!n) return false;
  let t = (CCR_SESSION_MCP_PATH.exec(n.pathname) ?? CODE_SESSION_MCP_PATH.exec(n.pathname))?.[1];
  return (
    t !== undefined &&
    startupCcrEnv.ownCcrSessionIds.some(
      (ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === sessionIdBody(t),
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
  let n = ccrOrigin === null ? null : parseSameOriginUrl(url, ccrOrigin);
  let t = n ? CCR_SESSION_MCP_PATH.exec(n.pathname)?.[1] : undefined;
  if (!n || t === undefined) return null;
  let s = [...n.searchParams.keys()];
  let o = n.searchParams.get("mcp_server_id");
  let i = n.searchParams.get("toolbox_mcp_server_id");
  if (
    new Set(s).size !== s.length ||
    s.some((a) => !CCR_MCP_QUERY_PARAMS.includes(a)) ||
    o === null ||
    !UUID_RE.test(o) ||
    i === null
  )
    return null;
  return {
    sessionSegment: t,
    mcpServerId: o,
    toolboxMcpServerId: i,
    upstreamUrl: n.searchParams.get("mcp_url") ?? undefined,
  };
}
//@ chunk-1wpnxx5r.js:13286-13358 placement
function originIfValid(e) {
  return e !== undefined && checkSdkUrl(e) === null ? new URL(e).origin : null;
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
  let r;
  try {
    r = new URL(url);
  } catch {
    return false;
  }
  return (
    r.username === "" &&
    r.password === "" &&
    r.hash === "" &&
    r.search === "" &&
    (r.pathname === HEARTHBOT_MCP_PATH || HEARTHBOT_CCR_PATH_RE.test(r.pathname))
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
  let n;
  try {
    n = new URL(config.url);
  } catch {
    return false;
  }
  return (
    n.username === "" &&
    n.password === "" &&
    n.hash === "" &&
    n.search === "" &&
    CCR_EMAIL_MCP_PATH_RE.test(n.pathname)
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
  let r;
  try {
    r = new URL(url);
  } catch {
    return false;
  }
  return (
    (r.protocol === "https:" || r.protocol === "http:") &&
    r.username === "" &&
    r.password === "" &&
    r.hash === "" &&
    r.search === "" &&
    CCR_REMOTE_BROWSER_MCP_PATH_RE.test(r.pathname)
  );
}
//@ chunk-1wpnxx5r.js:14222-14485 placement
function isRemoteBrowserCcrUrl(e) {
  if (!isRemoteBrowserAllowed() || !isCcrSessionScopedMcpUrl(e)) return false;
  let r = new URL(e);
  let n = CCR_SESSION_MCP_PATH.exec(r.pathname)?.[1];
  let t = r.searchParams.get("mcp_server_id");
  return (
    n !== undefined &&
    [...r.searchParams.keys()].length === 2 &&
    r.searchParams.get("toolbox_mcp_server_id") === REMOTE_BROWSER_SERVER_ID &&
    sessionScopedServerIds_2(sessionIdBody(n), REMOTE_BROWSER_SERVER_NAME).some((s) => s === t)
  );
}
//@ chunk-1wpnxx5r.js:14485-14899 placement
function matchesCcrMcpServerId(serverName, url) {
  if (!isRemoteBrowserAllowed() || !isSameOriginAsCcr(url)) return false;
  let n = new URL(url);
  let flattened = queryValuesForKeys(n, ["mcp_server_id", "toolbox_mcp_server_id"]).flatMap(
    percentDecodingVariants,
  );
  if (flattened.some(isRemoteBrowserAllowedUrl))
    return !(serverName === REMOTE_BROWSER_SERVER_NAME && isRemoteBrowserCcrUrl(url));
  let mapped = percentDecodingVariants(n.pathname).map((i) => posix.normalize(i).replace(/\/+$/, ""));
  let mapped_2 = [
    ...startupCcrEnv.ownCcrSessionIds,
    ...[CCR_SESSION_MCP_PATH, CODE_SESSION_MCP_PATH, SHTTP_MCP_PATH_REGEX, WS_MCP_PATH_REGEX].flatMap(
      (i) => firstMatchGroup(i, mapped) ?? [],
    ),
  ]
    .flatMap((i) => sessionScopedServerIds_2(sessionIdBody(i), REMOTE_BROWSER_SERVER_NAME))
    .map(normalizedUuidDigits);
  return (
    mapped.some((i) => CCR_REMOTE_BROWSER_MCP_PATH_RE.test(i)) ||
    flattened.some(
      (i) =>
        normalizedAlnum(i) === normalizedAlnum(REMOTE_BROWSER_SERVER_NAME) ||
        mapped_2.some((a) => normalizeUuidDigits(i).includes(a)),
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
function isRemoteBrowserAllowedUrl(e) {
  return (
    isRemoteBrowserAllowed() &&
    (HAS_DIGITS_RE.test(e) || normalizeUuidDigits(e).includes(normalizedUuidDigits(REMOTE_BROWSER_SERVER_ID)))
  );
}
//@ chunk-1wpnxx5r.js:14989-15034 placement
/**
 * 规范化 UUID 数字并去掉前导零。
 */
function normalizedUuidDigits(e) {
  return normalizeUuidDigits(e).replace(/^0+/, "");
}
//@ chunk-1wpnxx5r.js:15034-15189 placement
function normalizeUuidDigits(e) {
  let r = decodeTaggedUuid(e)?.replaceAll("-", "") ?? "";
  let replaced = e
    .toLowerCase()
    .replaceAll("urn:", "")
    .replaceAll("uuid:", "")
    .replace(/[^0-9a-f]/g, "");
  return `${r}${replaced}`;
}
//@ chunk-1wpnxx5r.js:15189-15294 placement
/**
 * 桥接设备 MCP 的路径。
 */
var BRIDGE_HOSTS = new Set(["bridge.claudeusercontent.com", "bridge-staging.claudeusercontent.com"]);
var BRIDGE_DEVICES_PATH = "/devices/mcp";
//@ chunk-1wpnxx5r.js:15294-15428 placement
function isBareWssUrl(e) {
  let r;
  try {
    r = new URL(e);
  } catch {
    return false;
  }
  return r.protocol === "wss:" && r.username === "" && r.password === "" && BRIDGE_HOSTS.has(r.hostname);
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
var WEB_SCHEMES = new Set(["http:", "https:", "ws:", "wss:"]);
//@ chunk-1wpnxx5r.js:15667-15809 placement
function ccrProxyTargetHost(url) {
  let ccrProxyTargetUrl = getCcrProxyTargetUrl(url);
  if (ccrProxyTargetUrl === undefined || !URL.canParse(ccrProxyTargetUrl)) return;
  let n = new URL(ccrProxyTargetUrl);
  return WEB_SCHEMES.has(n.protocol) ? n.hostname.toLowerCase() : undefined;
}
//@ chunk-1wpnxx5r.js:15931-15976 placement
var BRIDGE_DEVICE_URL_PREFIXES = [...BRIDGE_HOSTS].map((e) => `https://${e}${BRIDGE_DEVICES_PATH}`);
//@ chunk-1wpnxx5r.js:16167-16204 placement
function safeOrigin(mcpServerBaseUrl) {
  return mcpServerBaseUrl ? shortHash(mcpServerBaseUrl) : undefined;
}
//@ chunk-1wpnxx5r.js:16204-16374 placement
function urlPathOf(url) {
  if (!URL.canParse(url)) return;
  let r = new URL(url);
  if (r.origin === "null") return;
  return r.pathname !== "/" || r.search !== "" || r.hash !== "" ? `${r.origin}/\u2026` : r.origin;
}
export {
  originIfValid,
  parseCcrSessionMcpUrl,
  isToolboxMcpServerConfig,
  isCcrMemoryMcpServer,
  hasOnlyAllowedCcrParams,
  matchesCcrMcpServerId,
  isSameOriginAsCcr,
  urlPathOf,
  ccrSessionIdFromMcpUrl,
  UUID_RE,
  ccrProxyTargetHost,
  isCcrInjectedMcpUrl,
  isCcrMcpPath,
  safeOrigin,
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
