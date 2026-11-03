/**
 * pngjs/lib/filter-parse-async.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { st } from "./chunkstream.js";
import { ft } from "./filter-parse.js";

//@ chunk-spjgqa4y.js:25954-26249 cjs-fingerprint
var Fr = x(function (Gl, Ur) {
  var qr = importMetaRequire("util"),
    at = st(),
    Po = ft(),
    ko = (Ur.exports = function (t) {
      at.call(this);
      let e = [],
        r = this;
      ((this._filter = new Po(t, {
        read: this.read.bind(this),
        write: function (n) {
          e.push(n);
        },
        complete: function () {
          r.emit("complete", Buffer.concat(e));
        },
      })),
        this._filter.start());
    });
  qr.inherits(ko, at);
});

export { Fr };
