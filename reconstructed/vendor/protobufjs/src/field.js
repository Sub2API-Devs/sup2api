/**
 * protobufjs/src/field.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Kt } from "./object.js";
import { nt } from "./enum.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:115253-119864 cjs-fingerprint
var Yt = x(function (mA, xd) {
  xd.exports = he;
  var ki = Kt();
  ((he.prototype = Object.create(ki.prototype)).constructor = he).className = "Field";
  var Id = nt(),
    to = Cr(),
    se = de(),
    xi,
    kE = /^required|optional|repeated$/;
  he.fromJSON = function (t, r) {
    var i = new he(t, r.id, r.type, r.rule, r.extend, r.options, r.comment);
    if (r.edition) i._edition = r.edition;
    return ((i._defaultEdition = "proto3"), i);
  };
  function he(e, t, r, i, s, n, a) {
    if (se.isObject(i)) ((a = s), (n = i), (i = s = void 0));
    else if (se.isObject(s)) ((a = n), (n = s), (s = void 0));
    if ((ki.call(this, e, n), !se.isInteger(t) || t < 0))
      throw TypeError("id must be a non-negative integer");
    if (!se.isString(r)) throw TypeError("type must be a string");
    if (i !== void 0 && !kE.test((i = i.toString().toLowerCase())))
      throw TypeError("rule must be a string rule");
    if (s !== void 0 && !se.isString(s)) throw TypeError("extend must be a string");
    if (i === "proto3_optional") i = "optional";
    ((this.rule = i && i !== "optional" ? i : void 0),
      (this.type = r),
      (this.id = t),
      (this.extend = s || void 0),
      (this.repeated = i === "repeated"),
      (this.map = !1),
      (this.message = null),
      (this.partOf = null),
      (this.typeDefault = null),
      (this.defaultValue = null),
      (this.long = se.Long ? to.long[r] !== void 0 : !1),
      (this.bytes = r === "bytes"),
      (this.resolvedType = null),
      (this.extensionField = null),
      (this.declaringField = null),
      (this.comment = a));
  }
  Object.defineProperty(he.prototype, "required", {
    get: function () {
      return this._features.field_presence === "LEGACY_REQUIRED";
    },
  });
  Object.defineProperty(he.prototype, "optional", {
    get: function () {
      return !this.required;
    },
  });
  Object.defineProperty(he.prototype, "delimited", {
    get: function () {
      return this.resolvedType instanceof xi && this._features.message_encoding === "DELIMITED";
    },
  });
  Object.defineProperty(he.prototype, "packed", {
    get: function () {
      return this._features.repeated_field_encoding === "PACKED";
    },
  });
  Object.defineProperty(he.prototype, "hasPresence", {
    get: function () {
      if (this.repeated || this.map) return !1;
      return (
        this.partOf ||
        this.declaringField ||
        this.extensionField ||
        this._features.field_presence !== "IMPLICIT"
      );
    },
  });
  he.prototype.setOption = function (t, r, i) {
    return ki.prototype.setOption.call(this, t, r, i);
  };
  he.prototype.toJSON = function (t) {
    var r = t ? Boolean(t.keepComments) : !1;
    return se.toObject([
      "edition",
      this._editionToJSON(),
      "rule",
      (this.rule !== "optional" && this.rule) || void 0,
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
  he.prototype.resolve = function () {
    if (this.resolved) return this;
    if ((this.typeDefault = to.defaults[this.type]) === void 0)
      if (
        ((this.resolvedType = (
          this.declaringField ? this.declaringField.parent : this.parent
        ).lookupTypeOrEnum(this.type)),
        this.resolvedType instanceof xi)
      )
        this.typeDefault = null;
      else this.typeDefault = this.resolvedType.values[Object.keys(this.resolvedType.values)[0]];
    else if (this.options && this.options.proto3_optional) this.typeDefault = null;
    if (this.options && this.options.default != null) {
      if (
        ((this.typeDefault = this.options.default),
        this.resolvedType instanceof Id && typeof this.typeDefault === "string")
      )
        this.typeDefault = this.resolvedType.values[this.typeDefault];
    }
    if (this.options) {
      if (this.options.packed !== void 0 && this.resolvedType && !(this.resolvedType instanceof Id))
        delete this.options.packed;
      if (!Object.keys(this.options).length) this.options = void 0;
    }
    if (this.long) {
      if (
        ((this.typeDefault = se.Long.fromNumber(this.typeDefault, this.type.charAt(0) === "u")),
        Object.freeze)
      )
        Object.freeze(this.typeDefault);
    } else if (this.bytes && typeof this.typeDefault === "string") {
      var t;
      if (se.base64.test(this.typeDefault))
        se.base64.decode(this.typeDefault, (t = se.newBuffer(se.base64.length(this.typeDefault))), 0);
      else se.utf8.write(this.typeDefault, (t = se.newBuffer(se.utf8.length(this.typeDefault))), 0);
      this.typeDefault = t;
    }
    if (this.map) this.defaultValue = se.emptyObject;
    else if (this.repeated) this.defaultValue = se.emptyArray;
    else this.defaultValue = this.typeDefault;
    if (this.parent instanceof xi) this.parent.ctor.prototype[this.name] = this.defaultValue;
    return ki.prototype.resolve.call(this);
  };
  he.prototype._inferLegacyProtoFeatures = function (t) {
    if (t !== "proto2" && t !== "proto3") return {};
    var r = {};
    if (this.rule === "required") r.field_presence = "LEGACY_REQUIRED";
    if (this.parent && to.defaults[this.type] === void 0) {
      var i = this.parent.get(this.type.split(".").pop());
      if (i && i instanceof xi && i.group) r.message_encoding = "DELIMITED";
    }
    if (this.getOption("packed") === !0) r.repeated_field_encoding = "PACKED";
    else if (this.getOption("packed") === !1) r.repeated_field_encoding = "EXPANDED";
    return r;
  };
  he.prototype._resolveFeatures = function (t) {
    return ki.prototype._resolveFeatures.call(this, this._edition || t);
  };
  he.d = function (t, r, i, s) {
    if (typeof r === "function") r = se.decorateType(r).name;
    else if (r && typeof r === "object") r = se.decorateEnum(r).name;
    return function (a, o) {
      se.decorateType(a.constructor).add(new he(o, t, r, i, { default: s }));
    };
  };
  he._configure = function (t) {
    xi = t;
  };
});

export { Yt };
