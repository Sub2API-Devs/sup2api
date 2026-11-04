/**
 * protobufjs/src/object.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_oneof } from "./oneof.js";
import { require_util_2 } from "./util.js";

//@ chunk-pwh5dx3n.js:121933-125754 cjs-fingerprint
var require_object = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = ReflectionObject;
  ReflectionObject.className = "ReflectionObject";
  var OneOf = require_oneof();
  var util = require_util_2();
  var Root;
  var editions2023Defaults = {
    enum_type: "OPEN",
    field_presence: "EXPLICIT",
    json_format: "ALLOW",
    message_encoding: "LENGTH_PREFIXED",
    repeated_field_encoding: "PACKED",
    utf8_validation: "VERIFY",
  };
  var proto2Defaults = {
    enum_type: "CLOSED",
    field_presence: "EXPLICIT",
    json_format: "LEGACY_BEST_EFFORT",
    message_encoding: "LENGTH_PREFIXED",
    repeated_field_encoding: "EXPANDED",
    utf8_validation: "NONE",
  };
  var proto3Defaults = {
    enum_type: "OPEN",
    field_presence: "IMPLICIT",
    json_format: "ALLOW",
    message_encoding: "LENGTH_PREFIXED",
    repeated_field_encoding: "PACKED",
    utf8_validation: "VERIFY",
  };
  function ReflectionObject(name, options) {
    if (!util.isString(name)) throw TypeError("name must be a string");
    if (options && !util.isObject(options)) throw TypeError("options must be an object");
    this.options = options;
    this.parsedOptions = null;
    this.name = name;
    this._edition = null;
    this._defaultEdition = "proto2";
    this._features = {};
    this._featuresResolved = false;
    this.parent = null;
    this.resolved = false;
    this.comment = null;
    this.filename = null;
  }
  Object.defineProperties(ReflectionObject.prototype, {
    root: {
      get: function () {
        var ptr = this;
        while (ptr.parent !== null) ptr = ptr.parent;
        return ptr;
      },
    },
    fullName: {
      get: function () {
        var path = [this.name];
        var ptr = this.parent;
        while (ptr) {
          path.unshift(ptr.name);
          ptr = ptr.parent;
        }
        return path.join(".");
      },
    },
  });
  ReflectionObject.prototype.toJSON = function () {
    throw Error();
  };
  ReflectionObject.prototype.onAdd = function (parent) {
    if (this.parent && this.parent !== parent) this.parent.remove(this);
    this.parent = parent;
    this.resolved = false;
    var root = parent.root;
    if (root instanceof Root) root._handleAdd(this);
  };
  ReflectionObject.prototype.onRemove = function (parent) {
    var root = parent.root;
    if (root instanceof Root) root._handleRemove(this);
    this.parent = null;
    this.resolved = false;
  };
  ReflectionObject.prototype.resolve = function () {
    if (this.resolved) return this;
    if (this.root instanceof Root) this.resolved = true;
    return this;
  };
  ReflectionObject.prototype._resolveFeaturesRecursive = function (edition) {
    return this._resolveFeatures(this._edition || edition);
  };
  ReflectionObject.prototype._resolveFeatures = function (edition) {
    if (this._featuresResolved) return;
    var defaults = {};
    if (!edition) throw Error("Unknown edition for " + this.fullName);
    var protoFeatures = Object.assign(
      this.options ? Object.assign({}, this.options.features) : {},
      this._inferLegacyProtoFeatures(edition),
    );
    if (this._edition) {
      if (edition === "proto2") defaults = Object.assign({}, proto2Defaults);
      else if (edition === "proto3") defaults = Object.assign({}, proto3Defaults);
      else if (edition === "2023") defaults = Object.assign({}, editions2023Defaults);
      else throw Error("Unknown edition: " + edition);
      this._features = Object.assign(defaults, protoFeatures || {});
      this._featuresResolved = true;
      return;
    }
    if (this.partOf instanceof OneOf) {
      var lexicalParentFeaturesCopy = Object.assign({}, this.partOf._features);
      this._features = Object.assign(lexicalParentFeaturesCopy, protoFeatures || {});
    } else if (this.declaringField);
    else if (this.parent) {
      var parentFeaturesCopy = Object.assign({}, this.parent._features);
      this._features = Object.assign(parentFeaturesCopy, protoFeatures || {});
    } else throw Error("Unable to find a parent for " + this.fullName);
    if (this.extensionField) this.extensionField._features = this._features;
    this._featuresResolved = true;
  };
  ReflectionObject.prototype._inferLegacyProtoFeatures = function () {
    return {};
  };
  ReflectionObject.prototype.getOption = function (name) {
    if (this.options) return this.options[name];
    return;
  };
  ReflectionObject.prototype.setOption = function (name, value, ifNotSet) {
    if (name === "__proto__") return this;
    if (!this.options) this.options = {};
    if (/^features\./.test(name)) util.setProperty(this.options, name, value, ifNotSet);
    else if (!ifNotSet || this.options[name] === undefined) {
      if (this.getOption(name) !== value) this.resolved = false;
      this.options[name] = value;
    }
    return this;
  };
  ReflectionObject.prototype.setParsedOption = function (name, value, propName) {
    if (name === "__proto__") return this;
    if (!this.parsedOptions) this.parsedOptions = [];
    var parsedOptions = this.parsedOptions;
    if (propName) {
      var opt = parsedOptions.find(function (opt) {
        return Object.prototype.hasOwnProperty.call(opt, name);
      });
      if (opt) {
        var newValue = opt[name];
        util.setProperty(newValue, propName, value);
      } else {
        opt = {};
        opt[name] = util.setProperty({}, propName, value);
        parsedOptions.push(opt);
      }
    } else {
      var newOpt = {};
      newOpt[name] = value;
      parsedOptions.push(newOpt);
    }
    return this;
  };
  ReflectionObject.prototype.setOptions = function (options, ifNotSet) {
    if (options)
      for (var keys = Object.keys(options), i = 0; i < keys.length; ++i)
        this.setOption(keys[i], options[keys[i]], ifNotSet);
    return this;
  };
  ReflectionObject.prototype.toString = function () {
    var className = this.constructor.className;
    var fullName = this.fullName;
    if (fullName.length) return className + " " + fullName;
    return className;
  };
  ReflectionObject.prototype._editionToJSON = function () {
    if (!this._edition || this._edition === "proto3") return;
    return this._edition;
  };
  ReflectionObject._configure = function (Root_) {
    Root = Root_;
  };
});
export { require_object };
