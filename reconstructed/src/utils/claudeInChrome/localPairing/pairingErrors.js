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
/**
 * 判断错误码是否已知，未知时归一为 malformed。
 */
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
];
var PAIRING_ERROR_CODE_SET = new Set(PAIRING_ERROR_CODES);
//@ chunk-p7xf186d.js:5251-5566 placement
class PairingError extends Error {
  code;
  httpStatus;
  peerOrg;
  constructor(code, message, extra = {}) {
    super(message ? `${code}: ${message}` : code, {
      cause: extra.cause,
    });
    this.name = "PairingError";
    this.code = code;
    this.httpStatus = extra.httpStatus;
    this.peerOrg = extra.peerOrg;
  }
  wireCode() {
    return this.code === "attest_failed" && this.httpStatus !== undefined
      ? `attest_failed:${this.httpStatus}`
      : this.code;
  }
}
//@ chunk-p7xf186d.js:5566-5708 placement
function normalizePairingErrorCode(code) {
  if (typeof code !== "string") return "malformed";
  let code_2 = code.startsWith("attest_failed:") ? "attest_failed" : code;
  return PAIRING_ERROR_CODE_SET.has(code_2) ? code_2 : "malformed";
}
//@ chunk-p7xf186d.js:5708-5750 placement
function malformedError(message) {
  return new PairingError("malformed", message);
}
//@ chunk-p7xf186d.js:5750-6008 placement
class PairingClock {
  wall;
  mono;
  constructor(options = {}) {
    this.wall = options.now ?? (() => Date.now() / 1000);
    this.mono = options.monotonicNow ?? (() => globalThis.performance.now() / 1000);
  }
  stamp() {
    return {
      wall: this.wall(),
      mono: this.mono(),
    };
  }
  since(stamp) {
    return Math.max(0, this.wall() - stamp.wall, this.mono() - stamp.mono);
  }
}
//@ chunk-p7xf186d.js:6008-6058 placement
var LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
export { LOOPBACK_HOSTS, malformedError, PairingError, PairingClock, normalizePairingErrorCode };
