/**
 * jose/dist/webapi/lib/check_key_type.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-layout 2
 */
import { te, rt, et, tt } from "./type_checks.js";
import { We } from "./key.js";
import { Pe } from "../../node/esm/lib/invalid_key_input.js";

//@ chunk-5h78gfwc.js:28225-30586 esm-layout
var Z = (e) => e?.[Symbol.toStringTag],
  Te = (e, t, r) => {
    if (t.use !== void 0) {
      let n;
      switch (r) {
        case "sign":
        case "verify":
          n = "sig";
          break;
        case "encrypt":
        case "decrypt":
          n = "enc";
          break;
      }
      if (t.use !== n)
        throw TypeError(`Invalid key for this operation, its "use" must be "${n}" when present`);
    }
    if (t.alg !== void 0 && t.alg !== e)
      throw TypeError(`Invalid key for this operation, its "alg" must be "${e}" when present`);
    if (Array.isArray(t.key_ops)) {
      let n;
      switch (!0) {
        case r === "sign" || r === "verify":
        case e === "dir":
        case e.includes("CBC-HS"):
          n = r;
          break;
        case e.startsWith("PBES2"):
          n = "deriveBits";
          break;
        case /^A\d{3}(?:GCM)?(?:KW)?$/.test(e):
          if (!e.includes("GCM") && e.endsWith("KW")) n = r === "encrypt" ? "wrapKey" : "unwrapKey";
          else n = r;
          break;
        case r === "encrypt" && e.startsWith("RSA"):
          n = "wrapKey";
          break;
        case r === "decrypt":
          n = e.startsWith("RSA") ? "unwrapKey" : "deriveBits";
          break;
      }
      if (n && t.key_ops?.includes?.(n) === !1)
        throw TypeError(`Invalid key for this operation, its "key_ops" must include "${n}" when present`);
    }
    return !0;
  },
  sr = (e, t, r) => {
    if (t instanceof Uint8Array) return;
    if (te(t)) {
      if (rt(t) && Te(e, t, r)) return;
      throw TypeError(
        'JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present',
      );
    }
    if (!We(t)) throw TypeError(Pe(e, t, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array"));
    if (t.type !== "secret")
      throw TypeError(`${Z(t)} instances for symmetric algorithms must be of type "secret"`);
  },
  cr = (e, t, r) => {
    if (te(t))
      switch (r) {
        case "decrypt":
        case "sign":
          if (et(t) && Te(e, t, r)) return;
          throw TypeError("JSON Web Key for this operation must be a private JWK");
        case "encrypt":
        case "verify":
          if (tt(t) && Te(e, t, r)) return;
          throw TypeError("JSON Web Key for this operation must be a public JWK");
      }
    if (!We(t)) throw TypeError(Pe(e, t, "CryptoKey", "KeyObject", "JSON Web Key"));
    if (t.type === "secret")
      throw TypeError(`${Z(t)} instances for asymmetric algorithms must not be of type "secret"`);
    if (t.type === "public")
      switch (r) {
        case "sign":
          throw TypeError(`${Z(t)} instances for asymmetric algorithm signing must be of type "private"`);
        case "decrypt":
          throw TypeError(`${Z(t)} instances for asymmetric algorithm decryption must be of type "private"`);
      }
    if (t.type === "private")
      switch (r) {
        case "verify":
          throw TypeError(`${Z(t)} instances for asymmetric algorithm verifying must be of type "public"`);
        case "encrypt":
          throw TypeError(`${Z(t)} instances for asymmetric algorithm encryption must be of type "public"`);
      }
  };
//@ chunk-5h78gfwc.js:30586-30709 esm-layout
function B(e, t, r) {
  switch (e.substring(0, 2)) {
    case "A1":
    case "A2":
    case "di":
    case "HS":
    case "PB":
      sr(e, t, r);
      break;
    default:
      cr(e, t, r);
  }
}

export { B };
