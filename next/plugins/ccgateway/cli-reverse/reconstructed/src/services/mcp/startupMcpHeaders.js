/**
 * services/mcp/startupMcpHeaders.ts
 *
 * 2.1.316 新增：启动时 MCP 服务器配置与请求头快照（比较、收窄）；MCP 服务器条目的比较文本与工具权限。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h61dq9nz.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";
import { getOwn } from "../../utils/objectSafety.js";
import {
  headerValues,
  X_MCP_SERVER_ORIGIN,
  X_CCR_OWNER_SLACK_USER_ID,
  X_CCR_GMAIL_ATTACHMENTS,
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

//@ chunk-h61dq9nz.js:17260-18895 placement
/**
 * 启动时 MCP 服务器配置与请求头快照（比较、收窄）。
 */
class StartupMcpHeaders {
  #t;
  #e;
  constructor(hostOwnedConfigs, asWritten) {
    let held = Object.create(null);
    for (let [key, value] of Object.entries(hostOwnedConfigs)) {
      let forms = value.type === "http" ? headerSnapshotsFor(key, value) : [];
      if (value.type !== "http" || forms.length === 0) continue;
      let asWrittenEntry = getOwn(asWritten, key);
      if (
        isSdkHttpMessage(asWrittenEntry) &&
        asWrittenEntry.url === value.url &&
        permissionsWithinStartup(value, asWrittenEntry)
      ) {
        let seenForms = new Set(forms.map((form) => form.text));
        for (let entryForm of headerSnapshotsFor(key, asWrittenEntry))
          if (!seenForms.has(entryForm.text)) {
            seenForms.add(entryForm.text);
            forms.push(entryForm);
          }
      }
      let originHeaders = Object.create(null);
      for (let [key, value_2] of Object.entries(value.headers ?? {})) {
        let singleHeader = {
          [key]: value_2,
        };
        if (
          headerValues(singleHeader, X_MCP_SERVER_ORIGIN).length > 0 ||
          headerValues(singleHeader, X_CCR_OWNER_SLACK_USER_ID).length > 0 ||
          headerValues(singleHeader, X_CCR_GMAIL_ATTACHMENTS).length > 0
        )
          originHeaders[key] = value_2;
      }
      held[key] = {
        forms,
        headers: Object.freeze(originHeaders),
      };
    }
    this.#t = held;
    this.#e = new Set(Object.keys(held));
  }
  headersOf(serverName, url) {
    let entry = this.#e.has(serverName) ? getOwn(this.#t, serverName) : undefined;
    return entry?.forms.some((form) => form.url === url) ? entry.headers : undefined;
  }
  isHeldEntry(serverName, config) {
    if (!this.#e.has(serverName) || config.type !== "http") return false;
    let fingerprint = entryFingerprintText(config);
    return (
      fingerprint !== undefined &&
      getOwn(this.#t, serverName)?.forms.some((form) => form.text === fingerprint) === true
    );
  }
  narrowTo(configs, keepNames) {
    try {
      let keptNames = new Set(this.#e);
      let ended = [];
      for (let serverName of keepNames ?? this.#e) {
        if (!this.#e.has(serverName)) continue;
        let config = getOwn(configs, serverName);
        let fingerprint = config === undefined ? undefined : entryFingerprintText(config);
        let entry = getOwn(this.#t, serverName);
        if (fingerprint === undefined || entry?.forms.some((form) => form.text === fingerprint) !== true) {
          keptNames.delete(serverName);
          ended.push([
            entry,
            config === undefined ? "removed" : fingerprint === undefined ? "unreadable" : "changed",
          ]);
        }
      }
      let removedCount = this.#e.size - keptNames.size;
      this.#e = keptNames;
      try {
        for (let [entry, reason] of ended) {
          let found = FILE_REFERENCE_ROWS.find((row) => {
            let expectedUrl = `${row.connectorOrigin}${row.connectorPath}`;
            return (
              row.recipientCheck === undefined &&
              entry?.forms.some((form) => {
                let upstreamUrl = ccrSessionIdFromMcpUrl(form.url)?.upstreamUrl;
                return upstreamUrl === expectedUrl || upstreamUrl === `${expectedUrl}/`;
              })
            );
          });
          if (found !== undefined)
            getFileReferenceOffer().note(found, {
              state: "hold_ended",
              reason,
            });
        }
      } catch {}
      if (removedCount > 0)
        logForDebugging(
          `[MCP] ${removedCount} MCP server(s) this process started with were removed, changed or could not be read; if one was Google Drive, uploads of local files by path to it stay off until a new worker process starts`,
        );
    } catch (error) {
      this.#e = new Set();
      logError(error);
    }
  }
}
//@ chunk-h61dq9nz.js:18895-19188 placement
function installStartupMcpHeaders(session, regularMcpConfigs, ownership, asWritten = {}) {
  if (!isRemoteOrFalse() || isCcsTenant()) return;
  try {
    let startupHeaders = new StartupMcpHeaders(
      partitionOperatorServers(
        Object.entries(regularMcpConfigs).map(([key, value]) => ({
          name: key,
          type: "pending",
          config: value,
        })),
        ownership,
      ).hostOwnedConfigs,
      asWritten,
    );
    let capabilityCache = serverCapabilityCache.of(session);
    capabilityCache.read = (serverName, url) => startupHeaders.headersOf(serverName, url);
    capabilityCache.isStartupEntry = (serverName, config) => startupHeaders.isHeldEntry(serverName, config);
    capabilityCache.narrowTo = (configs, keepNames) => startupHeaders.narrowTo(configs, keepNames);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-h61dq9nz.js:19188-19237 placement
/**
 * 校验对象是否为 SDK 的 http 消息结构。
 */
function isSdkHttpMessage(value) {
  return SDKHttpMessageSchema().safeParse(value).success;
}
//@ chunk-h61dq9nz.js:19237-19435 placement
function headerSnapshotsFor(serverName, config) {
  let fingerprint = entryFingerprintText(config);
  if (
    fingerprint === undefined ||
    containsEnvRef(fingerprint) ||
    getOwn(config, "headersHelper") !== undefined
  )
    return [];
  let rewritten = rewriteCcrSessionMcpUrl(serverName, config);
  let rewrittenFingerprint = rewritten && entryFingerprintText(rewritten);
  return rewritten && rewrittenFingerprint !== undefined
    ? [
        {
          url: config.url,
          text: fingerprint,
        },
        {
          url: rewritten.url,
          text: rewrittenFingerprint,
        },
      ]
    : [
        {
          url: config.url,
          text: fingerprint,
        },
      ];
}
//@ chunk-h61dq9nz.js:19435-19663 placement
function permissionsWithinStartup(config, asWritten) {
  let caps = mcpEntryFingerprint(asWritten)?.caps;
  if (caps === undefined) return false;
  if (!("toolPermissions" in config) || config.toolPermissions === undefined) return true;
  return (
    isPlainObject(config.toolPermissions) &&
    Object.entries(config.toolPermissions).every(
      ([key, value]) => value === "allow" || getOwn(caps, key) === value,
    )
  );
}
//@ chunk-h61dq9nz.js:19663-19697 placement
/**
 * 取服务器条目的指纹文本。
 */
function entryFingerprintText(entry) {
  return mcpEntryFingerprint(entry)?.text;
}
//@ chunk-h61dq9nz.js:19697-20033 placement
/**
 * MCP 服务器条目的比较文本与工具权限。
 */
function mcpEntryFingerprint(entry) {
  try {
    let config = withoutAllowPermissions(
      toDynamicServerConfig({
        ...entry,
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
//@ chunk-h61dq9nz.js:20033-20317 placement
function withoutAllowPermissions(dynamicServerConfig) {
  if (!("toolPermissions" in dynamicServerConfig) || !isPlainObject(dynamicServerConfig.toolPermissions))
    return dynamicServerConfig;
  let entries = Object.entries(dynamicServerConfig.toolPermissions);
  let filtered = entries.filter(([, value]) => value !== "allow");
  if (filtered.length === entries.length) return dynamicServerConfig;
  if (filtered.length > 0)
    return {
      ...dynamicServerConfig,
      toolPermissions: Object.fromEntries(filtered),
    };
  let { toolPermissions, ...rest } = dynamicServerConfig;
  return rest;
}
export { installStartupMcpHeaders };
