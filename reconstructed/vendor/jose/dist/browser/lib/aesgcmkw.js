/**
 * jose/dist/browser/lib/aesgcmkw.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3), chunk-5h78gfwc.js (2)
 * attribution: esm-layout 3, esm-fingerprint 2
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { init_base64url, encode } from "../runtime/base64url.js";
import {
  init_content_encryption_5,
  init_content_encryption_2,
  Se,
  encrypt,
} from "../../webapi/lib/content_encryption.js";
import { init_timing_safe_equal } from "../runtime/timing_safe_equal.js";
import { init_buffer_utils } from "../../webapi/lib/buffer_utils.js";
import { L } from "../../node/esm/lib/invalid_key_input.js";
import { O, init_is_key_like } from "../runtime/is_key_like.js";
import { encrypt_default, encrypt_3 } from "../runtime/encrypt.js";
import { decrypt_default } from "../runtime/decrypt.js";
import { Et } from "../../webapi/key/export.js";
import { encode_2 } from "../../webapi/util/base64url.js";

//@ chunk-2tyrgda4.js:19683-19740 esm-layout
var init_aesgcmkw = Xa(() => {
  init_base64url();
  init_content_encryption_5();
  init_timing_safe_equal();
  init_buffer_utils();
  L();
  O();
  init_content_encryption_2();
  init_is_key_like();
  encrypt_default = encrypt_3;
});
//@ chunk-2tyrgda4.js:19740-19899 esm-fingerprint
async function wrap_2(alg, key, cek, iv) {
  let jweAlgorithm = alg.slice(0, 7);
  if (!iv) iv = Se(jweAlgorithm);
  let { ciphertext: encryptedKey, tag } = await encrypt_default(
    jweAlgorithm,
    cek,
    key,
    iv,
    new Uint8Array(0),
  );
  return {
    encryptedKey,
    iv: encode(iv),
    tag: encode(tag),
  };
}
//@ chunk-2tyrgda4.js:19899-19986 esm-layout
async function Rt(alg, key, encryptedKey, iv, tag) {
  let jweAlgorithm = alg.slice(0, 7);
  return decrypt_default(jweAlgorithm, key, encryptedKey, iv, tag, new Uint8Array(0));
}
//@ chunk-5h78gfwc.js:23811-23845 esm-layout
async function At(key) {
  return Et(key);
}
//@ chunk-5h78gfwc.js:23845-23984 esm-fingerprint
async function gt(alg, key, cek, n) {
  let jweAlgorithm = alg.slice(0, 7);
  let o = await encrypt(jweAlgorithm, cek, key, n, new Uint8Array());
  return {
    encryptedKey: o.ciphertext,
    iv: encode_2(o.iv),
    tag: encode_2(o.tag),
  };
}
export { At, gt, init_aesgcmkw, Rt, wrap_2 };
