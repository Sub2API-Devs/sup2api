/**
 * jose/dist/node/esm/lib/encrypt_key_management.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-layout 3, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { W } from "../../../webapi/lib/buffer_utils.js";
import { O, M } from "../../../browser/runtime/is_key_like.js";
import { P, f } from "../../../webapi/lib/content_encryption.js";
import { Ft, Lr } from "../../../browser/runtime/key_to_jwk.js";
import { z } from "./check_key_type.js";
import { xe, bt, _e } from "../../../browser/runtime/ecdhes.js";
import { ie } from "./cek.js";
import { w } from "../../../browser/runtime/base64url.js";
import { V } from "../../../browser/runtime/jwk_to_key.js";
import { ne } from "../../../browser/runtime/aeskw.js";
import { vt } from "../../../browser/runtime/rsaes.js";
import { xt } from "../../../browser/runtime/pbes2kw.js";
import { It } from "../../../browser/lib/aesgcmkw.js";

//@ chunk-2tyrgda4.js:31220-31259 esm-layout
var Vt = Xa(() => {
  W();
  O();
  P();
  M();
  Ft = Lr;
});
//@ chunk-2tyrgda4.js:31259-31293 esm-layout
async function ot(e) {
  return Ft(e);
}
//@ chunk-2tyrgda4.js:31293-31315 esm-layout
var nt = Xa(() => {
  Vt();
});
//@ chunk-2tyrgda4.js:31315-32529 esm-fingerprint
async function $r(e, t, r, o, n = {}) {
  let a, i, c;
  switch ((z(e, r, "encrypt"), e)) {
    case "dir": {
      c = r;
      break;
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (!xe(r))
        throw new f("ECDH with the provided key is not allowed or not supported by your javascript runtime");
      let { apu: apu, apv: apv } = n,
        { epk: epk } = n;
      epk || (epk = (await bt(r)).privateKey);
      let { x: I, y: b, crv: crv, kty: kty } = await ot(epk),
        U = await _e(
          r,
          epk,
          e === "ECDH-ES" ? t : e,
          e === "ECDH-ES" ? ie(t) : parseInt(e.slice(-5, -2), 10),
          apu,
          apv,
        );
      if (((i = { epk: { x: I, crv: crv, kty: kty } }), kty === "EC")) i.epk.y = b;
      if (apu) i.apu = w(apu);
      if (apv) i.apv = w(apv);
      if (e === "ECDH-ES") {
        c = U;
        break;
      }
      c = o || V(t);
      let sliced = e.slice(-6);
      a = await ne(sliced, U, c);
      break;
    }
    case "RSA1_5":
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      ((c = o || V(t)), (a = await vt(e, r, c)));
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      c = o || V(t);
      let { p2c: p2c, p2s: p2s } = n;
      ({ encryptedKey: a, ...i } = await xt(e, r, c, p2c, p2s));
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      ((c = o || V(t)), (a = await ne(e, r, c)));
      break;
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      c = o || V(t);
      let { iv: iv } = n;
      ({ encryptedKey: a, ...i } = await It(e, r, c, iv));
      break;
    }
    default:
      throw new f('Invalid or unsupported "alg" (JWE Algorithm) header value');
  }
  return { cek: c, encryptedKey: a, parameters: i };
}

export { nt, $r };
