/**
 * jose/dist/node/esm/jwe/compact/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { P, Ae, E } from "../../../../webapi/lib/content_encryption.js";
import { ke } from "../../../../browser/lib/aesgcmkw.js";
import { Ge, oe } from "../../../../webapi/lib/validate.js";
import { Xt, at } from "../flattened/encrypt.js";
import { v } from "../../../../browser/runtime/base64url.js";
import { pe } from "../../../../webapi/lib/options.js";

//@ chunk-2tyrgda4.js:36110-36117 esm-layout
var Gr;
//@ chunk-2tyrgda4.js:36117-36188 esm-layout
var Yt = Xa(() => {
  P();
  ke();
  Ge();
  Ae();
  Xt();
  E();
  oe();
  v();
  pe();
  Gr = Symbol();
});
//@ chunk-2tyrgda4.js:36188-36693 esm-fingerprint
class qt {
  constructor(e) {
    this._flattened = new at(e);
  }
  setContentEncryptionKey(e) {
    return (this._flattened.setContentEncryptionKey(e), this);
  }
  setInitializationVector(e) {
    return (this._flattened.setInitializationVector(e), this);
  }
  setProtectedHeader(e) {
    return (this._flattened.setProtectedHeader(e), this);
  }
  setKeyManagementParameters(e) {
    return (this._flattened.setKeyManagementParameters(e), this);
  }
  async encrypt(e, t) {
    let encrypt = await this._flattened.encrypt(e, t);
    return [encrypt.protected, encrypt.encrypted_key, encrypt.iv, encrypt.ciphertext, encrypt.tag].join(".");
  }
}

export { Yt, Gr };
