/**
 * pngjs/lib/packer-sync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { se } from "./constants.js";
import { yt } from "./packer.js";

//@ chunk-spjgqa4y.js:47377-47987 cjs-fingerprint
var Bn = x(function (nu, xn) {
  var Cn = !0,
    ke = importMetaRequire("zlib");
  if (!ke.deflateSync) Cn = !1;
  var bn = se(),
    ys = yt();
  xn.exports = function (t, e) {
    if (!Cn)
      throw Error(
        "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0",
      );
    let n = new ys(e || {}),
      i = [];
    if ((i.push(Buffer.from(bn.PNG_SIGNATURE)), i.push(n.packIHDR(t.width, t.height)), t.gamma))
      i.push(n.packGAMA(t.gamma));
    let filterData = n.filterData(t.data, t.width, t.height),
      deflateSync = ke.deflateSync(filterData, n.getDeflateOptions());
    if (((filterData = null), !deflateSync || !deflateSync.length))
      throw Error("bad png - invalid compressed data response");
    return (i.push(n.packIDAT(deflateSync)), i.push(n.packIEND()), Buffer.concat(i));
  };
});

export { Bn };
