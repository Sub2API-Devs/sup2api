/**
 * jose/dist/webapi/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (7)
 * attribution: esm-layout 6, esm-fingerprint 1
 */
import { Xa } from "../../../../runtime/bun-runtime.js";
import {
  init_decode_protected_header_2,
  init_decode_protected_header,
} from "../node/esm/util/decode_protected_header.js";
import { init_base64url } from "../browser/runtime/base64url.js";
import { F } from "./lib/content_encryption.js";
import { init_subtle_dsa } from "../browser/runtime/subtle_dsa.js";
import { init_key_to_jwk } from "../browser/runtime/key_to_jwk.js";
import { init_signing_3 } from "./lib/signing.js";
import { init_jwt_claims_set } from "./lib/jwt_claims_set.js";
import { init_sign_4 } from "../node/esm/jwt/sign.js";
import { init_encrypt_key_management_2 } from "../node/esm/lib/encrypt_key_management.js";
import { init_check_key_type } from "../node/esm/lib/check_key_type.js";

//@ chunk-2tyrgda4.js:42251-42281 esm-layout
var init_webapi = Xa(() => {
  init_decode_protected_header_2();
  init_base64url();
  F();
});
//@ chunk-2tyrgda4.js:42281-42303 esm-fingerprint
var WEBCRYPTOAPI = "WebCryptoAPI";
//@ chunk-2tyrgda4.js:42303-42317 esm-layout
var dr = () => {};
//@ chunk-2tyrgda4.js:42317-42324 esm-layout
var Yr;
//@ chunk-2tyrgda4.js:42324-42352 esm-layout
var init_webapi_2 = Xa(() => {
  dr();
  Yr = WEBCRYPTOAPI;
});
//@ chunk-2tyrgda4.js:42352-42419 esm-layout
var init_webapi_3 = Xa(() => {
  init_subtle_dsa();
  init_key_to_jwk();
  init_signing_3();
  init_jwt_claims_set();
  init_sign_4();
  init_decode_protected_header();
  init_encrypt_key_management_2();
  init_check_key_type();
  init_webapi();
  init_webapi_2();
});
//@ chunk-2tyrgda4.js:42419-42424 esm-layout
init_webapi_3();
