/**
 * utils/claudeInChrome/localPairing/pairingErrors.ts
 *
 * 2.1.316 新增：配对错误码与时钟
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p7xf186d.js (6)
 * attribution: placement 6
 */

//@ chunk-p7xf186d.js:4870-5251 placement
var PAIRING_ERROR_CODES = [
    "pairing_disabled",
    "not_signed_in",
    "managed_org_missing",
    "malformed",
    "unknown_kid",
    "jwks_unavailable",
    "bad_signature",
    "wrong_issuer_or_audience",
    "expired",
    "not_yet_valid",
    "wrong_peer_kind",
    "key_binding_mismatch",
    "account_mismatch",
    "org_mismatch",
    "org_not_permitted",
    "bad_key_confirmation",
    "attest_failed",
    "rate_limited",
    "unsupported_peer",
    "unknown_pairing",
  ],
  lt = new Set(PAIRING_ERROR_CODES);
//@ chunk-p7xf186d.js:5251-5566 placement
class PairingError extends Error {
  code;
  httpStatus;
  peerOrg;
  constructor(e, t, n = {}) {
    super(t ? `${e}: ${t}` : e, { cause: n.cause });
    ((this.name = "PairingError"),
      (this.code = e),
      (this.httpStatus = n.httpStatus),
      (this.peerOrg = n.peerOrg));
  }
  wireCode() {
    return this.code === "attest_failed" && this.httpStatus !== void 0
      ? `attest_failed:${this.httpStatus}`
      : this.code;
  }
}
//@ chunk-p7xf186d.js:5566-5708 placement
function normalizePairingErrorCode(e) {
  if (typeof e !== "string") return "malformed";
  let t = e.startsWith("attest_failed:") ? "attest_failed" : e;
  return lt.has(t) ? t : "malformed";
}
//@ chunk-p7xf186d.js:5708-5750 placement
function malformedError(e) {
  return new PairingError("malformed", e);
}
//@ chunk-p7xf186d.js:5750-6008 placement
class PairingClock {
  wall;
  mono;
  constructor(e = {}) {
    ((this.wall = e.now ?? (() => Date.now() / 1000)),
      (this.mono = e.monotonicNow ?? (() => globalThis.performance.now() / 1000)));
  }
  stamp() {
    return { wall: this.wall(), mono: this.mono() };
  }
  since(e) {
    return Math.max(0, this.wall() - e.wall, this.mono() - e.mono);
  }
}
//@ chunk-p7xf186d.js:6008-6058 placement
var LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export { LOOPBACK_HOSTS, malformedError, PairingError, PairingClock, normalizePairingErrorCode };
