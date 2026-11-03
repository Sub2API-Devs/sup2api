/**
 * protobufjs/src/object.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Sr } from "./oneof.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:121933-125754 cjs-fingerprint
var Kt = x(function (yA, Fd) {
  Fd.exports = ye;
  ye.className = "ReflectionObject";
  var DE = Sr(),
    Di = de(),
    Ls,
    LE = {
      enum_type: "OPEN",
      field_presence: "EXPLICIT",
      json_format: "ALLOW",
      message_encoding: "LENGTH_PREFIXED",
      repeated_field_encoding: "PACKED",
      utf8_validation: "VERIFY",
    },
    FE = {
      enum_type: "CLOSED",
      field_presence: "EXPLICIT",
      json_format: "LEGACY_BEST_EFFORT",
      message_encoding: "LENGTH_PREFIXED",
      repeated_field_encoding: "EXPANDED",
      utf8_validation: "NONE",
    },
    qE = {
      enum_type: "OPEN",
      field_presence: "IMPLICIT",
      json_format: "ALLOW",
      message_encoding: "LENGTH_PREFIXED",
      repeated_field_encoding: "PACKED",
      utf8_validation: "VERIFY",
    };
  function ye(e, t) {
    if (!Di.isString(e)) throw TypeError("name must be a string");
    if (t && !Di.isObject(t)) throw TypeError("options must be an object");
    ((this.options = t),
      (this.parsedOptions = null),
      (this.name = e),
      (this._edition = null),
      (this._defaultEdition = "proto2"),
      (this._features = {}),
      (this._featuresResolved = !1),
      (this.parent = null),
      (this.resolved = !1),
      (this.comment = null),
      (this.filename = null));
  }
  Object.defineProperties(ye.prototype, {
    root: {
      get: function () {
        var e = this;
        while (e.parent !== null) e = e.parent;
        return e;
      },
    },
    fullName: {
      get: function () {
        var e = [this.name],
          parent = this.parent;
        while (parent) (e.unshift(parent.name), (parent = parent.parent));
        return e.join(".");
      },
    },
  });
  ye.prototype.toJSON = function () {
    throw Error();
  };
  ye.prototype.onAdd = function (t) {
    if (this.parent && this.parent !== t) this.parent.remove(this);
    ((this.parent = t), (this.resolved = !1));
    var root = t.root;
    if (root instanceof Ls) root._handleAdd(this);
  };
  ye.prototype.onRemove = function (t) {
    var root = t.root;
    if (root instanceof Ls) root._handleRemove(this);
    ((this.parent = null), (this.resolved = !1));
  };
  ye.prototype.resolve = function () {
    if (this.resolved) return this;
    if (this.root instanceof Ls) this.resolved = !0;
    return this;
  };
  ye.prototype._resolveFeaturesRecursive = function (t) {
    return this._resolveFeatures(this._edition || t);
  };
  ye.prototype._resolveFeatures = function (t) {
    if (this._featuresResolved) return;
    var r = {};
    if (!t) throw Error("Unknown edition for " + this.fullName);
    var merged = Object.assign(
      this.options ? Object.assign({}, this.options.features) : {},
      this._inferLegacyProtoFeatures(t),
    );
    if (this._edition) {
      if (t === "proto2") r = Object.assign({}, FE);
      else if (t === "proto3") r = Object.assign({}, qE);
      else if (t === "2023") r = Object.assign({}, LE);
      else throw Error("Unknown edition: " + t);
      ((this._features = Object.assign(r, merged || {})), (this._featuresResolved = !0));
      return;
    }
    if (this.partOf instanceof DE) {
      var merged_2 = Object.assign({}, this.partOf._features);
      this._features = Object.assign(merged_2, merged || {});
    } else if (this.declaringField);
    else if (this.parent) {
      var merged_3 = Object.assign({}, this.parent._features);
      this._features = Object.assign(merged_3, merged || {});
    } else throw Error("Unable to find a parent for " + this.fullName);
    if (this.extensionField) this.extensionField._features = this._features;
    this._featuresResolved = !0;
  };
  ye.prototype._inferLegacyProtoFeatures = function () {
    return {};
  };
  ye.prototype.getOption = function (t) {
    if (this.options) return this.options[t];
    return;
  };
  ye.prototype.setOption = function (t, r, i) {
    if (t === "__proto__") return this;
    if (!this.options) this.options = {};
    if (/^features\./.test(t)) Di.setProperty(this.options, t, r, i);
    else if (!i || this.options[t] === void 0) {
      if (this.getOption(t) !== r) this.resolved = !1;
      this.options[t] = r;
    }
    return this;
  };
  ye.prototype.setParsedOption = function (t, r, i) {
    if (t === "__proto__") return this;
    if (!this.parsedOptions) this.parsedOptions = [];
    var parsedOptions = this.parsedOptions;
    if (i) {
      var found = parsedOptions.find(function (l) {
        return Object.prototype.hasOwnProperty.call(l, t);
      });
      if (found) {
        var a = found[t];
        Di.setProperty(a, i, r);
      } else ((found = {}), (found[t] = Di.setProperty({}, i, r)), parsedOptions.push(found));
    } else {
      var o = {};
      ((o[t] = r), parsedOptions.push(o));
    }
    return this;
  };
  ye.prototype.setOptions = function (t, r) {
    if (t)
      for (var keys = Object.keys(t), s = 0; s < keys.length; ++s) this.setOption(keys[s], t[keys[s]], r);
    return this;
  };
  ye.prototype.toString = function () {
    var className = this.constructor.className,
      fullName = this.fullName;
    if (fullName.length) return className + " " + fullName;
    return className;
  };
  ye.prototype._editionToJSON = function () {
    if (!this._edition || this._edition === "proto3") return;
    return this._edition;
  };
  ye._configure = function (e) {
    Ls = e;
  };
});

export { Kt };
