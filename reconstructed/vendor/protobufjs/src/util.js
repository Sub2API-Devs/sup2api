/**
 * protobufjs/src/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { QGe } from "./util/minimal.js";
import { eIo } from "./roots.js";
import { ed } from "../../@protobufjs/codegen/index.js";
import { id } from "./util/fetch.js";
import { ad } from "../../@protobufjs/path/index.js";
import { ld } from "./util/patterns.js";
import { Ps } from "./type.js";
import { nt } from "./enum.js";
import { xs } from "./root.js";

//@ chunk-pwh5dx3n.js:112807-114753 cjs-fingerprint
var de = x(function (pA, Nd) {
  var Z = (Nd.exports = QGe()),
    Ad = eIo(),
    Za,
    eo;
  Z.codegen = ed();
  Z.fetch = id();
  Z.path = ad();
  Z.patterns = ld();
  var reservedRe = Z.patterns.reservedRe,
    unsafePropertyRe = Z.patterns.unsafePropertyRe;
  Z.fs = Z.inquire("fs");
  Z.checkDepth = function (t) {
    if (t === void 0) t = 0;
    if (t > Z.recursionLimit) throw Error("max depth exceeded");
    return t;
  };
  Z.toArray = function (t) {
    if (t) {
      var keys = Object.keys(t),
        i = Array(keys.length),
        s = 0;
      while (s < keys.length) i[s] = t[keys[s++]];
      return i;
    }
    return [];
  };
  Z.toObject = function (t) {
    var r = {},
      i = 0;
    while (i < t.length) {
      var s = t[i++],
        n = t[i++];
      if (n !== void 0) r[s] = n;
    }
    return r;
  };
  Z.isReserved = function (t) {
    return reservedRe.test(t);
  };
  Z.safeProp = function (t) {
    if (!/^[$\w_]+$/.test(t) || reservedRe.test(t)) return "[" + JSON.stringify(t) + "]";
    return "." + t;
  };
  Z.ucFirst = function (t) {
    return t.charAt(0).toUpperCase() + t.substring(1);
  };
  var NE = /_([a-z])/g;
  Z.camelCase = function (t) {
    return (
      t.substring(0, 1) +
      t.substring(1).replace(NE, function (r, i) {
        return i.toUpperCase();
      })
    );
  };
  Z.compareFieldsById = function (t, r) {
    return t.id - r.id;
  };
  Z.decorateType = function (t, r) {
    if (t.$type) {
      if (r && t.$type.name !== r)
        (Z.decorateRoot.remove(t.$type), (t.$type.name = r), Z.decorateRoot.add(t.$type));
      return t.$type;
    }
    if (!Za) Za = Ps();
    var i = new Za(r || t.name);
    return (
      Z.decorateRoot.add(i),
      (i.ctor = t),
      Object.defineProperty(t, "$type", { value: i, enumerable: !1 }),
      Object.defineProperty(t.prototype, "$type", { value: i, enumerable: !1 }),
      i
    );
  };
  var ME = 0;
  Z.decorateEnum = function (t) {
    if (t.$type) return t.$type;
    if (!eo) eo = nt();
    var r = new eo("Enum" + ME++, t);
    return (Z.decorateRoot.add(r), Object.defineProperty(t, "$type", { value: r, enumerable: !1 }), r);
  };
  Z.setProperty = function (t, r, i, s) {
    function n(a, o, l) {
      var c = o.shift();
      if (unsafePropertyRe.test(c)) return a;
      if (o.length > 0) a[c] = n(a[c] || {}, o, l);
      else {
        var u = a[c];
        if (u && s) return a;
        if (u) l = [].concat(u).concat(l);
        a[c] = l;
      }
      return a;
    }
    if (typeof t !== "object") throw TypeError("dst must be an object");
    if (!r) throw TypeError("path must be specified");
    return ((r = r.split(".")), n(t, r, i));
  };
  Object.defineProperty(Z, "decorateRoot", {
    get: function () {
      return Ad.decorated || (Ad.decorated = new (xs())());
    },
  });
});

export { de };
