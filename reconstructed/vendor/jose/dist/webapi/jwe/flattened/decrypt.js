/**
 * jose/dist/webapi/jwe/flattened/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { b, _ } from "../../lib/type_checks.js";
import { c, f_2, z } from "../../../node/esm/util/errors.js";
import { v_2 } from "../../util/base64url.js";
import { textDecoder, A, E_2 } from "../../lib/buffer_utils.js";
import { N, ce } from "../../lib/options.js";
import { I } from "../../lib/helpers.js";
import { B } from "../../lib/check_key_type.js";
import { R } from "../../lib/normalize_key.js";
import { xt } from "../../lib/key_management.js";
import { M_2, Se_5h78 } from "../../lib/content_encryption.js";
import { It } from "../../lib/deflate.js";

//@ chunk-5h78gfwc.js:31501-34826 esm-fingerprint
async function Ht(e, t, r) {
  if (!b(e)) throw new c("Flattened JWE must be an object");
  if (e.protected === void 0 && e.header === void 0 && e.unprotected === void 0)
    throw new c("JOSE Header missing");
  if (e.iv !== void 0 && typeof e.iv !== "string") throw new c("JWE Initialization Vector incorrect type");
  if (typeof e.ciphertext !== "string") throw new c("JWE Ciphertext missing or incorrect type");
  if (e.tag !== void 0 && typeof e.tag !== "string") throw new c("JWE Authentication Tag incorrect type");
  if (e.protected !== void 0 && typeof e.protected !== "string")
    throw new c("JWE Protected Header incorrect type");
  if (e.encrypted_key !== void 0 && typeof e.encrypted_key !== "string")
    throw new c("JWE Encrypted Key incorrect type");
  if (e.aad !== void 0 && typeof e.aad !== "string") throw new c("JWE AAD incorrect type");
  if (e.header !== void 0 && !b(e.header)) throw new c("JWE Shared Unprotected Header incorrect type");
  if (e.unprotected !== void 0 && !b(e.unprotected))
    throw new c("JWE Per-Recipient Unprotected Header incorrect type");
  let n;
  if (e.protected)
    try {
      let J = v_2(e.protected);
      n = JSON.parse(textDecoder.decode(J));
    } catch {
      throw new c("JWE Protected Header is invalid");
    }
  if (!_(n, e.header, e.unprotected))
    throw new c(
      "JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint",
    );
  let i = { ...n, ...e.header, ...e.unprotected };
  if ((N(c, new Map(), r?.crit, n, i), i.zip !== void 0 && i.zip !== "DEF"))
    throw new f_2('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value.');
  if (i.zip !== void 0 && !n?.zip)
    throw new c('JWE "zip" (Compression Algorithm) Header Parameter MUST be in a protected header.');
  let { alg: alg, enc: enc } = i;
  if (typeof alg !== "string" || !alg) throw new c("missing JWE Algorithm (alg) in JWE Header");
  if (typeof enc !== "string" || !enc) throw new c("missing JWE Encryption Algorithm (enc) in JWE Header");
  let s = r && ce("keyManagementAlgorithms", r.keyManagementAlgorithms),
    p = r && ce("contentEncryptionAlgorithms", r.contentEncryptionAlgorithms);
  if ((s && !s.has(alg)) || (!s && alg.startsWith("PBES2")))
    throw new z('"alg" (Algorithm) Header Parameter value not allowed');
  if (p && !p.has(enc)) throw new z('"enc" (Encryption Algorithm) Header Parameter value not allowed');
  let d;
  if (e.encrypted_key !== void 0) d = I(e.encrypted_key, "encrypted_key", c);
  let u = !1;
  if (typeof t === "function") ((t = await t(n, e)), (u = !0));
  B(alg === "dir" ? enc : alg, t, "decrypt");
  let m = await R(t, alg),
    w;
  try {
    w = await xt(alg, m, d, i, r);
  } catch (error) {
    if (error instanceof TypeError || error instanceof c || error instanceof f_2) throw error;
    w = M_2(enc);
  }
  let K, S;
  if (e.iv !== void 0) K = I(e.iv, "iv", c);
  if (e.tag !== void 0) S = I(e.tag, "tag", c);
  let l = e.protected !== void 0 ? A(e.protected) : new Uint8Array(),
    g;
  if (e.aad !== void 0) g = E_2(l, A("."), A(e.aad));
  else g = l;
  let ge = I(e.ciphertext, "ciphertext", c),
    _e = await Se_5h78(enc, w, ge, K, S, g),
    G = { plaintext: _e };
  if (i.zip === "DEF") {
    let J = r?.maxDecompressedLength ?? 250000;
    if (J === 0) throw new f_2('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
    if (J !== 1 / 0 && (!Number.isSafeInteger(J) || J < 1))
      throw TypeError("maxDecompressedLength must be 0, a positive safe integer, or Infinity");
    G.plaintext = await It(_e, J).catch((be) => {
      if (be instanceof c) throw be;
      throw new c("Failed to decompress plaintext", { cause: be });
    });
  }
  if (e.protected !== void 0) G.protectedHeader = n;
  if (e.aad !== void 0) G.additionalAuthenticatedData = I(e.aad, "aad", c);
  if (e.unprotected !== void 0) G.sharedUnprotectedHeader = e.unprotected;
  if (e.header !== void 0) G.unprotectedHeader = e.header;
  if (u) return { ...G, key: m };
  return G;
}

export { Ht };
