/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-decode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (7)
 * attribution: esm-fingerprint 7
 */
import { FAKE_VALUE } from "./credential-sentinel.js";

//@ chunk-fq0cr76a.js:708365-708428 esm-fingerprint
var vR = "(eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)";
//@ chunk-fq0cr76a.js:708428-708524 esm-fingerprint
function IE(e) {
  try {
    return JSON.parse(Buffer.from(e, "base64url").toString("utf8"));
  } catch {
    return;
  }
}
//@ chunk-fq0cr76a.js:708524-708679 esm-fingerprint
function Vm(e) {
  let parts = e.split(".");
  if (parts.length !== 3) return !1;
  let r = IE(parts[0]);
  if (typeof r !== "object" || r === null || !("alg" in r)) return !1;
  return IE(parts[1]) !== void 0;
}
//@ chunk-fq0cr76a.js:708679-708714 esm-fingerprint
var GH = 9999999999,
  C3J0LWZHA2U = "c3J0LWZha2U";
//@ chunk-fq0cr76a.js:708714-708780 esm-fingerprint
function NE(e) {
  return Buffer.from(e, "utf8").toString("base64url");
}
//@ chunk-fq0cr76a.js:708780-708909 esm-fingerprint
function Wm(e) {
  let n = NE(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    r = NE(JSON.stringify({ sub: FAKE_VALUE + e, exp: GH }));
  return `${n}.${r}.${C3J0LWZHA2U}`;
}
//@ chunk-fq0cr76a.js:708909-709266 esm-fingerprint
function Gm(e, n, r) {
  let [s, h] = e.split("."),
    y = IE(h ?? "");
  if (typeof y !== "object" || y === null || Array.isArray(y)) return null;
  let b = y,
    S = [];
  for (let R of n) {
    let D = b[R];
    if (typeof D === "string") S.push([R, D]);
  }
  if (S.length === 0) return null;
  let w = new Map();
  for (let [R, D] of S) {
    let O = r(R, D);
    ((b[R] = O), w.set(R, O));
  }
  return { fakeToken: `${s}.${NE(JSON.stringify(b))}.${C3J0LWZHA2U}`, claimSentinels: w };
}

export { vR, Vm, Gm, Wm };
