/**
 * @mixmark-io/domino/lib/CharacterData.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Nn } from "./Leaf.js";
import { ee } from "./utils.js";
import { ra } from "./ChildNode.js";
import { mn } from "./NonDocumentTypeChildNode.js";

//@ chunk-vwj6ccer.js:62721-63701 cjs-fingerprint
var lr = x(function (yd, Vs) {
  Vs.exports = ia;
  var Us = Nn(),
    Ps = ee(),
    rx = ra(),
    ax = mn();
  function ia() {
    Us.call(this);
  }
  ia.prototype = Object.create(Us.prototype, {
    substringData: {
      value: function (t, r) {
        if (arguments.length < 2) throw TypeError("Not enough arguments");
        if (((t = t >>> 0), (r = r >>> 0), t > this.data.length || t < 0 || r < 0)) Ps.IndexSizeError();
        return this.data.substring(t, t + r);
      },
    },
    appendData: {
      value: function (t) {
        if (arguments.length < 1) throw TypeError("Not enough arguments");
        this.data += String(t);
      },
    },
    insertData: {
      value: function (t, r) {
        return this.replaceData(t, 0, r);
      },
    },
    deleteData: {
      value: function (t, r) {
        return this.replaceData(t, r, "");
      },
    },
    replaceData: {
      value: function (t, r, a) {
        var s = this.data,
          c = s.length;
        if (((t = t >>> 0), (r = r >>> 0), (a = String(a)), t > c || t < 0)) Ps.IndexSizeError();
        if (t + r > c) r = c - t;
        var substring = s.substring(0, t),
          substring_2 = s.substring(t + r);
        this.data = substring + a + substring_2;
      },
    },
    isEqual: {
      value: function (t) {
        return this._data === t._data;
      },
    },
    length: {
      get: function () {
        return this.data.length;
      },
    },
  });
  Object.defineProperties(ia.prototype, rx);
  Object.defineProperties(ia.prototype, ax);
});

export { lr };
