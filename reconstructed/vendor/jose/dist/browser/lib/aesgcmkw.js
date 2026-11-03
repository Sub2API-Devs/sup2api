/**
 * jose/dist/browser/lib/aesgcmkw.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3), chunk-5h78gfwc.js (2)
 * attribution: esm-layout 3, esm-fingerprint 2
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { v, w } from "../runtime/base64url.js";
import { Me, E, Se, we } from "../../webapi/lib/content_encryption.js";
import { Ne } from "../runtime/timing_safe_equal.js";
import { W } from "../../webapi/lib/buffer_utils.js";
import { L } from "../../node/esm/lib/invalid_key_input.js";
import { O, M } from "../runtime/is_key_like.js";
import { ce, Tr } from "../runtime/encrypt.js";
import { Ke } from "../runtime/decrypt.js";
import { Et } from "../../webapi/key/export.js";
import { y } from "../../webapi/util/base64url.js";

//@ chunk-2tyrgda4.js:19683-19740 esm-layout
var ke = Xa(() => {
  v();
  Me();
  Ne();
  W();
  L();
  O();
  E();
  M();
  ce = Tr;
});
//@ chunk-2tyrgda4.js:19740-19899 esm-fingerprint
async function It(e, t, r, o) {
  let sliced = e.slice(0, 7);
  o || (o = Se(sliced));
  let { ciphertext: ciphertext, tag: tag } = await ce(sliced, r, t, o, new Uint8Array(0));
  return { encryptedKey: ciphertext, iv: w(o), tag: w(tag) };
}
//@ chunk-2tyrgda4.js:19899-19986 esm-layout
async function Rt(e, t, r, o, n) {
  let sliced = e.slice(0, 7);
  return Ke(sliced, t, r, o, n, new Uint8Array(0));
}
//@ chunk-5h78gfwc.js:23811-23845 esm-layout
async function At(e) {
  return Et(e);
}
//@ chunk-5h78gfwc.js:23845-23984 esm-fingerprint
async function gt(e, t, r, n) {
  let sliced = e.slice(0, 7),
    o = await we(sliced, r, t, n, new Uint8Array());
  return { encryptedKey: o.ciphertext, iv: y(o.iv), tag: y(o.tag) };
}

export { At, gt, ke, Rt, It };
