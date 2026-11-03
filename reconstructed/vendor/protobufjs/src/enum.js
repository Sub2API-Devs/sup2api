/**
 * protobufjs/src/enum.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Kt } from "./object.js";
import { zr } from "./namespace.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:125754-128334 cjs-fingerprint
var nt = x(function (_A, Ud) {
  Ud.exports = at;
  var ro = Kt();
  ((at.prototype = Object.create(ro.prototype)).constructor = at).className = "Enum";
  var qd = zr(),
    Fs = de();
  function at(e, t, r, i, s, n) {
    if ((ro.call(this, e, r), t && typeof t !== "object")) throw TypeError("values must be an object");
    if (
      ((this.valuesById = {}),
      (this.values = Object.create(this.valuesById)),
      (this.comment = i),
      (this.comments = s || {}),
      (this.valuesOptions = n),
      (this._valuesFeatures = {}),
      (this.reserved = void 0),
      t)
    ) {
      for (var keys = Object.keys(t), o = 0; o < keys.length; ++o)
        if (keys[o] !== "__proto__" && typeof t[keys[o]] === "number")
          this.valuesById[(this.values[keys[o]] = t[keys[o]])] = keys[o];
    }
  }
  at.prototype._resolveFeatures = function (t) {
    return (
      (t = this._edition || t),
      ro.prototype._resolveFeatures.call(this, t),
      Object.keys(this.values).forEach((r) => {
        var merged = Object.assign({}, this._features);
        this._valuesFeatures[r] = Object.assign(
          merged,
          this.valuesOptions && this.valuesOptions[r] && this.valuesOptions[r].features,
        );
      }),
      this
    );
  };
  at.fromJSON = function (t, r) {
    var i = new at(t, r.values, r.options, r.comment, r.comments);
    if (((i.reserved = r.reserved), r.edition)) i._edition = r.edition;
    return ((i._defaultEdition = "proto3"), i);
  };
  at.prototype.toJSON = function (t) {
    var r = t ? Boolean(t.keepComments) : !1;
    return Fs.toObject([
      "edition",
      this._editionToJSON(),
      "options",
      this.options,
      "valuesOptions",
      this.valuesOptions,
      "values",
      this.values,
      "reserved",
      this.reserved && this.reserved.length ? this.reserved : void 0,
      "comment",
      r ? this.comment : void 0,
      "comments",
      r ? this.comments : void 0,
    ]);
  };
  at.prototype.add = function (t, r, i, s) {
    if (!Fs.isString(t)) throw TypeError("name must be a string");
    if (!Fs.isInteger(r)) throw TypeError("id must be an integer");
    if (t === "__proto__") return this;
    if (this.values[t] !== void 0) throw Error("duplicate name '" + t + "' in " + this);
    if (this.isReservedId(r)) throw Error("id " + r + " is reserved in " + this);
    if (this.isReservedName(t)) throw Error("name '" + t + "' is reserved in " + this);
    if (this.valuesById[r] !== void 0) {
      if (!(this.options && this.options.allow_alias)) throw Error("duplicate id " + r + " in " + this);
      this.values[t] = r;
    } else this.valuesById[(this.values[t] = r)] = t;
    if (s) {
      if (this.valuesOptions === void 0) this.valuesOptions = {};
      this.valuesOptions[t] = s || null;
    }
    return ((this.comments[t] = i || null), this);
  };
  at.prototype.remove = function (t) {
    if (!Fs.isString(t)) throw TypeError("name must be a string");
    var r = this.values[t];
    if (r == null) throw Error("name '" + t + "' does not exist in " + this);
    if ((delete this.valuesById[r], delete this.values[t], delete this.comments[t], this.valuesOptions))
      delete this.valuesOptions[t];
    return this;
  };
  at.prototype.isReservedId = function (t) {
    return qd.isReservedId(this.reserved, t);
  };
  at.prototype.isReservedName = function (t) {
    return qd.isReservedName(this.reserved, t);
  };
});

export { nt };
