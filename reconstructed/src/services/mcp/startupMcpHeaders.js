/**
 * services/mcp/startupMcpHeaders.ts
 *
 * 2.1.316 新增：启动时 MCP 服务器配置与请求头快照（比较、收窄）；MCP 服务器条目的比较文本与工具权限。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (8)
 * attribution: placement 8
 */
import { logForDebugging } from "../../utils/debug.js";
import { getOwn } from "../../utils/objectSafety.js";
import {
  iJ,
  X_MCP_SERVER_ORIGIN,
  X_CCR_OWNER_SLACK_USER_ID,
  Jkt,
  pot,
} from "./fileReference/fileReferencePolicy.js";
import { FILE_REFERENCE_ROWS } from "./fileReference/wrapFileReferenceTool.js";
import { ccrSessionIdFromMcpUrl } from "./ccrMcpUrls.js";
import { logError } from "../../utils/log.js";
import { hSr } from "../../utils/remoteEnvironment.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { partitionOperatorServers } from "./mcpConfigProvenance.js";
import { SDKHttpMessageSchema } from "../../entrypoints/sdk/coreSchemas.js";
import { Ove } from "./envExpansion.js";
import { rewriteCcrSessionMcpUrl } from "./ccrSessionMcpUrl.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { toDynamicServerConfig } from "./dynamicServers.js";
import { canonicalMcpConfigKey } from "./client.js";

/**
 * 启动时 MCP 服务器配置与请求头快照（比较、收窄）。
 */
//@ chunk-cjydagjy.js:17117-18705 placement
class StartupMcpHeaders {
  #t;
  #e;
  constructor(e, r) {
    let create = Object.create(null);
    for (let [s, S] of Object.entries(e)) {
      let y = S.type === "http" ? headerSnapshotsFor(s, S) : [];
      if (S.type !== "http" || y.length === 0) continue;
      let P = getOwn(r, s);
      if (Vo(P) && P.url === S.url && permissionsWithinStartup(S, P)) {
        let A = new Set(y.map((M) => M.text));
        for (let M of headerSnapshotsFor(s, P)) if (!A.has(M.text)) (A.add(M.text), y.push(M));
      }
      let create_2 = Object.create(null);
      for (let [A, M] of Object.entries(S.headers ?? {})) {
        let h = { [A]: M };
        if (iJ(h, X_MCP_SERVER_ORIGIN).length > 0 || iJ(h, X_CCR_OWNER_SLACK_USER_ID).length > 0)
          create_2[A] = M;
      }
      create[s] = { forms: y, headers: Object.freeze(create_2) };
    }
    ((this.#t = create), (this.#e = new Set(Object.keys(create))));
  }
  headersOf(e, r) {
    let n = this.#e.has(e) ? getOwn(this.#t, e) : void 0;
    return n?.forms.some((s) => s.url === r) ? n.headers : void 0;
  }
  isHeldEntry(e, r) {
    if (!this.#e.has(e) || r.type !== "http") return !1;
    let n = Ue(r);
    return n !== void 0 && getOwn(this.#t, e)?.forms.some((s) => s.text === n) === !0;
  }
  narrowTo(e, r) {
    try {
      let n = new Set(this.#e),
        s = [];
      for (let y of r ?? this.#e) {
        if (!this.#e.has(y)) continue;
        let P = getOwn(e, y),
          E = P === void 0 ? void 0 : Ue(P),
          A = getOwn(this.#t, y);
        if (E === void 0 || A?.forms.some((M) => M.text === E) !== !0)
          (n.delete(y), s.push([A, P === void 0 ? "removed" : E === void 0 ? "unreadable" : "changed"]));
      }
      let S = this.#e.size - n.size;
      this.#e = n;
      try {
        for (let [y, P] of s) {
          let found = FILE_REFERENCE_ROWS.find((A) => {
            let M = `${A.connectorOrigin}${A.connectorPath}`;
            return y?.forms.some((h) => {
              let k = ccrSessionIdFromMcpUrl(h.url)?.upstreamUrl;
              return k === M || k === `${M}/`;
            });
          });
          if (found !== void 0) Jkt().note(found, { state: "hold_ended", reason: P });
        }
      } catch {}
      if (S > 0)
        logForDebugging(
          `[MCP] ${S} MCP server(s) this process started with were removed, changed or could not be read; if one was Google Drive, uploads of local files by path to it stay off until a new worker process starts`,
        );
    } catch (error) {
      ((this.#e = new Set()), logError(error));
    }
  }
}
//@ chunk-cjydagjy.js:18705-18998 placement
function installStartupMcpHeaders(e, r, n, s = {}) {
  if (!hSr() || isCcsTenant()) return;
  try {
    let S = new StartupMcpHeaders(
        partitionOperatorServers(
          Object.entries(r).map(([P, E]) => ({ name: P, type: "pending", config: E })),
          n,
        ).hostOwnedConfigs,
        s,
      ),
      of = pot.of(e);
    ((of.read = (P, E) => S.headersOf(P, E)),
      (of.isStartupEntry = (P, E) => S.isHeldEntry(P, E)),
      (of.narrowTo = (P, E) => S.narrowTo(P, E)));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-cjydagjy.js:18998-19047 placement
function Vo(e) {
  return SDKHttpMessageSchema().safeParse(e).success;
}
//@ chunk-cjydagjy.js:19047-19246 placement
function headerSnapshotsFor(e, r) {
  let n = Ue(r);
  if (n === void 0 || Ove(n) || getOwn(r, "headersHelper") !== void 0) return [];
  let s = rewriteCcrSessionMcpUrl(e, r),
    S = s && Ue(s);
  return s && S !== void 0
    ? [
        { url: r.url, text: n },
        { url: s.url, text: S },
      ]
    : [{ url: r.url, text: n }];
}
//@ chunk-cjydagjy.js:19246-19474 placement
function permissionsWithinStartup(e, r) {
  let n = mcpEntryFingerprint(r)?.caps;
  if (n === void 0) return !1;
  if (!("toolPermissions" in e) || e.toolPermissions === void 0) return !0;
  return (
    isPlainObject(e.toolPermissions) &&
    Object.entries(e.toolPermissions).every(([s, S]) => S === "allow" || getOwn(n, s) === S)
  );
}
//@ chunk-cjydagjy.js:19474-19508 placement
function Ue(e) {
  return mcpEntryFingerprint(e)?.text;
}
/**
 * MCP 服务器条目的比较文本与工具权限。
 */
//@ chunk-cjydagjy.js:19508-19844 placement
function mcpEntryFingerprint(e) {
  try {
    let r = withoutAllowPermissions(toDynamicServerConfig({ ...e }));
    return {
      text: canonicalMcpConfigKey(r),
      caps: "toolPermissions" in r && isPlainObject(r.toolPermissions) ? r.toolPermissions : {},
    };
  } catch (error) {
    logForDebugging(
      `[MCP] could not read an MCP server entry (${error instanceof Error ? error.name : typeof error}), so it is left out when entries are compared with the ones this process started with`,
      { level: "error" },
    );
    return;
  }
}
//@ chunk-cjydagjy.js:19844-20128 placement
function withoutAllowPermissions(e) {
  if (!("toolPermissions" in e) || !isPlainObject(e.toolPermissions)) return e;
  let entries = Object.entries(e.toolPermissions),
    filtered = entries.filter(([, y]) => y !== "allow");
  if (filtered.length === entries.length) return e;
  if (filtered.length > 0) return { ...e, toolPermissions: Object.fromEntries(filtered) };
  let { toolPermissions: toolPermissions, ...S } = e;
  return S;
}

export { installStartupMcpHeaders };
