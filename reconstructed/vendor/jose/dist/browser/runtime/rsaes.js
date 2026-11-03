/**
 * jose/dist/browser/runtime/rsaes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { g, p } from "../../webapi/lib/buffer_utils.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { m } from "./is_key_like.js";
import { J } from "../../node/esm/lib/crypto_key.js";
import { q } from "../../webapi/lib/signing.js";
import { te } from "../../webapi/lib/key_management.js";
import { ee } from "../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:12890-12904 esm-layout
var He = () => {};
//@ chunk-2tyrgda4.js:12904-13748 esm-fingerprint
var vt = async (e, t, r) => {
    if (!g(t)) throw TypeError(A(t, ...m));
    if ((J(t, e, "encrypt", "wrapKey"), q(e, t), t.usages.includes("encrypt")))
      return new Uint8Array(await p.subtle.encrypt(te(e), t, r));
    if (t.usages.includes("wrapKey")) {
      let importKey = await p.subtle.importKey("raw", r, ...ee);
      return new Uint8Array(await p.subtle.wrapKey("raw", importKey, t, te(e)));
    }
    throw TypeError('RSA-OAEP key "usages" must include "encrypt" or "wrapKey" for this operation');
  },
  Pt = async (e, t, r) => {
    if (!g(t)) throw TypeError(A(t, ...m));
    if ((J(t, e, "decrypt", "unwrapKey"), q(e, t), t.usages.includes("decrypt")))
      return new Uint8Array(await p.subtle.decrypt(te(e), t, r));
    if (t.usages.includes("unwrapKey")) {
      let unwrapKey = await p.subtle.unwrapKey("raw", r, t, te(e), ...ee);
      return new Uint8Array(await p.subtle.exportKey("raw", unwrapKey));
    }
    throw TypeError('RSA-OAEP key "usages" must include "decrypt" or "unwrapKey" for this operation');
  };

export { He, Pt, vt };
