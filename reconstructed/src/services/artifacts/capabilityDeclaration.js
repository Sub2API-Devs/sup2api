/**
 * services/artifacts/capabilityDeclaration.ts
 *
 * 2.1.316 新增：页面能力声明（mcp/db/user）的规范化、host grant 过滤与展示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-99h01h55.js (79)
 * attribution: placement 79
 */
import {
  isPlainObjectConnector,
  emptyConnectorResolution,
  CONNECTOR_NAME_FIELDS,
  isDeclarableServer,
  sanitizeConnectorName,
} from "./connectorNames.js";
import {
  SAFE_ID_RE,
  MAX_SANITIZED_TEXT,
  MAX_LISTED_MCP_SERVERS,
  ESCAPE_CHAR_RE,
  MAX_NAME_LENGTH,
  makeEdgeSpaceMasker,
  escapeChar,
} from "./textSanitize.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { internalKey } from "../mcp/serverIdentity.js";
import {
  hostCapabilityServer,
  sameNormalizedServer,
  isHostCapabilityServer,
  HOST_CAPABILITY_SERVERS,
} from "../mcp/firstPartyServerIds.js";
import { CLAUDE_AI, normalizeNameForMCP } from "../mcp/normalization.js";
import { firstLineOf, plural } from "../../utils/stringUtils.js";
import { uniq } from "../../utils/collections.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, array, string } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  readUntrustedArray,
  UNREADABLE_ARRAY,
  UNREADABLE_LIST_TEXT,
  readUntrustedArrayOrUndefined,
} from "../../utils/untrustedArray.js";
import {
  QUOTE_HOMOGLYPHS,
  MODEL_TEXT_PUNCT_CODE_POINT,
  isJoinerOrEmojiSelector,
  selectorOrJoinerRides,
  rideStateAfter,
  sweepMarkerLookalikes,
  sweepAskCopy,
  isDecisionSurfaceControl,
  INVISIBLE_BLANKS,
} from "../../tools/ArtifactTool/artifactUrls.js";

//@ chunk-99h01h55.js:4881-4919 placement
function getUserScopes(e) {
  return arrayField(e, "scopes");
}
//@ chunk-99h01h55.js:4919-5011 placement
function isValidScopeList(e) {
  return e.every((n) => typeof n === "string" && /^[a-z][a-z0-9_-]{0,31}$/.test(n));
}
//@ chunk-99h01h55.js:5011-5140 placement
function isValidUserCapability(e) {
  if (!isPlainObjectConnector(e)) return false;
  let { scopes, ...t } = e;
  return (
    Object.keys(t).length === 0 &&
    (scopes === undefined || (Array.isArray(scopes) && isValidScopeList(scopes)))
  );
}
//@ chunk-99h01h55.js:5140-5218 placement
function arrayField(e, n) {
  if (!isPlainObjectConnector(e)) return;
  let t = e[n];
  return Array.isArray(t) ? t : undefined;
}
//@ chunk-99h01h55.js:5218-5358 placement
/**
 * 数据库规则路径正则（允许 {self} 段）与可用作用域集合（view/interact/admin/owner/self）。
 */
var DB_RULE_PATH_REGEX = /^(?:[A-Za-z0-9_.~:@+-]+|\{self\})(?:\/(?:[A-Za-z0-9_.~:@+-]+|\{self\}))*$/;
var DB_RULE_SCOPES = new Set(["view", "interact", "admin", "owner", "self"]);
//@ chunk-99h01h55.js:5358-5573 placement
function isValidDbCapability(e) {
  if (!isPlainObjectConnector(e)) return false;
  let { rules, wake, ...r } = e;
  return (
    Object.keys(r).length === 0 &&
    (rules === undefined || (Array.isArray(rules) && isValidDbRules(rules))) &&
    (wake === undefined ||
      (Array.isArray(wake) && wake.every((s) => typeof s === "string" && DB_RULE_PATH_REGEX.test(s))))
  );
}
//@ chunk-99h01h55.js:5573-5836 placement
function isValidDbRules(e) {
  return e.every((n) => {
    if (!isPlainObjectConnector(n)) return false;
    let { path, read, write, ...i } = n;
    return (
      Object.keys(i).length === 0 &&
      typeof path === "string" &&
      (path === "" || DB_RULE_PATH_REGEX.test(path)) &&
      (read === undefined || (typeof read === "string" && DB_RULE_SCOPES.has(read))) &&
      (write === undefined || (typeof write === "string" && DB_RULE_SCOPES.has(write)))
    );
  });
}
//@ chunk-99h01h55.js:5836-5895 placement
function serverConfigOrUndefined(e) {
  try {
    return isPlainObjectConnector(e) ? e : undefined;
  } catch {
    return null;
  }
}
//@ chunk-99h01h55.js:5895-5969 placement
function isStringArray(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string");
}
//@ chunk-99h01h55.js:5969-6004 placement
function stringListOrNull(tools) {
  return isStringArray(tools) ? tools : null;
}
//@ chunk-99h01h55.js:6004-6056 placement
function safeIds(e) {
  return [...e].filter((n) => SAFE_ID_RE.test(n));
}
//@ chunk-99h01h55.js:6056-6108 placement
function normalizedOrLower(e) {
  return normalizeUuidOrNull(e) === null ? e : e.toLowerCase();
}
//@ chunk-99h01h55.js:6108-11482 placement
/**
 * 规范化页面声明的 mcp 能力（servers 列表、dynamic、改名），返回规范结果、警告与被重命名的服务器。
 */
function normalizeMcpCapability(capabilities, connectorNames, serverNames, r = {}) {
  let mcp = capabilities.mcp;
  if (mcp === undefined)
    return {
      ok: true,
      caps: capabilities,
      warnings: [],
      servers: [],
      renamed: [],
    };
  let servers = isPlainObjectConnector(mcp) ? mcp.servers : false;
  if (servers === false || (servers != null && !Array.isArray(servers)))
    return {
      ...emptyConnectorResolution(),
      malformed: [
        {
          kind: "not_object",
        },
      ],
    };
  if (isPlainObjectConnector(mcp) && mcp.dynamic !== undefined && typeof mcp.dynamic !== "boolean")
    return {
      ...emptyConnectorResolution(),
      malformed: [
        {
          kind: "dynamic_not_boolean",
        },
      ],
    };
  if (servers == null || servers.length === 0) {
    if (isPlainObjectConnector(mcp) && isDynamicMcp(mcp))
      return {
        ok: true,
        caps: {
          ...capabilities,
          mcp: {
            ...mcp,
            servers: [],
          },
        },
        warnings: [],
        servers: [],
        renamed: [],
      };
    return {
      ...emptyConnectorResolution(),
      malformed: [
        {
          kind: "no_servers",
        },
      ],
    };
  }
  let l = new Map(connectorNames.map((g) => [normalizedOrLower(g.toolPrefix), g]));
  let c = new Map(connectorNames.map((g) => [g.server, g]));
  let d = [];
  let m = [];
  let a = [];
  let b = [];
  let y = new Map();
  let C = new Map();
  let R = [];
  let P = [];
  for (let [g, h] of servers.entries()) {
    let serverField = getServerField(h);
    let f = serverField?.startsWith("host:") ? `host:${internalKey(serverField.slice(5))}` : serverField;
    if (f === undefined) {
      let wrongKey =
        h !== null && typeof h === "object" ? (CONNECTOR_NAME_FIELDS.find((M) => M in h) ?? null) : null;
      a.push({
        kind: "entry_shape",
        index: g,
        wrongKey,
      });
      continue;
    }
    let E = l.get(normalizedOrLower(internalKey(f)));
    let tools = isPlainObjectConnector(h) ? h.tools : undefined;
    let N = stringListOrNull(tools);
    if (tools === undefined || N?.length === 0) {
      let w = E ?? c.get(f);
      a.push({
        kind: "no_tools",
        server: f,
        display: E !== undefined && isDeclarableServer(E) ? E.server : null,
        available: safeIds(w?.toolNames ?? []),
      });
    } else if (N === null)
      a.push({
        kind: "tools_shape",
        server: f,
      });
    let localServerName = getLocalServerName(f);
    let Q = localServerName === undefined ? undefined : l.get(normalizedOrLower(localServerName));
    let W = localServerName === undefined ? null : hostCapabilityServer(localServerName);
    let x = null;
    let pe = c.get(f);
    if (E !== undefined) {
      if (!isDeclarableServer(E))
        a.push({
          kind: "undeclarable_name",
          server: f,
          name: E.server,
        });
      else if (normalizeUuidOrNull(f) !== null)
        a.push({
          kind: "known_id",
          server: f,
          display: E.server,
        });
      else {
        x = E.server;
        if (f !== E.server) y.set(f, E.server);
      }
    } else if (pe !== undefined) {
      if (isDeclarableServer(pe)) x = f;
      else
        a.push({
          kind: "undeclarable_name",
          server: f,
          name: f,
        });
    } else if (f.startsWith(CLAUDE_AI)) d.push(f);
    else if (f.startsWith("mcp__")) {
      let w = l.get(normalizedOrLower(firstLineOf(f.slice(5), "__")));
      a.push({
        kind: "tool_name",
        server: f,
        display: w !== undefined && isDeclarableServer(w) ? w.server : null,
      });
    } else if (normalizeUuidOrNull(f) !== null)
      a.push({
        kind: "opaque_id",
        server: f,
      });
    else if (Q !== undefined)
      a.push(
        isDeclarableServer(Q)
          ? {
              kind: "connector_as_host",
              server: f,
              display: Q.server,
            }
          : {
              kind: "undeclarable_name",
              server: f,
              name: Q.server,
            },
      );
    else if (localServerName !== undefined && normalizeUuidOrNull(localServerName) !== null)
      a.push({
        kind: "opaque_id",
        server: f,
      });
    else if (localServerName !== undefined && r.hostServers === false)
      a.push({
        kind: "host_unavailable",
        server: f,
      });
    else if (W !== null) {
      let w = (server) =>
        sameNormalizedServer(server, W) ||
        sameNormalizedServer(firstLineOf(`${normalizeNameForMCP(server)}__`, "__"), W) ||
        sameNormalizedServer(normalizeConnectorName(server), W);
      let M = serverNames.find(w) ?? connectorNames.find((k) => w(k.server))?.server;
      if (M === undefined) x = `host:${W}`;
      else
        a.push({
          kind: "local_server_as_first_party",
          server: f,
          local: M,
        });
    } else if (isHostCapabilityServer(localServerName ?? "")) m.push(f);
    else {
      x = f;
      let w = localServerName === undefined ? suggestConnectorName(f, connectorNames) : undefined;
      if (w !== undefined && !C.has(f)) C.set(f, w);
    }
    if (x !== null && serverField !== f && !y.has(f)) y.set(serverField ?? f, x);
    if (x !== null && N !== null && N.length > 0 && isPlainObjectConnector(h)) {
      let w = new Set(
        connectorNames.flatMap((k) => (k.server === x && isDeclarableServer(k) ? (k.toolNames ?? []) : [])),
      );
      let M = N;
      if (w.size > 0) {
        M = N.map((j) => {
          if (w.has(j)) return j;
          let filtered = [...w].filter((Le) => normalizeNameForMCP(Le) === j);
          if (filtered.length !== 1 || !SAFE_ID_RE.test(filtered[0])) return j;
          R.push([j, filtered[0]]);
          return filtered[0];
        });
        let k = uniq(M.filter((j) => !w.has(j)));
        if (k.length > 0 && k.length === uniq(M).length) {
          a.push({
            kind: "unknown_tools",
            server: f,
            display: f === x ? null : x,
            unknown: k,
            available: safeIds(w),
          });
          continue;
        }
        if (k.length > 0)
          P.push({
            server: x,
            unknown: k,
            known: safeIds(w),
          });
      }
      b.push({
        ...h,
        server: x,
        tools: M,
      });
    }
  }
  if (d.length > 0 || m.length > 0 || a.length > 0)
    return {
      ...emptyConnectorResolution(),
      unresolved: d,
      internal: m,
      malformed: a,
    };
  let S = [];
  let z = new Map();
  for (let g of b) {
    let h = z.get(g.server);
    if (h === undefined) {
      z.set(g.server, {
        idx: S.length,
        from: 1,
      });
      S.push(g);
    } else {
      h.from++;
      let _ = S[h.idx];
      S[h.idx] = {
        ..._,
        tools: uniq([..._.tools, ...g.tools]),
      };
    }
  }
  let F = [];
  if (y.size > 0) {
    let joined = capListForDisplay(
      [...y],
      8,
      ([h, _]) => `"${sanitizeDisplayText(h)}" \u2192 "${sanitizeConnectorName(_)}"`,
    ).join(", ");
    F.push(
      `resolved ${plural(y.size, "a connector name", "connector names")} to the display ${plural(y.size, "name")} viewers match \u2014 ${joined}; the page must pass exactly ${y.size === 1 ? "that name" : "those names"} to callTool(\u2026) / watchTool(\u2026).`,
    );
  }
  if (C.size > 0) {
    let joined = capListForDisplay(
      [...C],
      8,
      ([h, _]) => `"${sanitizeConnectorName(h)}" (closest here: "${sanitizeConnectorName(_)}")`,
    ).join(", ");
    F.push(
      `no connector in this session is named ${joined} \u2014 if the closest name is the one you meant, declare it with exactly that spelling; viewers' connectors are matched by name (ignoring at most letter case and separators), so a name none of them carries works for no viewer.`,
    );
  }
  if (R.length > 0) {
    let g = uniq(R.map(([h, _]) => `"${sanitizeConnectorName(h)}" \u2192 "${sanitizeConnectorName(_)}"`));
    F.push(
      `rewrote mcp tool ${plural(g.length, "name")} to the upstream ${plural(g.length, "spelling")} viewers call \u2014 ${capListForDisplay(g, 8, (h) => h).join(", ")}; the page must pass exactly ${g.length === 1 ? "that name" : "those names"} to callTool(\u2026) / watchTool(\u2026).`,
    );
  }
  for (let { server, unknown, known } of P) {
    let joined = capListForDisplay(unknown, 8, (N) => `"${sanitizeConnectorName(N)}"`).join(", ");
    let E = unknown.length === 1 ? "it" : "them";
    let I =
      known.length === 0
        ? ""
        : ` (its tools here: ${capListForDisplay(known, 12, (N) => `"${sanitizeConnectorName(N)}"`).join(", ")})`;
    F.push(
      `connector "${sanitizeConnectorName(server)}" has no ${plural(unknown.length, "tool")} named ${joined} in this session${I}, so the page's calls to ${E} fail for any viewer whose "${sanitizeConnectorName(server)}" lacks ${E} too \u2014 "tools" takes the connector's own top-level tool names; if ${E === "it" ? "that name is" : "those names are"} wrong, fix "tools" and publish again.`,
    );
  }
  let ie = [];
  for (let [g, h] of z) {
    let _ = S[h.idx].tools.length;
    let f = hostCapabilityServer(getLocalServerName(g) ?? "") !== null;
    if (h.from > 1 && !f) {
      let E = sanitizeConnectorName(g);
      let I = describeServerKind(g);
      F.push(
        `${h.from} manifest entries resolve to ${I} "${E}" and were merged into one (${_} ${plural(_, "tool")}). A viewer with more than one ${I} named "${E}" gets server_ambiguous on every call until the duplicates are renamed or removed.`,
      );
    }
    if (_ > MAX_SANITIZED_TEXT)
      ie.push({
        server: g,
        toolCount: _,
      });
  }
  let fe = S.length > MAX_LISTED_MCP_SERVERS ? S.length : null;
  if (ie.length > 0 || fe !== null)
    return {
      ...emptyConnectorResolution(),
      oversized: ie,
      serverCount: fe,
    };
  return {
    ok: true,
    caps: {
      ...capabilities,
      mcp: {
        ...mcp,
        servers: S,
      },
    },
    warnings: F,
    servers: S.map((g) => g.server),
    renamed: [...y],
  };
}
//@ chunk-99h01h55.js:11482-11761 placement
function findUndeclaredMcpToolCalls(e, n, t = 8) {
  let r = new Set(n);
  let s = new Set();
  let i = [];
  let l = /\.(?:callTool|watchTool)\(\s*(?:'([^'\\\n]{1,200})'|"([^"\\\n]{1,200})")\s*,/g;
  for (let c of e)
    for (let d of c.matchAll(l)) {
      let m = d[1] ?? d[2];
      if (r.has(m) || s.has(m)) continue;
      s.add(m);
      i.push(m);
      if (i.length >= t) return i;
    }
  return i;
}
//@ chunk-99h01h55.js:11761-11841 placement
function foldName(server) {
  return server
    .toLowerCase()
    .replace(/[\s\p{Pd}\p{Pc}]+/gu, " ")
    .trim();
}
//@ chunk-99h01h55.js:11841-12342 placement
function suggestConnectorName(e, n) {
  let filtered = n.filter(isDeclarableServer);
  let r = foldName(e);
  if (filtered.some((a) => foldName(a.server) === r)) return;
  let s = (a) => a.replace(/[^\p{L}\p{N}]/gu, "");
  let i = (a) => a.split(/[^\p{L}\p{N}]+/u).filter((b) => b.length >= 3);
  let l = s(r);
  if (l.length < 3) return;
  let found = filtered.find((a) => s(foldName(a.server)) === l);
  if (found !== undefined) return found.server;
  let d = i(r);
  let m;
  for (let a of filtered) {
    let b = i(foldName(a.server));
    let [y, C] = b.length <= d.length ? [b, d] : [d, b];
    if (y.length > 0 && y.every((R) => C.includes(R)) && (m === undefined || y.length > m.shared))
      m = {
        server: a.server,
        shared: y.length,
      };
  }
  return m?.server;
}
//@ chunk-99h01h55.js:12342-12453 placement
function findMentionedTools(e, renamed) {
  return renamed.filter(([t]) => e.some((r) => [`'${t}'`, `"${t}"`, `\`${t}\``].some((s) => r.includes(s))));
}
//@ chunk-99h01h55.js:12453-12566 placement
function listLocalServerDeclarations(capabilities) {
  let mcp = capabilities.mcp;
  if (!hasDeclaredServers(mcp)) return [];
  return mcp.servers.map(getServerField).filter((t) => t !== undefined && t.startsWith(CLAUDE_AI));
}
//@ chunk-99h01h55.js:12566-13394 placement
function findUnservedMcpServers(e, n, t) {
  let mcp = e.mcp;
  let s = isDynamicMcp(mcp) ? [DYNAMIC_CONNECTOR_NOTICE] : [];
  if (!hasDeclaredServers(mcp)) return s;
  let i = uniq(mcp.servers.map(getServerField).filter((c) => c !== undefined));
  let l = (c) => t.has(c) && !HOST_CAPABILITY_SERVERS.has(c) && !n.some((d) => d.toolPrefix === c);
  return i
    .filter((c) => {
      let localServerName = getLocalServerName(c);
      if (localServerName !== undefined) {
        let m = hostCapabilityServer(localServerName);
        return m === null ? !l(localServerName) : ![...t].some((a) => hostCapabilityServer(a) === m && l(a));
      }
      return (
        !t.has(c) && !l(normalizeConnectorName(c)) && !n.some((m) => m.server === c && t.has(m.toolPrefix))
      );
    })
    .map((c) => {
      let d = sanitizeConnectorName(c);
      return `This page declares ${describeServerKind(c)} "${d}" but no successful call to it was observed in this session, so the page is published against an unobserved interface. Check the page's argument names against each tool's input schema if this session has the tool. The result fields the page reads stay unverified unless you can safely make one real call; otherwise tell the user the page's "${d}" integration is unverified.`;
    })
    .concat(s);
}
//@ chunk-99h01h55.js:13394-13492 placement
function normalizeConnectorName(e) {
  return normalizeNameForMCP(e).replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 64).replace(/_+$/, "");
}
//@ chunk-99h01h55.js:13492-13593 placement
function getServerField(e) {
  let server = e != null && typeof e === "object" ? e.server : undefined;
  return typeof server === "string" ? server : undefined;
}
//@ chunk-99h01h55.js:13593-13646 placement
function isNonEmptyObject(capabilities) {
  return isPlainObjectCapability(capabilities) && Object.keys(capabilities).length > 0;
}
//@ chunk-99h01h55.js:13646-13717 placement
function isPlainObjectCapability(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-99h01h55.js:13717-13761 placement
function foldSelfConfig(e) {
  let n = foldSelfCapability(e);
  return isPlainObjectCapability(n) ? n : e;
}
//@ chunk-99h01h55.js:13761-13858 placement
function defineValue(e, n, value) {
  Object.defineProperty(e, n, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}
//@ chunk-99h01h55.js:13858-14061 placement
function mergeCapabilities(e, n) {
  let t = foldSelfConfig(e ?? {});
  let r = foldSelfConfig(n ?? {});
  let s = {
    ...t,
  };
  let i = false;
  let conflict = false;
  for (let [key, value] of Object.entries(r))
    if (Object.hasOwn(t, key)) conflict ||= !sameCapabilityValue(t[key], value);
    else {
      defineValue(s, key, value);
      i = true;
    }
  return {
    capabilities: i ? s : e,
    widened: i,
    conflict,
  };
}
//@ chunk-99h01h55.js:14061-14077 placement
var UNVERSIONED_CONTRACT = "0.0.0";
//@ chunk-99h01h55.js:14077-14100 placement
class ServedCapabilityState {
  served = undefined;
}
//@ chunk-99h01h55.js:14100-14126 placement
var servedCapabilitySlot = new SessionRootSlot(() => new ServedCapabilityState());
//@ chunk-99h01h55.js:14126-14162 placement
function setServedCapabilities(session, served) {
  servedCapabilitySlot.of(session).served = served;
}
//@ chunk-99h01h55.js:14162-14204 placement
function getServedCapabilities(session) {
  return servedCapabilitySlot.peek(session)?.served;
}
//@ chunk-99h01h55.js:14204-14243 placement
function clearServedCapabilities(rootSession) {
  servedCapabilitySlot.of(rootSession).served = undefined;
}
//@ chunk-99h01h55.js:14243-14258 placement
var HOST = "host";
//@ chunk-99h01h55.js:14258-14360 placement
function hasFeatureFlag(e, n, t) {
  let features = e.features;
  return features !== undefined && Object.hasOwn(features, n) && Object.hasOwn(features[n] ?? {}, t);
}
//@ chunk-99h01h55.js:14360-14398 placement
var HOST_GRANT_SERVER_RE = /^host:([A-Za-z0-9_-]{1,64})$/;
//@ chunk-99h01h55.js:14398-14437 placement
function getLocalServerName(e) {
  return HOST_GRANT_SERVER_RE.exec(e)?.[1];
}
//@ chunk-99h01h55.js:14437-14503 placement
function describeServerKind(server) {
  return getLocalServerName(server) === undefined ? "connector" : "local server";
}
//@ chunk-99h01h55.js:14503-14612 placement
/**
 * CLAUDE_ARTIFACT_HOST_GRANT 环境变量的 schema：本机允许 artifact 调用的 MCP 服务器与工具。
 */
var CLAUDE_ARTIFACT_HOST_GRANT_ENV = "CLAUDE_ARTIFACT_HOST_GRANT";
var hostGrantSchema = DoctorLazy(() =>
  u({
    v: literal(1),
    servers: array(
      u({
        server: string().regex(HOST_GRANT_SERVER_RE),
        tools: array(string()),
      }),
    ),
  }),
);
//@ chunk-99h01h55.js:14612-14939 placement
/**
 * 读取 CLAUDE_ARTIFACT_HOST_GRANT（本机允许 artifact 调用的本地 MCP 服务器与工具），解析失败返回 unreadable。
 */
function readHostGrant(e) {
  if (e === undefined)
    return {
      kind: "absent",
    };
  let n;
  try {
    n = JSON.parse(e);
  } catch {
    return {
      kind: "unreadable",
    };
  }
  let t = hostGrantSchema().safeParse(n);
  if (!t.success)
    return {
      kind: "unreadable",
    };
  let r = new Map();
  for (let server of t.data.servers) {
    let i = r.get(server.server) ?? new Set();
    for (let tool of server.tools) i.add(tool);
    r.set(server.server, i);
  }
  return {
    kind: "granted",
    tools: r,
  };
}
//@ chunk-99h01h55.js:14939-15014 placement
function serverNames(servers) {
  return servers.flatMap((n) => {
    let serverField = getServerField(n);
    return serverField === undefined ? [] : [serverField];
  });
}
//@ chunk-99h01h55.js:15014-15924 placement
/**
 * 按本机 host grant 过滤页面声明的本地 MCP 服务器，返回保留与丢弃的服务器。
 */
function applyHostGrant(e, n) {
  let mcp = e.mcp;
  if (!isPlainObjectConnector(mcp) || !Array.isArray(mcp.servers))
    return {
      ok: true,
      caps: e,
      dropped: [],
      servers: [],
    };
  let servers = mcp.servers;
  if (n.kind === "absent")
    return {
      ok: true,
      caps: e,
      dropped: [],
      servers: serverNames(servers),
    };
  let s = uniq(serverNames(servers).filter((c) => getLocalServerName(c) !== undefined));
  if (s.length === 0)
    return {
      ok: true,
      caps: e,
      dropped: [],
      servers: serverNames(servers),
    };
  if (n.kind === "unreadable")
    return {
      ok: false,
      refused: s,
    };
  let i = [];
  let l = [];
  for (let server of servers) {
    let serverField = getServerField(server);
    if (serverField === undefined || getLocalServerName(serverField) === undefined) {
      l.push(server);
      continue;
    }
    let m = n.tools.get(serverField);
    if (m === undefined || !isPlainObjectConnector(server)) {
      i.push({
        server: serverField,
        tool: null,
      });
      continue;
    }
    let tools = server.tools;
    if (!isStringArray(tools)) {
      i.push({
        server: serverField,
        tool: null,
      });
      continue;
    }
    let filtered = tools.filter((tool) => m.has(tool));
    for (let tool of tools)
      if (!m.has(tool))
        i.push({
          server: serverField,
          tool,
        });
    if (filtered.length > 0)
      l.push({
        ...server,
        tools: filtered,
      });
  }
  if (i.length === 0)
    return {
      ok: true,
      caps: e,
      dropped: i,
      servers: serverNames(servers),
    };
  if (l.length === 0) {
    let { mcp, ...d } = e;
    return {
      ok: true,
      caps: d,
      dropped: i,
      servers: [],
    };
  }
  return {
    ok: true,
    caps: {
      ...e,
      mcp: {
        ...mcp,
        servers: l,
      },
    },
    dropped: i,
    servers: serverNames(l),
  };
}
//@ chunk-99h01h55.js:15924-15988 placement
var CONTRACT_VERSION_REGEX = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,5})$/;
//@ chunk-99h01h55.js:15988-16162 placement
function isNewerContractVersion(version, version_2) {
  if (!CONTRACT_VERSION_REGEX.test(version) || !CONTRACT_VERSION_REGEX.test(version_2)) return false;
  let mapped = version.split(".").map(Number);
  let mapped_2 = version_2.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (mapped[i] !== mapped_2[i]) return mapped[i] > mapped_2[i];
  return false;
}
//@ chunk-99h01h55.js:16162-16193 placement
var CAPABILITY_NAME_REGEX = /^[a-z][a-z0-9]{0,23}$/;
//@ chunk-99h01h55.js:16193-16263 placement
function parseContractVersion(contract) {
  return typeof contract === "string" &&
    contract !== UNVERSIONED_CONTRACT &&
    CONTRACT_VERSION_REGEX.test(contract)
    ? contract
    : null;
}
//@ chunk-99h01h55.js:16263-16384 placement
function listUnknownCapabilities(e, n) {
  if (n.version === UNVERSIONED_CONTRACT) return [];
  let t = new Set(n.capabilities);
  return Object.keys(e).filter((key) => !t.has(key));
}
//@ chunk-99h01h55.js:16384-16412 placement
var ARTIFACT_CAPABILITY_KEY = "artifact";
var SELF = "self";
//@ chunk-99h01h55.js:16412-16778 placement
function canonicalizeCapabilityValue(e) {
  let untrustedArray = readUntrustedArray(e);
  if (untrustedArray === UNREADABLE_ARRAY) return;
  if (untrustedArray !== undefined) {
    let mapped = untrustedArray.map((untrusted) => canonicalizeCapabilityValue(untrusted));
    return mapped.includes(undefined) ? undefined : `[${mapped.join(",")}]`;
  }
  if (e !== null && typeof e === "object") {
    let t = e;
    let mapped = Object.keys(t)
      .sort()
      .map((key) => {
        let i = canonicalizeCapabilityValue(t[key]);
        return i === undefined ? undefined : `${JSON.stringify(key)}:${i}`;
      });
    return mapped.includes(undefined) ? undefined : `{${mapped.join(",")}}`;
  }
  return JSON.stringify(e) ?? "null";
}
//@ chunk-99h01h55.js:16778-16836 placement
function sameCapabilityValue(e, n) {
  let t = canonicalizeCapabilityValue(e);
  return t !== undefined && t === canonicalizeCapabilityValue(n);
}
//@ chunk-99h01h55.js:16836-17078 placement
function renameArtifactCapabilityToSelf(capabilities) {
  if (!Object.hasOwn(capabilities, ARTIFACT_CAPABILITY_KEY)) return capabilities;
  if (Object.hasOwn(capabilities, SELF)) {
    if (!sameCapabilityValue(capabilities[ARTIFACT_CAPABILITY_KEY], capabilities[SELF])) return capabilities;
    let t = {};
    for (let [key, value] of Object.entries(capabilities))
      if (key !== ARTIFACT_CAPABILITY_KEY) defineValue(t, key, value);
    return t;
  }
  let n = {};
  for (let [key, value] of Object.entries(capabilities))
    defineValue(n, key === ARTIFACT_CAPABILITY_KEY ? SELF : key, value);
  return n;
}
//@ chunk-99h01h55.js:17078-17359 placement
/**
 * 规范化能力声明：把 SELF 键改写成 artifact 能力键（两者都在且不一致时原样返回）。
 */
function foldSelfCapability(e) {
  if (e === null || typeof e !== "object" || Array.isArray(e)) return e;
  let n = e;
  if (!Object.hasOwn(n, SELF)) return e;
  if (Object.hasOwn(n, ARTIFACT_CAPABILITY_KEY) && !sameCapabilityValue(n[ARTIFACT_CAPABILITY_KEY], n[SELF]))
    return e;
  let t = {};
  for (let [key, value] of Object.entries(n)) {
    if (key === SELF) {
      if (!Object.hasOwn(n, ARTIFACT_CAPABILITY_KEY)) defineValue(t, ARTIFACT_CAPABILITY_KEY, value);
      continue;
    }
    defineValue(t, key, value);
  }
  return t;
}
//@ chunk-99h01h55.js:17359-17906 placement
function reconcileSelfCapability(e, n) {
  let t = Object.hasOwn(e, ARTIFACT_CAPABILITY_KEY);
  let r = Object.hasOwn(e, SELF);
  if ((!t && !r) || n.version === UNVERSIONED_CONTRACT)
    return {
      caps: e,
    };
  let s = new Set(n.capabilities);
  let i = s.has(ARTIFACT_CAPABILITY_KEY) ? ARTIFACT_CAPABILITY_KEY : s.has(SELF) ? SELF : null;
  if (i === null)
    return {
      caps: e,
    };
  if (t && r) {
    if (!sameCapabilityValue(e[ARTIFACT_CAPABILITY_KEY], e[SELF]))
      return {
        errMsg:
          "capabilities declares both `artifact` and `self` \u2014 two " +
          "spellings of the same capability \u2014 with different configs. " +
          "Declare it once (canonically `artifact: {}`).",
      };
  }
  let l = {};
  for (let [key, value] of Object.entries(e)) {
    if (key === ARTIFACT_CAPABILITY_KEY || key === SELF) {
      if (!Object.hasOwn(l, i)) defineValue(l, i, value);
      continue;
    }
    defineValue(l, key, value);
  }
  return {
    caps: l,
  };
}
//@ chunk-99h01h55.js:17906-17969 placement
function getDeclaredCapabilities(e) {
  return "capabilities" in e ? e.capabilities : undefined;
}
//@ chunk-99h01h55.js:17969-18044 placement
/**
 * artifact 能力声明的已知键（artifact/self/downloads/comments/room/db/assets/user 等）及其扩展集合 mcp/flags。
 */
var BASIC_CAPABILITY_KEYS = new Set([
  ARTIFACT_CAPABILITY_KEY,
  SELF,
  "downloads",
  "comments",
  "room",
  "db",
  "assets",
  "user",
]);
//@ chunk-99h01h55.js:18044-18076 placement
/**
 * 导出函数 `isKnownCapabilityObject`：参数 e，返回 de(e, oe)。
 */
function isKnownCapabilityObject(e) {
  return onlyKeysIn(e, BASIC_CAPABILITY_KEYS);
}
//@ chunk-99h01h55.js:18076-18134 placement
var REMOTE_CAPABILITY_KEYS = new Set(["downloads", "room", "db", "assets", "user"]);
//@ chunk-99h01h55.js:18134-18413 placement
function isValidCapabilitiesObject(declaredCapabilities) {
  return (
    declaredCapabilities !== null &&
    isKnownCapabilityObject(declaredCapabilities) &&
    onlyKeysIn(declaredCapabilities, REMOTE_CAPABILITY_KEYS) &&
    Object.entries(declaredCapabilities).every(([key, value]) => {
      if (value === true) return true;
      if (!isPlainObjectConnector(value)) return false;
      switch (key) {
        case "db":
          return !("wake" in value) && isValidDbCapability(value);
        case "user":
          return isValidUserCapability(value) && (getUserScopes(value) ?? []).every((r) => r === "profile");
        default:
          return Object.keys(value).length === 0;
      }
    })
  );
}
//@ chunk-99h01h55.js:18413-18451 placement
var ALL_CAPABILITY_KEYS = new Set([...BASIC_CAPABILITY_KEYS, "mcp", "flags"]);
//@ chunk-99h01h55.js:18451-18483 placement
/**
 * 导出函数 `isFullCapabilityObject`：参数 e，返回 de(e, xe)。
 */
function isFullCapabilityObject(e) {
  return onlyKeysIn(e, ALL_CAPABILITY_KEYS);
}
//@ chunk-99h01h55.js:18483-18530 placement
/**
 * 导出函数 `allKnownCapabilityKeys`：参数 e，返回 e.every((n) => xe.has(n))。
 */
function allKnownCapabilityKeys(e) {
  return e.every((n) => ALL_CAPABILITY_KEYS.has(n));
}
//@ chunk-99h01h55.js:18530-18606 placement
function onlyKeysIn(e, n) {
  return e == null || (isPlainObjectCapability(e) && Object.keys(e).every((key) => n.has(key)));
}
//@ chunk-99h01h55.js:18606-18646 placement
var regExp = new RegExp(`^${QUOTE_HOMOGLYPHS.source}$`, "u");
//@ chunk-99h01h55.js:18646-18761 placement
function isStrippablePunctuation(e) {
  return (
    MODEL_TEXT_PUNCT_CODE_POINT.test(e) &&
    !/^[\p{P}\p{M}]$/u.test(e) &&
    !regExp.test(e) &&
    !isJoinerOrEmojiSelector(e.codePointAt(0) ?? 0) &&
    !ESCAPE_CHAR_RE.test(e)
  );
}
//@ chunk-99h01h55.js:18761-19159 placement
function maskConfusableChars(e) {
  let sliced = Array.from(e).slice(0, MAX_NAME_LENGTH + 1);
  let t = sliced.length;
  let mapped = sliced.map(isStrippablePunctuation);
  let mapped_2 = sliced.map(
    (a, b) => mapped[b] || /^\p{M}$/u.test(a) || isJoinerOrEmojiSelector(a.codePointAt(0) ?? 0),
  );
  let mapped_3 = sliced.map((a, b) => !mapped[b] && /^[\p{L}\p{N}]$/u.test(a));
  let l = Array(t).fill(false);
  let c = Array(t).fill(false);
  let d = false;
  for (let j = 0; j < t; j++) {
    l[j] = d;
    d = mapped_3[j] || (mapped_2[j] && d);
  }
  d = false;
  for (let j = t - 1; j >= 0; j--) {
    c[j] = d;
    d = mapped_3[j] || (mapped_2[j] && d);
  }
  let m = new Set();
  for (let j = 0; j < t; j++) if (mapped[j] && l[j] && c[j]) m.add(j);
  return m;
}
//@ chunk-99h01h55.js:19159-19415 placement
function makeMaskPredicate(e) {
  let n = maskConfusableChars(e);
  let edgeSpaceMasker = makeEdgeSpaceMasker(e);
  let r = "none";
  let s = -1;
  return (i) => {
    s++;
    let l = i.codePointAt(0) ?? 0;
    if (edgeSpaceMasker(i, s)) {
      r = "none";
      return true;
    }
    if (n.has(s)) {
      r = "none";
      return true;
    }
    if (isJoinerOrEmojiSelector(l)) {
      let c = selectorOrJoinerRides(l, r);
      r = c.after;
      return !c.rides;
    }
    if (ESCAPE_CHAR_RE.test(i)) {
      r = "none";
      return true;
    }
    r = rideStateAfter(i);
    return false;
  };
}
//@ chunk-99h01h55.js:19415-19587 placement
/**
 * 逐字符拼接文本，需要转义的字符替换为转义串，累计长度超过上限时截断并标记 cut。
 */
function truncateWithEscapes(e, n, t) {
  let r = [];
  let s = 0;
  for (let i of e) {
    let l = n(i) ? escapeChar(i) : i;
    let c = l === i ? 1 : l.length;
    if (s + c > t)
      return {
        text: r.join(""),
        cut: true,
      };
    r.push(l);
    s += c;
  }
  return {
    text: r.join(""),
    cut: false,
  };
}
//@ chunk-99h01h55.js:19587-19766 placement
/**
 * 把能力/服务器名清洗成可安全展示的短文本：转义可疑字符、截断、去除标记同形字与 ;,(){}，空则为 "?"，截断时加省略号。
 */
function sanitizeCapabilityName(server) {
  let n = server;
  let t = false;
  if (typeof server === "string")
    ({ text: n, cut: t } = truncateWithEscapes(server, makeMaskPredicate(server), MAX_NAME_LENGTH));
  let r =
    sweepMarkerLookalikes(
      (
        sweepAskCopy(
          sanitizeDisplayText(n, {
            max: MAX_NAME_LENGTH,
          }),
        ) ?? "?"
      ).replace(/[;,(){}]/g, " "),
    ).trim() || "?";
  return t ? `${r}\u2026` : r;
}
//@ chunk-99h01h55.js:19766-20766 placement
/**
 * 把能力声明（mcp 服务器/工具、db、user…）格式化成给用户/模型看的简短列表文本。
 */
function describeCapabilities(e) {
  if (!e) return "";
  let n = [];
  let t = [];
  let r;
  for (let [key, value] of Object.entries(e)) {
    let y = key === "mcp" ? declaredServersOrUnreadable(value) : undefined;
    let C = key === "mcp" && isDynamicMcp(value);
    if (y === UNREADABLE_ARRAY) {
      r = C ? `${VIEWER_APPROVED_CONNECTOR_TEXT} + ${UNREADABLE_LIST_TEXT}` : UNREADABLE_LIST_TEXT;
      n.unshift("mcp");
    } else if (y !== undefined && y.length > 0) {
      let joined = capListForDisplay(y, 8, (P) => {
        let S = serverConfigOrUndefined(P);
        let z = S === null ? UNREADABLE_ARRAY : readUntrustedArray(S?.tools);
        let F = declaredServerCount(z) ?? 0;
        return `${sanitizeCapabilityName(S?.server)}[${z === UNREADABLE_ARRAY ? "?" : F} ${plural(F, "tool")}]`;
      }).join(", ");
      r = C ? `${VIEWER_APPROVED_CONNECTOR_TEXT} + ${joined}` : joined;
      n.unshift("mcp");
    } else if (C) {
      r = VIEWER_APPROVED_CONNECTOR_TEXT;
      n.unshift("mcp");
    } else if (BASIC_CAPABILITY_KEYS.has(key)) {
      let R = serverConfigOrUndefined(value);
      let P = R === null ? UNREADABLE_ARRAY : readUntrustedArray(R?.rules);
      let S = declaredServerCount(P);
      t.push(P === undefined ? key : `${key}[${P === UNREADABLE_ARRAY ? "?" : S} ${plural(S ?? 0, "rule")}]`);
    } else n.push(CAPABILITY_NAME_REGEX.test(key) ? key : INVALID_CAPABILITY_NAME);
  }
  let s = n.length + t.length;
  if (s === 0) return "";
  let i = [...n, ...t.slice(0, Math.max(0, 8 - n.length))];
  let l = s > 8 ? `[${s} total]; ` : "";
  let c = l + i.join("; ");
  if (r !== undefined) {
    let joined = i.slice(1).join("; ");
    let b = joined === "" ? "" : "; ";
    let max = Math.max(16, 400 - Array.from(l + joined + b).length - 6);
    let list = Array.from(r);
    let R = list.length > max ? list.slice(0, max).join("") + "\u2026" : r;
    c = `${l}mcp: ${R}${b}${joined}`;
  }
  let list = Array.from(c);
  return ` (${list.length > 400 ? list.slice(0, 400).join("") + "\u2026" : list.join("")})`;
}
//@ chunk-99h01h55.js:20766-21059 placement
function describeCapabilityWidening(capabilities, declaredCapabilities) {
  let t = foldSelfConfig(capabilities ?? {});
  let filtered = Object.keys(foldSelfConfig(declaredCapabilities ?? {})).filter(
    (key) => !Object.hasOwn(t, key),
  );
  let s = (l) => (l === "mcp" ? 0 : BASIC_CAPABILITY_KEYS.has(l) ? 2 : 1);
  let mapped = filtered
    .sort((l, c) => s(l) - s(c))
    .map((l) => (CAPABILITY_NAME_REGEX.test(l) ? l : INVALID_CAPABILITY_NAME));
  if (!filtered.includes("mcp")) {
    if (isDynamicMcp(declaredCapabilities?.mcp) && !isDynamicMcp(capabilities?.mcp))
      mapped.unshift(MCP_APPROVED_CONNECTOR_LABEL);
    else if (widensMcpAccess(capabilities?.mcp, declaredCapabilities?.mcp))
      mapped.unshift(MCP_ANY_CONNECTOR_LABEL);
  }
  return mapped;
}
//@ chunk-99h01h55.js:21059-21591 placement
/**
 * 页面连接器声明的文案：动态 mcp 说明、无效名与“查看者逐个批准”的提示。
 */
var INVALID_CAPABILITY_NAME = "invalid-name";
var MCP_ANY_CONNECTOR_LABEL = "mcp (more servers or tools)";
var VIEWER_APPROVED_CONNECTOR_TEXT = "any connector the viewer approves";
var MCP_APPROVED_CONNECTOR_LABEL = `mcp (${VIEWER_APPROVED_CONNECTOR_TEXT})`;
var DYNAMIC_CONNECTOR_NOTICE =
  "This page's connector declaration is dynamic: beyond any servers it lists, the page can ask each viewer for any connector by name at call time, and the viewer approves each at first use. Connectors and tools the page calls without listing them were not checked against this session. Tell the user which connectors and tools the page calls, and that those integrations are unverified unless one real call was made.";
//@ chunk-99h01h55.js:21591-21633 placement
function isDynamicMcp(e) {
  return serverConfigOrUndefined(e)?.dynamic === true;
}
//@ chunk-99h01h55.js:21633-21981 placement
function widensMcpAccess(e, n) {
  if (n === undefined) return false;
  let t = declaredServers(n);
  if (t === undefined) return true;
  let r = new Map();
  for (let s of declaredServers(e) ?? []) {
    let i = serverConfigOrUndefined(s);
    let server = i?.server;
    if (typeof server === "string") r.set(server, new Set(readUntrustedArrayOrUndefined(i?.tools) ?? []));
  }
  return t.some((s) => {
    let i = serverConfigOrUndefined(s);
    let server = i?.server;
    let c = typeof server === "string" ? r.get(server) : undefined;
    let untrustedArrayOrUndefined = readUntrustedArrayOrUndefined(i?.tools);
    return (
      c === undefined ||
      untrustedArrayOrUndefined === undefined ||
      untrustedArrayOrUndefined.some((m) => !c.has(m))
    );
  });
}
//@ chunk-99h01h55.js:21981-22058 placement
function declaredServersOrUnreadable(e) {
  let n = serverConfigOrUndefined(e);
  return n === null ? UNREADABLE_ARRAY : n === undefined ? undefined : readUntrustedArray(n.servers);
}
//@ chunk-99h01h55.js:22058-22108 placement
function declaredServers(e) {
  let n = declaredServersOrUnreadable(e);
  return n === UNREADABLE_ARRAY ? undefined : n;
}
//@ chunk-99h01h55.js:22108-22165 placement
function declaredServerCount(e) {
  return e === undefined || e === UNREADABLE_ARRAY ? undefined : e.length;
}
//@ chunk-99h01h55.js:22165-22268 placement
function capListForDisplay(e, n, t) {
  if (e.length <= n) return e.map(t);
  return [`[${e.length} total]`, ...e.slice(0, n).map(t)];
}
//@ chunk-99h01h55.js:22268-22380 placement
function hasDeclaredServers(e) {
  return (
    e != null && typeof e === "object" && "servers" in e && Array.isArray(e.servers) && e.servers.length > 0
  );
}
//@ chunk-99h01h55.js:22380-22594 placement
function sanitizeDisplayText(e, n) {
  if (typeof e !== "string") return "?";
  let max = n?.max ?? 64;
  let replaced = Array.from(e.slice(0, 2 * max), (s) =>
    isDecisionSurfaceControl(s.codePointAt(0) ?? 0) ? " " : s,
  )
    .slice(0, max)
    .join("")
    .replace(INVISIBLE_BLANKS, " ")
    .replace(/\s+/g, " ");
  return replaced.trim() === "" ? "?" : replaced;
}
//@ chunk-99h01h55.js:22594-22687 placement
function sanitizeDisplayTextOrUndefined(e, max) {
  let trimmed = sanitizeDisplayText(e, {
    max,
  })
    .replace(INVISIBLE_BLANKS, " ")
    .trim();
  return trimmed !== "" && trimmed !== "?" ? trimmed : undefined;
}
export {
  CONTRACT_VERSION_REGEX,
  CAPABILITY_NAME_REGEX,
  parseContractVersion,
  getLocalServerName,
  listUnknownCapabilities,
  capListForDisplay,
  sanitizeDisplayText,
  isNewerContractVersion,
  reconcileSelfCapability,
  renameArtifactCapabilityToSelf,
  isNonEmptyObject,
  sanitizeDisplayTextOrUndefined,
  normalizeMcpCapability,
  hasFeatureFlag,
  HOST,
  describeServerKind,
  findUndeclaredMcpToolCalls,
  findMentionedTools,
  listLocalServerDeclarations,
  readHostGrant,
  applyHostGrant,
  CLAUDE_ARTIFACT_HOST_GRANT_ENV,
  isDynamicMcp,
  UNVERSIONED_CONTRACT,
  SELF,
  ARTIFACT_CAPABILITY_KEY,
  isValidDbRules,
  getUserScopes,
  isValidScopeList,
  isValidDbCapability,
  isValidUserCapability,
  arrayField,
  VIEWER_APPROVED_CONNECTOR_TEXT,
  clearServedCapabilities,
  allKnownCapabilityKeys,
  describeCapabilities,
  DB_RULE_PATH_REGEX,
  DB_RULE_SCOPES,
  getDeclaredCapabilities,
  isValidCapabilitiesObject,
  isFullCapabilityObject,
  isKnownCapabilityObject,
  describeCapabilityWidening,
  getServedCapabilities,
  setServedCapabilities,
  findUnservedMcpServers,
  truncateWithEscapes,
  mergeCapabilities,
};
