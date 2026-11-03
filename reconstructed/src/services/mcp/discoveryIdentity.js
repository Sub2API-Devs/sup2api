/**
 * services/mcp/discoveryIdentity.ts
 *
 * 2.1.316 新增：MCP 发现缓存的身份与账户解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0qyh5wah.js (17)
 * attribution: placement 17
 */
import { createDecipheriv } from "crypto";
import {
  CACHE_VERSION_PREFIX,
  Pe,
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

//@ chunk-0qyh5wah.js:4326-4362 placement
/**
 * 取封印文件头里的摘要。
 */
function headerDigest(e) {
  return parseSealedHeader(e)?.digest;
}
//@ chunk-0qyh5wah.js:4362-4556 placement
function parseSealedHeader(e) {
  if (!e.startsWith(CACHE_VERSION_PREFIX)) return;
  let r = CACHE_VERSION_PREFIX.length + Pe;
  if (e.length <= r || e[r] !== ":") return;
  let sliced = e.slice(CACHE_VERSION_PREFIX.length, r);
  let sliced_2 = e.slice(r + 1);
  if (!regExp.test(sliced) || !BASE64URL_CHARS_RE.test(sliced_2)) return;
  return {
    digest: sliced,
    body: sliced_2,
  };
}
//@ chunk-0qyh5wah.js:4556-5082 placement
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
//@ chunk-0qyh5wah.js:5082-5123 placement
/**
 * 按宿主保存的“呈现过的凭据”记录。
 */
var MAX_PRESENTED_CREDENTIALS = 4096;
var MAX_CREDENTIAL_PREFIX_CHARS = 1024;
var presentedCredentialLog = new HostScoped(() => new PresentedCredentialLog());
//@ chunk-0qyh5wah.js:5123-5160 placement
/**
 * 取当前宿主的呈现凭据记录。
 */
function getPresentedCredentialLog() {
  return presentedCredentialLog.of(getRootSession().host);
}
//@ chunk-0qyh5wah.js:5160-5238 placement
function basicAuthValue(clientId, clientSecret) {
  if (!clientId || !clientSecret) return;
  try {
    return btoa(`${clientId}:${clientSecret}`);
  } catch {
    return;
  }
}
//@ chunk-0qyh5wah.js:5238-5274 placement
/**
 * 呈现凭据记录是否开启。
 */
function isPresentedLogEnabled() {
  return getCacheOffLatched() !== undefined;
}
//@ chunk-0qyh5wah.js:5274-5851 placement
/**
 * 记录连接时呈现过的凭据片段（有数量上限，超出时标记不完整并给出一次提示），关闭记录时清空。
 */
class PresentedCredentialLog {
  seen = new Set();
  off = false;
  incomplete = false;
  overflowNotice = null;
  record(e) {
    if (this.recordingOff()) return;
    if (typeof e !== "string" || e === "") return;
    let r = truncateToLength(e, MAX_CREDENTIAL_PREFIX_CHARS);
    if (this.seen.has(r)) return;
    if (this.seen.size >= MAX_PRESENTED_CREDENTIALS) {
      this.incomplete = true;
      this.overflowNotice ??= true;
      return;
    }
    this.seen.add(r);
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
//@ chunk-0qyh5wah.js:5851-5932 placement
function setAccountResolver(accountResolver) {
  let discoveryCacheStore = getDiscoveryCacheStore();
  discoveryCacheStore.accountResolver = accountResolver;
  discoveryCacheStore.lastResolvedAccountToken = undefined;
}
//@ chunk-0qyh5wah.js:5932-5967 placement
function setEraResolver(eraResolver) {
  getDiscoveryCacheStore().eraResolver = eraResolver;
}
//@ chunk-0qyh5wah.js:5967-6007 placement
function currentEra() {
  return getDiscoveryCacheStore().eraResolver();
}
//@ chunk-0qyh5wah.js:6007-6059 placement
function hasAccountResolver() {
  return getDiscoveryCacheStore().accountResolver !== undefined;
}
//@ chunk-0qyh5wah.js:6059-6177 placement
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
//@ chunk-0qyh5wah.js:6177-6215 placement
/**
 * 远程服务器且身份代号已变化。
 */
function identityChangedForRemote(config, attemptEpoch) {
  return !isCurrentIdentityEpoch(attemptEpoch) && isRemoteMcpTransport(config);
}
//@ chunk-0qyh5wah.js:6215-6310 placement
function identityChangedFailure(name, config) {
  return {
    name,
    type: "failed",
    config,
    error: ACCOUNT_CHANGED_REASON,
    errorCode: "IDENTITY_CHANGED",
  };
}
//@ chunk-0qyh5wah.js:6310-6359 placement
function hasRemoteMcpServers(e) {
  return e.some((r) => isRemoteMcpTransport(r.config));
}
//@ chunk-0qyh5wah.js:6359-6392 placement
/**
 * 当前 MCP 身份快照里的令牌。
 */
function currentIdentityToken() {
  return getMcpIdentitySnapshot().token;
}
export {
  currentEra,
  currentIdentityToken,
  getPresentedCredentialLog,
  openDiscoverySeal,
  headerDigest,
  setEraResolver,
  hasAccountResolver,
  setAccountResolver,
  isRemoteMcpTransport,
  identityChangedForRemote,
  identityChangedFailure,
  hasRemoteMcpServers,
  basicAuthValue,
};
