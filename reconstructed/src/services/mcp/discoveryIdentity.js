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
import { V2, ceil, regExp, dt, hashCacheKeyId, Z, K } from "./discoveryCache.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { D4s, getDiscoveryCacheStore } from "./mcpAccountKey.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { isCurrentIdentityEpoch, getMcpIdentitySnapshot } from "./identityChange.js";
import { gnr } from "./redactMcpErrors.js";

//@ chunk-0qyh5wah.js:4326-4362 placement
function xe(e) {
  return parseSealedHeader(e)?.digest;
}
//@ chunk-0qyh5wah.js:4362-4556 placement
function parseSealedHeader(e) {
  if (!e.startsWith(V2)) return;
  let r = V2.length + ceil;
  if (e.length <= r || e[r] !== ":") return;
  let sliced = e.slice(V2.length, r),
    sliced_2 = e.slice(r + 1);
  if (!regExp.test(sliced) || !dt.test(sliced_2)) return;
  return { digest: sliced, body: sliced_2 };
}
/**
 * 解开加密的发现缓存条目：校验版本前缀与缓存键摘要头，按 IV|密文|认证标签 拆分，用 AES-256-GCM 与 AAD 解密，失败给出 v1/short/header/tag 原因。
 */
//@ chunk-0qyh5wah.js:4556-5082 placement
function openDiscoverySeal(keyInfo, sealed) {
  if (!sealed.startsWith(V2)) return { ok: !1, reason: "v1" };
  let header = parseSealedHeader(sealed);
  if (!header) return { ok: !1, reason: "short" };
  if (header.digest !== hashCacheKeyId(keyInfo.cacheKey)) return { ok: !1, reason: "header" };
  let raw = Buffer.from(header.body, "base64url");
  if (raw.length < Z + K) return { ok: !1, reason: "short" };
  let iv = raw.subarray(0, Z),
    authTag = raw.subarray(raw.length - K),
    ciphertext = raw.subarray(Z, raw.length - K);
  try {
    let l = createDecipheriv("aes-256-gcm", keyInfo.key, iv, { authTagLength: K });
    return (
      l.setAuthTag(authTag),
      l.setAAD(keyInfo.aad),
      { ok: !0, plaintext: Buffer.concat([l.update(ciphertext), l.final()]).toString("utf8") }
    );
  } catch {
    return { ok: !1, reason: "tag" };
  }
}
//@ chunk-0qyh5wah.js:5082-5123 placement
var ut = 4096,
  ft = 1024,
  lt = new HostScoped(() => new PresentedCredentialLog());
//@ chunk-0qyh5wah.js:5123-5160 placement
function Ny() {
  return lt.of(getRootSession().host);
}
//@ chunk-0qyh5wah.js:5160-5238 placement
function basicAuthValue(e, r) {
  if (!e || !r) return;
  try {
    return btoa(`${e}:${r}`);
  } catch {
    return;
  }
}
//@ chunk-0qyh5wah.js:5238-5274 placement
function pt() {
  return D4s() !== void 0;
}
/**
 * 记录连接时呈现过的凭据片段（有数量上限，超出时标记不完整并给出一次提示），关闭记录时清空。
 */
//@ chunk-0qyh5wah.js:5274-5851 placement
class PresentedCredentialLog {
  seen = new Set();
  off = !1;
  incomplete = !1;
  overflowNotice = null;
  record(e) {
    if (this.recordingOff()) return;
    if (typeof e !== "string" || e === "") return;
    let r = truncateToLength(e, ft);
    if (this.seen.has(r)) return;
    if (this.seen.size >= ut) {
      ((this.incomplete = !0), (this.overflowNotice ??= !0));
      return;
    }
    this.seen.add(r);
  }
  recordingOff() {
    if (!this.off && pt())
      ((this.off = !0), this.seen.clear(), (this.incomplete = !1), (this.overflowNotice = null));
    return this.off;
  }
  takeOverflowNotice() {
    if (this.overflowNotice === !0) return ((this.overflowNotice = !1), !0);
    return !1;
  }
  snapshot() {
    return (this.recordingOff(), { atoms: [...this.seen], complete: !this.incomplete });
  }
}
//@ chunk-0qyh5wah.js:5851-5932 placement
function setAccountResolver(e) {
  let r = getDiscoveryCacheStore();
  ((r.accountResolver = e), (r.lastResolvedAccountToken = void 0));
}
//@ chunk-0qyh5wah.js:5932-5967 placement
function setEraResolver(e) {
  getDiscoveryCacheStore().eraResolver = e;
}
//@ chunk-0qyh5wah.js:5967-6007 placement
function currentEra() {
  return getDiscoveryCacheStore().eraResolver();
}
//@ chunk-0qyh5wah.js:6007-6059 placement
function hasAccountResolver() {
  return getDiscoveryCacheStore().accountResolver !== void 0;
}
//@ chunk-0qyh5wah.js:6059-6177 placement
function isRemoteMcpTransport(e) {
  switch (e.type) {
    case "stdio":
    case void 0:
    case "sdk":
    case "sse-ide":
    case "ws-ide":
      return !1;
    default:
      return !0;
  }
}
//@ chunk-0qyh5wah.js:6177-6215 placement
function R_t(e, r) {
  return !isCurrentIdentityEpoch(r) && isRemoteMcpTransport(e);
}
//@ chunk-0qyh5wah.js:6215-6310 placement
function identityChangedFailure(e, r) {
  return { name: e, type: "failed", config: r, error: gnr, errorCode: "IDENTITY_CHANGED" };
}
//@ chunk-0qyh5wah.js:6310-6359 placement
function hasRemoteMcpServers(e) {
  return e.some((r) => isRemoteMcpTransport(r.config));
}
//@ chunk-0qyh5wah.js:6359-6392 placement
function vt() {
  return getMcpIdentitySnapshot().token;
}

export {
  currentEra,
  vt,
  Ny,
  openDiscoverySeal,
  xe,
  setEraResolver,
  hasAccountResolver,
  setAccountResolver,
  isRemoteMcpTransport,
  R_t,
  identityChangedFailure,
  hasRemoteMcpServers,
  basicAuthValue,
};
