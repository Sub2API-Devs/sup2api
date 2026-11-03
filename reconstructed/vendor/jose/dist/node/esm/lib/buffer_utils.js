/**
 * jose/dist/node/esm/lib/buffer_utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (8)
 * attribution: esm-layout 4, esm-fingerprint 4
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { W, ue, mr } from "../../../webapi/lib/buffer_utils.js";
import { l, le } from "../../../browser/runtime/base64url.js";

//@ chunk-2tyrgda4.js:389-416 esm-layout
var Ie = Xa(() => {
  W();
  ue = mr;
});
//@ chunk-2tyrgda4.js:416-545 esm-fingerprint
function _(...e) {
  let reduced = e.reduce((n, { length: a }) => n + a, 0),
    uint8Array = new Uint8Array(reduced),
    o = 0;
  return (
    e.forEach((n) => {
      (uint8Array.set(n, o), (o += n.length));
    }),
    uint8Array
  );
}
//@ chunk-2tyrgda4.js:545-606 esm-fingerprint
function ft(e, t) {
  return _(l.encode(e), new Uint8Array([0]), t);
}
//@ chunk-2tyrgda4.js:606-745 esm-fingerprint
function Re(e, t, r) {
  if (t < 0 || t >= le) throw RangeError(`value must be >= 0 and <= ${le - 1}. Received ${t}`);
  e.set([t >>> 24, t >>> 16, t >>> 8, t & 255], r);
}
//@ chunk-2tyrgda4.js:745-839 esm-layout
function he(e) {
  let floored = Math.floor(e / le),
    r = e % le,
    uint8Array = new Uint8Array(8);
  return (Re(uint8Array, floored, 0), Re(uint8Array, r, 4), uint8Array);
}
//@ chunk-2tyrgda4.js:839-895 esm-layout
function ye(e) {
  let uint8Array = new Uint8Array(4);
  return (Re(uint8Array, e), uint8Array);
}
//@ chunk-2tyrgda4.js:895-935 esm-layout
function we(e) {
  return _(ye(e.length), e);
}
//@ chunk-2tyrgda4.js:935-1175 esm-fingerprint
async function mt(e, t, r) {
  let ceil = Math.ceil((t >> 3) / 32),
    uint8Array = new Uint8Array(ceil * 32);
  for (let a = 0; a < ceil; a++) {
    let uint8Array_2 = new Uint8Array(4 + e.length + r.length);
    (uint8Array_2.set(ye(a + 1)),
      uint8Array_2.set(e, 4),
      uint8Array_2.set(r, 4 + e.length),
      uint8Array.set(await ue("sha256", uint8Array_2), a * 32));
  }
  return uint8Array.slice(0, t >> 3);
}

export { Ie, _, he, we, ye, mt, ft };
