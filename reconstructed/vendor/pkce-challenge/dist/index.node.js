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
r = globalThis.crypto?.webcrypto ?? globalThis.crypto ?? import("crypto").then((m) => m.webcrypto);
//@ chunk-333ft0yv.js:288-359 esm-fingerprint
async function getRandomValues(size) {
  return (await r).getRandomValues(new Uint8Array(size));
}
//@ chunk-333ft0yv.js:359-520 esm-fingerprint
async function random(e) {
  let t = "";
  let randomValues = await getRandomValues(e);
  for (let j = 0; j < e; j++) {
    let o = randomValues[j] % 66;
    t += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"[o];
  }
  return t;
}
//@ chunk-333ft0yv.js:520-558 esm-layout
async function generateVerifier(length) {
  return await random(length);
}
//@ chunk-333ft0yv.js:558-762 esm-fingerprint
async function generateChallenge(code_verifier) {
  let buffer = await (await r).subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=/g, "");
}
//@ chunk-333ft0yv.js:762-941 esm-fingerprint
async function pkceChallenge(length) {
  if (!length) length = 43;
  if (length < 43 || length > 128) throw `Expected a length between 43 and 128. Received ${length}.`;
  let verifier = await generateVerifier(length);
  let challenge = await generateChallenge(verifier);
  return {
    code_verifier: verifier,
    code_challenge: challenge,
  };
}
export { pkceChallenge };
