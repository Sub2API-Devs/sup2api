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
import { k4, G, Qe, zit, sanitizeConnectorName } from "./connectorNames.js";
import {
  SAFE_ID_RE,
  MAX_SANITIZED_TEXT,
  MAX_LISTED_MCP_SERVERS,
  ESCAPE_CHAR_RE,
  MAX_NAME_LENGTH,
  makeEdgeSpaceMasker,
  escapeChar,
} from "./textSanitize.js";
import { Vt } from "../../utils/agentId.js";
import { internalKey } from "../mcp/serverIdentity.js";
import { JPn, KIt, isHostCapabilityServer, HOST_CAPABILITY_SERVERS } from "../mcp/firstPartyServerIds.js";
import { CLAUDE_AI, normalizeNameForMCP } from "../mcp/normalization.js";
import { firstLineOf, plural } from "../../utils/stringUtils.js";
import { uniq } from "../../utils/collections.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, A, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { readUntrustedArray, Uf, E3, Eae } from "../../utils/untrustedArray.js";
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
  return Se(e, "scopes");
}
//@ chunk-99h01h55.js:4919-5011 placement
function isValidScopeList(e) {
  return e.every((n) => typeof n === "string" && /^[a-z][a-z0-9_-]{0,31}$/.test(n));
}
//@ chunk-99h01h55.js:5011-5140 placement
function isValidUserCapability(e) {
  if (!k4(e)) return !1;
  let { scopes: scopes, ...t } = e;
  return (
    Object.keys(t).length === 0 && (scopes === void 0 || (Array.isArray(scopes) && isValidScopeList(scopes)))
  );
}
//@ chunk-99h01h55.js:5140-5218 placement
function Se(e, n) {
  if (!k4(e)) return;
  let t = e[n];
  return Array.isArray(t) ? t : void 0;
}
//@ chunk-99h01h55.js:5218-5358 placement
var DB_RULE_PATH_REGEX = /^(?:[A-Za-z0-9_.~:@+-]+|\{self\})(?:\/(?:[A-Za-z0-9_.~:@+-]+|\{self\}))*$/,
  GQr = new Set(["view", "interact", "admin", "owner", "self"]);
//@ chunk-99h01h55.js:5358-5573 placement
function isValidDbCapability(e) {
  if (!k4(e)) return !1;
  let { rules: rules, wake: wake, ...r } = e;
  return (
    Object.keys(r).length === 0 &&
    (rules === void 0 || (Array.isArray(rules) && isValidDbRules(rules))) &&
    (wake === void 0 ||
      (Array.isArray(wake) && wake.every((s) => typeof s === "string" && DB_RULE_PATH_REGEX.test(s))))
  );
}
//@ chunk-99h01h55.js:5573-5836 placement
function isValidDbRules(e) {
  return e.every((n) => {
    if (!k4(n)) return !1;
    let { path: path, read: read, write: write, ...i } = n;
    return (
      Object.keys(i).length === 0 &&
      typeof path === "string" &&
      (path === "" || DB_RULE_PATH_REGEX.test(path)) &&
      (read === void 0 || (typeof read === "string" && GQr.has(read))) &&
      (write === void 0 || (typeof write === "string" && GQr.has(write)))
    );
  });
}
//@ chunk-99h01h55.js:5836-5895 placement
function B(e) {
  try {
    return k4(e) ? e : void 0;
  } catch {
    return null;
  }
}
//@ chunk-99h01h55.js:5895-5969 placement
function ke(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string");
}
//@ chunk-99h01h55.js:5969-6004 placement
function Je(e) {
  return ke(e) ? e : null;
}
//@ chunk-99h01h55.js:6004-6056 placement
function ae(e) {
  return [...e].filter((n) => SAFE_ID_RE.test(n));
}
//@ chunk-99h01h55.js:6056-6108 placement
function J(e) {
  return Vt(e) === null ? e : e.toLowerCase();
}
/**
 * 规范化页面声明的 mcp 能力（servers 列表、dynamic、改名），返回规范结果、警告与被重命名的服务器。
 */
//@ chunk-99h01h55.js:6108-11482 placement
function normalizeMcpCapability(e, n, t, r = {}) {
  let mcp = e.mcp;
  if (mcp === void 0) return { ok: !0, caps: e, warnings: [], servers: [], renamed: [] };
  let i = k4(mcp) ? mcp.servers : !1;
  if (i === !1 || (i != null && !Array.isArray(i))) return { ...G(), malformed: [{ kind: "not_object" }] };
  if (k4(mcp) && mcp.dynamic !== void 0 && typeof mcp.dynamic !== "boolean")
    return { ...G(), malformed: [{ kind: "dynamic_not_boolean" }] };
  if (i == null || i.length === 0) {
    if (k4(mcp) && isDynamicMcp(mcp))
      return { ok: !0, caps: { ...e, mcp: { ...mcp, servers: [] } }, warnings: [], servers: [], renamed: [] };
    return { ...G(), malformed: [{ kind: "no_servers" }] };
  }
  let l = new Map(n.map((g) => [J(g.toolPrefix), g])),
    c = new Map(n.map((g) => [g.server, g])),
    d = [],
    m = [],
    a = [],
    b = [],
    y = new Map(),
    C = new Map(),
    R = [],
    P = [];
  for (let [g, h] of i.entries()) {
    let _ = getServerField(h),
      f = _?.startsWith("host:") ? `host:${internalKey(_.slice(5))}` : _;
    if (f === void 0) {
      let w = h !== null && typeof h === "object" ? (Qe.find((M) => M in h) ?? null) : null;
      a.push({ kind: "entry_shape", index: g, wrongKey: w });
      continue;
    }
    let E = l.get(J(internalKey(f))),
      I = k4(h) ? h.tools : void 0,
      N = Je(I);
    if (I === void 0 || N?.length === 0) {
      let w = E ?? c.get(f);
      a.push({
        kind: "no_tools",
        server: f,
        display: E !== void 0 && zit(E) ? E.server : null,
        available: ae(w?.toolNames ?? []),
      });
    } else if (N === null) a.push({ kind: "tools_shape", server: f });
    let L = getLocalServerName(f),
      Q = L === void 0 ? void 0 : l.get(J(L)),
      W = L === void 0 ? null : JPn(L),
      x = null,
      pe = c.get(f);
    if (E !== void 0) {
      if (!zit(E)) a.push({ kind: "undeclarable_name", server: f, name: E.server });
      else if (Vt(f) !== null) a.push({ kind: "known_id", server: f, display: E.server });
      else if (((x = E.server), f !== E.server)) y.set(f, E.server);
    } else if (pe !== void 0)
      if (zit(pe)) x = f;
      else a.push({ kind: "undeclarable_name", server: f, name: f });
    else if (f.startsWith(CLAUDE_AI)) d.push(f);
    else if (f.startsWith("mcp__")) {
      let w = l.get(J(firstLineOf(f.slice(5), "__")));
      a.push({ kind: "tool_name", server: f, display: w !== void 0 && zit(w) ? w.server : null });
    } else if (Vt(f) !== null) a.push({ kind: "opaque_id", server: f });
    else if (Q !== void 0)
      a.push(
        zit(Q)
          ? { kind: "connector_as_host", server: f, display: Q.server }
          : { kind: "undeclarable_name", server: f, name: Q.server },
      );
    else if (L !== void 0 && Vt(L) !== null) a.push({ kind: "opaque_id", server: f });
    else if (L !== void 0 && r.hostServers === !1) a.push({ kind: "host_unavailable", server: f });
    else if (W !== null) {
      let w = (k) => KIt(k, W) || KIt(firstLineOf(`${normalizeNameForMCP(k)}__`, "__"), W) || KIt(Ce(k), W),
        M = t.find(w) ?? n.find((k) => w(k.server))?.server;
      if (M === void 0) x = `host:${W}`;
      else a.push({ kind: "local_server_as_first_party", server: f, local: M });
    } else if (isHostCapabilityServer(L ?? "")) m.push(f);
    else {
      x = f;
      let w = L === void 0 ? suggestConnectorName(f, n) : void 0;
      if (w !== void 0 && !C.has(f)) C.set(f, w);
    }
    if (x !== null && _ !== f && !y.has(f)) y.set(_ ?? f, x);
    if (x !== null && N !== null && N.length > 0 && k4(h)) {
      let w = new Set(n.flatMap((k) => (k.server === x && zit(k) ? (k.toolNames ?? []) : []))),
        M = N;
      if (w.size > 0) {
        M = N.map((j) => {
          if (w.has(j)) return j;
          let filtered = [...w].filter((Le) => normalizeNameForMCP(Le) === j);
          if (filtered.length !== 1 || !SAFE_ID_RE.test(filtered[0])) return j;
          return (R.push([j, filtered[0]]), filtered[0]);
        });
        let k = uniq(M.filter((j) => !w.has(j)));
        if (k.length > 0 && k.length === uniq(M).length) {
          a.push({
            kind: "unknown_tools",
            server: f,
            display: f === x ? null : x,
            unknown: k,
            available: ae(w),
          });
          continue;
        }
        if (k.length > 0) P.push({ server: x, unknown: k, known: ae(w) });
      }
      b.push({ ...h, server: x, tools: M });
    }
  }
  if (d.length > 0 || m.length > 0 || a.length > 0)
    return { ...G(), unresolved: d, internal: m, malformed: a };
  let S = [],
    z = new Map();
  for (let g of b) {
    let h = z.get(g.server);
    if (h === void 0) (z.set(g.server, { idx: S.length, from: 1 }), S.push(g));
    else {
      h.from++;
      let _ = S[h.idx];
      S[h.idx] = { ..._, tools: uniq([..._.tools, ...g.tools]) };
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
  for (let { server: server, unknown: unknown, known: known } of P) {
    let joined = capListForDisplay(unknown, 8, (N) => `"${sanitizeConnectorName(N)}"`).join(", "),
      E = unknown.length === 1 ? "it" : "them",
      I =
        known.length === 0
          ? ""
          : ` (its tools here: ${capListForDisplay(known, 12, (N) => `"${sanitizeConnectorName(N)}"`).join(", ")})`;
    F.push(
      `connector "${sanitizeConnectorName(server)}" has no ${plural(unknown.length, "tool")} named ${joined} in this session${I}, so the page's calls to ${E} fail for any viewer whose "${sanitizeConnectorName(server)}" lacks ${E} too \u2014 "tools" takes the connector's own top-level tool names; if ${E === "it" ? "that name is" : "those names are"} wrong, fix "tools" and publish again.`,
    );
  }
  let ie = [];
  for (let [g, h] of z) {
    let _ = S[h.idx].tools.length,
      f = JPn(getLocalServerName(g) ?? "") !== null;
    if (h.from > 1 && !f) {
      let E = sanitizeConnectorName(g),
        I = describeServerKind(g);
      F.push(
        `${h.from} manifest entries resolve to ${I} "${E}" and were merged into one (${_} ${plural(_, "tool")}). A viewer with more than one ${I} named "${E}" gets server_ambiguous on every call until the duplicates are renamed or removed.`,
      );
    }
    if (_ > MAX_SANITIZED_TEXT) ie.push({ server: g, toolCount: _ });
  }
  let fe = S.length > MAX_LISTED_MCP_SERVERS ? S.length : null;
  if (ie.length > 0 || fe !== null) return { ...G(), oversized: ie, serverCount: fe };
  return {
    ok: !0,
    caps: { ...e, mcp: { ...mcp, servers: S } },
    warnings: F,
    servers: S.map((g) => g.server),
    renamed: [...y],
  };
}
//@ chunk-99h01h55.js:11482-11761 placement
function findUndeclaredMcpToolCalls(e, n, t = 8) {
  let r = new Set(n),
    s = new Set(),
    i = [],
    l = /\.(?:callTool|watchTool)\(\s*(?:'([^'\\\n]{1,200})'|"([^"\\\n]{1,200})")\s*,/g;
  for (let c of e)
    for (let d of c.matchAll(l)) {
      let m = d[1] ?? d[2];
      if (r.has(m) || s.has(m)) continue;
      if ((s.add(m), i.push(m), i.length >= t)) return i;
    }
  return i;
}
//@ chunk-99h01h55.js:11761-11841 placement
function ee(e) {
  return e
    .toLowerCase()
    .replace(/[\s\p{Pd}\p{Pc}]+/gu, " ")
    .trim();
}
//@ chunk-99h01h55.js:11841-12342 placement
function suggestConnectorName(e, n) {
  let filtered = n.filter(zit),
    r = ee(e);
  if (filtered.some((a) => ee(a.server) === r)) return;
  let s = (a) => a.replace(/[^\p{L}\p{N}]/gu, ""),
    i = (a) => a.split(/[^\p{L}\p{N}]+/u).filter((b) => b.length >= 3),
    l = s(r);
  if (l.length < 3) return;
  let found = filtered.find((a) => s(ee(a.server)) === l);
  if (found !== void 0) return found.server;
  let d = i(r),
    m;
  for (let a of filtered) {
    let b = i(ee(a.server)),
      [y, C] = b.length <= d.length ? [b, d] : [d, b];
    if (y.length > 0 && y.every((R) => C.includes(R)) && (m === void 0 || y.length > m.shared))
      m = { server: a.server, shared: y.length };
  }
  return m?.server;
}
//@ chunk-99h01h55.js:12342-12453 placement
function findMentionedTools(e, n) {
  return n.filter(([t]) => e.some((r) => [`'${t}'`, `"${t}"`, `\`${t}\``].some((s) => r.includes(s))));
}
//@ chunk-99h01h55.js:12453-12566 placement
function listLocalServerDeclarations(e) {
  let mcp = e.mcp;
  if (!hasDeclaredServers(mcp)) return [];
  return mcp.servers.map(getServerField).filter((t) => t !== void 0 && t.startsWith(CLAUDE_AI));
}
//@ chunk-99h01h55.js:12566-13394 placement
function findUnservedMcpServers(e, n, t) {
  let mcp = e.mcp,
    s = isDynamicMcp(mcp) ? [fn] : [];
  if (!hasDeclaredServers(mcp)) return s;
  let i = uniq(mcp.servers.map(getServerField).filter((c) => c !== void 0)),
    l = (c) => t.has(c) && !HOST_CAPABILITY_SERVERS.has(c) && !n.some((d) => d.toolPrefix === c);
  return i
    .filter((c) => {
      let d = getLocalServerName(c);
      if (d !== void 0) {
        let m = JPn(d);
        return m === null ? !l(d) : ![...t].some((a) => JPn(a) === m && l(a));
      }
      return !t.has(c) && !l(Ce(c)) && !n.some((m) => m.server === c && t.has(m.toolPrefix));
    })
    .map((c) => {
      let d = sanitizeConnectorName(c);
      return `This page declares ${describeServerKind(c)} "${d}" but no successful call to it was observed in this session, so the page is published against an unobserved interface. Check the page's argument names against each tool's input schema if this session has the tool. The result fields the page reads stay unverified unless you can safely make one real call; otherwise tell the user the page's "${d}" integration is unverified.`;
    })
    .concat(s);
}
//@ chunk-99h01h55.js:13394-13492 placement
function Ce(e) {
  return normalizeNameForMCP(e).replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 64).replace(/_+$/, "");
}
//@ chunk-99h01h55.js:13492-13593 placement
function getServerField(e) {
  let n = e != null && typeof e === "object" ? e.server : void 0;
  return typeof n === "string" ? n : void 0;
}
//@ chunk-99h01h55.js:13593-13646 placement
function isNonEmptyObject(e) {
  return le(e) && Object.keys(e).length > 0;
}
//@ chunk-99h01h55.js:13646-13717 placement
function le(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-99h01h55.js:13717-13761 placement
function te(e) {
  let n = foldSelfCapability(e);
  return le(n) ? n : e;
}
//@ chunk-99h01h55.js:13761-13858 placement
function D(e, n, t) {
  Object.defineProperty(e, n, { value: t, enumerable: !0, writable: !0, configurable: !0 });
}
//@ chunk-99h01h55.js:13858-14061 placement
function mergeCapabilities(e, n) {
  let t = te(e ?? {}),
    r = te(n ?? {}),
    s = { ...t },
    i = !1,
    l = !1;
  for (let [c, d] of Object.entries(r))
    if (Object.hasOwn(t, c)) l ||= !se(t[c], d);
    else (D(s, c, d), (i = !0));
  return { capabilities: i ? s : e, widened: i, conflict: l };
}
//@ chunk-99h01h55.js:14061-14077 placement
var UNVERSIONED_CONTRACT = "0.0.0";
//@ chunk-99h01h55.js:14077-14100 placement
class Oe {
  served = void 0;
}
//@ chunk-99h01h55.js:14100-14126 placement
var ce = new SessionRootSlot(() => new Oe());
//@ chunk-99h01h55.js:14126-14162 placement
function setServedCapabilities(e, n) {
  ce.of(e).served = n;
}
//@ chunk-99h01h55.js:14162-14204 placement
function getServedCapabilities(e) {
  return ce.peek(e)?.served;
}
//@ chunk-99h01h55.js:14204-14243 placement
function clearServedCapabilities(e) {
  ce.of(e).served = void 0;
}
//@ chunk-99h01h55.js:14243-14258 placement
var HOST = "host";
//@ chunk-99h01h55.js:14258-14360 placement
function hasFeatureFlag(e, n, t) {
  let features = e.features;
  return features !== void 0 && Object.hasOwn(features, n) && Object.hasOwn(features[n] ?? {}, t);
}
//@ chunk-99h01h55.js:14360-14398 placement
var Re = /^host:([A-Za-z0-9_-]{1,64})$/;
//@ chunk-99h01h55.js:14398-14437 placement
function getLocalServerName(e) {
  return Re.exec(e)?.[1];
}
//@ chunk-99h01h55.js:14437-14503 placement
function describeServerKind(e) {
  return getLocalServerName(e) === void 0 ? "connector" : "local server";
}
//@ chunk-99h01h55.js:14503-14612 placement
var CLAUDE_ARTIFACT_HOST_GRANT_ENV = "CLAUDE_ARTIFACT_HOST_GRANT",
  en = DoctorLazy(() => u({ v: T(1), servers: A(u({ server: o().regex(Re), tools: A(o()) })) }));
/**
 * 读取 CLAUDE_ARTIFACT_HOST_GRANT（本机允许 artifact 调用的本地 MCP 服务器与工具），解析失败返回 unreadable。
 */
//@ chunk-99h01h55.js:14612-14939 placement
function readHostGrant(e) {
  if (e === void 0) return { kind: "absent" };
  let n;
  try {
    n = JSON.parse(e);
  } catch {
    return { kind: "unreadable" };
  }
  let safeParse = en().safeParse(n);
  if (!safeParse.success) return { kind: "unreadable" };
  let r = new Map();
  for (let server of safeParse.data.servers) {
    let i = r.get(server.server) ?? new Set();
    for (let tool of server.tools) i.add(tool);
    r.set(server.server, i);
  }
  return { kind: "granted", tools: r };
}
//@ chunk-99h01h55.js:14939-15014 placement
function V(e) {
  return e.flatMap((n) => {
    let t = getServerField(n);
    return t === void 0 ? [] : [t];
  });
}
/**
 * 按本机 host grant 过滤页面声明的本地 MCP 服务器，返回保留与丢弃的服务器。
 */
//@ chunk-99h01h55.js:15014-15924 placement
function applyHostGrant(e, n) {
  let mcp = e.mcp;
  if (!k4(mcp) || !Array.isArray(mcp.servers)) return { ok: !0, caps: e, dropped: [], servers: [] };
  let servers = mcp.servers;
  if (n.kind === "absent") return { ok: !0, caps: e, dropped: [], servers: V(servers) };
  let s = uniq(V(servers).filter((c) => getLocalServerName(c) !== void 0));
  if (s.length === 0) return { ok: !0, caps: e, dropped: [], servers: V(servers) };
  if (n.kind === "unreadable") return { ok: !1, refused: s };
  let i = [],
    l = [];
  for (let c of servers) {
    let d = getServerField(c);
    if (d === void 0 || getLocalServerName(d) === void 0) {
      l.push(c);
      continue;
    }
    let m = n.tools.get(d);
    if (m === void 0 || !k4(c)) {
      i.push({ server: d, tool: null });
      continue;
    }
    let tools = c.tools;
    if (!ke(tools)) {
      i.push({ server: d, tool: null });
      continue;
    }
    let filtered = tools.filter((y) => m.has(y));
    for (let y of tools) if (!m.has(y)) i.push({ server: d, tool: y });
    if (filtered.length > 0) l.push({ ...c, tools: filtered });
  }
  if (i.length === 0) return { ok: !0, caps: e, dropped: i, servers: V(servers) };
  if (l.length === 0) {
    let { mcp: mcp, ...d } = e;
    return { ok: !0, caps: d, dropped: i, servers: [] };
  }
  return { ok: !0, caps: { ...e, mcp: { ...mcp, servers: l } }, dropped: i, servers: V(l) };
}
//@ chunk-99h01h55.js:15924-15988 placement
var CONTRACT_VERSION_REGEX = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,5})$/;
//@ chunk-99h01h55.js:15988-16162 placement
function isNewerContractVersion(e, n) {
  if (!CONTRACT_VERSION_REGEX.test(e) || !CONTRACT_VERSION_REGEX.test(n)) return !1;
  let mapped = e.split(".").map(Number),
    mapped_2 = n.split(".").map(Number);
  for (let s = 0; s < 3; s++) if (mapped[s] !== mapped_2[s]) return mapped[s] > mapped_2[s];
  return !1;
}
//@ chunk-99h01h55.js:16162-16193 placement
var CAPABILITY_NAME_REGEX = /^[a-z][a-z0-9]{0,23}$/;
//@ chunk-99h01h55.js:16193-16263 placement
function parseContractVersion(e) {
  return typeof e === "string" && e !== UNVERSIONED_CONTRACT && CONTRACT_VERSION_REGEX.test(e) ? e : null;
}
//@ chunk-99h01h55.js:16263-16384 placement
function listUnknownCapabilities(e, n) {
  if (n.version === UNVERSIONED_CONTRACT) return [];
  let t = new Set(n.capabilities);
  return Object.keys(e).filter((r) => !t.has(r));
}
//@ chunk-99h01h55.js:16384-16412 placement
var ARTIFACT_CAPABILITY_KEY = "artifact",
  SELF = "self";
//@ chunk-99h01h55.js:16412-16778 placement
function canonicalizeCapabilityValue(e) {
  let n = readUntrustedArray(e);
  if (n === Uf) return;
  if (n !== void 0) {
    let mapped = n.map((r) => canonicalizeCapabilityValue(r));
    return mapped.includes(void 0) ? void 0 : `[${mapped.join(",")}]`;
  }
  if (e !== null && typeof e === "object") {
    let t = e,
      mapped = Object.keys(t)
        .sort()
        .map((s) => {
          let i = canonicalizeCapabilityValue(t[s]);
          return i === void 0 ? void 0 : `${JSON.stringify(s)}:${i}`;
        });
    return mapped.includes(void 0) ? void 0 : `{${mapped.join(",")}}`;
  }
  return JSON.stringify(e) ?? "null";
}
//@ chunk-99h01h55.js:16778-16836 placement
function se(e, n) {
  let t = canonicalizeCapabilityValue(e);
  return t !== void 0 && t === canonicalizeCapabilityValue(n);
}
//@ chunk-99h01h55.js:16836-17078 placement
function renameArtifactCapabilityToSelf(e) {
  if (!Object.hasOwn(e, ARTIFACT_CAPABILITY_KEY)) return e;
  if (Object.hasOwn(e, SELF)) {
    if (!se(e[ARTIFACT_CAPABILITY_KEY], e[SELF])) return e;
    let t = {};
    for (let [r, s] of Object.entries(e)) if (r !== ARTIFACT_CAPABILITY_KEY) D(t, r, s);
    return t;
  }
  let n = {};
  for (let [t, r] of Object.entries(e)) D(n, t === ARTIFACT_CAPABILITY_KEY ? SELF : t, r);
  return n;
}
/**
 * 规范化能力声明：把 SELF 键改写成 artifact 能力键（两者都在且不一致时原样返回）。
 */
//@ chunk-99h01h55.js:17078-17359 placement
function foldSelfCapability(e) {
  if (e === null || typeof e !== "object" || Array.isArray(e)) return e;
  let n = e;
  if (!Object.hasOwn(n, SELF)) return e;
  if (Object.hasOwn(n, ARTIFACT_CAPABILITY_KEY) && !se(n[ARTIFACT_CAPABILITY_KEY], n[SELF])) return e;
  let t = {};
  for (let [r, s] of Object.entries(n)) {
    if (r === SELF) {
      if (!Object.hasOwn(n, ARTIFACT_CAPABILITY_KEY)) D(t, ARTIFACT_CAPABILITY_KEY, s);
      continue;
    }
    D(t, r, s);
  }
  return t;
}
//@ chunk-99h01h55.js:17359-17906 placement
function reconcileSelfCapability(e, n) {
  let hasOwn = Object.hasOwn(e, ARTIFACT_CAPABILITY_KEY),
    hasOwn_2 = Object.hasOwn(e, SELF);
  if ((!hasOwn && !hasOwn_2) || n.version === UNVERSIONED_CONTRACT) return { caps: e };
  let s = new Set(n.capabilities),
    i = s.has(ARTIFACT_CAPABILITY_KEY) ? ARTIFACT_CAPABILITY_KEY : s.has(SELF) ? SELF : null;
  if (i === null) return { caps: e };
  if (hasOwn && hasOwn_2) {
    if (!se(e[ARTIFACT_CAPABILITY_KEY], e[SELF]))
      return {
        errMsg:
          "capabilities declares both `artifact` and `self` \u2014 two " +
          "spellings of the same capability \u2014 with different configs. " +
          "Declare it once (canonically `artifact: {}`).",
      };
  }
  let l = {};
  for (let [c, d] of Object.entries(e)) {
    if (c === ARTIFACT_CAPABILITY_KEY || c === SELF) {
      if (!Object.hasOwn(l, i)) D(l, i, d);
      continue;
    }
    D(l, c, d);
  }
  return { caps: l };
}
//@ chunk-99h01h55.js:17906-17969 placement
function getDeclaredCapabilities(e) {
  return "capabilities" in e ? e.capabilities : void 0;
}
//@ chunk-99h01h55.js:17969-18044 placement
var oe = new Set([ARTIFACT_CAPABILITY_KEY, SELF, "downloads", "comments", "room", "db", "assets", "user"]);
//@ chunk-99h01h55.js:18044-18076 placement
function KQr(e) {
  return de(e, oe);
}
//@ chunk-99h01h55.js:18076-18134 placement
var tn = new Set(["downloads", "room", "db", "assets", "user"]);
//@ chunk-99h01h55.js:18134-18413 placement
function isValidCapabilitiesObject(e) {
  return (
    e !== null &&
    KQr(e) &&
    de(e, tn) &&
    Object.entries(e).every(([n, t]) => {
      if (t === !0) return !0;
      if (!k4(t)) return !1;
      switch (n) {
        case "db":
          return !("wake" in t) && isValidDbCapability(t);
        case "user":
          return isValidUserCapability(t) && (getUserScopes(t) ?? []).every((r) => r === "profile");
        default:
          return Object.keys(t).length === 0;
      }
    })
  );
}
//@ chunk-99h01h55.js:18413-18451 placement
var xe = new Set([...oe, "mcp", "flags"]);
//@ chunk-99h01h55.js:18451-18483 placement
function Zes(e) {
  return de(e, xe);
}
//@ chunk-99h01h55.js:18483-18530 placement
function Wyi(e) {
  return e.every((n) => xe.has(n));
}
//@ chunk-99h01h55.js:18530-18606 placement
function de(e, n) {
  return e == null || (le(e) && Object.keys(e).every((t) => n.has(t)));
}
//@ chunk-99h01h55.js:18606-18646 placement
var regExp_2 = new RegExp(`^${QUOTE_HOMOGLYPHS.source}$`, "u");
//@ chunk-99h01h55.js:18646-18761 placement
function isStrippablePunctuation(e) {
  return (
    MODEL_TEXT_PUNCT_CODE_POINT.test(e) &&
    !/^[\p{P}\p{M}]$/u.test(e) &&
    !regExp_2.test(e) &&
    !isJoinerOrEmojiSelector(e.codePointAt(0) ?? 0) &&
    !ESCAPE_CHAR_RE.test(e)
  );
}
//@ chunk-99h01h55.js:18761-19159 placement
function maskConfusableChars(e) {
  let sliced = Array.from(e).slice(0, MAX_NAME_LENGTH + 1),
    t = sliced.length,
    mapped = sliced.map(isStrippablePunctuation),
    mapped_2 = sliced.map(
      (a, b) => mapped[b] || /^\p{M}$/u.test(a) || isJoinerOrEmojiSelector(a.codePointAt(0) ?? 0),
    ),
    mapped_3 = sliced.map((a, b) => !mapped[b] && /^[\p{L}\p{N}]$/u.test(a)),
    fill = Array(t).fill(!1),
    fill_2 = Array(t).fill(!1),
    d = !1;
  for (let a = 0; a < t; a++) ((fill[a] = d), (d = mapped_3[a] || (mapped_2[a] && d)));
  d = !1;
  for (let a = t - 1; a >= 0; a--) ((fill_2[a] = d), (d = mapped_3[a] || (mapped_2[a] && d)));
  let m = new Set();
  for (let a = 0; a < t; a++) if (mapped[a] && fill[a] && fill_2[a]) m.add(a);
  return m;
}
//@ chunk-99h01h55.js:19159-19415 placement
function makeMaskPredicate(e) {
  let n = maskConfusableChars(e),
    t = makeEdgeSpaceMasker(e),
    r = "none",
    s = -1;
  return (i) => {
    s++;
    let l = i.codePointAt(0) ?? 0;
    if (t(i, s)) return ((r = "none"), !0);
    if (n.has(s)) return ((r = "none"), !0);
    if (isJoinerOrEmojiSelector(l)) {
      let c = selectorOrJoinerRides(l, r);
      return ((r = c.after), !c.rides);
    }
    if (ESCAPE_CHAR_RE.test(i)) return ((r = "none"), !0);
    return ((r = rideStateAfter(i)), !1);
  };
}
/**
 * 逐字符拼接文本，需要转义的字符替换为转义串，累计长度超过上限时截断并标记 cut。
 */
//@ chunk-99h01h55.js:19415-19587 placement
function truncateWithEscapes(e, n, t) {
  let r = [],
    s = 0;
  for (let i of e) {
    let l = n(i) ? escapeChar(i) : i,
      c = l === i ? 1 : l.length;
    if (s + c > t) return { text: r.join(""), cut: !0 };
    (r.push(l), (s += c));
  }
  return { text: r.join(""), cut: !1 };
}
/**
 * 把能力/服务器名清洗成可安全展示的短文本：转义可疑字符、截断、去除标记同形字与 ;,(){}，空则为 "?"，截断时加省略号。
 */
//@ chunk-99h01h55.js:19587-19766 placement
function sanitizeCapabilityName(e) {
  let n = e,
    t = !1;
  if (typeof e === "string")
    ({ text: n, cut: t } = truncateWithEscapes(e, makeMaskPredicate(e), MAX_NAME_LENGTH));
  let r =
    sweepMarkerLookalikes(
      (sweepAskCopy(sanitizeDisplayText(n, { max: MAX_NAME_LENGTH })) ?? "?").replace(/[;,(){}]/g, " "),
    ).trim() || "?";
  return t ? `${r}\u2026` : r;
}
/**
 * 把能力声明（mcp 服务器/工具、db、user…）格式化成给用户/模型看的简短列表文本。
 */
//@ chunk-99h01h55.js:19766-20766 placement
function describeCapabilities(e) {
  if (!e) return "";
  let n = [],
    t = [],
    r;
  for (let [a, b] of Object.entries(e)) {
    let y = a === "mcp" ? Fe(b) : void 0,
      C = a === "mcp" && isDynamicMcp(b);
    if (y === Uf) ((r = C ? `${s6t} + ${E3}` : E3), n.unshift("mcp"));
    else if (y !== void 0 && y.length > 0) {
      let joined = capListForDisplay(y, 8, (P) => {
        let S = B(P),
          z = S === null ? Uf : readUntrustedArray(S?.tools),
          F = be(z) ?? 0;
        return `${sanitizeCapabilityName(S?.server)}[${z === Uf ? "?" : F} ${plural(F, "tool")}]`;
      }).join(", ");
      ((r = C ? `${s6t} + ${joined}` : joined), n.unshift("mcp"));
    } else if (C) ((r = s6t), n.unshift("mcp"));
    else if (oe.has(a)) {
      let R = B(b),
        P = R === null ? Uf : readUntrustedArray(R?.rules),
        S = be(P);
      t.push(P === void 0 ? a : `${a}[${P === Uf ? "?" : S} ${plural(S ?? 0, "rule")}]`);
    } else n.push(CAPABILITY_NAME_REGEX.test(a) ? a : INVALID_CAPABILITY_NAME);
  }
  let s = n.length + t.length;
  if (s === 0) return "";
  let i = [...n, ...t.slice(0, Math.max(0, 8 - n.length))],
    l = s > 8 ? `[${s} total]; ` : "",
    c = l + i.join("; ");
  if (r !== void 0) {
    let joined = i.slice(1).join("; "),
      b = joined === "" ? "" : "; ",
      max = Math.max(16, 400 - Array.from(l + joined + b).length - 6),
      list = Array.from(r),
      R = list.length > max ? list.slice(0, max).join("") + "\u2026" : r;
    c = `${l}mcp: ${R}${b}${joined}`;
  }
  let list = Array.from(c);
  return ` (${list.length > 400 ? list.slice(0, 400).join("") + "\u2026" : list.join("")})`;
}
//@ chunk-99h01h55.js:20766-21059 placement
function describeCapabilityWidening(e, n) {
  let t = te(e ?? {}),
    filtered = Object.keys(te(n ?? {})).filter((l) => !Object.hasOwn(t, l)),
    s = (l) => (l === "mcp" ? 0 : oe.has(l) ? 2 : 1),
    mapped = filtered
      .sort((l, c) => s(l) - s(c))
      .map((l) => (CAPABILITY_NAME_REGEX.test(l) ? l : INVALID_CAPABILITY_NAME));
  if (!filtered.includes("mcp")) {
    if (isDynamicMcp(n?.mcp) && !isDynamicMcp(e?.mcp)) mapped.unshift(dn);
    else if (widensMcpAccess(e?.mcp, n?.mcp)) mapped.unshift(cn);
  }
  return mapped;
}
//@ chunk-99h01h55.js:21059-21591 placement
var INVALID_CAPABILITY_NAME = "invalid-name",
  cn = "mcp (more servers or tools)",
  s6t = "any connector the viewer approves",
  dn = `mcp (${s6t})`,
  fn =
    "This page's connector declaration is dynamic: beyond any servers it lists, the page can ask each viewer for any connector by name at call time, and the viewer approves each at first use. Connectors and tools the page calls without listing them were not checked against this session. Tell the user which connectors and tools the page calls, and that those integrations are unverified unless one real call was made.";
//@ chunk-99h01h55.js:21591-21633 placement
function isDynamicMcp(e) {
  return B(e)?.dynamic === !0;
}
//@ chunk-99h01h55.js:21633-21981 placement
function widensMcpAccess(e, n) {
  if (n === void 0) return !1;
  let t = ye(n);
  if (t === void 0) return !0;
  let r = new Map();
  for (let s of ye(e) ?? []) {
    let i = B(s),
      l = i?.server;
    if (typeof l === "string") r.set(l, new Set(Eae(i?.tools) ?? []));
  }
  return t.some((s) => {
    let i = B(s),
      l = i?.server,
      c = typeof l === "string" ? r.get(l) : void 0,
      d = Eae(i?.tools);
    return c === void 0 || d === void 0 || d.some((m) => !c.has(m));
  });
}
//@ chunk-99h01h55.js:21981-22058 placement
function Fe(e) {
  let n = B(e);
  return n === null ? Uf : n === void 0 ? void 0 : readUntrustedArray(n.servers);
}
//@ chunk-99h01h55.js:22058-22108 placement
function ye(e) {
  let n = Fe(e);
  return n === Uf ? void 0 : n;
}
//@ chunk-99h01h55.js:22108-22165 placement
function be(e) {
  return e === void 0 || e === Uf ? void 0 : e.length;
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
  let t = n?.max ?? 64,
    replaced = Array.from(e.slice(0, 2 * t), (s) =>
      isDecisionSurfaceControl(s.codePointAt(0) ?? 0) ? " " : s,
    )
      .slice(0, t)
      .join("")
      .replace(INVISIBLE_BLANKS, " ")
      .replace(/\s+/g, " ");
  return replaced.trim() === "" ? "?" : replaced;
}
//@ chunk-99h01h55.js:22594-22687 placement
function sanitizeDisplayTextOrUndefined(e, n) {
  let trimmed = sanitizeDisplayText(e, { max: n }).replace(INVISIBLE_BLANKS, " ").trim();
  return trimmed !== "" && trimmed !== "?" ? trimmed : void 0;
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
  Se,
  s6t,
  clearServedCapabilities,
  Wyi,
  describeCapabilities,
  DB_RULE_PATH_REGEX,
  GQr,
  getDeclaredCapabilities,
  isValidCapabilitiesObject,
  Zes,
  KQr,
  describeCapabilityWidening,
  getServedCapabilities,
  setServedCapabilities,
  findUnservedMcpServers,
  truncateWithEscapes,
  mergeCapabilities,
};
