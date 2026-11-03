/**
 * jose/dist/webapi/lib/ecdhes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (5)
 * attribution: esm-layout 1, esm-fingerprint 4
 */
import { concat, fe, encode } from "./buffer_utils.js";
import { digest } from "./helpers.js";
import { checkEncCryptoKey } from "./crypto_key.js";

//@ chunk-5h78gfwc.js:12812-12852 esm-layout
function lengthAndInput(input) {
  return concat(fe(input.length), input);
}
//@ chunk-5h78gfwc.js:12852-13109 esm-fingerprint
async function concatKdf(Z, L, OtherInfo) {
  let dkLen = L >> 3;
  let hashLen = 32;
  let reps = Math.ceil(dkLen / 32);
  let dk = new Uint8Array(reps * 32);
  for (let i = 1; i <= reps; i++) {
    let hashInput = new Uint8Array(4 + Z.length + OtherInfo.length);
    hashInput.set(fe(i), 0);
    hashInput.set(Z, 4);
    hashInput.set(OtherInfo, 4 + Z.length);
    let hashResult = await digest("sha256", hashInput);
    dk.set(hashResult, (i - 1) * 32);
  }
  return dk.slice(0, dkLen);
}
//@ chunk-5h78gfwc.js:13109-13386 esm-fingerprint
async function deriveKey(
  publicKey,
  privateKey,
  algorithm,
  keyLength,
  apu = new Uint8Array(),
  apv = new Uint8Array(),
) {
  checkEncCryptoKey(publicKey, "ECDH");
  checkEncCryptoKey(privateKey, "ECDH", "deriveBits");
  let algorithmID = lengthAndInput(encode(algorithm));
  let partyUInfo = lengthAndInput(apu);
  let partyVInfo = lengthAndInput(apv);
  let suppPubInfo = fe(keyLength);
  let suppPrivInfo = new Uint8Array();
  let otherInfo = concat(algorithmID, partyUInfo, partyVInfo, suppPubInfo, suppPrivInfo);
  let Z = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: publicKey.algorithm.name,
        public: publicKey,
      },
      privateKey,
      getEcdhBitLength(publicKey),
    ),
  );
  return concatKdf(Z, keyLength, otherInfo);
}
//@ chunk-5h78gfwc.js:13386-13512 esm-fingerprint
function getEcdhBitLength(publicKey) {
  if (publicKey.algorithm.name === "X25519") return 256;
  return Math.ceil(parseInt(publicKey.algorithm.namedCurve.slice(-3), 10) / 8) << 3;
}
//@ chunk-5h78gfwc.js:13512-13647 esm-fingerprint
function allowed(key) {
  switch (key.algorithm.namedCurve) {
    case "P-256":
    case "P-384":
    case "P-521":
      return true;
    default:
      return key.algorithm.name === "X25519";
  }
}
export { allowed, deriveKey };
