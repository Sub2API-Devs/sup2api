/**
 * pkce-challenge/dist/index.node.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: pkce-challenge@5.0.1
 * pieces: chunk-z18kt4r5.js (7)
 * attribution: esm-layout 2, esm-fingerprint 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-z18kt4r5.js:191-197 esm-layout
var webcryptoPromise;
//@ chunk-z18kt4r5.js:197-288 esm-fingerprint
webcryptoPromise =
  globalThis.crypto?.webcrypto ?? globalThis.crypto ?? import("crypto").then((m) => m.webcrypto);
//@ chunk-z18kt4r5.js:288-359 esm-fingerprint
async function getRandomValues(size) {
  return (await webcryptoPromise).getRandomValues(new Uint8Array(size));
}
//@ chunk-z18kt4r5.js:359-520 esm-fingerprint
async function random(length) {
  let result = "";
  let randomValues = await getRandomValues(length);
  for (let j = 0; j < length; j++) {
    let charIndex = randomValues[j] % 66;
    result += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"[charIndex];
  }
  return result;
}
//@ chunk-z18kt4r5.js:520-558 esm-layout
async function generateVerifier(length) {
  return await random(length);
}
//@ chunk-z18kt4r5.js:558-762 esm-fingerprint
async function generateChallenge(code_verifier) {
  let buffer = await (
    await webcryptoPromise
  ).subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=/g, "");
}
//@ chunk-z18kt4r5.js:762-941 esm-fingerprint
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
