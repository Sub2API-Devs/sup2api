/**
 * utils/claudeInChrome/localPairing/handshake.ts
 *
 * 2.1.316 新增：本地配对握手与加密通道
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p7xf186d.js (41)
 * attribution: placement 41
 */
import { PairingClock, PairingError, malformedError, normalizePairingErrorCode_2 } from "./pairingErrors.js";
import {
  MAX_TAG_FAILURES,
  normalizeApiOrigin,
  generateEcdhKeyPair,
  sha256,
  concatBytesArgs,
  lengthPrefixed,
  PAIRING_PROTOCOL,
  utf8Encode,
  toArrayBuffer,
  isNonNegativeSafeInt,
  u64be,
  utf8Decode,
  bytesToBinaryString,
  base64UrlDecode,
  concatBytes,
  randomBytes,
  constantTimeEqual,
  importEcdhPublicKey,
} from "./encoding.js";
import {
  MAX_TAG_FAILURES_DEFAULT,
  validatePeerClaims,
  parseAssertion,
  canonicalJson,
  verifyPeerAssertion,
  checkAssertionTimes,
  JwksCache,
} from "./jwksAndAssertions.js";
import { withTimeout_2 } from "../../sleep.js";

//@ chunk-p7xf186d.js:15660-15675 placement
/**
 * 配对断言失败后的默认冷却秒数（5）。
 */
var DEFAULT_FAILURE_FLOOR_S = 5;
var LONG_FAILURE_FLOOR_S = 60;
//@ chunk-p7xf186d.js:15675-17989 placement
/**
 * 获取并缓存本地配对断言（含签发中的去重、失败记录、过期时间）。
 */
class PairingAssertionSource {
  opts;
  current;
  minting;
  lastFailure;
  epoch = 0;
  clock;
  timeoutSec;
  urls;
  constructor(e) {
    this.opts = e;
    this.clock = new PairingClock(e);
    this.timeoutSec = e.timeoutSec ?? MAX_TAG_FAILURES;
    this.urls = normalizeApiOrigin(e.apiOrigin, e.allowLoopbackHttp);
  }
  get issuer() {
    return this.urls.issuer;
  }
  serverNow(e) {
    return e.claims.iat + this.clock.since(e.minted);
  }
  async get() {
    let e = this.current;
    if (e && e.claims.exp - MAX_TAG_FAILURES_DEFAULT > this.serverNow(e)) return e;
    let lastFailure = this.lastFailure;
    if (lastFailure && this.clock.since(lastFailure.at) < lastFailure.floor) throw lastFailure.error;
    let n = (this.minting ??= this.mint().finally(() => {
      if (this.minting === n) this.minting = undefined;
    }));
    return n;
  }
  isCurrent(e) {
    return e.epoch === this.epoch;
  }
  clear() {
    this.epoch += 1;
    this.current = undefined;
    this.minting = undefined;
    this.lastFailure = undefined;
  }
  async mint() {
    let epoch = this.epoch;
    try {
      let t = await withTimeout_2(
        this.attest(epoch),
        this.timeoutSec,
        () =>
          new PairingError("attest_failed", "timed out", {
            httpStatus: 0,
          }),
      );
      if (epoch !== this.epoch) throw new PairingError("not_signed_in", "identity changed during attest");
      this.current = t;
      this.lastFailure = undefined;
      return t;
    } catch (error) {
      let n =
        error instanceof PairingError
          ? error
          : new PairingError("attest_failed", "unexpected", {
              cause: error,
            });
      if (epoch === this.epoch && n.code !== "not_signed_in") {
        let r = n.code === "rate_limited" || n.code === "pairing_disabled";
        this.lastFailure = {
          error: n,
          at: this.clock.stamp(),
          floor: r ? LONG_FAILURE_FLOOR_S : DEFAULT_FAILURE_FLOOR_S,
        };
      }
      throw n;
    }
  }
  async attest(epoch) {
    let t;
    try {
      t = await this.opts.getBearer();
    } catch (error) {
      throw new PairingError("not_signed_in", "bearer unavailable", {
        cause: error,
      });
    }
    if (!t) throw new PairingError("not_signed_in");
    let ecdhKeyPair = await generateEcdhKeyPair();
    let minted = this.clock.stamp();
    let i;
    try {
      i = await this.opts.fetchImpl(this.urls.attest, {
        method: "POST",
        headers: {
          authorization: `Bearer ${t}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          public_key: ecdhKeyPair.publicKey,
        }),
      });
    } catch (error) {
      throw new PairingError("attest_failed", "fetch failed", {
        httpStatus: 0,
        cause: error,
      });
    }
    if (i.status === 404)
      throw new PairingError("pairing_disabled", "attest is not enabled", {
        httpStatus: 404,
      });
    if (i.status === 429)
      throw new PairingError("rate_limited", undefined, {
        httpStatus: 429,
      });
    if (i.status !== 200)
      throw new PairingError("attest_failed", `HTTP ${i.status}`, {
        httpStatus: i.status,
      });
    let s;
    try {
      s = JSON.parse(await i.text());
    } catch {
      throw new PairingError("attest_failed", "response is not JSON", {
        httpStatus: 200,
      });
    }
    let assertion = s?.assertion;
    if (typeof assertion !== "string")
      throw new PairingError("attest_failed", "response lacks assertion", {
        httpStatus: 200,
      });
    let c = validatePeerClaims(parseAssertion(assertion).payload);
    if (c.cnf.jkt !== ecdhKeyPair.jkt)
      throw new PairingError("key_binding_mismatch", "server bound a different key");
    return {
      assertion,
      claims: c,
      eph: ecdhKeyPair,
      minted,
      epoch,
    };
  }
}
//@ chunk-p7xf186d.js:17989-18070 placement
/**
 * 计算 hello 阶段（含 offer 与去掉 mac 的 hello）的 MAC。
 */
async function computeHelloMac(offer, hello) {
  let { mac, ...r } = hello;
  return sha256(
    concatBytesArgs(
      lengthPrefixed(PAIRING_PROTOCOL),
      lengthPrefixed(utf8Encode(canonicalJson(offer))),
      lengthPrefixed(utf8Encode(canonicalJson(r))),
    ),
  );
}
//@ chunk-p7xf186d.js:18070-18188 placement
async function deriveEcdhSecret(privateKey, t) {
  return new Uint8Array(
    await globalThis.crypto.subtle.deriveBits(
      {
        name: "ECDH",
        public: t,
      },
      privateKey,
      256,
    ),
  );
}
//@ chunk-p7xf186d.js:18188-18348 placement
async function hkdfDerive_2(e, t, n, r) {
  return new Uint8Array(
    await globalThis.crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: toArrayBuffer(t),
        info: toArrayBuffer(utf8Encode(`${PAIRING_PROTOCOL} ${n}`)),
      },
      e,
      r * 8,
    ),
  );
}
//@ chunk-p7xf186d.js:18348-18635 placement
async function hkdfDerive(ecdhSecret, helloMac) {
  let n = await globalThis.crypto.subtle.importKey("raw", toArrayBuffer(ecdhSecret), "HKDF", false, [
    "deriveBits",
  ]);
  let [r, i, s, o, c] = await Promise.all([
    hkdfDerive_2(n, helloMac, "confirm d", 32),
    hkdfDerive_2(n, helloMac, "confirm e", 32),
    hkdfDerive_2(n, helloMac, "aead d2e", 32),
    hkdfDerive_2(n, helloMac, "aead e2d", 32),
    hkdfDerive_2(n, helloMac, "sid", 16),
  ]);
  return {
    th: helloMac,
    kcD: r,
    kcE: i,
    kD2e: s,
    kE2d: o,
    sid: c,
  };
}
//@ chunk-p7xf186d.js:18635-18831 placement
async function hmacSha256(e, t) {
  let n = await globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(e),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  return new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", n, toArrayBuffer(t)));
}
//@ chunk-p7xf186d.js:18831-18867 placement
/**
 * 用加密密钥计算密钥确认 MAC。
 */
function encryptKeyConfirmMac(e) {
  return hmacSha256(e.kcE, e.th);
}
//@ chunk-p7xf186d.js:18867-18903 placement
/**
 * 用解密密钥计算密钥确认 MAC。
 */
function decryptKeyConfirmMac(e) {
  return hmacSha256(e.kcD, e.th);
}
//@ chunk-p7xf186d.js:18903-18952 placement
/**
 * 计算 pair_done 阶段的 MAC。
 */
function computePairDoneMac(secrets) {
  return hmacSha256(secrets.kcE, concatBytesArgs(secrets.th, utf8Encode("done")));
}
//@ chunk-p7xf186d.js:18952-19183 placement
var SEALED_MESSAGE_TYPES = [
  "execute_tool",
  "tool_response",
  "notification:permission_request",
  "notification:sealed_broadcast",
  "notification:inference_request",
  "notification:inference_response",
];
var CHANNEL_VERSION = 3;
var MAX_SEALED_BYTES = 33554432;
var MAX_CLOCK_SKEW_S = 60;
var SURROGATE_RE = /\p{Surrogate}/u;
var SEALED_MESSAGE_TYPE_SET = new Set(SEALED_MESSAGE_TYPES);
//@ chunk-p7xf186d.js:19183-19236 placement
/**
 * 判断字符串是否为合法的封装帧类型。
 */
function isSealedFrameKind(e) {
  return typeof e === "string" && SEALED_MESSAGE_TYPE_SET.has(e);
}
//@ chunk-p7xf186d.js:19236-19311 placement
/**
 * 判断 toolUseId 合法（未给、或非空且无孤立代理项）。
 */
function isValidToolUseIdOrUndefined(e) {
  return e === undefined || (typeof e === "string" && e !== "" && !SURROGATE_RE.test(e));
}
//@ chunk-p7xf186d.js:19311-19421 placement
function isValidChunkInfo(chunk) {
  if (chunk === undefined) return true;
  let t = chunk;
  return (
    !!t &&
    typeof t === "object" &&
    isNonNegativeSafeInt(t.n) &&
    t.n >= 1 &&
    isNonNegativeSafeInt(t.i) &&
    t.i < t.n
  );
}
//@ chunk-p7xf186d.js:19421-19617 placement
/**
 * 生成配对通道 AES-GCM 参数：IV 为 4 字节 0 + 64 位序号，附加数据依次绑定协议名、双方标识、序号、消息类型、可选会话、时间戳与分片信息。
 */
function aesGcmParams(e, t, n, r, i, s, o) {
  let c = u64be(n);
  return {
    name: "AES-GCM",
    iv: toArrayBuffer(concatBytesArgs(new Uint8Array(4), c)),
    additionalData: toArrayBuffer(
      concatBytesArgs(
        lengthPrefixed(PAIRING_PROTOCOL),
        lengthPrefixed(e),
        lengthPrefixed(t),
        c,
        lengthPrefixed(r),
        lengthPrefixed(i ?? ""),
        u64be(s),
        ...(o ? [lengthPrefixed("chunk"), u64be(o.i), u64be(o.n)] : []),
      ),
    ),
    tagLength: 128,
  };
}
//@ chunk-p7xf186d.js:19617-19708 placement
/**
 * 取安全整数形式的当前时间，失败返回 NaN。
 */
function safeFloorNow(wall) {
  try {
    let floored = Math.floor(wall());
    return isNonNegativeSafeInt(floored) ? floored : Number.NaN;
  } catch {
    return Number.NaN;
  }
}
//@ chunk-p7xf186d.js:19708-19809 placement
async function importAesKey(e, t) {
  return globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(e),
    {
      name: "AES-GCM",
    },
    false,
    [t],
  );
}
//@ chunk-p7xf186d.js:19809-19829 placement
/**
 * 什么都不做的回调（用于清理 promise 队列）。
 */
var noopCallback = () => {
  return;
};
//@ chunk-p7xf186d.js:19829-19925 placement
/**
 * 解析封装消息里的 JSON，失败返回 malformed。
 */
function parseSealedJson(e) {
  try {
    return {
      ok: true,
      inner: JSON.parse(utf8Decode(e)),
    };
  } catch {
    return {
      ok: false,
      reason: "malformed",
    };
  }
}
//@ chunk-p7xf186d.js:19925-23584 placement
/**
 * 配对后的加密通道：派生收发密钥、计数器防重放、标签失败计数，负责加解密消息。
 */
class PairingChannel {
  sid;
  dirOut;
  kOut;
  kIn;
  clock;
  sidB64;
  ctrOut = 0;
  ctrIn = -1;
  tagFailures = 0;
  tornDown = false;
  q = {
    send: Promise.resolve(),
    recv: Promise.resolve(),
  };
  partial;
  stats = {
    gaps: 0,
    replays: 0,
    stale: 0,
    badTags: 0,
  };
  born;
  constructor(e, dirOut, kOut, kIn, i) {
    this.sid = e;
    this.dirOut = dirOut;
    this.kOut = kOut;
    this.kIn = kIn;
    this.clock = i;
    this.sidB64 = bytesToBinaryString(e);
    this.born = i.stamp();
  }
  static async create(e, t, n = {}) {
    let [r, i, dirOut] = e === "desktop" ? [t.kD2e, t.kE2d, "d2e"] : [t.kE2d, t.kD2e, "e2d"];
    return new PairingChannel(
      t.sid,
      dirOut,
      await importAesKey(r, "encrypt"),
      await importAesKey(i, "decrypt"),
      n.clock ?? new PairingClock(),
    );
  }
  ownSeconds() {
    return safeFloorNow(() => this.born.wall + this.clock.since(this.born));
  }
  get dirIn() {
    return this.dirOut === "d2e" ? "e2d" : "d2e";
  }
  get isTornDown() {
    return this.tornDown;
  }
  enqueue(e, t) {
    let n = this.q[e].then(t, t);
    this.q[e] = n.then(noopCallback, noopCallback);
    return n;
  }
  seal(e, t, n) {
    return this.sealFrames(e, t, n, undefined).then(([r]) => {
      if (r === undefined) throw Error("seal: no envelope produced");
      return r;
    });
  }
  sealChunked(e, t, n, r) {
    if (!Number.isSafeInteger(r) || r < 1)
      return Promise.reject(RangeError("sealChunked: maxChunkBytes must be a positive integer"));
    return this.sealFrames(e, t, n, r);
  }
  sealFrames(e, t, n, r) {
    if (this.tornDown) return Promise.reject(Error("sealed channel torn down"));
    if (!isSealedFrameKind(e)) return Promise.reject(TypeError("seal: unknown frame kind"));
    if (!isValidToolUseIdOrUndefined(t))
      return Promise.reject(TypeError("seal: toolUseId must be a non-empty well-formed string"));
    let i;
    try {
      let json = JSON.stringify(n);
      if (typeof json !== "string") throw TypeError("not JSON-serialisable");
      i = utf8Encode(json);
    } catch (error) {
      return Promise.reject(
        TypeError("seal: inner is not JSON-serialisable", {
          cause: error,
        }),
      );
    }
    let s = r !== undefined;
    let o = r ?? i.length;
    let c = Math.ceil(i.length / o);
    let a = safeFloorNow(this.clock.wall);
    if (!isNonNegativeSafeInt(a)) return Promise.reject(Error("seal: clock is not a usable time"));
    let ctrOut = this.ctrOut;
    this.ctrOut = ctrOut + c;
    if (!Number.isSafeInteger(this.ctrOut)) {
      this.tornDown = true;
      return Promise.reject(Error("sealed channel counter exhausted"));
    }
    return this.enqueue("send", async () => {
      let l = [];
      for (let idx = 0; idx < c; idx++) {
        let y = s
          ? {
              i: idx,
              n: c,
            }
          : undefined;
        let uint8Array = new Uint8Array(
          await globalThis.crypto.subtle.encrypt(
            aesGcmParams(this.dirOut, this.sid, ctrOut + idx, e, t, a, y),
            this.kOut,
            toArrayBuffer(i.subarray(idx * o, (idx + 1) * o)),
          ),
        );
        if (this.tornDown) throw Error("sealed channel torn down");
        l.push({
          sid: this.sidB64,
          ctr: ctrOut + idx,
          t: a,
          ct: bytesToBinaryString(uint8Array),
          ...(y && {
            chunk: y,
          }),
        });
      }
      return l;
    });
  }
  open(e, t, n) {
    return this.enqueue("recv", () => this.openNow(e, t, n));
  }
  async openNow(e, t, n) {
    if (this.tornDown)
      return {
        ok: false,
        reason: "torn_down",
      };
    let r = n;
    if (
      !r ||
      typeof r !== "object" ||
      typeof r.sid !== "string" ||
      typeof r.ct !== "string" ||
      !isNonNegativeSafeInt(r.t) ||
      !isSealedFrameKind(e) ||
      !isValidToolUseIdOrUndefined(t) ||
      !isValidChunkInfo(r.chunk)
    )
      return {
        ok: false,
        reason: "malformed",
      };
    let { t: i, chunk } = r;
    if (r.sid !== this.sidB64)
      return {
        ok: false,
        reason: "foreign_sid",
      };
    let ctr = r.ctr;
    if (!isNonNegativeSafeInt(ctr))
      return {
        ok: false,
        reason: "malformed",
      };
    if (ctr <= this.ctrIn) {
      this.stats.replays += 1;
      return {
        ok: false,
        reason: "replay",
      };
    }
    if (!(Math.abs(this.ownSeconds() - i) <= MAX_CLOCK_SKEW_S)) {
      this.stats.stale += 1;
      return {
        ok: false,
        reason: "stale",
      };
    }
    let a;
    try {
      a = base64UrlDecode(r.ct);
    } catch {
      return {
        ok: false,
        reason: "malformed",
      };
    }
    if (a.length < 16)
      return {
        ok: false,
        reason: "malformed",
      };
    let u;
    try {
      u = await globalThis.crypto.subtle.decrypt(
        aesGcmParams(this.dirIn, this.sid, ctr, e, t, i, chunk),
        this.kIn,
        toArrayBuffer(a),
      );
    } catch {
      this.stats.badTags += 1;
      if (++this.tagFailures >= CHANNEL_VERSION) this.tearDown();
      return {
        ok: false,
        reason: "bad_tag",
      };
    }
    if (this.tornDown)
      return {
        ok: false,
        reason: "torn_down",
      };
    if (ctr > this.ctrIn + 1) this.stats.gaps += ctr - this.ctrIn - 1;
    this.ctrIn = ctr;
    let uint8Array = new Uint8Array(u);
    if (!chunk) {
      this.partial = undefined;
      return parseSealedJson(uint8Array);
    }
    return this.reassemble(ctr, chunk, uint8Array);
  }
  reassemble(e, t, n) {
    let partial = this.partial;
    this.partial = undefined;
    if (t.i === 0)
      partial = {
        firstCtr: e,
        n: t.n,
        parts: [],
        bytes: 0,
      };
    else if (!partial || e !== partial.firstCtr + partial.parts.length)
      return {
        ok: false,
        reason: "bad_chunk",
      };
    if (partial.bytes + n.length > MAX_SEALED_BYTES)
      return {
        ok: false,
        reason: "bad_chunk",
      };
    partial.parts.push(n);
    partial.bytes += n.length;
    if (partial.parts.length < partial.n) {
      this.partial = partial;
      return {
        ok: false,
        reason: "partial",
      };
    }
    return parseSealedJson(concatBytes(partial.parts));
  }
  tearDown() {
    this.tornDown = true;
    this.partial = undefined;
  }
}
//@ chunk-p7xf186d.js:23584-23649 placement
/**
 * 配对协议版本号（1）。
 */
var PAIRING_PROTOCOL_VERSION = 1;
var PAIRING_STEP_TIMEOUT_S = 30;
var ROLE_FIELD_NAMES = {
  offer: "instance_hint",
  accept: "instance",
};
var NONCE_BYTES = 32;
//@ chunk-p7xf186d.js:23649-23706 placement
/**
 * 比较两个组织名（忽略大小写）。
 */
function sameOrgCaseInsensitive(e, t) {
  return e.toLowerCase() === t.toLowerCase();
}
//@ chunk-p7xf186d.js:23706-24222 placement
function verifyPeerAccount(claims, claims_2, policy) {
  if (claims_2.sub !== claims.sub) throw new PairingError("account_mismatch");
  if (policy.requiredOrg !== undefined) {
    if (!sameOrgCaseInsensitive(claims.org, policy.requiredOrg))
      throw new PairingError("org_not_permitted", "own sign-in is not in the configured org");
  }
  let r = claims_2.hybrid && claims_2.client_kind === "desktop";
  let i =
    !policy.allowedOrgs ||
    policy.allowedOrgs.some((allowedOrg) => sameOrgCaseInsensitive(allowedOrg, claims_2.org));
  if (r && !i)
    throw new PairingError("org_not_permitted", "the managing Desktop's org is outside the configured list");
  if (
    (policy.requiredOrg !== undefined || r || policy.hybridSignIn) &&
    !sameOrgCaseInsensitive(claims_2.org, claims.org)
  )
    throw new PairingError(
      "org_mismatch",
      undefined,
      i
        ? {
            peerOrg: claims_2.org,
          }
        : {},
    );
}
//@ chunk-p7xf186d.js:24222-24412 placement
function decodeB64Field(e, t, n) {
  if (typeof e !== "string") throw malformedError(`${t} missing`);
  let r;
  try {
    r = base64UrlDecode(e);
  } catch {
    throw malformedError(`${t} not base64url`);
  }
  if (n !== undefined && r.length !== n) throw malformedError(`${t} must be ${n} bytes`);
  return r;
}
//@ chunk-p7xf186d.js:24412-24608 placement
function checkPairMessage(e, t) {
  let n = e;
  if (!n || typeof n !== "object" || n.msg !== t) throw malformedError(`pair_${t} malformed`);
  if (n.v !== PAIRING_PROTOCOL_VERSION) {
    let r = typeof n.v === "number" ? String(n.v) : typeof n.v;
    throw malformedError(`unsupported v ${r}`);
  }
  return n;
}
//@ chunk-p7xf186d.js:24608-24757 placement
function smallObjectField(e, t) {
  if (e === undefined) return;
  if (!e || typeof e !== "object" || Array.isArray(e) || canonicalJson(e).length > 1024)
    throw malformedError(`${t} must be a small object`);
  return e;
}
//@ chunk-p7xf186d.js:24757-24920 placement
function parsePairHello(e, t) {
  let n = ROLE_FIELD_NAMES[t];
  let r = checkPairMessage(e, t);
  try {
    canonicalJson(r);
  } catch {
    throw malformedError(`pair_${t} is not canonical JSON`);
  }
  decodeB64Field(r.nonce, "nonce", NONCE_BYTES);
  let instance = smallObjectField(r[n], n);
  return {
    hello: r,
    instance,
  };
}
//@ chunk-p7xf186d.js:24920-25047 placement
function buildPairHello(e, t, instanceHint) {
  let r = {
    msg: e,
    v: PAIRING_PROTOCOL_VERSION,
    assertion: t.assertion,
    public_key: t.eph.publicKey,
    nonce: bytesToBinaryString(randomBytes(NONCE_BYTES)),
  };
  if (instanceHint) r[ROLE_FIELD_NAMES[e]] = instanceHint;
  return r;
}
//@ chunk-p7xf186d.js:25047-25185 placement
function parsePairMac(e, t) {
  let n = checkPairMessage(e, t);
  if (typeof n.sid !== "string") throw malformedError(`pair_${t} sid missing`);
  return {
    sid: n.sid,
    mac: decodeB64Field(n.mac, `pair_${t} mac`),
  };
}
//@ chunk-p7xf186d.js:25185-25342 placement
function cloneSmallObject(instanceHint, t) {
  if (instanceHint === undefined) return;
  try {
    return smallObjectField(JSON.parse(JSON.stringify(instanceHint)), t);
  } catch (error) {
    throw TypeError(`${t} must be a small JSON object`, {
      cause: error,
    });
  }
}
//@ chunk-p7xf186d.js:25342-25447 placement
function assertIdentityUnchanged(e, t) {
  if (!e.isCurrent(t)) throw new PairingError("not_signed_in", "identity changed during the handshake");
}
//@ chunk-p7xf186d.js:25447-25516 placement
/**
 * 用常数时间比较 MAC，不符时抛 bad_key_confirmation。
 */
function assertMacEqual(e, t, n) {
  if (!constantTimeEqual(e, t)) throw new PairingError("bad_key_confirmation", n);
}
//@ chunk-p7xf186d.js:25516-25596 placement
/**
 * 超过步骤超时则抛出配对过期错误。
 */
function assertNotExpired(clock, t, n) {
  if (clock.since(t) > PAIRING_STEP_TIMEOUT_S) throw new PairingError("expired", `${n} took too long`);
}
//@ chunk-p7xf186d.js:25596-25794 placement
async function establishPairingChannel(e, source, clock, r) {
  let i = await PairingChannel.create(e, r.secrets, {
    clock,
  });
  assertIdentityUnchanged(source, r.own);
  return {
    sidB64: i.sidB64,
    channel: i,
    own: r.own.claims,
    peer: r.peer,
    peerInstance: r.peerInstance,
    establishedAt: clock.wall(),
  };
}
//@ chunk-p7xf186d.js:25794-27468 placement
/**
 * 本地配对握手状态机：交换 ECDH 公钥与断言、校验对端，建立加密通道。
 */
class LocalPairingHandshake {
  opts;
  phase = {
    is: "fresh",
  };
  clock;
  instanceHint;
  constructor(e) {
    this.opts = e;
    this.clock = new PairingClock(e);
    this.instanceHint = cloneSmallObject(e.instanceHint, "instanceHint");
  }
  enter(e, t) {
    let phase = this.phase;
    if (phase.is !== e) throw malformedError(t);
    this.phase = {
      is: "busy",
    };
    return phase;
  }
  async step(e) {
    try {
      let { next: t, out } = await e();
      this.phase = t;
      return out;
    } catch (error) {
      this.phase = {
        is: "spent",
      };
      throw error;
    }
  }
  async createOffer() {
    this.enter("fresh", "createOffer already called; use a new Initiator");
    return this.step(async () => {
      let e = await this.opts.source.get();
      let pairHello = buildPairHello("offer", e, this.instanceHint);
      return {
        next: {
          is: "offered",
          offer: pairHello,
          own: e,
          at: this.clock.stamp(),
        },
        out: pairHello,
      };
    });
  }
  async onAccept(e) {
    let t = this.enter("offered", "no offer outstanding");
    return this.step(async () => {
      assertNotExpired(this.clock, t.at, "pair_accept");
      let { hello, instance } = parsePairHello(e, "accept");
      let i = decodeB64Field(hello.mac, "pair_accept mac");
      let { source, jwks, policy } = this.opts;
      let { claims, peerRaw } = await verifyPeerAssertion(hello.assertion, hello.public_key, {
        jwks,
        expectedIssuer: source.issuer,
        expectedKind: "chrome_extension",
      });
      checkAssertionTimes(claims, source.serverNow(t.own));
      verifyPeerAccount(t.own.claims, claims, policy);
      let l = await importEcdhPublicKey(peerRaw);
      let ecdhSecret = await deriveEcdhSecret(t.own.eph.keyPair.privateKey, l);
      let helloMac = await computeHelloMac(t.offer, hello);
      let g = await hkdfDerive(ecdhSecret, helloMac);
      assertMacEqual(i, await encryptKeyConfirmMac(g));
      let h = await decryptKeyConfirmMac(g);
      assertIdentityUnchanged(source, t.own);
      let U = bytesToBinaryString(g.sid);
      return {
        next: {
          is: "finishing",
          own: t.own,
          secrets: g,
          sidB64: U,
          peer: claims,
          peerInstance: instance,
          at: this.clock.stamp(),
        },
        out: {
          msg: "finish",
          v: PAIRING_PROTOCOL_VERSION,
          sid: U,
          mac: bytesToBinaryString(h),
        },
      };
    });
  }
  async onDone(e) {
    let t = this.enter("finishing", "no finish outstanding");
    return this.step(async () => {
      assertNotExpired(this.clock, t.at, "pair_done");
      let pairMac = parsePairMac(e, "done");
      if (pairMac.sid !== t.sidB64) throw new PairingError("bad_key_confirmation", "pair_done sid differs");
      assertMacEqual(pairMac.mac, await computePairDoneMac(t.secrets), "pair_done mac");
      let out = await establishPairingChannel("desktop", this.opts.source, this.clock, t);
      return {
        next: {
          is: "spent",
        },
        out,
      };
    });
  }
}
//@ chunk-p7xf186d.js:27468-27561 placement
function parseRefusal(localPairing) {
  let t = localPairing;
  if (!t || typeof t !== "object" || t.msg !== "refuse") return;
  return normalizePairingErrorCode_2(t.code);
}
//@ chunk-p7xf186d.js:27561-27580 placement
var weakMap = new WeakMap();
//@ chunk-p7xf186d.js:27580-27612 placement
function getPairingContext(e) {
  return weakMap.get(e);
}
//@ chunk-p7xf186d.js:27612-27704 placement
function ensurePairingContext(e) {
  let t = weakMap.get(e);
  if (!t) {
    t = {
      source: new PairingAssertionSource(e),
      jwks: new JwksCache(e),
    };
    weakMap.set(e, t);
  }
  return t;
}
//@ chunk-p7xf186d.js:27704-27792 placement
function normalizeCategory(category) {
  return typeof category === "string" && /^category[0-9a-z_]{1,32}$/.test(category) ? category : undefined;
}
//@ chunk-p7xf186d.js:27792-27900 placement
function stripPrivateOptions(actionData) {
  let { _perActionOnly, _privateHostReadAlwaysOffer, _privateHostReadAlways, ...i } = actionData;
  return i;
}
export {
  stripPrivateOptions,
  normalizeCategory,
  parseRefusal,
  ensurePairingContext,
  LocalPairingHandshake,
  getPairingContext,
};
