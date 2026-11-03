/**
 * protobufjs/src/mapfield.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Yt } from "./field.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:85940-86966 cjs-fingerprint
var Ts = x(function (sA, hd) {
  hd.exports = Lt;
  var Da = Yt();
  ((Lt.prototype = Object.create(Da.prototype)).constructor = Lt).className = "MapField";
  var lE = Cr(),
    Ai = de();
  function Lt(e, t, r, i, s, n) {
    if ((Da.call(this, e, t, i, void 0, void 0, s, n), !Ai.isString(r)))
      throw TypeError("keyType must be a string");
    ((this.keyType = r), (this.resolvedKeyType = null), (this.map = !0));
  }
  Lt.fromJSON = function (t, r) {
    return new Lt(t, r.id, r.keyType, r.type, r.options, r.comment);
  };
  Lt.prototype.toJSON = function (t) {
    var r = t ? Boolean(t.keepComments) : !1;
    return Ai.toObject([
      "keyType",
      this.keyType,
      "type",
      this.type,
      "id",
      this.id,
      "extend",
      this.extend,
      "options",
      this.options,
      "comment",
      r ? this.comment : void 0,
    ]);
  };
  Lt.prototype.resolve = function () {
    if (this.resolved) return this;
    if (lE.mapKey[this.keyType] === void 0) throw Error("invalid key type: " + this.keyType);
    return Da.prototype.resolve.call(this);
  };
  Lt.d = function (t, r, i) {
    if (typeof i === "function") i = Ai.decorateType(i).name;
    else if (i && typeof i === "object") i = Ai.decorateEnum(i).name;
    return function (n, a) {
      Ai.decorateType(n.constructor).add(new Lt(a, t, r, i));
    };
  };
});

export { Ts };
