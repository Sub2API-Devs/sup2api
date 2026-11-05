/**
 * jose/dist/node/esm/jwe/compact/encrypt.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { __esm } from "../../../../../../../runtime/bun-runtime.js";
import {
  init_content_encryption,
  init_content_encryption_4,
  init_content_encryption_2,
} from "../../../../webapi/lib/content_encryption.js";
import { init_aesgcmkw } from "../../../../browser/runtime/encrypt.js";
import { init_validate, init_validate_2 } from "../../../../webapi/lib/validate.js";
import { init_encrypt_2, FlattenedEncrypt } from "../flattened/encrypt.js";
import { init_base64url } from "../../../../browser/runtime/base64url.js";
import { init_options_2 } from "../../../../webapi/lib/options.js";

//@ chunk-pd6th42n.js:36110-36117 esm-layout
var jweEncryptInit;
//@ chunk-pd6th42n.js:36117-36188 esm-layout
var init_encrypt_3 = __esm(() => {
  init_content_encryption();
  init_aesgcmkw();
  init_validate();
  init_content_encryption_4();
  init_encrypt_2();
  init_content_encryption_2();
  init_validate_2();
  init_base64url();
  init_options_2();
  jweEncryptInit = Symbol();
});
//@ chunk-pd6th42n.js:36188-36693 esm-fingerprint
class CompactEncrypt {
  constructor(plaintext) {
    this._flattened = new FlattenedEncrypt(plaintext);
  }
  setContentEncryptionKey(cek) {
    this._flattened.setContentEncryptionKey(cek);
    return this;
  }
  setInitializationVector(iv) {
    this._flattened.setInitializationVector(iv);
    return this;
  }
  setProtectedHeader(protectedHeader) {
    this._flattened.setProtectedHeader(protectedHeader);
    return this;
  }
  setKeyManagementParameters(parameters) {
    this._flattened.setKeyManagementParameters(parameters);
    return this;
  }
  async encrypt(key, options) {
    let jwe = await this._flattened.encrypt(key, options);
    return [jwe.protected, jwe.encrypted_key, jwe.iv, jwe.ciphertext, jwe.tag].join(".");
  }
}
export { init_encrypt_3, jweEncryptInit, CompactEncrypt };
