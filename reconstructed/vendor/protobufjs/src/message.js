/**
 * protobufjs/src/message.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { QGe } from "./util/minimal.js";

//@ chunk-pwh5dx3n.js:90850-91572 cjs-fingerprint
var Os = x(function (oA, md) {
  md.exports = pt;
  var dE = QGe();
  function pt(e) {
    if (e)
      for (var keys = Object.keys(e), r = 0; r < keys.length; ++r) {
        var i = keys[r];
        if (i === "__proto__") continue;
        this[i] = e[i];
      }
  }
  pt.create = function (t) {
    return this.$type.create(t);
  };
  pt.encode = function (t, r) {
    return this.$type.encode(t, r);
  };
  pt.encodeDelimited = function (t, r) {
    return this.$type.encodeDelimited(t, r);
  };
  pt.decode = function (t) {
    return this.$type.decode(t);
  };
  pt.decodeDelimited = function (t) {
    return this.$type.decodeDelimited(t);
  };
  pt.verify = function (t) {
    return this.$type.verify(t);
  };
  pt.fromObject = function (t) {
    return this.$type.fromObject(t);
  };
  pt.toObject = function (t, r) {
    return this.$type.toObject(t, r);
  };
  pt.prototype.toJSON = function () {
    return this.$type.toObject(this, dE.toJSONOptions);
  };
});

export { Os };
