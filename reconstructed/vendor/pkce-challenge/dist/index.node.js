/**
 * pkce-challenge/dist/index.node.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pkce-challenge@5.0.1
 * pieces: chunk-333ft0yv.js (7)
 * attribution: esm-layout 2, esm-fingerprint 5
 */

//@ chunk-333ft0yv.js:191-197 esm-layout
var r;
//@ chunk-333ft0yv.js:197-288 esm-fingerprint
r = globalThis.crypto?.webcrypto ?? globalThis.crypto ?? import("crypto").then((e) => e.webcrypto);
//@ chunk-333ft0yv.js:288-359 esm-fingerprint
async function i(e) {
  return (await r).getRandomValues(new Uint8Array(e));
}
//@ chunk-333ft0yv.js:359-520 esm-fingerprint
async function l(e) {
  let t = "",
    c = await i(e);
  for (let n = 0; n < e; n++) {
    let o = c[n] % 66;
    t += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"[o];
  }
  return t;
}
//@ chunk-333ft0yv.js:520-558 esm-layout
async function s(e) {
  return await l(e);
}
//@ chunk-333ft0yv.js:558-762 esm-fingerprint
async function u(e) {
  let digest = await (await r).subtle.digest("SHA-256", new TextEncoder().encode(e));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=/g, "");
}
//@ chunk-333ft0yv.js:762-941 esm-fingerprint
async function hcn(e) {
  if (!e) e = 43;
  if (e < 43 || e > 128) throw `Expected a length between 43 and 128. Received ${e}.`;
  let a = await s(e),
    t = await u(a);
  return { code_verifier: a, code_challenge: t };
}

export { hcn };
