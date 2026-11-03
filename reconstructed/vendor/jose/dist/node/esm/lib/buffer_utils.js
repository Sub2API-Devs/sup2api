/**
 * jose/dist/node/esm/lib/buffer_utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (8)
 * attribution: esm-layout 4, esm-fingerprint 4
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { init_buffer_utils, ue, mr } from "../../../webapi/lib/buffer_utils.js";
import { l, le } from "../../../browser/runtime/base64url.js";

//@ chunk-2tyrgda4.js:389-416 esm-layout
var init_buffer_utils_2 = Xa(() => {
  init_buffer_utils();
  ue = mr;
});
//@ chunk-2tyrgda4.js:416-545 esm-fingerprint
function concat(...buffers) {
  let size = buffers.reduce((acc, { length }) => acc + length, 0);
  let buf = new Uint8Array(size);
  let i = 0;
  buffers.forEach((buffer) => {
    buf.set(buffer, i);
    i += buffer.length;
  });
  return buf;
}
//@ chunk-2tyrgda4.js:545-606 esm-fingerprint
function p2s(alg, p2sInput) {
  return concat(l.encode(alg), new Uint8Array([0]), p2sInput);
}
//@ chunk-2tyrgda4.js:606-745 esm-fingerprint
function writeUInt32BE(buf, value, offset) {
  if (value < 0 || value >= le) throw RangeError(`value must be >= 0 and <= ${le - 1}. Received ${value}`);
  buf.set([value >>> 24, value >>> 16, value >>> 8, value & 255], offset);
}
//@ chunk-2tyrgda4.js:745-839 esm-layout
function he(value) {
  let floored = Math.floor(value / le);
  let low = value % le;
  let buf = new Uint8Array(8);
  writeUInt32BE(buf, floored, 0);
  writeUInt32BE(buf, low, 4);
  return buf;
}
//@ chunk-2tyrgda4.js:839-895 esm-layout
function uint32be(value) {
  let buf = new Uint8Array(4);
  writeUInt32BE(buf, value);
  return buf;
}
//@ chunk-2tyrgda4.js:895-935 esm-layout
function lengthAndInput(input) {
  return concat(uint32be(input.length), input);
}
//@ chunk-2tyrgda4.js:935-1175 esm-fingerprint
async function concatKdf(secret, bits, value) {
  let iterations = Math.ceil((bits >> 3) / 32);
  let res = new Uint8Array(iterations * 32);
  for (let iter = 0; iter < iterations; iter++) {
    let buf = new Uint8Array(4 + secret.length + value.length);
    buf.set(uint32be(iter + 1));
    buf.set(secret, 4);
    buf.set(value, 4 + secret.length);
    res.set(await ue("sha256", buf), iter * 32);
  }
  return res.slice(0, bits >> 3);
}
export { init_buffer_utils_2, concat, he, lengthAndInput, uint32be, concatKdf, p2s };
