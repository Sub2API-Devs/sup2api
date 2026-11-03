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
  headerValues,
  X_MCP_SERVER_ORIGIN,
  X_CCR_OWNER_SLACK_USER_ID,
  getFileReferenceOffer,
  serverCapabilityCache,
} from "./fileReference/fileReferencePolicy.js";
import { FILE_REFERENCE_ROWS } from "./fileReference/wrapFileReferenceTool.js";
import { ccrSessionIdFromMcpUrl } from "./ccrMcpUrls.js";
import { logError } from "../../utils/log.js";
import { isRemoteOrFalse } from "../../utils/remoteEnvironment.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { partitionOperatorServers } from "./mcpConfigProvenance.js";
import { SDKHttpMessageSchema } from "../../entrypoints/sdk/coreSchemas.js";
import { containsEnvRef } from "./envExpansion.js";
import { rewriteCcrSessionMcpUrl } from "./ccrSessionMcpUrl.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { toDynamicServerConfig } from "./dynamicServers.js";
import { canonicalMcpConfigKey } from "./client.js";

//@ chunk-cjydagjy.js:17117-18705 placement
/**
 * 启动时 MCP 服务器配置与请求头快照（比较、收窄）。
 */
class StartupMcpHeaders {
  #t;
  #e;
  constructor(hostOwnedConfigs, r) {
    let n = Object.create(null);
    for (let [key, value] of Object.entries(hostOwnedConfigs)) {
      let y = value.type === "http" ? headerSnapshotsFor(key, value) : [];
      if (value.type !== "http" || y.length === 0) continue;
      let P = getOwn(r, key);
      if (isSdkHttpMessage(P) && P.url === value.url && permissionsWithinStartup(value, P)) {
        let A = new Set(y.map((M) => M.text));
        for (let M of headerSnapshotsFor(key, P))
          if (!A.has(M.text)) {
            A.add(M.text);
            y.push(M);
          }
      }
      let E = Object.create(null);
      for (let [key, value_2] of Object.entries(value.headers ?? {})) {
        let h = {
          [key]: value_2,
        };
        if (
          headerValues(h, X_MCP_SERVER_ORIGIN).length > 0 ||
          headerValues(h, X_CCR_OWNER_SLACK_USER_ID).length > 0
        )
          E[key] = value_2;
      }
      n[key] = {
        forms: y,
        headers: Object.freeze(E),
      };
    }
    this.#t = n;
    this.#e = new Set(Object.keys(n));
  }
  headersOf(e, r) {
    let n = this.#e.has(e) ? getOwn(this.#t, e) : undefined;
    return n?.forms.some((form) => form.url === r) ? n.headers : undefined;
  }
  isHeldEntry(e, r) {
    if (!this.#e.has(e) || r.type !== "http") return false;
    let n = entryFingerprintText(r);
    return n !== undefined && getOwn(this.#t, e)?.forms.some((form) => form.text === n) === true;
  }
  narrowTo(e, r) {
    try {
      let n = new Set(this.#e);
      let s = [];
      for (let y of r ?? this.#e) {
        if (!this.#e.has(y)) continue;
        let P = getOwn(e, y);
        let E = P === undefined ? undefined : entryFingerprintText(P);
        let A = getOwn(this.#t, y);
        if (E === undefined || A?.forms.some((form) => form.text === E) !== true) {
          n.delete(y);
          s.push([A, P === undefined ? "removed" : E === undefined ? "unreadable" : "changed"]);
        }
      }
      let S = this.#e.size - n.size;
      this.#e = n;
      try {
        for (let [y, P] of s) {
          let found = FILE_REFERENCE_ROWS.find((A) => {
            let M = `${A.connectorOrigin}${A.connectorPath}`;
            return y?.forms.some((form) => {
              let upstreamUrl = ccrSessionIdFromMcpUrl(form.url)?.upstreamUrl;
              return upstreamUrl === M || upstreamUrl === `${M}/`;
            });
          });
          if (found !== undefined)
            getFileReferenceOffer().note(found, {
              state: "hold_ended",
              reason: P,
            });
        }
      } catch {}
      if (S > 0)
        logForDebugging(
          `[MCP] ${S} MCP server(s) this process started with were removed, changed or could not be read; if one was Google Drive, uploads of local files by path to it stay off until a new worker process starts`,
        );
    } catch (error) {
      this.#e = new Set();
      logError(error);
    }
  }
}
//@ chunk-cjydagjy.js:18705-18998 placement
function installStartupMcpHeaders(session, regularMcpConfigs, mcpConfigOwnership, asWrittenMcpEntries = {}) {
  if (!isRemoteOrFalse() || isCcsTenant()) return;
  try {
    let S = new StartupMcpHeaders(
      partitionOperatorServers(
        Object.entries(regularMcpConfigs).map(([key, value]) => ({
          name: key,
          type: "pending",
          config: value,
        })),
        mcpConfigOwnership,
      ).hostOwnedConfigs,
      asWrittenMcpEntries,
    );
    let y = serverCapabilityCache.of(session);
    y.read = (P, E) => S.headersOf(P, E);
    y.isStartupEntry = (P, E) => S.isHeldEntry(P, E);
    y.narrowTo = (P, E) => S.narrowTo(P, E);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-cjydagjy.js:18998-19047 placement
/**
 * 校验对象是否为 SDK 的 http 消息结构。
 */
function isSdkHttpMessage(e) {
  return SDKHttpMessageSchema().safeParse(e).success;
}
//@ chunk-cjydagjy.js:19047-19246 placement
function headerSnapshotsFor(e, r) {
  let n = entryFingerprintText(r);
  if (n === undefined || containsEnvRef(n) || getOwn(r, "headersHelper") !== undefined) return [];
  let s = rewriteCcrSessionMcpUrl(e, r);
  let S = s && entryFingerprintText(s);
  return s && S !== undefined
    ? [
        {
          url: r.url,
          text: n,
        },
        {
          url: s.url,
          text: S,
        },
      ]
    : [
        {
          url: r.url,
          text: n,
        },
      ];
}
//@ chunk-cjydagjy.js:19246-19474 placement
function permissionsWithinStartup(e, r) {
  let caps = mcpEntryFingerprint(r)?.caps;
  if (caps === undefined) return false;
  if (!("toolPermissions" in e) || e.toolPermissions === undefined) return true;
  return (
    isPlainObject(e.toolPermissions) &&
    Object.entries(e.toolPermissions).every(
      ([key, value]) => value === "allow" || getOwn(caps, key) === value,
    )
  );
}
//@ chunk-cjydagjy.js:19474-19508 placement
/**
 * 取服务器条目的指纹文本。
 */
function entryFingerprintText(e) {
  return mcpEntryFingerprint(e)?.text;
}
//@ chunk-cjydagjy.js:19508-19844 placement
/**
 * MCP 服务器条目的比较文本与工具权限。
 */
function mcpEntryFingerprint(e) {
  try {
    let config = withoutAllowPermissions(
      toDynamicServerConfig({
        ...e,
      }),
    );
    return {
      text: canonicalMcpConfigKey(config),
      caps:
        "toolPermissions" in config && isPlainObject(config.toolPermissions) ? config.toolPermissions : {},
    };
  } catch (error) {
    logForDebugging(
      `[MCP] could not read an MCP server entry (${error instanceof Error ? error.name : typeof error}), so it is left out when entries are compared with the ones this process started with`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-cjydagjy.js:19844-20128 placement
function withoutAllowPermissions(dynamicServerConfig) {
  if (!("toolPermissions" in dynamicServerConfig) || !isPlainObject(dynamicServerConfig.toolPermissions))
    return dynamicServerConfig;
  let entries = Object.entries(dynamicServerConfig.toolPermissions);
  let filtered = entries.filter(([, y]) => y !== "allow");
  if (filtered.length === entries.length) return dynamicServerConfig;
  if (filtered.length > 0)
    return {
      ...dynamicServerConfig,
      toolPermissions: Object.fromEntries(filtered),
    };
  let { toolPermissions, ...S } = dynamicServerConfig;
  return S;
}
export { installStartupMcpHeaders };
