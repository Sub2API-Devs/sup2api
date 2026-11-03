/**
 * jose/dist/node/esm/lib/decrypt_key_management.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { ke, Rt } from "../../../browser/lib/aesgcmkw.js";
import { $e } from "../../../browser/runtime/zlib.js";
import { Ae, P, s, f } from "../../../webapi/lib/content_encryption.js";
import { z } from "./check_key_type.js";
import { K } from "../../../webapi/lib/validate.js";
import { xe, _e } from "../../../browser/runtime/ecdhes.js";
import { Ze } from "../key/import.js";
import { S } from "../../../browser/runtime/base64url.js";
import { ie } from "./cek.js";
import { ae } from "../../../browser/runtime/aeskw.js";
import { Pt } from "../../../browser/runtime/rsaes.js";
import { Ht } from "../../../browser/runtime/pbes2kw.js";

//@ chunk-2tyrgda4.js:19986-20022 esm-layout
var je = Xa(() => {
  ke();
  $e();
  Ae();
  P();
});
//@ chunk-2tyrgda4.js:20022-22519 esm-fingerprint
async function Ur(e, t, r, o, n) {
  switch ((z(e, t, "decrypt"), e)) {
    case "dir": {
      if (r !== void 0) throw new s("Encountered unexpected JWE Encrypted Key");
      return t;
    }
    case "ECDH-ES":
      if (r !== void 0) throw new s("Encountered unexpected JWE Encrypted Key");
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (!K(o.epk)) throw new s('JOSE Header "epk" (Ephemeral Public Key) missing or invalid');
      if (!xe(t))
        throw new f("ECDH with the provided key is not allowed or not supported by your javascript runtime");
      let a = await Ze(o.epk, e),
        i,
        c;
      if (o.apu !== void 0) {
        if (typeof o.apu !== "string") throw new s('JOSE Header "apu" (Agreement PartyUInfo) invalid');
        try {
          i = S(o.apu);
        } catch (error) {
          throw new s("Failed to base64url decode the apu");
        }
      }
      if (o.apv !== void 0) {
        if (typeof o.apv !== "string") throw new s('JOSE Header "apv" (Agreement PartyVInfo) invalid');
        try {
          c = S(o.apv);
        } catch (error) {
          throw new s("Failed to base64url decode the apv");
        }
      }
      let d = await _e(
        a,
        t,
        e === "ECDH-ES" ? o.enc : e,
        e === "ECDH-ES" ? ie(o.enc) : parseInt(e.slice(-5, -2), 10),
        i,
        c,
      );
      if (e === "ECDH-ES") return d;
      if (r === void 0) throw new s("JWE Encrypted Key missing");
      return ae(e.slice(-6), d, r);
    }
    case "RSA1_5":
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      if (r === void 0) throw new s("JWE Encrypted Key missing");
      return Pt(e, t, r);
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      if (r === void 0) throw new s("JWE Encrypted Key missing");
      if (typeof o.p2c !== "number") throw new s('JOSE Header "p2c" (PBES2 Count) missing or invalid');
      let a = (n === null || n === void 0 ? void 0 : n.maxPBES2Count) || 1e4;
      if (o.p2c > a) throw new s('JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds');
      if (typeof o.p2s !== "string") throw new s('JOSE Header "p2s" (PBES2 Salt) missing or invalid');
      let i;
      try {
        i = S(o.p2s);
      } catch (error) {
        throw new s("Failed to base64url decode the p2s");
      }
      return Ht(e, t, r, o.p2c, i);
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      if (r === void 0) throw new s("JWE Encrypted Key missing");
      return ae(e, t, r);
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      if (r === void 0) throw new s("JWE Encrypted Key missing");
      if (typeof o.iv !== "string")
        throw new s('JOSE Header "iv" (Initialization Vector) missing or invalid');
      if (typeof o.tag !== "string") throw new s('JOSE Header "tag" (Authentication Tag) missing or invalid');
      let a;
      try {
        a = S(o.iv);
      } catch (error) {
        throw new s("Failed to base64url decode the iv");
      }
      let i;
      try {
        i = S(o.tag);
      } catch (error) {
        throw new s("Failed to base64url decode the tag");
      }
      return Rt(e, t, r, a, i);
    }
    default:
      throw new f('Invalid or unsupported "alg" (JWE Algorithm) header value');
  }
}

export { je, Ur };
