/**
 * services/mcp/discoveryIdentity.ts
 *
 * 2.1.316 新增：MCP 发现缓存的身份与账户解析。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kbr8ch1e.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createDecipheriv } from "crypto";
import {
  CACHE_VERSION_PREFIX,
  CACHE_KEY_ID_CHARS,
  regExp,
  BASE64URL_CHARS_RE,
  hashCacheKeyId,
  IV_BYTES,
  AUTH_TAG_BYTES,
} from "./discoveryCache.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getCacheOffLatched, getDiscoveryCacheStore } from "./mcpAccountKey.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { isCurrentIdentityEpoch, getMcpIdentitySnapshot } from "./identityChange.js";
import { ACCOUNT_CHANGED_REASON } from "./redactMcpErrors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kbr8ch1e.js:4326-4362 placement
/**
 * 取封印文件头里的摘要。
 */
function headerDigest(text) {
  return parseSealedHeader(text)?.digest;
}
//@ chunk-kbr8ch1e.js:4362-4556 placement
function parseSealedHeader(header) {
  if (!header.startsWith(CACHE_VERSION_PREFIX)) return;
  let colonIndex = CACHE_VERSION_PREFIX.length + CACHE_KEY_ID_CHARS;
  if (header.length <= colonIndex || header[colonIndex] !== ":") return;
  let sliced = header.slice(CACHE_VERSION_PREFIX.length, colonIndex);
  let sliced_2 = header.slice(colonIndex + 1);
  if (!regExp.test(sliced) || !BASE64URL_CHARS_RE.test(sliced_2)) return;
  return {
    digest: sliced,
    body: sliced_2,
  };
}
//@ chunk-kbr8ch1e.js:4556-5083 placement
/**
 * 解开加密的发现缓存条目：校验版本前缀与缓存键摘要头，按 IV|密文|认证标签 拆分，用 AES-256-GCM 与 AAD 解密，失败给出 v1/short/header/tag 原因。
 */
function openDiscoverySeal(keyInfo, sealed) {
  if (!sealed.startsWith(CACHE_VERSION_PREFIX))
    return {
      ok: false,
      reason: "v1",
    };
  let header = parseSealedHeader(sealed);
  if (!header)
    return {
      ok: false,
      reason: "short",
    };
  if (header.digest !== hashCacheKeyId(keyInfo.cacheKey))
    return {
      ok: false,
      reason: "header",
    };
  let raw = Buffer.from(header.body, "base64url");
  if (raw.length < IV_BYTES + AUTH_TAG_BYTES)
    return {
      ok: false,
      reason: "short",
    };
  let iv = raw.subarray(0, IV_BYTES);
  let authTag = raw.subarray(raw.length - AUTH_TAG_BYTES);
  let ciphertext = raw.subarray(IV_BYTES, raw.length - AUTH_TAG_BYTES);
  try {
    let decipheriv = createDecipheriv("aes-256-gcm", keyInfo.key, iv, {
      authTagLength: AUTH_TAG_BYTES,
    });
    decipheriv.setAuthTag(authTag);
    decipheriv.setAAD(keyInfo.aad);
    return {
      ok: true,
      plaintext: Buffer.concat([decipheriv.update(ciphertext), decipheriv.final()]).toString("utf8"),
    };
  } catch {
    return {
      ok: false,
      reason: "tag",
    };
  }
}
//@ chunk-kbr8ch1e.js:5083-5124 placement
/**
 * 按宿主保存的“呈现过的凭据”记录。
 */
var MAX_PRESENTED_CREDENTIALS; // deferred: uses PresentedCredentialLog of its import cycle while loading; runs once the cycle is complete
var MAX_CREDENTIAL_PREFIX_CHARS;
var presentedCredentialLog;
deferInit("chunk-kbr8ch1e.js:5083", () => {
  MAX_PRESENTED_CREDENTIALS = 4096;
  MAX_CREDENTIAL_PREFIX_CHARS = 1024;
  presentedCredentialLog = new HostScoped(() => new PresentedCredentialLog());
});
//@ chunk-kbr8ch1e.js:5124-5161 placement
/**
 * 取当前宿主的呈现凭据记录。
 */
function getPresentedCredentialLog() {
  return presentedCredentialLog.of(getRootSession().host);
}
//@ chunk-kbr8ch1e.js:5161-5239 placement
function basicAuthValue(clientId, clientSecret) {
  if (!clientId || !clientSecret) return;
  try {
    return btoa(`${clientId}:${clientSecret}`);
  } catch {
    return;
  }
}
//@ chunk-kbr8ch1e.js:5239-5275 placement
/**
 * 呈现凭据记录是否开启。
 */
function isPresentedLogEnabled() {
  return getCacheOffLatched() !== undefined;
}
//@ chunk-kbr8ch1e.js:5275-5851 placement
/**
 * 记录连接时呈现过的凭据片段（有数量上限，超出时标记不完整并给出一次提示），关闭记录时清空。
 */
class PresentedCredentialLog {
  seen = new Set();
  off = false;
  incomplete = false;
  overflowNotice = null;
  record(secret) {
    if (this.recordingOff()) return;
    if (typeof secret !== "string" || secret === "") return;
    let prefix = truncateToLength(secret, MAX_CREDENTIAL_PREFIX_CHARS);
    if (this.seen.has(prefix)) return;
    if (this.seen.size >= MAX_PRESENTED_CREDENTIALS) {
      this.incomplete = true;
      this.overflowNotice ??= true;
      return;
    }
    this.seen.add(prefix);
  }
  recordingOff() {
    if (!this.off && isPresentedLogEnabled()) {
      this.off = true;
      this.seen.clear();
      this.incomplete = false;
      this.overflowNotice = null;
    }
    return this.off;
  }
  takeOverflowNotice() {
    if (this.overflowNotice === true) {
      this.overflowNotice = false;
      return true;
    }
    return false;
  }
  snapshot() {
    this.recordingOff();
    return {
      atoms: [...this.seen],
      complete: !this.incomplete,
    };
  }
}
//@ chunk-kbr8ch1e.js:5851-5932 placement
function setAccountResolver(accountResolver) {
  let discoveryCacheStore = getDiscoveryCacheStore();
  discoveryCacheStore.accountResolver = accountResolver;
  discoveryCacheStore.lastResolvedAccountToken = undefined;
}
//@ chunk-kbr8ch1e.js:5932-5967 placement
function setEraResolver(eraResolver) {
  getDiscoveryCacheStore().eraResolver = eraResolver;
}
//@ chunk-kbr8ch1e.js:5967-6007 placement
function currentEra() {
  return getDiscoveryCacheStore().eraResolver();
}
//@ chunk-kbr8ch1e.js:6007-6059 placement
function hasAccountResolver() {
  return getDiscoveryCacheStore().accountResolver !== undefined;
}
//@ chunk-kbr8ch1e.js:6059-6177 placement
function isRemoteMcpTransport(config) {
  switch (config.type) {
    case "stdio":
    case undefined:
    case "sdk":
    case "sse-ide":
    case "ws-ide":
      return false;
    default:
      return true;
  }
}
//@ chunk-kbr8ch1e.js:6177-6215 placement
/**
 * 远程服务器且身份代号已变化。
 */
function identityChangedForRemote(config, attemptEpoch) {
  return !isCurrentIdentityEpoch(attemptEpoch) && isRemoteMcpTransport(config);
}
//@ chunk-kbr8ch1e.js:6215-6310 placement
function identityChangedFailure(name, config) {
  return {
    name,
    type: "failed",
    config,
    error: ACCOUNT_CHANGED_REASON,
    errorCode: "IDENTITY_CHANGED",
  };
}
//@ chunk-kbr8ch1e.js:6310-6359 placement
function hasRemoteMcpServers(clients) {
  return clients.some((client) => isRemoteMcpTransport(client.config));
}
//@ chunk-kbr8ch1e.js:6359-6392 placement
/**
 * 当前 MCP 身份快照里的令牌。
 */
function currentIdentityToken() {
  return getMcpIdentitySnapshot().token;
}
export {
  getPresentedCredentialLog,
  identityChangedFailure,
  isRemoteMcpTransport,
  identityChangedForRemote,
  setEraResolver,
  hasAccountResolver,
  setAccountResolver,
  hasRemoteMcpServers,
  basicAuthValue,
  currentEra,
  currentIdentityToken,
  openDiscoverySeal,
  headerDigest,
};
