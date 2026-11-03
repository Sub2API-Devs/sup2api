/**
 * pngjs/lib/parser-sync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { dn } from "./sync-inflate.js";
import { Et } from "./sync-reader.js";
import { _n } from "./filter-parse-sync.js";
import { pt } from "./parser.js";
import { gt } from "./bitmapper.js";
import { _t } from "./format-normaliser.js";

//@ chunk-spjgqa4y.js:46406-47377 cjs-fingerprint
var Tn = x(function (ru, En) {
  var mn = !0,
    Pe = importMetaRequire("zlib"),
    ps = dn();
  if (!Pe.deflateSync) mn = !1;
  var gs = Et(),
    yn = _n(),
    _s = pt(),
    wn = gt(),
    ms = _t();
  En.exports = function (t, e) {
    if (!mn)
      throw Error(
        "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0",
      );
    let r;
    function n(I) {
      r = I;
    }
    let i;
    function o(I) {
      i = I;
    }
    function s(I) {
      i.transColor = I;
    }
    function l(I) {
      i.palette = I;
    }
    function u() {
      i.alpha = !0;
    }
    let f;
    function a(I) {
      f = I;
    }
    let h = [];
    function c(I) {
      h.push(I);
    }
    let p = new gs(t);
    if (
      (new _s(e, {
        read: p.read.bind(p),
        error: n,
        metadata: o,
        gamma: a,
        palette: l,
        transColor: s,
        inflateData: c,
        simpleTransparency: u,
      }).start(),
      p.process(),
      r)
    )
      throw r;
    let buffer = Buffer.concat(h);
    h.length = 0;
    let m;
    if (i.interlace) m = Pe.inflateSync(buffer);
    else {
      let L = (((i.width * i.bpp * i.depth + 7) >> 3) + 1) * i.height;
      m = ps(buffer, { chunkSize: L, maxLength: L });
    }
    if (((buffer = null), !m || !m.length)) throw Error("bad png - invalid inflate data response");
    let E = yn.process(m, i);
    buffer = null;
    let dataToBitMap = wn.dataToBitMap(E, i);
    E = null;
    let ce = ms(dataToBitMap, i);
    return ((i.data = ce), (i.gamma = f || 0), i);
  };
});

export { Tn };
