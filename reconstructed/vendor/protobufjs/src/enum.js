/**
 * protobufjs/src/enum.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../runtime/bun-runtime.js";
import { Kt } from "./object.js";
import { zr } from "./namespace.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:125754-128334 cjs-fingerprint
var nt = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Enum;
  var ReflectionObject = Kt();
  ((Enum.prototype = Object.create(ReflectionObject.prototype)).constructor = Enum).className = "Enum";
  var Namespace = zr();
  var util = de();
  function Enum(name, values, options, comment, comments, valuesOptions) {
    ReflectionObject.call(this, name, options);
    if (values && typeof values !== "object") throw TypeError("values must be an object");
    this.valuesById = {};
    this.values = Object.create(this.valuesById);
    this.comment = comment;
    this.comments = comments || {};
    this.valuesOptions = valuesOptions;
    this._valuesFeatures = {};
    this.reserved = undefined;
    if (values) {
      for (var keys = Object.keys(values), i = 0; i < keys.length; ++i)
        if (keys[i] !== "__proto__" && typeof values[keys[i]] === "number")
          this.valuesById[(this.values[keys[i]] = values[keys[i]])] = keys[i];
    }
  }
  Enum.prototype._resolveFeatures = function (edition) {
    edition = this._edition || edition;
    ReflectionObject.prototype._resolveFeatures.call(this, edition);
    Object.keys(this.values).forEach((key) => {
      var parentFeaturesCopy = Object.assign({}, this._features);
      this._valuesFeatures[key] = Object.assign(
        parentFeaturesCopy,
        this.valuesOptions && this.valuesOptions[key] && this.valuesOptions[key].features,
      );
    });
    return this;
  };
  Enum.fromJSON = function (name, json) {
    var enm = new Enum(name, json.values, json.options, json.comment, json.comments);
    enm.reserved = json.reserved;
    if (json.edition) enm._edition = json.edition;
    enm._defaultEdition = "proto3";
    return enm;
  };
  Enum.prototype.toJSON = function (toJSONOptions) {
    var keepComments = toJSONOptions ? Boolean(toJSONOptions.keepComments) : false;
    return util.toObject([
      "edition",
      this._editionToJSON(),
      "options",
      this.options,
      "valuesOptions",
      this.valuesOptions,
      "values",
      this.values,
      "reserved",
      this.reserved && this.reserved.length ? this.reserved : undefined,
      "comment",
      keepComments ? this.comment : undefined,
      "comments",
      keepComments ? this.comments : undefined,
    ]);
  };
  Enum.prototype.add = function (name, id, comment, options) {
    if (!util.isString(name)) throw TypeError("name must be a string");
    if (!util.isInteger(id)) throw TypeError("id must be an integer");
    if (name === "__proto__") return this;
    if (this.values[name] !== undefined) throw Error("duplicate name '" + name + "' in " + this);
    if (this.isReservedId(id)) throw Error("id " + id + " is reserved in " + this);
    if (this.isReservedName(name)) throw Error("name '" + name + "' is reserved in " + this);
    if (this.valuesById[id] !== undefined) {
      if (!(this.options && this.options.allow_alias)) throw Error("duplicate id " + id + " in " + this);
      this.values[name] = id;
    } else this.valuesById[(this.values[name] = id)] = name;
    if (options) {
      if (this.valuesOptions === undefined) this.valuesOptions = {};
      this.valuesOptions[name] = options || null;
    }
    this.comments[name] = comment || null;
    return this;
  };
  Enum.prototype.remove = function (name) {
    if (!util.isString(name)) throw TypeError("name must be a string");
    var val = this.values[name];
    if (val == null) throw Error("name '" + name + "' does not exist in " + this);
    delete this.valuesById[val];
    delete this.values[name];
    delete this.comments[name];
    if (this.valuesOptions) delete this.valuesOptions[name];
    return this;
  };
  Enum.prototype.isReservedId = function (id) {
    return Namespace.isReservedId(this.reserved, id);
  };
  Enum.prototype.isReservedName = function (name) {
    return Namespace.isReservedName(this.reserved, name);
  };
});
export { nt };
