/**
 * jose/dist/browser/runtime/zlib.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { v } from "./base64url.js";
import { Me, E, f } from "../../webapi/lib/content_encryption.js";
import { Ne } from "./timing_safe_equal.js";
import { lt } from "../../node/esm/lib/crypto_key.js";
import { W } from "../../webapi/lib/buffer_utils.js";
import { L } from "../../node/esm/lib/invalid_key_input.js";
import { O, M } from "./is_key_like.js";
import { Ke, br } from "./decrypt.js";

//@ chunk-2tyrgda4.js:8812-8874 esm-layout
var $e = Xa(() => {
  v();
  Me();
  Ne();
  lt();
  E();
  W();
  L();
  O();
  M();
  Ke = br;
});
//@ chunk-2tyrgda4.js:8874-9302 esm-fingerprint
var Et = async () => {
    throw new f(
      'JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `inflateRaw` decrypt option to provide Inflate Raw implementation.',
    );
  },
  St = async () => {
    throw new f(
      'JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `deflateRaw` encrypt option to provide Deflate Raw implementation.',
    );
  };

export { $e, Et, St };
