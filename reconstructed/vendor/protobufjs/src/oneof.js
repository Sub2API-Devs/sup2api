/**
 * protobufjs/src/oneof.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Kt } from "./object.js";
import { Yt } from "./field.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:119864-121933 cjs-fingerprint
var Sr = x(function (vA, Ld) {
  Ld.exports = Fe;
  var Ds = Kt();
  ((Fe.prototype = Object.create(Ds.prototype)).constructor = Fe).className = "OneOf";
  var kd = Yt(),
    ks = de();
  function Fe(e, t, r, i) {
    if (!Array.isArray(t)) ((r = t), (t = void 0));
    if ((Ds.call(this, e, r), !(t === void 0 || Array.isArray(t))))
      throw TypeError("fieldNames must be an Array");
    ((this.oneof = t || []), (this.fieldsArray = []), (this.comment = i));
  }
  Fe.fromJSON = function (t, r) {
    return new Fe(t, r.oneof, r.options, r.comment);
  };
  Fe.prototype.toJSON = function (t) {
    var r = t ? Boolean(t.keepComments) : !1;
    return ks.toObject(["options", this.options, "oneof", this.oneof, "comment", r ? this.comment : void 0]);
  };
  function Dd(e) {
    if (e.parent) {
      for (var t = 0; t < e.fieldsArray.length; ++t)
        if (!e.fieldsArray[t].parent) e.parent.add(e.fieldsArray[t]);
    }
  }
  Fe.prototype.add = function (t) {
    if (!(t instanceof kd)) throw TypeError("field must be a Field");
    if (t.parent && t.parent !== this.parent) t.parent.remove(t);
    return (this.oneof.push(t.name), this.fieldsArray.push(t), (t.partOf = this), Dd(this), this);
  };
  Fe.prototype.remove = function (t) {
    if (!(t instanceof kd)) throw TypeError("field must be a Field");
    var index = this.fieldsArray.indexOf(t);
    if (index < 0) throw Error(t + " is not a member of " + this);
    if ((this.fieldsArray.splice(index, 1), (index = this.oneof.indexOf(t.name)), index > -1))
      this.oneof.splice(index, 1);
    return ((t.partOf = null), this);
  };
  Fe.prototype.onAdd = function (t) {
    Ds.prototype.onAdd.call(this, t);
    var r = this;
    for (var i = 0; i < this.oneof.length; ++i) {
      var s = t.get(this.oneof[i]);
      if (s && !s.partOf) ((s.partOf = r), r.fieldsArray.push(s));
    }
    Dd(this);
  };
  Fe.prototype.onRemove = function (t) {
    for (var r = 0, i; r < this.fieldsArray.length; ++r)
      if ((i = this.fieldsArray[r]).parent) i.parent.remove(i);
    Ds.prototype.onRemove.call(this, t);
  };
  Object.defineProperty(Fe.prototype, "isProto3Optional", {
    get: function () {
      if (this.fieldsArray == null || this.fieldsArray.length !== 1) return !1;
      var e = this.fieldsArray[0];
      return e.options != null && e.options.proto3_optional === !0;
    },
  });
  Fe.d = function () {
    var t = Array(arguments.length),
      r = 0;
    while (r < arguments.length) t[r] = arguments[r++];
    return function (s, n) {
      (ks.decorateType(s.constructor).add(new Fe(n, t)),
        Object.defineProperty(s, n, { get: ks.oneOfGetter(t), set: ks.oneOfSetter(t) }));
    };
  };
});

export { Sr };
