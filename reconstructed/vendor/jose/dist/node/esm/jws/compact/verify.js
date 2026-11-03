/**
 * jose/dist/node/esm/jws/compact/verify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2), chunk-5h78gfwc.js (1)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  F,
  y,
} from "../../../../webapi/lib/content_encryption.js";
import { init_verify, flattenedVerify } from "../flattened/verify.js";
import { init_base64url, C } from "../../../../browser/runtime/base64url.js";
import { init_validate_2 } from "../../../../webapi/lib/validate.js";
import { init_encrypt } from "../../../../browser/runtime/encrypt.js";
import { init_options_2 } from "../../../../webapi/lib/options.js";
import { init_decrypt } from "../../jwe/flattened/decrypt.js";
import { textDecoder } from "../../../../webapi/lib/buffer_utils.js";
import { JWSInvalid } from "../../util/errors.js";
import { flattenedVerify_2 } from "../../../../webapi/jws/flattened/verify.js";

//@ chunk-2tyrgda4.js:30438-30496 esm-layout
var init_verify_2 = Xa(() => {
  init_content_encryption();
  init_verify();
  init_content_encryption_2();
  init_base64url();
  init_validate_2();
  F();
  init_encrypt();
  init_options_2();
  init_decrypt();
});
//@ chunk-2tyrgda4.js:30496-30895 esm-fingerprint
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) jws = C.decode(jws);
  if (typeof jws !== "string") throw new y("Compact JWS must be a string or Uint8Array");
  let { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) throw new y("Invalid Compact JWS");
  let verified = await flattenedVerify(
    {
      payload,
      protected: protectedHeader,
      signature,
    },
    key,
    options,
  );
  let result = {
    payload: verified.payload,
    protectedHeader: verified.protectedHeader,
  };
  if (typeof key === "function")
    return {
      ...result,
      key: verified.key,
    };
  return result;
}
//@ chunk-5h78gfwc.js:39805-40204 esm-fingerprint
async function compactVerify_2(jws, key, options) {
  if (jws instanceof Uint8Array) jws = textDecoder.decode(jws);
  if (typeof jws !== "string") throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  let { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) throw new JWSInvalid("Invalid Compact JWS");
  let verified = await flattenedVerify_2(
    {
      payload,
      protected: protectedHeader,
      signature,
    },
    key,
    options,
  );
  let result = {
    payload: verified.payload,
    protectedHeader: verified.protectedHeader,
  };
  if (typeof key === "function")
    return {
      ...result,
      key: verified.key,
    };
  return result;
}
export { init_verify_2, compactVerify_2 };
