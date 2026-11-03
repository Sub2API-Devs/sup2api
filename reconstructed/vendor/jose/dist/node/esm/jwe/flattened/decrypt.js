/**
 * jose/dist/node/esm/jwe/flattened/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { de, Or, X, Tt } from "../../../../webapi/lib/options.js";
import { K, G } from "../../../../webapi/lib/validate.js";
import { s, f, Q } from "../../../../webapi/lib/content_encryption.js";
import { S, C, l } from "../../../../browser/runtime/base64url.js";
import { V } from "../../../../browser/runtime/jwk_to_key.js";
import { _ } from "../../lib/buffer_utils.js";
import { Ke } from "../../../../browser/runtime/decrypt.js";
import { Et } from "../../../../browser/runtime/zlib.js";

//@ chunk-2tyrgda4.js:23575-23598 esm-layout
var et = Xa(() => {
  de = Or;
});
//@ chunk-2tyrgda4.js:23598-26775 esm-fingerprint
async function Dt(e, t, r) {
  var o;
  if (!K(e)) throw new s("Flattened JWE must be an object");
  if (e.protected === void 0 && e.header === void 0 && e.unprotected === void 0)
    throw new s("JOSE Header missing");
  if (typeof e.iv !== "string") throw new s("JWE Initialization Vector missing or incorrect type");
  if (typeof e.ciphertext !== "string") throw new s("JWE Ciphertext missing or incorrect type");
  if (typeof e.tag !== "string") throw new s("JWE Authentication Tag missing or incorrect type");
  if (e.protected !== void 0 && typeof e.protected !== "string")
    throw new s("JWE Protected Header incorrect type");
  if (e.encrypted_key !== void 0 && typeof e.encrypted_key !== "string")
    throw new s("JWE Encrypted Key incorrect type");
  if (e.aad !== void 0 && typeof e.aad !== "string") throw new s("JWE AAD incorrect type");
  if (e.header !== void 0 && !K(e.header)) throw new s("JWE Shared Unprotected Header incorrect type");
  if (e.unprotected !== void 0 && !K(e.unprotected))
    throw new s("JWE Per-Recipient Unprotected Header incorrect type");
  let n;
  if (e.protected)
    try {
      let R = S(e.protected);
      n = JSON.parse(C.decode(R));
    } catch (error) {
      throw new s("JWE Protected Header is invalid");
    }
  if (!G(n, e.header, e.unprotected))
    throw new s(
      "JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint",
    );
  let a = { ...n, ...e.header, ...e.unprotected };
  if ((X(s, new Map(), r === null || r === void 0 ? void 0 : r.crit, n, a), a.zip !== void 0)) {
    if (!n || !n.zip) throw new s('JWE "zip" (Compression Algorithm) Header MUST be integrity protected');
    if (a.zip !== "DEF") throw new f('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value');
  }
  let { alg: alg, enc: enc } = a;
  if (typeof alg !== "string" || !alg) throw new s("missing JWE Algorithm (alg) in JWE Header");
  if (typeof enc !== "string" || !enc) throw new s("missing JWE Encryption Algorithm (enc) in JWE Header");
  let d = r && de("keyManagementAlgorithms", r.keyManagementAlgorithms),
    u = r && de("contentEncryptionAlgorithms", r.contentEncryptionAlgorithms);
  if (d && !d.has(alg)) throw new Q('"alg" (Algorithm) Header Parameter not allowed');
  if (u && !u.has(enc)) throw new Q('"enc" (Encryption Algorithm) Header Parameter not allowed');
  let h;
  if (e.encrypted_key !== void 0)
    try {
      h = S(e.encrypted_key);
    } catch (error) {
      throw new s("Failed to base64url decode the encrypted_key");
    }
  let I = !1;
  if (typeof t === "function") ((t = await t(n, e)), (I = !0));
  let b;
  try {
    b = await Tt(alg, t, h, a, r);
  } catch (error) {
    if (error instanceof TypeError || error instanceof s || error instanceof f) throw error;
    b = V(enc);
  }
  let H, T;
  try {
    H = S(e.iv);
  } catch (error) {
    throw new s("Failed to base64url decode the iv");
  }
  try {
    T = S(e.tag);
  } catch (error) {
    throw new s("Failed to base64url decode the tag");
  }
  let encode = l.encode((o = e.protected) !== null && o !== void 0 ? o : ""),
    D;
  if (e.aad !== void 0) D = _(encode, l.encode("."), l.encode(e.aad));
  else D = encode;
  let dt;
  try {
    dt = S(e.ciphertext);
  } catch (error) {
    throw new s("Failed to base64url decode the ciphertext");
  }
  let Je = await Ke(enc, b, dt, H, T, D);
  if (a.zip === "DEF") Je = await ((r === null || r === void 0 ? void 0 : r.inflateRaw) || Et)(Je);
  let Z = { plaintext: Je };
  if (e.protected !== void 0) Z.protectedHeader = n;
  if (e.aad !== void 0)
    try {
      Z.additionalAuthenticatedData = S(e.aad);
    } catch (error) {
      throw new s("Failed to base64url decode the aad");
    }
  if (e.unprotected !== void 0) Z.sharedUnprotectedHeader = e.unprotected;
  if (e.header !== void 0) Z.unprotectedHeader = e.header;
  if (I) return { ...Z, key: t };
  return Z;
}

export { et, Dt };
