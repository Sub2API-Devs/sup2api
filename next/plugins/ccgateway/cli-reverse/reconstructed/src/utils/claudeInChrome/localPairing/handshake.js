/**
 * utils/claudeInChrome/localPairing/handshake.ts
 *
 * 2.1.316 新增：本地配对握手与加密通道
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-290tacpj.js (41)
 * attribution: placement 41
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { PairingClock, PairingError, malformedError, normalizePairingErrorCode } from "./pairingErrors.js";
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

//@ chunk-290tacpj.js:15660-15675 placement
/**
 * 配对断言失败后的默认冷却秒数（5）。
 */
var DEFAULT_FAILURE_FLOOR_S = 5;
var LONG_FAILURE_FLOOR_S = 60;
//@ chunk-290tacpj.js:15675-17989 placement
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
  constructor(options) {
    this.opts = options;
    this.clock = new PairingClock(options);
    this.timeoutSec = options.timeoutSec ?? MAX_TAG_FAILURES;
    this.urls = normalizeApiOrigin(options.apiOrigin, options.allowLoopbackHttp);
  }
  get issuer() {
    return this.urls.issuer;
  }
  serverNow(serverTime) {
    return serverTime.claims.iat + this.clock.since(serverTime.minted);
  }
  async get() {
    let current = this.current;
    if (current && current.claims.exp - MAX_TAG_FAILURES_DEFAULT > this.serverNow(current)) return current;
    let lastFailure = this.lastFailure;
    if (lastFailure && this.clock.since(lastFailure.at) < lastFailure.floor) throw lastFailure.error;
    let minting = (this.minting ??= this.mint().finally(() => {
      if (this.minting === minting) this.minting = undefined;
    }));
    return minting;
  }
  isCurrent(token) {
    return token.epoch === this.epoch;
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
      let response = await withTimeout_2(
        this.attest(epoch),
        this.timeoutSec,
        () =>
          new PairingError("attest_failed", "timed out", {
            httpStatus: 0,
          }),
      );
      if (epoch !== this.epoch) throw new PairingError("not_signed_in", "identity changed during attest");
      this.current = response;
      this.lastFailure = undefined;
      return response;
    } catch (error) {
      let errorBody =
        error instanceof PairingError
          ? error
          : new PairingError("attest_failed", "unexpected", {
              cause: error,
            });
      if (epoch === this.epoch && errorBody.code !== "not_signed_in") {
        let isFatal = errorBody.code === "rate_limited" || errorBody.code === "pairing_disabled";
        this.lastFailure = {
          error: errorBody,
          at: this.clock.stamp(),
          floor: isFatal ? LONG_FAILURE_FLOOR_S : DEFAULT_FAILURE_FLOOR_S,
        };
      }
      throw errorBody;
    }
  }
  async attest(epoch) {
    let verified;
    try {
      verified = await this.opts.getBearer();
    } catch (error) {
      throw new PairingError("not_signed_in", "bearer unavailable", {
        cause: error,
      });
    }
    if (!verified) throw new PairingError("not_signed_in");
    let ecdhKeyPair = await generateEcdhKeyPair();
    let minted = this.clock.stamp();
    let payload;
    try {
      payload = await this.opts.fetchImpl(this.urls.attest, {
        method: "POST",
        headers: {
          authorization: `Bearer ${verified}`,
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
    if (payload.status === 404)
      throw new PairingError("pairing_disabled", "attest is not enabled", {
        httpStatus: 404,
      });
    if (payload.status === 429)
      throw new PairingError("rate_limited", undefined, {
        httpStatus: 429,
      });
    if (payload.status !== 200)
      throw new PairingError("attest_failed", `HTTP ${payload.status}`, {
        httpStatus: payload.status,
      });
    let claims;
    try {
      claims = JSON.parse(await payload.text());
    } catch {
      throw new PairingError("attest_failed", "response is not JSON", {
        httpStatus: 200,
      });
    }
    let assertion = claims?.assertion;
    if (typeof assertion !== "string")
      throw new PairingError("attest_failed", "response lacks assertion", {
        httpStatus: 200,
      });
    let peerClaims = validatePeerClaims(parseAssertion(assertion).payload);
    if (peerClaims.cnf.jkt !== ecdhKeyPair.jkt)
      throw new PairingError("key_binding_mismatch", "server bound a different key");
    return {
      assertion,
      claims: peerClaims,
      eph: ecdhKeyPair,
      minted,
      epoch,
    };
  }
}
//@ chunk-290tacpj.js:17989-18070 placement
/**
 * 计算 hello 阶段（含 offer 与去掉 mac 的 hello）的 MAC。
 */
async function computeHelloMac(offer, hello) {
  let { mac, ...rest } = hello;
  return sha256(
    concatBytesArgs(
      lengthPrefixed(PAIRING_PROTOCOL),
      lengthPrefixed(utf8Encode(canonicalJson(offer))),
      lengthPrefixed(utf8Encode(canonicalJson(rest))),
    ),
  );
}
//@ chunk-290tacpj.js:18070-18188 placement
async function deriveEcdhSecret(privateKey, peerPublicKey) {
  return new Uint8Array(
    await globalThis.crypto.subtle.deriveBits(
      {
        name: "ECDH",
        public: peerPublicKey,
      },
      privateKey,
      256,
    ),
  );
}
//@ chunk-290tacpj.js:18188-18348 placement
async function hkdfDerive_2(secret, salt, info, length) {
  return new Uint8Array(
    await globalThis.crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: toArrayBuffer(salt),
        info: toArrayBuffer(utf8Encode(`${PAIRING_PROTOCOL} ${info}`)),
      },
      secret,
      length * 8,
    ),
  );
}
//@ chunk-290tacpj.js:18348-18635 placement
async function hkdfDerive(ecdhSecret, helloMac) {
  let baseKey = await globalThis.crypto.subtle.importKey("raw", toArrayBuffer(ecdhSecret), "HKDF", false, [
    "deriveBits",
  ]);
  let [clientToServerKey, serverToClientKey, clientKeyConfirm, serverKeyConfirm, keyIds] = await Promise.all([
    hkdfDerive_2(baseKey, helloMac, "confirm d", 32),
    hkdfDerive_2(baseKey, helloMac, "confirm e", 32),
    hkdfDerive_2(baseKey, helloMac, "aead d2e", 32),
    hkdfDerive_2(baseKey, helloMac, "aead e2d", 32),
    hkdfDerive_2(baseKey, helloMac, "sid", 16),
  ]);
  return {
    th: helloMac,
    kcD: clientToServerKey,
    kcE: serverToClientKey,
    kD2e: clientKeyConfirm,
    kE2d: serverKeyConfirm,
    sid: keyIds,
  };
}
//@ chunk-290tacpj.js:18635-18831 placement
async function hmacSha256(key, data) {
  let cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(key),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  return new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", cryptoKey, toArrayBuffer(data)));
}
//@ chunk-290tacpj.js:18831-18867 placement
/**
 * 用加密密钥计算密钥确认 MAC。
 */
function encryptKeyConfirmMac(mac) {
  return hmacSha256(mac.kcE, mac.th);
}
//@ chunk-290tacpj.js:18867-18903 placement
/**
 * 用解密密钥计算密钥确认 MAC。
 */
function decryptKeyConfirmMac(mac) {
  return hmacSha256(mac.kcD, mac.th);
}
//@ chunk-290tacpj.js:18903-18952 placement
/**
 * 计算 pair_done 阶段的 MAC。
 */
function computePairDoneMac(secrets) {
  return hmacSha256(secrets.kcE, concatBytesArgs(secrets.th, utf8Encode("done")));
}
//@ chunk-290tacpj.js:18952-19183 placement
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
//@ chunk-290tacpj.js:19183-19236 placement
/**
 * 判断字符串是否为合法的封装帧类型。
 */
function isSealedFrameKind(kind) {
  return typeof kind === "string" && SEALED_MESSAGE_TYPE_SET.has(kind);
}
//@ chunk-290tacpj.js:19236-19311 placement
/**
 * 判断 toolUseId 合法（未给、或非空且无孤立代理项）。
 */
function isValidToolUseIdOrUndefined(value) {
  return value === undefined || (typeof value === "string" && value !== "" && !SURROGATE_RE.test(value));
}
//@ chunk-290tacpj.js:19311-19421 placement
function isValidChunkInfo(chunk) {
  if (chunk === undefined) return true;
  let frame = chunk;
  return (
    !!frame &&
    typeof frame === "object" &&
    isNonNegativeSafeInt(frame.n) &&
    frame.n >= 1 &&
    isNonNegativeSafeInt(frame.i) &&
    frame.i < frame.n
  );
}
//@ chunk-290tacpj.js:19421-19617 placement
/**
 * 生成配对通道 AES-GCM 参数：IV 为 4 字节 0 + 64 位序号，附加数据依次绑定协议名、双方标识、序号、消息类型、可选会话、时间戳与分片信息。
 */
function aesGcmParams(key, iv, counter, keyId, direction, frameKind, aad) {
  let counterBytes = u64be(counter);
  return {
    name: "AES-GCM",
    iv: toArrayBuffer(concatBytesArgs(new Uint8Array(4), counterBytes)),
    additionalData: toArrayBuffer(
      concatBytesArgs(
        lengthPrefixed(PAIRING_PROTOCOL),
        lengthPrefixed(key),
        lengthPrefixed(iv),
        counterBytes,
        lengthPrefixed(keyId),
        lengthPrefixed(direction ?? ""),
        u64be(frameKind),
        ...(aad ? [lengthPrefixed("chunk"), u64be(aad.i), u64be(aad.n)] : []),
      ),
    ),
    tagLength: 128,
  };
}
//@ chunk-290tacpj.js:19617-19708 placement
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
//@ chunk-290tacpj.js:19708-19809 placement
async function importAesKey(rawKey, usage) {
  return globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(rawKey),
    {
      name: "AES-GCM",
    },
    false,
    [usage],
  );
}
//@ chunk-290tacpj.js:19809-19829 placement
/**
 * 什么都不做的回调（用于清理 promise 队列）。
 */
var noopCallback = () => {
  return;
};
//@ chunk-290tacpj.js:19829-19925 placement
/**
 * 解析封装消息里的 JSON，失败返回 malformed。
 */
function parseSealedJson(text) {
  try {
    return {
      ok: true,
      inner: JSON.parse(utf8Decode(text)),
    };
  } catch {
    return {
      ok: false,
      reason: "malformed",
    };
  }
}
//@ chunk-290tacpj.js:19925-23584 placement
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
  constructor(sid, dirOut, kOut, kIn, clock) {
    this.sid = sid;
    this.dirOut = dirOut;
    this.kOut = kOut;
    this.kIn = kIn;
    this.clock = clock;
    this.sidB64 = bytesToBinaryString(sid);
    this.born = clock.stamp();
  }
  static async create(role, secrets, options = {}) {
    let [keyOut, keyIn, dirOut] =
      role === "desktop" ? [secrets.kD2e, secrets.kE2d, "d2e"] : [secrets.kE2d, secrets.kD2e, "e2d"];
    return new PairingChannel(
      secrets.sid,
      dirOut,
      await importAesKey(keyOut, "encrypt"),
      await importAesKey(keyIn, "decrypt"),
      options.clock ?? new PairingClock(),
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
  enqueue(queue, task) {
    let result = this.q[queue].then(task, task);
    this.q[queue] = result.then(noopCallback, noopCallback);
    return result;
  }
  seal(kind, toolUseId, payload) {
    return this.sealFrames(kind, toolUseId, payload, undefined).then(([envelope]) => {
      if (envelope === undefined) throw Error("seal: no envelope produced");
      return envelope;
    });
  }
  sealChunked(kind, toolUseId, payload, chunkSize) {
    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1)
      return Promise.reject(RangeError("sealChunked: maxChunkBytes must be a positive integer"));
    return this.sealFrames(kind, toolUseId, payload, chunkSize);
  }
  sealFrames(kind, toolUseId, payload, chunkSize) {
    if (this.tornDown) return Promise.reject(Error("sealed channel torn down"));
    if (!isSealedFrameKind(kind)) return Promise.reject(TypeError("seal: unknown frame kind"));
    if (!isValidToolUseIdOrUndefined(toolUseId))
      return Promise.reject(TypeError("seal: toolUseId must be a non-empty well-formed string"));
    let plaintext;
    try {
      let json = JSON.stringify(payload);
      if (typeof json !== "string") throw TypeError("not JSON-serialisable");
      plaintext = utf8Encode(json);
    } catch (error) {
      return Promise.reject(
        TypeError("seal: inner is not JSON-serialisable", {
          cause: error,
        }),
      );
    }
    let isChunked = chunkSize !== undefined;
    let chunkLength = chunkSize ?? plaintext.length;
    let chunkCount = Math.ceil(plaintext.length / chunkLength);
    let sentAt = safeFloorNow(this.clock.wall);
    if (!isNonNegativeSafeInt(sentAt)) return Promise.reject(Error("seal: clock is not a usable time"));
    let ctrOut = this.ctrOut;
    this.ctrOut = ctrOut + chunkCount;
    if (!Number.isSafeInteger(this.ctrOut)) {
      this.tornDown = true;
      return Promise.reject(Error("sealed channel counter exhausted"));
    }
    return this.enqueue("send", async () => {
      let frames = [];
      for (let idx = 0; idx < chunkCount; idx++) {
        let chunkInfo = isChunked
          ? {
              i: idx,
              n: chunkCount,
            }
          : undefined;
        let uint8Array = new Uint8Array(
          await globalThis.crypto.subtle.encrypt(
            aesGcmParams(this.dirOut, this.sid, ctrOut + idx, kind, toolUseId, sentAt, chunkInfo),
            this.kOut,
            toArrayBuffer(plaintext.subarray(idx * chunkLength, (idx + 1) * chunkLength)),
          ),
        );
        if (this.tornDown) throw Error("sealed channel torn down");
        frames.push({
          sid: this.sidB64,
          ctr: ctrOut + idx,
          t: sentAt,
          ct: bytesToBinaryString(uint8Array),
          ...(chunkInfo && {
            chunk: chunkInfo,
          }),
        });
      }
      return frames;
    });
  }
  open(kind, toolUseId, envelope) {
    return this.enqueue("recv", () => this.openNow(kind, toolUseId, envelope));
  }
  async openNow(kind, toolUseId, envelope) {
    if (this.tornDown)
      return {
        ok: false,
        reason: "torn_down",
      };
    let message = envelope;
    if (
      !message ||
      typeof message !== "object" ||
      typeof message.sid !== "string" ||
      typeof message.ct !== "string" ||
      !isNonNegativeSafeInt(message.t) ||
      !isSealedFrameKind(kind) ||
      !isValidToolUseIdOrUndefined(toolUseId) ||
      !isValidChunkInfo(message.chunk)
    )
      return {
        ok: false,
        reason: "malformed",
      };
    let { t: sentAt, chunk } = message;
    if (message.sid !== this.sidB64)
      return {
        ok: false,
        reason: "foreign_sid",
      };
    let ctr = message.ctr;
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
    if (!(Math.abs(this.ownSeconds() - sentAt) <= MAX_CLOCK_SKEW_S)) {
      this.stats.stale += 1;
      return {
        ok: false,
        reason: "stale",
      };
    }
    let cipherBytes;
    try {
      cipherBytes = base64UrlDecode(message.ct);
    } catch {
      return {
        ok: false,
        reason: "malformed",
      };
    }
    if (cipherBytes.length < 16)
      return {
        ok: false,
        reason: "malformed",
      };
    let plaintext;
    try {
      plaintext = await globalThis.crypto.subtle.decrypt(
        aesGcmParams(this.dirIn, this.sid, ctr, kind, toolUseId, sentAt, chunk),
        this.kIn,
        toArrayBuffer(cipherBytes),
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
    let uint8Array = new Uint8Array(plaintext);
    if (!chunk) {
      this.partial = undefined;
      return parseSealedJson(uint8Array);
    }
    return this.reassemble(ctr, chunk, uint8Array);
  }
  reassemble(counter, chunkInfo, bytes) {
    let partial = this.partial;
    this.partial = undefined;
    if (chunkInfo.i === 0)
      partial = {
        firstCtr: counter,
        n: chunkInfo.n,
        parts: [],
        bytes: 0,
      };
    else if (!partial || counter !== partial.firstCtr + partial.parts.length)
      return {
        ok: false,
        reason: "bad_chunk",
      };
    if (partial.bytes + bytes.length > MAX_SEALED_BYTES)
      return {
        ok: false,
        reason: "bad_chunk",
      };
    partial.parts.push(bytes);
    partial.bytes += bytes.length;
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
//@ chunk-290tacpj.js:23584-23649 placement
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
//@ chunk-290tacpj.js:23649-23706 placement
/**
 * 比较两个组织名（忽略大小写）。
 */
function sameOrgCaseInsensitive(left, right) {
  return left.toLowerCase() === right.toLowerCase();
}
//@ chunk-290tacpj.js:23706-24222 placement
function verifyPeerAccount(claims, claims_2, policy) {
  if (claims_2.sub !== claims.sub) throw new PairingError("account_mismatch");
  if (policy.requiredOrg !== undefined) {
    if (!sameOrgCaseInsensitive(claims.org, policy.requiredOrg))
      throw new PairingError("org_not_permitted", "own sign-in is not in the configured org");
  }
  let desktopHybrid = claims_2.hybrid && claims_2.client_kind === "desktop";
  let orgMatches =
    !policy.allowedOrgs ||
    policy.allowedOrgs.some((allowedOrg) => sameOrgCaseInsensitive(allowedOrg, claims_2.org));
  if (desktopHybrid && !orgMatches)
    throw new PairingError("org_not_permitted", "the managing Desktop's org is outside the configured list");
  if (
    (policy.requiredOrg !== undefined || desktopHybrid || policy.hybridSignIn) &&
    !sameOrgCaseInsensitive(claims_2.org, claims.org)
  )
    throw new PairingError(
      "org_mismatch",
      undefined,
      orgMatches
        ? {
            peerOrg: claims_2.org,
          }
        : {},
    );
}
//@ chunk-290tacpj.js:24222-24412 placement
function decodeB64Field(value, fieldName, expectedLength) {
  if (typeof value !== "string") throw malformedError(`${fieldName} missing`);
  let bytes;
  try {
    bytes = base64UrlDecode(value);
  } catch {
    throw malformedError(`${fieldName} not base64url`);
  }
  if (expectedLength !== undefined && bytes.length !== expectedLength)
    throw malformedError(`${fieldName} must be ${expectedLength} bytes`);
  return bytes;
}
//@ chunk-290tacpj.js:24412-24608 placement
function checkPairMessage(message, role) {
  let body = message;
  if (!body || typeof body !== "object" || body.msg !== role) throw malformedError(`pair_${role} malformed`);
  if (body.v !== PAIRING_PROTOCOL_VERSION) {
    let versionType = typeof body.v === "number" ? String(body.v) : typeof body.v;
    throw malformedError(`unsupported v ${versionType}`);
  }
  return body;
}
//@ chunk-290tacpj.js:24608-24757 placement
function smallObjectField(value, fieldName) {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value) || canonicalJson(value).length > 1024)
    throw malformedError(`${fieldName} must be a small object`);
  return value;
}
//@ chunk-290tacpj.js:24757-24920 placement
function parsePairHello(message, role) {
  let instanceField = ROLE_FIELD_NAMES[role];
  let body = checkPairMessage(message, role);
  try {
    canonicalJson(body);
  } catch {
    throw malformedError(`pair_${role} is not canonical JSON`);
  }
  decodeB64Field(body.nonce, "nonce", NONCE_BYTES);
  let instance = smallObjectField(body[instanceField], instanceField);
  return {
    hello: body,
    instance,
  };
}
//@ chunk-290tacpj.js:24920-25047 placement
function buildPairHello(message, offer, instanceHint) {
  let hello = {
    msg: message,
    v: PAIRING_PROTOCOL_VERSION,
    assertion: offer.assertion,
    public_key: offer.eph.publicKey,
    nonce: bytesToBinaryString(randomBytes(NONCE_BYTES)),
  };
  if (instanceHint) hello[ROLE_FIELD_NAMES[message]] = instanceHint;
  return hello;
}
//@ chunk-290tacpj.js:25047-25185 placement
function parsePairMac(message, role) {
  let body = checkPairMessage(message, role);
  if (typeof body.sid !== "string") throw malformedError(`pair_${role} sid missing`);
  return {
    sid: body.sid,
    mac: decodeB64Field(body.mac, `pair_${role} mac`),
  };
}
//@ chunk-290tacpj.js:25185-25342 placement
function cloneSmallObject(instanceHint, fieldName) {
  if (instanceHint === undefined) return;
  try {
    return smallObjectField(JSON.parse(JSON.stringify(instanceHint)), fieldName);
  } catch (error) {
    throw TypeError(`${fieldName} must be a small JSON object`, {
      cause: error,
    });
  }
}
//@ chunk-290tacpj.js:25342-25447 placement
function assertIdentityUnchanged(source, ownIdentity) {
  if (!source.isCurrent(ownIdentity))
    throw new PairingError("not_signed_in", "identity changed during the handshake");
}
//@ chunk-290tacpj.js:25447-25516 placement
/**
 * 用常数时间比较 MAC，不符时抛 bad_key_confirmation。
 */
function assertMacEqual(actual, expected, label) {
  if (!constantTimeEqual(actual, expected)) throw new PairingError("bad_key_confirmation", label);
}
//@ chunk-290tacpj.js:25516-25596 placement
/**
 * 超过步骤超时则抛出配对过期错误。
 */
function assertNotExpired(clock, startedAt, label) {
  if (clock.since(startedAt) > PAIRING_STEP_TIMEOUT_S)
    throw new PairingError("expired", `${label} took too long`);
}
//@ chunk-290tacpj.js:25596-25794 placement
async function establishPairingChannel(role, source, clock, state) {
  let channel = await PairingChannel.create(role, state.secrets, {
    clock,
  });
  assertIdentityUnchanged(source, state.own);
  return {
    sidB64: channel.sidB64,
    channel,
    own: state.own.claims,
    peer: state.peer,
    peerInstance: state.peerInstance,
    establishedAt: clock.wall(),
  };
}
//@ chunk-290tacpj.js:25794-27468 placement
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
  constructor(options) {
    this.opts = options;
    this.clock = new PairingClock(options);
    this.instanceHint = cloneSmallObject(options.instanceHint, "instanceHint");
  }
  enter(expectedPhase, message) {
    let phase = this.phase;
    if (phase.is !== expectedPhase) throw malformedError(message);
    this.phase = {
      is: "busy",
    };
    return phase;
  }
  async step(fn) {
    try {
      let { next: nextPhase, out } = await fn();
      this.phase = nextPhase;
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
      let own = await this.opts.source.get();
      let pairHello = buildPairHello("offer", own, this.instanceHint);
      return {
        next: {
          is: "offered",
          offer: pairHello,
          own,
          at: this.clock.stamp(),
        },
        out: pairHello,
      };
    });
  }
  async onAccept(message) {
    let offered = this.enter("offered", "no offer outstanding");
    return this.step(async () => {
      assertNotExpired(this.clock, offered.at, "pair_accept");
      let { hello, instance } = parsePairHello(message, "accept");
      let peerMac = decodeB64Field(hello.mac, "pair_accept mac");
      let { source, jwks, policy } = this.opts;
      let { claims, peerRaw } = await verifyPeerAssertion(hello.assertion, hello.public_key, {
        jwks,
        expectedIssuer: source.issuer,
        expectedKind: "chrome_extension",
      });
      checkAssertionTimes(claims, source.serverNow(offered.own));
      verifyPeerAccount(offered.own.claims, claims, policy);
      let peerKey = await importEcdhPublicKey(peerRaw);
      let ecdhSecret = await deriveEcdhSecret(offered.own.eph.keyPair.privateKey, peerKey);
      let helloMac = await computeHelloMac(offered.offer, hello);
      let secrets = await hkdfDerive(ecdhSecret, helloMac);
      assertMacEqual(peerMac, await encryptKeyConfirmMac(secrets));
      let keyConfirm = await decryptKeyConfirmMac(secrets);
      assertIdentityUnchanged(source, offered.own);
      let sidB64 = bytesToBinaryString(secrets.sid);
      return {
        next: {
          is: "finishing",
          own: offered.own,
          secrets,
          sidB64,
          peer: claims,
          peerInstance: instance,
          at: this.clock.stamp(),
        },
        out: {
          msg: "finish",
          v: PAIRING_PROTOCOL_VERSION,
          sid: sidB64,
          mac: bytesToBinaryString(keyConfirm),
        },
      };
    });
  }
  async onDone(message) {
    let finishing = this.enter("finishing", "no finish outstanding");
    return this.step(async () => {
      assertNotExpired(this.clock, finishing.at, "pair_done");
      let pairMac = parsePairMac(message, "done");
      if (pairMac.sid !== finishing.sidB64)
        throw new PairingError("bad_key_confirmation", "pair_done sid differs");
      assertMacEqual(pairMac.mac, await computePairDoneMac(finishing.secrets), "pair_done mac");
      let out = await establishPairingChannel("desktop", this.opts.source, this.clock, finishing);
      return {
        next: {
          is: "spent",
        },
        out,
      };
    });
  }
}
//@ chunk-290tacpj.js:27468-27561 placement
function parseRefusal(localPairing) {
  let pairing = localPairing;
  if (!pairing || typeof pairing !== "object" || pairing.msg !== "refuse") return;
  return normalizePairingErrorCode(pairing.code);
}
//@ chunk-290tacpj.js:27561-27580 placement
var weakMap = new WeakMap();
//@ chunk-290tacpj.js:27580-27612 placement
function getPairingContext(session) {
  return weakMap.get(session);
}
//@ chunk-290tacpj.js:27612-27704 placement
function ensurePairingContext(session) {
  let context = weakMap.get(session);
  if (!context) {
    context = {
      source: new PairingAssertionSource(session),
      jwks: new JwksCache(session),
    };
    weakMap.set(session, context);
  }
  return context;
}
//@ chunk-290tacpj.js:27704-27792 placement
function normalizeCategory(category) {
  return typeof category === "string" && /^category[0-9a-z_]{1,32}$/.test(category) ? category : undefined;
}
//@ chunk-290tacpj.js:27792-27900 placement
function stripPrivateOptions(actionData) {
  let { _perActionOnly, _privateHostReadAlwaysOffer, _privateHostReadAlways, ...state } = actionData;
  return state;
}
export {
  stripPrivateOptions,
  normalizeCategory,
  parseRefusal,
  ensurePairingContext,
  LocalPairingHandshake,
  getPairingContext,
};
