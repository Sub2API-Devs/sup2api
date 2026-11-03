/**
 * jose/dist/browser/runtime/zlib.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { init_base64url } from "./base64url.js";
import {
  init_content_encryption_5,
  init_content_encryption_2,
  f,
} from "../../webapi/lib/content_encryption.js";
import { init_timing_safe_equal } from "./timing_safe_equal.js";
import { init_crypto_key } from "../../node/esm/lib/crypto_key.js";
import { init_buffer_utils } from "../../webapi/lib/buffer_utils.js";
import { L } from "../../node/esm/lib/invalid_key_input.js";
import { O, init_is_key_like } from "./is_key_like.js";
import { decrypt_default, decrypt } from "./decrypt.js";

//@ chunk-2tyrgda4.js:8812-8874 esm-layout
var init_zlib = Xa(() => {
  init_base64url();
  init_content_encryption_5();
  init_timing_safe_equal();
  init_crypto_key();
  init_content_encryption_2();
  init_buffer_utils();
  L();
  O();
  init_is_key_like();
  decrypt_default = decrypt;
});
//@ chunk-2tyrgda4.js:8874-9302 esm-fingerprint
var inflate = async () => {
  throw new f(
    'JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `inflateRaw` decrypt option to provide Inflate Raw implementation.',
  );
};
var deflate = async () => {
  throw new f(
    'JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `deflateRaw` encrypt option to provide Deflate Raw implementation.',
  );
};
export { init_zlib, inflate, deflate };
