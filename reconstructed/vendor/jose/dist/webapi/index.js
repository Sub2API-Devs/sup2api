/**
 * jose/dist/webapi/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (7)
 * attribution: esm-layout 6, esm-fingerprint 1
 */
import { Xa } from "../../../../runtime/bun-runtime.js";
import { sr, ar } from "../node/esm/util/decode_protected_header.js";
import { v } from "../browser/runtime/base64url.js";
import { F } from "./lib/content_encryption.js";
import { Mt } from "../browser/runtime/subtle_dsa.js";
import { Gt } from "../browser/runtime/key_to_jwk.js";
import { Zt } from "./lib/signing.js";
import { st } from "./lib/jwt_claims_set.js";
import { nr } from "../node/esm/jwt/sign.js";
import { nt } from "../node/esm/lib/encrypt_key_management.js";
import { Qe } from "../node/esm/lib/check_key_type.js";

//@ chunk-2tyrgda4.js:42251-42281 esm-layout
var cr = Xa(() => {
  sr();
  v();
  F();
});
//@ chunk-2tyrgda4.js:42281-42303 esm-fingerprint
var WEBCRYPTOAPI = "WebCryptoAPI";
//@ chunk-2tyrgda4.js:42303-42317 esm-layout
var dr = () => {};
//@ chunk-2tyrgda4.js:42317-42324 esm-layout
var Yr;
//@ chunk-2tyrgda4.js:42324-42352 esm-layout
var fr = Xa(() => {
  dr();
  Yr = WEBCRYPTOAPI;
});
//@ chunk-2tyrgda4.js:42352-42419 esm-layout
var qr = Xa(() => {
  Mt();
  Gt();
  Zt();
  st();
  nr();
  ar();
  nt();
  Qe();
  cr();
  fr();
});
//@ chunk-2tyrgda4.js:42419-42424 esm-layout
qr();
