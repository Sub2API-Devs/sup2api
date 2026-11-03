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
  MEMORY_SERVER_ID,
  derivedServerId,
  MEMORY,
  A471CAF9_E559_5AD8_836C_4E5972877185,
  CCR_EMAIL,
} from "./firstPartyServerIds.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../../utils/claudeInChrome/common.js";
import { Zl } from "./cliOwnedClients.js";
import { uniq } from "../../utils/collections.js";
import { C, isRemoteBrowserAllowed, w, REMOTE_BROWSER_SERVER_NAME } from "./remoteBrowserServer.js";
import { checkSdkUrl } from "../../cli/transports/sdkUrlValidation.js";
import { decodeTaggedUuid } from "./serverIdentity.js";
import { gn } from "../../utils/shortHash.js";

//@ chunk-1wpnxx5r.js:3514-3650 placement
function ccrBridgeEnvVarNames() {
  return startupCcrEnv.bridgeCarrier
    ? ["CLAUDE_CODE_SESSION_ACCESS_TOKEN", "SESSION_INGRESS_URL", "CLAUDE_CODE_BRIDGE_PROMPT_SHA256"]
    : [];
}
/**
 * 判断 URL 是否与启动时记录的 CCR（云端会话）地址同源。
 */
//@ chunk-1wpnxx5r.js:3650-3907 placement
function isSameOriginAsCcr(e) {
  let atStartup = startupCcrEnv.atStartup;
  if (!atStartup) return !1;
  let n, t;
  try {
    ((n = new URL(e)), (t = new URL(atStartup)));
  } catch {
    return !1;
  }
  if (
    (n.protocol === "wss:" ? `https://${n.host}` : n.protocol === "ws:" ? `http://${n.host}` : n.origin) !==
    t.origin
  )
    return !1;
  return CCR_PROXY_PATH_MARKERS.some((o) => n.pathname.includes(o));
}
//@ chunk-1wpnxx5r.js:3907-4130 placement
function isCcrInjectedMcpUrl(e, r) {
  if (!("url" in r) || typeof r.url !== "string") return !1;
  if (!isSameOriginAsCcr(r.url)) return !1;
  switch (startupCcrEnv.bridgeCarrier) {
    case void 0:
      return !0;
    case "child":
      return "scope" in r && r.scope === "dynamic" && e === CLAUDE_CODE_REMOTE;
    case "descendant":
      return !1;
  }
}
//@ chunk-1wpnxx5r.js:4130-4338 placement
function isCcrMetaOrProxyUrl(e, r) {
  let n = parseSameOriginUrl(e, r);
  if (!n) return !1;
  if (n.pathname === CCR_META_MCP_PATH) return n.search === "";
  let all = n.searchParams.getAll("toolbox_mcp_server_id");
  return (
    CCR_PROXY_PATH_MARKERS.some((s) => n.pathname.includes(s)) &&
    all.length === 1 &&
    all[0] === BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A
  );
}
//@ chunk-1wpnxx5r.js:4338-4822 placement
function isCcrSessionMcpUrl(e) {
  let r = getCcrOrigin();
  if (r === null) return !1;
  let n = parseSameOriginUrl(e, r);
  if (!n) return !1;
  let t = CCR_SESSION_MCP_PATH.exec(n.pathname)?.[1];
  if (t === void 0) return !1;
  if (
    !startupCcrEnv.ownCcrSessionIds.some(
      (ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === sessionIdBody(t),
    )
  )
    return !1;
  let s = [...n.searchParams.keys()],
    all = n.searchParams.getAll("toolbox_mcp_server_id"),
    i = n.searchParams.get("mcp_server_id"),
    a = n.searchParams.get("mcp_url");
  return (
    new Set(s).size === s.length &&
    s.every((l) => CCR_MCP_QUERY_PARAMS.includes(l)) &&
    all.length === 1 &&
    all[0] === MEMORY_SERVER_ID &&
    (i === null || ownCcrSessionIdSpellings().has(i)) &&
    (a === null || parseSameOriginUrl(a, r) !== null)
  );
}
//@ chunk-1wpnxx5r.js:4822-5533 placement
function hasOnlyAllowedCcrParams(e) {
  if (!isSameOriginAsCcr(e)) return !1;
  let r;
  try {
    r = new URL(e);
  } catch {
    return !1;
  }
  let n = [...r.searchParams.getAll("mcp_server_id"), ...r.searchParams.getAll("toolbox_mcp_server_id")];
  if (n.length === 0) return !1;
  let t;
  try {
    t = decodeURIComponent(r.pathname);
  } catch {
    return !0;
  }
  let normalized = posix.normalize(t),
    o;
  for (let u of [CCR_SESSION_MCP_PATH, h, SHTTP_MCP_PATH_REGEX, WS_MCP_PATH_REGEX])
    if (((o = u.exec(r.pathname)?.[1] ?? u.exec(normalized)?.[1]), o !== void 0)) break;
  if (
    o === void 0 &&
    [
      "/v2/ccr-sessions/",
      "/v1/code/sessions/",
      "/v2/session_ingress/shttp/mcp/",
      "/v2/session_ingress/mcp/ws/",
    ].some((u) => r.pathname.includes(u) || t.includes(u) || normalized.includes(u))
  )
    return !0;
  if (o === SELF_SESSION_PLACEHOLDER && startupCcrEnv.ownCcrSessionIds.length === 0) return !0;
  let a = ownCcrSessionIdSpellings(),
    l = o === void 0 ? [] : J(sessionIdBody(o));
  return n.some((u) => a.has(u) || l.includes(u) || u.toLowerCase() === CLAUDE_IN_CHROME_MCP_SERVER_NAME);
}
//@ chunk-1wpnxx5r.js:5533-5640 placement
function ownCcrSessionIdSpellings() {
  let e = new Set([MEMORY_SERVER_ID]);
  for (let ownCcrSessionId of startupCcrEnv.ownCcrSessionIds)
    for (let n of J(sessionIdBody(ownCcrSessionId))) e.add(n);
  return e;
}
//@ chunk-1wpnxx5r.js:5640-5669 placement
function J(e) {
  return sessionScopedServerIds(e, CLAUDE_IN_CHROME_MCP_SERVER_NAME);
}
/**
 * 为一个裸会话 ID 生成 cse_/session_ 两种前缀下的作用域服务器 ID。
 */
//@ chunk-1wpnxx5r.js:5669-5737 placement = toCompatSessionId (1)
function sessionScopedServerIds(bareId, scope) {
  return [`cse_${bareId}`, `session_${bareId}`].map((n) => derivedServerId(n, scope));
}
//@ chunk-1wpnxx5r.js:5737-5796 placement
var CCR_MEMORY_MCP_PATH = /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/memory\/mcp$/;
/**
 * 是否是云会话的 memory MCP 服务器（动态作用域、URL 指向 /v2/ccr-sessions/{id}/memory/mcp 或指定 toolbox 服务器）。
 */
//@ chunk-1wpnxx5r.js:5796-6163 placement
function isCcrMemoryMcpServer(name, config) {
  if (
    name !== MEMORY ||
    config.scope !== "dynamic" ||
    Zl(config) ||
    !("url" in config) ||
    typeof config.url !== "string" ||
    !isSameOriginAsCcr(config.url)
  )
    return !1;
  let n;
  try {
    n = new URL(config.url);
  } catch {
    return !1;
  }
  if (n.username !== "" || n.password !== "" || n.hash !== "") return !1;
  if (CCR_MEMORY_MCP_PATH.test(n.pathname)) return n.search === "";
  let all = n.searchParams.getAll("toolbox_mcp_server_id");
  return (
    CCR_SESSION_MCP_PATH.test(n.pathname) &&
    all.length === 1 &&
    all[0] === A471CAF9_E559_5AD8_836C_4E5972877185
  );
}
/**
 * MCP 服务器配置是否指向 toolbox（带 x-mcp-server-id 头的 URL 配置）。
 */
//@ chunk-1wpnxx5r.js:6163-6538 placement
function isToolboxMcpServerConfig(config) {
  if (!("url" in config) || typeof config.url !== "string" || Zl(config)) return !1;
  let r = "headers" in config ? config.headers : void 0,
    entries = Object.entries(typeof r === "object" && r !== null ? r : {}),
    flattened = entries.flatMap(([s, o]) =>
      d(s) === "xmcpserverid" && typeof o === "string" && o.trim() !== "" ? [o.trim()] : [],
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
    ...sessionIds.flatMap((r) => {
      let n = sessionIdBody(r);
      return [`cse_${n}`, `session_${n}`].map((t) => derivedServerId(t, MEMORY));
    }),
  ].map(d);
}
//@ chunk-1wpnxx5r.js:6658-6858 placement
function mentionsCcrMarker(e, r, { orItsName: n = !0 } = {}) {
  if (n && percentDecodingVariants(e).some((s) => s.replace(Re, "") === MEMORY)) return !0;
  let t = e;
  for (let s = 0; s <= 3; s++) {
    if (includesAnyMarker(t, r)) return !0;
    let o = lenientDecodeURIComponent(t);
    if (o === t) return !1;
    if (s === 3) return !0;
    t = o;
  }
  return !1;
}
//@ chunk-1wpnxx5r.js:6858-6970 placement
function includesAnyMarker(e, r) {
  let mapped = [e, e.replace(/%[0-9a-f]{2}/gi, "")].map(d);
  return r.some((t) => mapped.some((s) => s.includes(t)));
}
//@ chunk-1wpnxx5r.js:6970-7094 placement
var BACKSLASH_OR_CONTROL_REGEX = /[\\\p{Cc}]/u,
  UNSAFE_PATH_CHAR_REGEX = /[%?#\\\s\p{Cc}]/u,
  URL_AUTHORITY_REGEX = /^(?:https?|wss?):\/\/(?:[^/?#\\]*@)?[^/?#\\@:]+(?::[^/?#\\@]*)?(?=[/?#\\]|$)/i;
//@ chunk-1wpnxx5r.js:7094-7156 placement
function d(e) {
  return e.toLowerCase().replace(/[^0-9a-z]/g, "");
}
//@ chunk-1wpnxx5r.js:7156-8354 placement
function isCcrProxiedUrl(e, r = [], n = r) {
  if (!isSameOriginAsCcr(e)) return !1;
  if (e.length > 32768) return !0;
  let t;
  try {
    t = new URL(e);
  } catch {
    return !1;
  }
  if ([e, ...r].some((c) => c.includes("${"))) return !0;
  if (isMemoryProxyPath(t.pathname)) return !0;
  let s = [...[...t.searchParams].flat(), ...[t.hash, t.username, t.password].filter((c) => c !== ""), ...n];
  if (s.length > 64 || t.pathname.length + s.join("").length > 8192) return !0;
  let o = uniq(s.flatMap(percentDecodingVariants));
  if (
    o.some((c) => pathHasMemoryMcpTokens(c, _e)) ||
    queryValuesForKeys(t, ["mcp_url"]).some((c) => he(c, t.hostname))
  )
    return !0;
  let i = queryValuesForKeys(t, ["mcp_server_id", "toolbox_mcp_server_id"]),
    a = [t.pathname, posix.normalize(t.pathname)],
    l = g(SHTTP_MCP_PATH_REGEX, a) ?? g(WS_MCP_PATH_REGEX, a),
    u = g(CCR_SESSION_MCP_PATH, a) ?? g(h, a) ?? l,
    { ownCcrSessionIds: ownCcrSessionIds } = startupCcrEnv,
    N = uniq(
      [...a, ...o].flatMap((c) =>
        O.flatMap((S) => {
          let index = c.indexOf(S),
            V = index === -1 ? void 0 : /^[A-Za-z0-9_-]+(?=[/?#&;]|$)/.exec(c.slice(index + S.length))?.[0];
          return V === void 0 ? [] : [V];
        }),
      ),
    );
  if (N.length > 8) return !0;
  let R = memoryServerIdsForSessions(uniq([...ownCcrSessionIds, ...(u === void 0 ? [] : [u]), ...N]));
  if ([...o, ...percentDecodingVariants(t.pathname + t.search + t.hash)].some((c) => includesAnyMarker(c, R)))
    return !0;
  if (
    [...r, ...(l === void 0 ? [] : [l])].some((c) => mentionsCcrMarker(c, R)) ||
    t.pathname.split("/").some((c) => mentionsCcrMarker(c, R, { orItsName: !1 }))
  )
    return !0;
  let B = u === SELF_SESSION_PLACEHOLDER && ownCcrSessionIds.length === 0;
  if (r.length > 0 && B) return !0;
  if (i.length === 0) return !1;
  if (u === void 0 ? O.some((c) => a.some((S) => S.includes(c))) : B) return !0;
  return i.some((c) => mentionsCcrMarker(c, R));
}
//@ chunk-1wpnxx5r.js:8354-8474 placement
function queryValuesForKeys(e, r) {
  let mapped = r.map(d);
  return [...e.searchParams]
    .filter(([t]) => percentDecodingVariants(t).some((s) => mapped.includes(d(s))))
    .map(([, t]) => t);
}
//@ chunk-1wpnxx5r.js:8474-8557 placement
function g(e, r) {
  for (let n of r) {
    let t = e.exec(n)?.[1];
    if (t !== void 0) return t;
  }
  return;
}
//@ chunk-1wpnxx5r.js:8557-8726 placement
var CCR_SESSION_BASE_PATHS = ["/v2/ccr-sessions/", "/v1/code/sessions/"],
  O = [...CCR_SESSION_BASE_PATHS, "/v2/session_ingress/shttp/mcp/", "/v2/session_ingress/mcp/ws/"],
  _e = [...O, "/v1/code/local/", "/v1/code/mcp/"];
//@ chunk-1wpnxx5r.js:8726-8780 placement
function he(e, r) {
  return (
    !isCcrToolportUrl(e, r) &&
    (UNSAFE_PATH_CHAR_REGEX.test(e) || pathHasMemoryMcpTokens(e, CCR_PROXY_PATH_MARKERS))
  );
}
//@ chunk-1wpnxx5r.js:8780-8969 placement
function percentDecodingVariants(e) {
  if (!e.includes("%")) return [e];
  let r = [e],
    n = [e];
  for (let t = 1; t <= 3; t++)
    ((n = uniq(
      n.flatMap((s) => [
        decodePercentRuns(s),
        decodePercentRuns(s.replace(Se, (o, i, a) => (o.length === 3 ? o : `	%${i}${a}	`))),
      ]),
    )),
      r.push(...n));
  return uniq(r);
}
//@ chunk-1wpnxx5r.js:8969-9064 placement
var Re = /[\s\p{Cc}\ufffd+]/gu,
  Se = /%[\s\p{Cc}\ufffd+]*([0-9a-f])[\s\p{Cc}\ufffd+]*([0-9a-f])/giu;
//@ chunk-1wpnxx5r.js:9064-9208 placement
function decodePercentRuns(e) {
  return e.replace(/(?:%[0-9a-f]{2})+/gi, (r) =>
    new TextDecoder().decode(Uint8Array.from(r.slice(1).split("%"), (n) => parseInt(n, 16))),
  );
}
//@ chunk-1wpnxx5r.js:9208-9444 placement
function pathHasMemoryMcpTokens(e, r) {
  let n = splitPathTokens(e);
  if (!n.join("").includes("memory")) return !1;
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
  for (let t = 0; t < e.length && n < r.length; t++) {
    let s = r[n] ?? "",
      o = 0;
    for (let i = t; ; i++) {
      let a = e[i] ?? "";
      if (a === "" || !s.startsWith(a, o)) break;
      if (((o += a.length), o === s.length)) {
        (n++, (t = i));
        break;
      }
    }
  }
  return n === r.length;
}
//@ chunk-1wpnxx5r.js:9791-9959 placement
function isMemoryProxyPath(e) {
  if (UNSAFE_PATH_CHAR_REGEX.test(e) || pathHasMemoryMcpTokens(e, CCR_PROXY_PATH_MARKERS)) return !0;
  let lower = e.toLowerCase();
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
  if (n === void 0 || BACKSLASH_OR_CONTROL_REGEX.test(e) || !URL.canParse(e) || G(e, r)) return !1;
  for (let t = 0; t <= 3; t++) {
    let s = lenientDecodeURIComponent(n);
    if (s === n) return !0;
    if (
      BACKSLASH_OR_CONTROL_REGEX.test(s) ||
      !URL_AUTHORITY_REGEX.test(s) ||
      s.toLowerCase().includes(U(r)) ||
      (URL.canParse(s) && G(s, r))
    )
      return !1;
    n = s;
  }
  return !1;
}
//@ chunk-1wpnxx5r.js:10213-10278 placement
function G(e, r) {
  return [U(r), ""].includes(U(new URL(e).hostname));
}
//@ chunk-1wpnxx5r.js:10278-10350 placement
function U(e) {
  let r = e.length;
  while (e[r - 1] === ".") r--;
  return e.slice(0, r);
}
//@ chunk-1wpnxx5r.js:10350-10546 placement
function hasMemoryMcpSegments(e) {
  return [e, posix.normalize(e)].some((r) => {
    let filtered = r.split("/").filter((s) => s !== ""),
      index = filtered.indexOf("memory");
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
var CCR_SESSION_MCP_PATH = /^\/v2\/ccr-sessions\/([A-Za-z0-9_-]+)\/mcp$/,
  h = /^\/v1\/code\/sessions\/([A-Za-z0-9_-]+)\/mcp$/;
//@ chunk-1wpnxx5r.js:10799-11105 placement
function ccrPathPrefixIndex(e) {
  let r = -1;
  for (let s of CCR_SESSION_PATH_PREFIXES) {
    let index = e.pathname.indexOf(s);
    if (index !== -1 && (r === -1 || index < r)) r = index;
  }
  if (r === -1) return !1;
  let sliced = e.pathname.slice(r),
    all = e.searchParams.getAll("toolbox_mcp_server_id");
  return (
    (all.length === 1 &&
      all.every((s) => C.includes(s.toLowerCase())) &&
      (CCR_SESSION_MCP_PATH.test(sliced) || h.test(sliced))) ||
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
function isCcrMcpPath(e) {
  return isSameOriginAsCcr(e) && regExp.test(new URL(e).pathname);
}
//@ chunk-1wpnxx5r.js:11448-11572 placement
var SHTTP_MCP_PATH_REGEX = /^\/v2\/session_ingress\/shttp\/mcp\/([A-Za-z0-9_-]+)$/,
  WS_MCP_PATH_REGEX = /^\/v2\/session_ingress\/mcp\/ws\/([A-Za-z0-9_-]+)$/,
  SELF_SESSION_PLACEHOLDER = "-";
//@ chunk-1wpnxx5r.js:11572-11735 placement
function parseCcrSessionMcpUrl(e, r, n) {
  let t = parseSameOriginUrl(e, r);
  if (!t) return null;
  let match = CCR_SESSION_MCP_PATH.exec(t.pathname),
    o = parseCcrMcpQuery(t, r);
  if (!match || match[1] !== n || !o) return null;
  return `${r}/v2/ccr-sessions/${n}/mcp?${o}`;
}
//@ chunk-1wpnxx5r.js:11735-11864 placement
var CCR_MCP_QUERY_PARAMS = ["mcp_url", "mcp_server_id", "toolbox_mcp_server_id"],
  Tso = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-1wpnxx5r.js:11864-12366 placement
function parseCcrMcpQuery(e, r) {
  let n = [...e.searchParams.keys()];
  if (
    new Set(n).size !== n.length ||
    n.some((i) => !CCR_MCP_QUERY_PARAMS.includes(i)) ||
    e.searchParams.get("toolbox_mcp_server_id") !== BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A
  )
    return null;
  let uRLSearchParams = new URLSearchParams(),
    s = e.searchParams.get("mcp_url");
  if (s !== null) {
    let i = parseSameOriginUrl(s, r);
    if (!i || i.pathname !== CCR_META_MCP_PATH || i.search !== "") return null;
    uRLSearchParams.set("mcp_url", `${r}${CCR_META_MCP_PATH}`);
  }
  let o = e.searchParams.get("mcp_server_id");
  if (o !== null) {
    if (!Tso.test(o)) return null;
    uRLSearchParams.set("mcp_server_id", o);
  }
  return (
    uRLSearchParams.set("toolbox_mcp_server_id", BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A),
    uRLSearchParams.toString()
  );
}
//@ chunk-1wpnxx5r.js:12366-12497 placement
function parseSameOriginUrl(e, r) {
  let n;
  try {
    n = new URL(e);
  } catch {
    return null;
  }
  return n.origin === r && n.username === "" && n.password === "" && n.hash === "" ? n : null;
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
function isCcrSessionScopedMcpUrl(e) {
  let r = getCcrOrigin(),
    n = r === null ? null : parseSameOriginUrl(e, r);
  if (!n) return !1;
  let t = (CCR_SESSION_MCP_PATH.exec(n.pathname) ?? h.exec(n.pathname))?.[1];
  return (
    t !== void 0 &&
    startupCcrEnv.ownCcrSessionIds.some(
      (ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === sessionIdBody(t),
    )
  );
}
//@ chunk-1wpnxx5r.js:12781-12834 placement
function isCcrOriginUrl(e) {
  let r = getCcrOrigin();
  return r !== null && isCcrMetaOrProxyUrl(e, r);
}
//@ chunk-1wpnxx5r.js:12834-13286 placement
function ccrSessionIdFromMcpUrl(e) {
  let r = getCcrOrigin(),
    n = r === null ? null : parseSameOriginUrl(e, r),
    t = n ? CCR_SESSION_MCP_PATH.exec(n.pathname)?.[1] : void 0;
  if (!n || t === void 0) return null;
  let s = [...n.searchParams.keys()],
    o = n.searchParams.get("mcp_server_id"),
    i = n.searchParams.get("toolbox_mcp_server_id");
  if (
    new Set(s).size !== s.length ||
    s.some((a) => !CCR_MCP_QUERY_PARAMS.includes(a)) ||
    o === null ||
    !Tso.test(o) ||
    i === null
  )
    return null;
  return {
    sessionSegment: t,
    mcpServerId: o,
    toolboxMcpServerId: i,
    upstreamUrl: n.searchParams.get("mcp_url") ?? void 0,
  };
}
//@ chunk-1wpnxx5r.js:13286-13358 placement
function originIfValid(e) {
  return e !== void 0 && checkSdkUrl(e) === null ? new URL(e).origin : null;
}
//@ chunk-1wpnxx5r.js:13358-13454 placement
var Oe = "/v1/code/mcp/hearthbot",
  Ue = /^\/v2\/ccr-sessions\/(?:-|[A-Za-z0-9_-]+)\/hearthbot\/mcp$/;
//@ chunk-1wpnxx5r.js:13454-13635 placement
function isCcrUrlWithoutCredentials(e) {
  if (!isSameOriginAsCcr(e)) return !1;
  let r;
  try {
    r = new URL(e);
  } catch {
    return !1;
  }
  return (
    r.username === "" &&
    r.password === "" &&
    r.hash === "" &&
    r.search === "" &&
    (r.pathname === Oe || Ue.test(r.pathname))
  );
}
//@ chunk-1wpnxx5r.js:13635-13699 placement
var be = /^\/v2\/ccr-sessions\/(?:-|[A-Za-z0-9_-]+)\/email\/mcp$/;
//@ chunk-1wpnxx5r.js:13699-13947 placement
function isCcrDynamicServer(e, r) {
  if (
    e !== CCR_EMAIL ||
    r.scope !== "dynamic" ||
    Zl(r) ||
    !("url" in r) ||
    typeof r.url !== "string" ||
    !isSameOriginAsCcr(r.url)
  )
    return !1;
  let n;
  try {
    n = new URL(r.url);
  } catch {
    return !1;
  }
  return n.username === "" && n.password === "" && n.hash === "" && n.search === "" && be.test(n.pathname);
}
//@ chunk-1wpnxx5r.js:13947-14014 placement
var oe = /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/remote-browser\/mcp$/;
//@ chunk-1wpnxx5r.js:14014-14222 placement
function isHttpsCcrUrl(e) {
  if (!isSameOriginAsCcr(e)) return !1;
  let r;
  try {
    r = new URL(e);
  } catch {
    return !1;
  }
  return (
    (r.protocol === "https:" || r.protocol === "http:") &&
    r.username === "" &&
    r.password === "" &&
    r.hash === "" &&
    r.search === "" &&
    oe.test(r.pathname)
  );
}
//@ chunk-1wpnxx5r.js:14222-14485 placement
function isRemoteBrowserCcrUrl(e) {
  if (!isRemoteBrowserAllowed() || !isCcrSessionScopedMcpUrl(e)) return !1;
  let r = new URL(e),
    n = CCR_SESSION_MCP_PATH.exec(r.pathname)?.[1],
    t = r.searchParams.get("mcp_server_id");
  return (
    n !== void 0 &&
    [...r.searchParams.keys()].length === 2 &&
    r.searchParams.get("toolbox_mcp_server_id") === w &&
    sessionScopedServerIds(sessionIdBody(n), REMOTE_BROWSER_SERVER_NAME).some((s) => s === t)
  );
}
//@ chunk-1wpnxx5r.js:14485-14899 placement
function matchesCcrMcpServerId(e, r) {
  if (!isRemoteBrowserAllowed() || !isSameOriginAsCcr(r)) return !1;
  let n = new URL(r),
    flattened = queryValuesForKeys(n, ["mcp_server_id", "toolbox_mcp_server_id"]).flatMap(
      percentDecodingVariants,
    );
  if (flattened.some(Ie)) return !(e === REMOTE_BROWSER_SERVER_NAME && isRemoteBrowserCcrUrl(r));
  let mapped = percentDecodingVariants(n.pathname).map((i) => posix.normalize(i).replace(/\/+$/, "")),
    mapped_2 = [
      ...startupCcrEnv.ownCcrSessionIds,
      ...[CCR_SESSION_MCP_PATH, h, SHTTP_MCP_PATH_REGEX, WS_MCP_PATH_REGEX].flatMap(
        (i) => g(i, mapped) ?? [],
      ),
    ]
      .flatMap((i) => sessionScopedServerIds(sessionIdBody(i), REMOTE_BROWSER_SERVER_NAME))
      .map(ie);
  return (
    mapped.some((i) => oe.test(i)) ||
    flattened.some(
      (i) =>
        d(i) === d(REMOTE_BROWSER_SERVER_NAME) || mapped_2.some((a) => normalizeUuidDigits(i).includes(a)),
    )
  );
}
//@ chunk-1wpnxx5r.js:14899-14925 placement
var Ae = /(?![0-9])\p{Nd}/u;
//@ chunk-1wpnxx5r.js:14925-14989 placement
function Ie(e) {
  return isRemoteBrowserAllowed() && (Ae.test(e) || normalizeUuidDigits(e).includes(ie(w)));
}
//@ chunk-1wpnxx5r.js:14989-15034 placement
function ie(e) {
  return normalizeUuidDigits(e).replace(/^0+/, "");
}
//@ chunk-1wpnxx5r.js:15034-15189 placement
function normalizeUuidDigits(e) {
  let r = decodeTaggedUuid(e)?.replaceAll("-", "") ?? "",
    replaced = e
      .toLowerCase()
      .replaceAll("urn:", "")
      .replaceAll("uuid:", "")
      .replace(/[^0-9a-f]/g, "");
  return `${r}${replaced}`;
}
//@ chunk-1wpnxx5r.js:15189-15294 placement
var BRIDGE_HOSTS = new Set(["bridge.claudeusercontent.com", "bridge-staging.claudeusercontent.com"]),
  ae = "/devices/mcp";
//@ chunk-1wpnxx5r.js:15294-15428 placement
function isBareWssUrl(e) {
  let r;
  try {
    r = new URL(e);
  } catch {
    return !1;
  }
  return r.protocol === "wss:" && r.username === "" && r.password === "" && BRIDGE_HOSTS.has(r.hostname);
}
//@ chunk-1wpnxx5r.js:15515-15619 affinity = unwrapCcrProxyUrl (0.858)
function getCcrProxyTargetUrl(url) {
  if (!isSameOriginAsCcr(url) || !URL.canParse(url)) return;
  return new URL(url).searchParams.get("mcp_url") || void 0;
}
//@ chunk-1wpnxx5r.js:15619-15667 placement
var ve = new Set(["http:", "https:", "ws:", "wss:"]);
//@ chunk-1wpnxx5r.js:15667-15809 placement
function ccrProxyTargetHost(e) {
  let r = getCcrProxyTargetUrl(e);
  if (r === void 0 || !URL.canParse(r)) return;
  let n = new URL(r);
  return ve.has(n.protocol) ? n.hostname.toLowerCase() : void 0;
}
//@ chunk-1wpnxx5r.js:15931-15976 placement
var BRIDGE_DEVICE_URL_PREFIXES = [...BRIDGE_HOSTS].map((e) => `https://${e}${ae}`);
//@ chunk-1wpnxx5r.js:16167-16204 placement
function safeOrigin(e) {
  return e ? gn(e) : void 0;
}
//@ chunk-1wpnxx5r.js:16204-16374 placement
function urlPathOf(e) {
  if (!URL.canParse(e)) return;
  let r = new URL(e);
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
  Tso,
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
  ae,
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
