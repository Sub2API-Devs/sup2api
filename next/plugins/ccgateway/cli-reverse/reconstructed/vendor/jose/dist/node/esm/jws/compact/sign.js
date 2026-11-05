/**
 * jose/dist/node/esm/jws/compact/sign.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __esm } from "../../../../../../../runtime/bun-runtime.js";
import {
  init_content_encryption,
  init_content_encryption_2,
} from "../../../../webapi/lib/content_encryption.js";
import { init_sign } from "../../../../webapi/lib/signing.js";
import { init_validate_2 } from "../../../../webapi/lib/validate.js";
import { init_base64url } from "../../../../browser/runtime/base64url.js";
import { init_encrypt } from "../../lib/check_key_type.js";
import { init_options_2 } from "../../../../webapi/lib/options.js";
import { FlattenedSign } from "../flattened/sign.js";

//@ chunk-pd6th42n.js:38428-38477 esm-layout
var init_sign_2 = __esm(() => {
  init_content_encryption();
  init_sign();
  init_validate_2();
  init_content_encryption_2();
  init_base64url();
  init_encrypt();
  init_options_2();
});
//@ chunk-pd6th42n.js:38477-38804 esm-fingerprint
class CompactSign {
  constructor(payload) {
    this._flattened = new FlattenedSign(payload);
  }
  setProtectedHeader(protectedHeader) {
    this._flattened.setProtectedHeader(protectedHeader);
    return this;
  }
  async sign(key, options) {
    let jws = await this._flattened.sign(key, options);
    if (jws.payload === undefined)
      throw TypeError("use the flattened module for creating JWS with b64: false");
    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
}
export { init_sign_2, CompactSign };
