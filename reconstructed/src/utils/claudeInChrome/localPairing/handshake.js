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
  vt,
  validatePeerClaims,
  parseAssertion,
  canonicalJson,
  verifyPeerAssertion,
  checkAssertionTimes,
  JwksCache,
} from "./jwksAndAssertions.js";
import { withTimeout_2 } from "../../sleep.js";

//@ chunk-p7xf186d.js:15660-15675 placement
var St = 5,
  Tt = 60;
/**
 * 获取并缓存本地配对断言（含签发中的去重、失败记录、过期时间）。
 */
//@ chunk-p7xf186d.js:15675-17989 placement
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
    ((this.clock = new PairingClock(e)),
      (this.timeoutSec = e.timeoutSec ?? MAX_TAG_FAILURES),
      (this.urls = normalizeApiOrigin(e.apiOrigin, e.allowLoopbackHttp)));
  }
  get issuer() {
    return this.urls.issuer;
  }
  serverNow(e) {
    return e.claims.iat + this.clock.since(e.minted);
  }
  async get() {
    let e = this.current;
    if (e && e.claims.exp - vt > this.serverNow(e)) return e;
    let lastFailure = this.lastFailure;
    if (lastFailure && this.clock.since(lastFailure.at) < lastFailure.floor) throw lastFailure.error;
    let n = (this.minting ??= this.mint().finally(() => {
      if (this.minting === n) this.minting = void 0;
    }));
    return n;
  }
  isCurrent(e) {
    return e.epoch === this.epoch;
  }
  clear() {
    ((this.epoch += 1), (this.current = void 0), (this.minting = void 0), (this.lastFailure = void 0));
  }
  async mint() {
    let epoch = this.epoch;
    try {
      let t = await withTimeout_2(
        this.attest(epoch),
        this.timeoutSec,
        () => new PairingError("attest_failed", "timed out", { httpStatus: 0 }),
      );
      if (epoch !== this.epoch) throw new PairingError("not_signed_in", "identity changed during attest");
      return ((this.current = t), (this.lastFailure = void 0), t);
    } catch (error) {
      let n =
        error instanceof PairingError
          ? error
          : new PairingError("attest_failed", "unexpected", { cause: error });
      if (epoch === this.epoch && n.code !== "not_signed_in") {
        let r = n.code === "rate_limited" || n.code === "pairing_disabled";
        this.lastFailure = { error: n, at: this.clock.stamp(), floor: r ? Tt : St };
      }
      throw n;
    }
  }
  async attest(e) {
    let t;
    try {
      t = await this.opts.getBearer();
    } catch (error) {
      throw new PairingError("not_signed_in", "bearer unavailable", { cause: error });
    }
    if (!t) throw new PairingError("not_signed_in");
    let n = await generateEcdhKeyPair(),
      stamp = this.clock.stamp(),
      i;
    try {
      i = await this.opts.fetchImpl(this.urls.attest, {
        method: "POST",
        headers: {
          authorization: `Bearer ${t}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ public_key: n.publicKey }),
      });
    } catch (error) {
      throw new PairingError("attest_failed", "fetch failed", { httpStatus: 0, cause: error });
    }
    if (i.status === 404)
      throw new PairingError("pairing_disabled", "attest is not enabled", { httpStatus: 404 });
    if (i.status === 429) throw new PairingError("rate_limited", void 0, { httpStatus: 429 });
    if (i.status !== 200)
      throw new PairingError("attest_failed", `HTTP ${i.status}`, { httpStatus: i.status });
    let s;
    try {
      s = JSON.parse(await i.text());
    } catch {
      throw new PairingError("attest_failed", "response is not JSON", { httpStatus: 200 });
    }
    let o = s?.assertion;
    if (typeof o !== "string")
      throw new PairingError("attest_failed", "response lacks assertion", { httpStatus: 200 });
    let c = validatePeerClaims(parseAssertion(o).payload);
    if (c.cnf.jkt !== n.jkt) throw new PairingError("key_binding_mismatch", "server bound a different key");
    return { assertion: o, claims: c, eph: n, minted: stamp, epoch: e };
  }
}
//@ chunk-p7xf186d.js:17989-18070 placement
async function xe(e, t) {
  let { mac: mac, ...r } = t;
  return sha256(
    concatBytesArgs(
      lengthPrefixed(PAIRING_PROTOCOL),
      lengthPrefixed(utf8Encode(canonicalJson(e))),
      lengthPrefixed(utf8Encode(canonicalJson(r))),
    ),
  );
}
//@ chunk-p7xf186d.js:18070-18188 placement
async function deriveEcdhSecret(e, t) {
  return new Uint8Array(await globalThis.crypto.subtle.deriveBits({ name: "ECDH", public: t }, e, 256));
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
async function hkdfDerive(e, t) {
  let importKey = await globalThis.crypto.subtle.importKey("raw", toArrayBuffer(e), "HKDF", !1, [
      "deriveBits",
    ]),
    [r, i, s, o, c] = await Promise.all([
      hkdfDerive_2(importKey, t, "confirm d", 32),
      hkdfDerive_2(importKey, t, "confirm e", 32),
      hkdfDerive_2(importKey, t, "aead d2e", 32),
      hkdfDerive_2(importKey, t, "aead e2d", 32),
      hkdfDerive_2(importKey, t, "sid", 16),
    ]);
  return { th: t, kcD: r, kcE: i, kD2e: s, kE2d: o, sid: c };
}
//@ chunk-p7xf186d.js:18635-18831 placement
async function hmacSha256(e, t) {
  let importKey = await globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(e),
    { name: "HMAC", hash: "SHA-256" },
    !1,
    ["sign"],
  );
  return new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", importKey, toArrayBuffer(t)));
}
//@ chunk-p7xf186d.js:18831-18867 placement
function Te(e) {
  return hmacSha256(e.kcE, e.th);
}
//@ chunk-p7xf186d.js:18867-18903 placement
function Ee(e) {
  return hmacSha256(e.kcD, e.th);
}
//@ chunk-p7xf186d.js:18903-18952 placement
function Re(e) {
  return hmacSha256(e.kcE, concatBytesArgs(e.th, utf8Encode("done")));
}
//@ chunk-p7xf186d.js:18952-19183 placement
var SEALED_MESSAGE_TYPES = [
    "execute_tool",
    "tool_response",
    "notification:permission_request",
    "notification:sealed_broadcast",
    "notification:inference_request",
    "notification:inference_response",
  ],
  CHANNEL_VERSION = 3,
  MAX_SEALED_BYTES = 33554432,
  MAX_CLOCK_SKEW_S = 60,
  SURROGATE_RE = /\p{Surrogate}/u,
  SEALED_MESSAGE_TYPE_SET = new Set(SEALED_MESSAGE_TYPES);
//@ chunk-p7xf186d.js:19183-19236 placement
function Ae(e) {
  return typeof e === "string" && SEALED_MESSAGE_TYPE_SET.has(e);
}
//@ chunk-p7xf186d.js:19236-19311 placement
function Ce(e) {
  return e === void 0 || (typeof e === "string" && e !== "" && !SURROGATE_RE.test(e));
}
//@ chunk-p7xf186d.js:19311-19421 placement
function isValidChunkInfo(e) {
  if (e === void 0) return !0;
  let t = e;
  return (
    !!t &&
    typeof t === "object" &&
    isNonNegativeSafeInt(t.n) &&
    t.n >= 1 &&
    isNonNegativeSafeInt(t.i) &&
    t.i < t.n
  );
}
/**
 * 生成配对通道 AES-GCM 参数：IV 为 4 字节 0 + 64 位序号，附加数据依次绑定协议名、双方标识、序号、消息类型、可选会话、时间戳与分片信息。
 */
//@ chunk-p7xf186d.js:19421-19617 placement
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
function Ie(e) {
  try {
    let floored = Math.floor(e());
    return isNonNegativeSafeInt(floored) ? floored : Number.NaN;
  } catch {
    return Number.NaN;
  }
}
//@ chunk-p7xf186d.js:19708-19809 placement
async function importAesKey(e, t) {
  return globalThis.crypto.subtle.importKey("raw", toArrayBuffer(e), { name: "AES-GCM" }, !1, [t]);
}
//@ chunk-p7xf186d.js:19809-19829 placement
var $e = () => {
  return;
};
//@ chunk-p7xf186d.js:19829-19925 placement
function Ue(e) {
  try {
    return { ok: !0, inner: JSON.parse(utf8Decode(e)) };
  } catch {
    return { ok: !1, reason: "malformed" };
  }
}
/**
 * 配对后的加密通道：派生收发密钥、计数器防重放、标签失败计数，负责加解密消息。
 */
//@ chunk-p7xf186d.js:19925-23584 placement
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
  tornDown = !1;
  q = { send: Promise.resolve(), recv: Promise.resolve() };
  partial;
  stats = { gaps: 0, replays: 0, stale: 0, badTags: 0 };
  born;
  constructor(e, t, n, r, i) {
    this.sid = e;
    this.dirOut = t;
    this.kOut = n;
    this.kIn = r;
    this.clock = i;
    ((this.sidB64 = bytesToBinaryString(e)), (this.born = i.stamp()));
  }
  static async create(e, t, n = {}) {
    let [r, i, s] = e === "desktop" ? [t.kD2e, t.kE2d, "d2e"] : [t.kE2d, t.kD2e, "e2d"];
    return new PairingChannel(
      t.sid,
      s,
      await importAesKey(r, "encrypt"),
      await importAesKey(i, "decrypt"),
      n.clock ?? new PairingClock(),
    );
  }
  ownSeconds() {
    return Ie(() => this.born.wall + this.clock.since(this.born));
  }
  get dirIn() {
    return this.dirOut === "d2e" ? "e2d" : "d2e";
  }
  get isTornDown() {
    return this.tornDown;
  }
  enqueue(e, t) {
    let n = this.q[e].then(t, t);
    return ((this.q[e] = n.then($e, $e)), n);
  }
  seal(e, t, n) {
    return this.sealFrames(e, t, n, void 0).then(([r]) => {
      if (r === void 0) throw Error("seal: no envelope produced");
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
    if (!Ae(e)) return Promise.reject(TypeError("seal: unknown frame kind"));
    if (!Ce(t)) return Promise.reject(TypeError("seal: toolUseId must be a non-empty well-formed string"));
    let i;
    try {
      let json = JSON.stringify(n);
      if (typeof json !== "string") throw TypeError("not JSON-serialisable");
      i = utf8Encode(json);
    } catch (error) {
      return Promise.reject(TypeError("seal: inner is not JSON-serialisable", { cause: error }));
    }
    let s = r !== void 0,
      o = r ?? i.length,
      ceil = Math.ceil(i.length / o),
      a = Ie(this.clock.wall);
    if (!isNonNegativeSafeInt(a)) return Promise.reject(Error("seal: clock is not a usable time"));
    let ctrOut = this.ctrOut;
    if (((this.ctrOut = ctrOut + ceil), !Number.isSafeInteger(this.ctrOut)))
      return ((this.tornDown = !0), Promise.reject(Error("sealed channel counter exhausted")));
    return this.enqueue("send", async () => {
      let l = [];
      for (let p = 0; p < ceil; p++) {
        let y = s ? { i: p, n: ceil } : void 0,
          uint8Array = new Uint8Array(
            await globalThis.crypto.subtle.encrypt(
              aesGcmParams(this.dirOut, this.sid, ctrOut + p, e, t, a, y),
              this.kOut,
              toArrayBuffer(i.subarray(p * o, (p + 1) * o)),
            ),
          );
        if (this.tornDown) throw Error("sealed channel torn down");
        l.push({
          sid: this.sidB64,
          ctr: ctrOut + p,
          t: a,
          ct: bytesToBinaryString(uint8Array),
          ...(y && { chunk: y }),
        });
      }
      return l;
    });
  }
  open(e, t, n) {
    return this.enqueue("recv", () => this.openNow(e, t, n));
  }
  async openNow(e, t, n) {
    if (this.tornDown) return { ok: !1, reason: "torn_down" };
    let r = n;
    if (
      !r ||
      typeof r !== "object" ||
      typeof r.sid !== "string" ||
      typeof r.ct !== "string" ||
      !isNonNegativeSafeInt(r.t) ||
      !Ae(e) ||
      !Ce(t) ||
      !isValidChunkInfo(r.chunk)
    )
      return { ok: !1, reason: "malformed" };
    let { t: i, chunk: chunk } = r;
    if (r.sid !== this.sidB64) return { ok: !1, reason: "foreign_sid" };
    let ctr = r.ctr;
    if (!isNonNegativeSafeInt(ctr)) return { ok: !1, reason: "malformed" };
    if (ctr <= this.ctrIn) return ((this.stats.replays += 1), { ok: !1, reason: "replay" });
    if (!(Math.abs(this.ownSeconds() - i) <= MAX_CLOCK_SKEW_S))
      return ((this.stats.stale += 1), { ok: !1, reason: "stale" });
    let a;
    try {
      a = base64UrlDecode(r.ct);
    } catch {
      return { ok: !1, reason: "malformed" };
    }
    if (a.length < 16) return { ok: !1, reason: "malformed" };
    let u;
    try {
      u = await globalThis.crypto.subtle.decrypt(
        aesGcmParams(this.dirIn, this.sid, ctr, e, t, i, chunk),
        this.kIn,
        toArrayBuffer(a),
      );
    } catch {
      if (((this.stats.badTags += 1), ++this.tagFailures >= CHANNEL_VERSION)) this.tearDown();
      return { ok: !1, reason: "bad_tag" };
    }
    if (this.tornDown) return { ok: !1, reason: "torn_down" };
    if (ctr > this.ctrIn + 1) this.stats.gaps += ctr - this.ctrIn - 1;
    this.ctrIn = ctr;
    let uint8Array = new Uint8Array(u);
    if (!chunk) return ((this.partial = void 0), Ue(uint8Array));
    return this.reassemble(ctr, chunk, uint8Array);
  }
  reassemble(e, t, n) {
    let partial = this.partial;
    if (((this.partial = void 0), t.i === 0)) partial = { firstCtr: e, n: t.n, parts: [], bytes: 0 };
    else if (!partial || e !== partial.firstCtr + partial.parts.length)
      return { ok: !1, reason: "bad_chunk" };
    if (partial.bytes + n.length > MAX_SEALED_BYTES) return { ok: !1, reason: "bad_chunk" };
    if ((partial.parts.push(n), (partial.bytes += n.length), partial.parts.length < partial.n))
      return ((this.partial = partial), { ok: !1, reason: "partial" });
    return Ue(concatBytes(partial.parts));
  }
  tearDown() {
    ((this.tornDown = !0), (this.partial = void 0));
  }
}
//@ chunk-p7xf186d.js:23584-23649 placement
var Z = 1,
  $t = 30,
  Be = { offer: "instance_hint", accept: "instance" },
  je = 32;
//@ chunk-p7xf186d.js:23649-23706 placement
function X(e, t) {
  return e.toLowerCase() === t.toLowerCase();
}
//@ chunk-p7xf186d.js:23706-24222 placement
function verifyPeerAccount(e, t, n) {
  if (t.sub !== e.sub) throw new PairingError("account_mismatch");
  if (n.requiredOrg !== void 0) {
    if (!X(e.org, n.requiredOrg))
      throw new PairingError("org_not_permitted", "own sign-in is not in the configured org");
  }
  let r = t.hybrid && t.client_kind === "desktop",
    i = !n.allowedOrgs || n.allowedOrgs.some((allowedOrg) => X(allowedOrg, t.org));
  if (r && !i)
    throw new PairingError("org_not_permitted", "the managing Desktop's org is outside the configured list");
  if ((n.requiredOrg !== void 0 || r || n.hybridSignIn) && !X(t.org, e.org))
    throw new PairingError("org_mismatch", void 0, i ? { peerOrg: t.org } : {});
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
  if (n !== void 0 && r.length !== n) throw malformedError(`${t} must be ${n} bytes`);
  return r;
}
//@ chunk-p7xf186d.js:24412-24608 placement
function checkPairMessage(e, t) {
  let n = e;
  if (!n || typeof n !== "object" || n.msg !== t) throw malformedError(`pair_${t} malformed`);
  if (n.v !== Z) {
    let r = typeof n.v === "number" ? String(n.v) : typeof n.v;
    throw malformedError(`unsupported v ${r}`);
  }
  return n;
}
//@ chunk-p7xf186d.js:24608-24757 placement
function smallObjectField(e, t) {
  if (e === void 0) return;
  if (!e || typeof e !== "object" || Array.isArray(e) || canonicalJson(e).length > 1024)
    throw malformedError(`${t} must be a small object`);
  return e;
}
//@ chunk-p7xf186d.js:24757-24920 placement
function parsePairHello(e, t) {
  let n = Be[t],
    r = checkPairMessage(e, t);
  try {
    canonicalJson(r);
  } catch {
    throw malformedError(`pair_${t} is not canonical JSON`);
  }
  decodeB64Field(r.nonce, "nonce", je);
  let i = smallObjectField(r[n], n);
  return { hello: r, instance: i };
}
//@ chunk-p7xf186d.js:24920-25047 placement
function buildPairHello(e, t, n) {
  let r = {
    msg: e,
    v: Z,
    assertion: t.assertion,
    public_key: t.eph.publicKey,
    nonce: bytesToBinaryString(randomBytes(je)),
  };
  if (n) r[Be[e]] = n;
  return r;
}
//@ chunk-p7xf186d.js:25047-25185 placement
function parsePairMac(e, t) {
  let n = checkPairMessage(e, t);
  if (typeof n.sid !== "string") throw malformedError(`pair_${t} sid missing`);
  return { sid: n.sid, mac: decodeB64Field(n.mac, `pair_${t} mac`) };
}
//@ chunk-p7xf186d.js:25185-25342 placement
function cloneSmallObject(e, t) {
  if (e === void 0) return;
  try {
    return smallObjectField(JSON.parse(JSON.stringify(e)), t);
  } catch (error) {
    throw TypeError(`${t} must be a small JSON object`, { cause: error });
  }
}
//@ chunk-p7xf186d.js:25342-25447 placement
function assertIdentityUnchanged(e, t) {
  if (!e.isCurrent(t)) throw new PairingError("not_signed_in", "identity changed during the handshake");
}
//@ chunk-p7xf186d.js:25447-25516 placement
function Me(e, t, n) {
  if (!constantTimeEqual(e, t)) throw new PairingError("bad_key_confirmation", n);
}
//@ chunk-p7xf186d.js:25516-25596 placement
function De(e, t, n) {
  if (e.since(t) > $t) throw new PairingError("expired", `${n} took too long`);
}
//@ chunk-p7xf186d.js:25596-25794 placement
async function establishPairingChannel(e, t, n, r) {
  let create = await PairingChannel.create(e, r.secrets, { clock: n });
  return (
    assertIdentityUnchanged(t, r.own),
    {
      sidB64: create.sidB64,
      channel: create,
      own: r.own.claims,
      peer: r.peer,
      peerInstance: r.peerInstance,
      establishedAt: n.wall(),
    }
  );
}
/**
 * 本地配对握手状态机：交换 ECDH 公钥与断言、校验对端，建立加密通道。
 */
//@ chunk-p7xf186d.js:25794-27468 placement
class LocalPairingHandshake {
  opts;
  phase = { is: "fresh" };
  clock;
  instanceHint;
  constructor(e) {
    this.opts = e;
    ((this.clock = new PairingClock(e)),
      (this.instanceHint = cloneSmallObject(e.instanceHint, "instanceHint")));
  }
  enter(e, t) {
    let phase = this.phase;
    if (phase.is !== e) throw malformedError(t);
    return ((this.phase = { is: "busy" }), phase);
  }
  async step(e) {
    try {
      let { next: t, out: out } = await e();
      return ((this.phase = t), out);
    } catch (error) {
      throw ((this.phase = { is: "spent" }), error);
    }
  }
  async createOffer() {
    return (
      this.enter("fresh", "createOffer already called; use a new Initiator"),
      this.step(async () => {
        let e = await this.opts.source.get(),
          t = buildPairHello("offer", e, this.instanceHint);
        return { next: { is: "offered", offer: t, own: e, at: this.clock.stamp() }, out: t };
      })
    );
  }
  async onAccept(e) {
    let enter = this.enter("offered", "no offer outstanding");
    return this.step(async () => {
      De(this.clock, enter.at, "pair_accept");
      let { hello: hello, instance: instance } = parsePairHello(e, "accept"),
        i = decodeB64Field(hello.mac, "pair_accept mac"),
        { source: source, jwks: jwks, policy: policy } = this.opts,
        { claims: claims, peerRaw: peerRaw } = await verifyPeerAssertion(hello.assertion, hello.public_key, {
          jwks: jwks,
          expectedIssuer: source.issuer,
          expectedKind: "chrome_extension",
        });
      (checkAssertionTimes(claims, source.serverNow(enter.own)),
        verifyPeerAccount(enter.own.claims, claims, policy));
      let l = await importEcdhPublicKey(peerRaw),
        p = await deriveEcdhSecret(enter.own.eph.keyPair.privateKey, l),
        y = await xe(enter.offer, hello),
        g = await hkdfDerive(p, y);
      Me(i, await Te(g));
      let h = await Ee(g);
      assertIdentityUnchanged(source, enter.own);
      let U = bytesToBinaryString(g.sid);
      return {
        next: {
          is: "finishing",
          own: enter.own,
          secrets: g,
          sidB64: U,
          peer: claims,
          peerInstance: instance,
          at: this.clock.stamp(),
        },
        out: { msg: "finish", v: Z, sid: U, mac: bytesToBinaryString(h) },
      };
    });
  }
  async onDone(e) {
    let enter = this.enter("finishing", "no finish outstanding");
    return this.step(async () => {
      De(this.clock, enter.at, "pair_done");
      let n = parsePairMac(e, "done");
      if (n.sid !== enter.sidB64) throw new PairingError("bad_key_confirmation", "pair_done sid differs");
      Me(n.mac, await Re(enter.secrets), "pair_done mac");
      let r = await establishPairingChannel("desktop", this.opts.source, this.clock, enter);
      return { next: { is: "spent" }, out: r };
    });
  }
}
//@ chunk-p7xf186d.js:27468-27561 placement
function parseRefusal(e) {
  let t = e;
  if (!t || typeof t !== "object" || t.msg !== "refuse") return;
  return normalizePairingErrorCode(t.code);
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
  if (!t) ((t = { source: new PairingAssertionSource(e), jwks: new JwksCache(e) }), weakMap.set(e, t));
  return t;
}
//@ chunk-p7xf186d.js:27704-27792 placement
function normalizeCategory(e) {
  return typeof e === "string" && /^category[0-9a-z_]{1,32}$/.test(e) ? e : void 0;
}
//@ chunk-p7xf186d.js:27792-27900 placement
function stripPrivateOptions(e) {
  let {
    _perActionOnly: _perActionOnly,
    _privateHostReadAlwaysOffer: _privateHostReadAlwaysOffer,
    _privateHostReadAlways: _privateHostReadAlways,
    ...i
  } = e;
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
