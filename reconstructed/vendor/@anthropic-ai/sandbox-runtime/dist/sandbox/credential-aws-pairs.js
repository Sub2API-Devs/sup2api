/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-aws-pairs.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (5)
 * attribution: esm-fingerprint 5
 */
import { At } from "../utils/debug.js";
import { zC, JC, _u, UNSIGNED_PAYLOAD, QC } from "./aws-sigv4.js";

//@ chunk-fq0cr76a.js:714642-714719 esm-fingerprint
var AWS_ACCESS_KEY_ID = "AWS_ACCESS_KEY_ID",
  AWS_SECRET_ACCESS_KEY = "AWS_SECRET_ACCESS_KEY",
  AWS_SESSION_TOKEN = "AWS_SESSION_TOKEN";
//@ chunk-fq0cr76a.js:714719-714935 esm-fingerprint
class DE {
  constructor() {
    this.bySentinel = new Map();
  }
  register(e) {
    this.bySentinel.set(e.accessKeyIdSentinel, e);
  }
  lookup(e) {
    return this.bySentinel.get(e);
  }
  get size() {
    return this.bySentinel.size;
  }
  clear() {
    this.bySentinel.clear();
  }
}
//@ chunk-fq0cr76a.js:714935-716340 esm-fingerprint
function DR(e, n, r, s, h, y = process.env) {
  let b = [...(n ?? [])],
    S = new Set(
      b.flatMap((O) => [
        O.accessKeyIdVar,
        O.secretAccessKeyVar,
        ...(O.sessionTokenVar ? [O.sessionTokenVar] : []),
      ]),
    );
  if (![AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN].some((O) => S.has(O)))
    b.push({
      accessKeyIdVar: AWS_ACCESS_KEY_ID,
      secretAccessKeyVar: AWS_SECRET_ACCESS_KEY,
      sessionTokenVar: AWS_SESSION_TOKEN,
    });
  let R = (O) =>
      e.find((L) => L.name === O && L.mode === "mask" && L.extract === void 0 && L.decode === void 0),
    D = (O) => (R(O) !== void 0 ? s[O] : void 0);
  for (let O of b) {
    let L = D(O.accessKeyIdVar),
      V = D(O.secretAccessKeyVar) !== void 0,
      K = y[O.accessKeyIdVar],
      q = y[O.secretAccessKeyVar];
    if (L === void 0 || !V || K === void 0 || q === void 0) {
      if (V && L === void 0) {
        let ae =
          `[sandbox-runtime] WARNING: "${O.secretAccessKeyVar}" is masked but "${O.accessKeyIdVar}" is not, so no AWS credential pair was registered. SigV4 requests will be signed with the masked placeholder secret and the proxy cannot ` +
          "detect or re-sign them \u2014 they will fail upstream. Mask both " +
          "variables (whole-value) to enable re-signing.";
        (console.warn(ae), At(ae, { level: "warn" }));
      }
      continue;
    }
    let Z = R(O.accessKeyIdVar),
      ie =
        (O.sessionTokenVar !== void 0 ? D(O.sessionTokenVar) : void 0) !== void 0 &&
        O.sessionTokenVar !== void 0
          ? y[O.sessionTokenVar]
          : void 0;
    (h.register({
      accessKeyIdSentinel: L,
      realAccessKeyId: K,
      realSecretAccessKey: q,
      ...(ie !== void 0 ? { realSessionToken: ie } : {}),
      injectHosts: Z.injectHosts ?? r,
    }),
      At(
        `[credential-aws] registered SigV4 pair for ${O.accessKeyIdVar}/${O.secretAccessKeyVar}` +
          (ie !== void 0 ? " (+session token)" : ""),
      ));
  }
}
//@ chunk-fq0cr76a.js:716340-716450 esm-fingerprint
function YH(e) {
  return {
    streaming: e?.streaming ?? "deny",
    presigned: e?.presigned ?? "deny",
    sigv4a: e?.sigv4a ?? "deny",
  };
}
//@ chunk-fq0cr76a.js:716450-718460 esm-fingerprint
function OR(e, n, r) {
  let s = YH(n);
  return (h, y, b, S) => {
    if (e.size === 0) return;
    let w = zC(b, y);
    if (w === null) return;
    let lookup = e.lookup(w.accessKeyId);
    if (lookup === void 0) return;
    if (!lookup.injectHosts.some((injectHost) => r(S, injectHost))) return;
    if (w.kind !== "header-sigv4") {
      if (s[w.kind] === "passthrough") {
        At(
          `[credential-aws] ${w.kind} request with masked credential passed through un-resigned per credentials.sigv4.${w.kind} (its signature covers the placeholder secret and will fail upstream)`,
        );
        return;
      }
      return {
        action: "deny",
        reason: `AWS SigV4 ${w.kind} request uses a masked credential but cannot be re-signed by the sandbox proxy; denied by policy. Set credentials.sigv4.${w.kind} to "passthrough" to forward it unmodified (it will fail upstream: the signature covers the masked placeholder).`,
      };
    }
    let D = JC(_u(b.authorization));
    if (D === null)
      return {
        action: "deny",
        reason:
          "AWS SigV4 request uses a masked credential but its Authorization header is malformed; the proxy cannot re-sign it.",
      };
    let O = _u(b["x-amz-date"]);
    if (O === void 0)
      return {
        action: "deny",
        reason:
          "AWS SigV4 request uses a masked credential but carries no x-amz-date header; the proxy cannot re-sign it.",
      };
    let L = [...D.signedHeaders];
    for (let K of L) {
      if (K === "host") continue;
      if (K === "x-amz-security-token" && lookup.realSessionToken !== void 0) continue;
      if (b[K] === void 0)
        return {
          action: "deny",
          reason: `AWS SigV4 request uses a masked credential but signed header "${K}" is missing; the proxy cannot re-sign it.`,
        };
    }
    if (lookup.realSessionToken !== void 0 && !L.includes("x-amz-security-token"))
      L.push("x-amz-security-token");
    let V = _u(b["x-amz-content-sha256"]);
    return {
      action: "resign",
      payloadHash: V === UNSIGNED_PAYLOAD ? UNSIGNED_PAYLOAD : void 0,
      apply(K, q, Z) {
        if (lookup.realSessionToken !== void 0) K["x-amz-security-token"] = lookup.realSessionToken;
        if (K["x-amz-content-sha256"] !== void 0 && V !== UNSIGNED_PAYLOAD) K["x-amz-content-sha256"] = Z;
        let { authorization: authorization } = QC({
          method: h,
          requestTarget: y,
          headers: K,
          hostHeader: q,
          signedHeaders: L,
          payloadHash: Z,
          amzDate: O,
          scope: { date: D.date, region: D.region, service: D.service },
          accessKeyId: lookup.realAccessKeyId,
          secretAccessKey: lookup.realSecretAccessKey,
        });
        K.authorization = authorization;
      },
    };
  };
}

export { DE, OR, DR };
