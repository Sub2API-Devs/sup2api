/**
 * protobufjs/src/field.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_object } from "./object.js";
import { require_enum } from "./enum.js";
import { require_types } from "./types.js";
import { require_util_2 } from "./util.js";

//@ chunk-3k21nfa0.js:115253-119864 cjs-fingerprint
var require_field = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Field;
  var ReflectionObject = require_object();
  ((Field.prototype = Object.create(ReflectionObject.prototype)).constructor = Field).className = "Field";
  var Enum = require_enum();
  var types = require_types();
  var util = require_util_2();
  var Type;
  var ruleRe = /^required|optional|repeated$/;
  Field.fromJSON = function (name, json) {
    var field = new Field(name, json.id, json.type, json.rule, json.extend, json.options, json.comment);
    if (json.edition) field._edition = json.edition;
    field._defaultEdition = "proto3";
    return field;
  };
  function Field(name, id, type, rule, extend, options, comment) {
    if (util.isObject(rule)) {
      comment = extend;
      options = rule;
      rule = extend = undefined;
    } else if (util.isObject(extend)) {
      comment = options;
      options = extend;
      extend = undefined;
    }
    ReflectionObject.call(this, name, options);
    if (!util.isInteger(id) || id < 0) throw TypeError("id must be a non-negative integer");
    if (!util.isString(type)) throw TypeError("type must be a string");
    if (rule !== undefined && !ruleRe.test((rule = rule.toString().toLowerCase())))
      throw TypeError("rule must be a string rule");
    if (extend !== undefined && !util.isString(extend)) throw TypeError("extend must be a string");
    if (rule === "proto3_optional") rule = "optional";
    this.rule = rule && rule !== "optional" ? rule : undefined;
    this.type = type;
    this.id = id;
    this.extend = extend || undefined;
    this.repeated = rule === "repeated";
    this.map = false;
    this.message = null;
    this.partOf = null;
    this.typeDefault = null;
    this.defaultValue = null;
    this.long = util.Long ? types.long[type] !== undefined : false;
    this.bytes = type === "bytes";
    this.resolvedType = null;
    this.extensionField = null;
    this.declaringField = null;
    this.comment = comment;
  }
  Object.defineProperty(Field.prototype, "required", {
    get: function () {
      return this._features.field_presence === "LEGACY_REQUIRED";
    },
  });
  Object.defineProperty(Field.prototype, "optional", {
    get: function () {
      return !this.required;
    },
  });
  Object.defineProperty(Field.prototype, "delimited", {
    get: function () {
      return this.resolvedType instanceof Type && this._features.message_encoding === "DELIMITED";
    },
  });
  Object.defineProperty(Field.prototype, "packed", {
    get: function () {
      return this._features.repeated_field_encoding === "PACKED";
    },
  });
  Object.defineProperty(Field.prototype, "hasPresence", {
    get: function () {
      if (this.repeated || this.map) return false;
      return (
        this.partOf ||
        this.declaringField ||
        this.extensionField ||
        this._features.field_presence !== "IMPLICIT"
      );
    },
  });
  Field.prototype.setOption = function (name, value, ifNotSet) {
    return ReflectionObject.prototype.setOption.call(this, name, value, ifNotSet);
  };
  Field.prototype.toJSON = function (toJSONOptions) {
    var keepComments = toJSONOptions ? Boolean(toJSONOptions.keepComments) : false;
    return util.toObject([
      "edition",
      this._editionToJSON(),
      "rule",
      (this.rule !== "optional" && this.rule) || undefined,
      "type",
      this.type,
      "id",
      this.id,
      "extend",
      this.extend,
      "options",
      this.options,
      "comment",
      keepComments ? this.comment : undefined,
    ]);
  };
  Field.prototype.resolve = function () {
    if (this.resolved) return this;
    if ((this.typeDefault = types.defaults[this.type]) === undefined) {
      this.resolvedType = (this.declaringField ? this.declaringField.parent : this.parent).lookupTypeOrEnum(
        this.type,
      );
      if (this.resolvedType instanceof Type) this.typeDefault = null;
      else this.typeDefault = this.resolvedType.values[Object.keys(this.resolvedType.values)[0]];
    } else if (this.options && this.options.proto3_optional) this.typeDefault = null;
    if (this.options && this.options.default != null) {
      this.typeDefault = this.options.default;
      if (this.resolvedType instanceof Enum && typeof this.typeDefault === "string")
        this.typeDefault = this.resolvedType.values[this.typeDefault];
    }
    if (this.options) {
      if (this.options.packed !== undefined && this.resolvedType && !(this.resolvedType instanceof Enum))
        delete this.options.packed;
      if (!Object.keys(this.options).length) this.options = undefined;
    }
    if (this.long) {
      this.typeDefault = util.Long.fromNumber(this.typeDefault, this.type.charAt(0) === "u");
      if (Object.freeze) Object.freeze(this.typeDefault);
    } else if (this.bytes && typeof this.typeDefault === "string") {
      var buf;
      if (util.base64.test(this.typeDefault))
        util.base64.decode(this.typeDefault, (buf = util.newBuffer(util.base64.length(this.typeDefault))), 0);
      else util.utf8.write(this.typeDefault, (buf = util.newBuffer(util.utf8.length(this.typeDefault))), 0);
      this.typeDefault = buf;
    }
    if (this.map) this.defaultValue = util.emptyObject;
    else if (this.repeated) this.defaultValue = util.emptyArray;
    else this.defaultValue = this.typeDefault;
    if (this.parent instanceof Type) this.parent.ctor.prototype[this.name] = this.defaultValue;
    return ReflectionObject.prototype.resolve.call(this);
  };
  Field.prototype._inferLegacyProtoFeatures = function (edition) {
    if (edition !== "proto2" && edition !== "proto3") return {};
    var features = {};
    if (this.rule === "required") features.field_presence = "LEGACY_REQUIRED";
    if (this.parent && types.defaults[this.type] === undefined) {
      var type = this.parent.get(this.type.split(".").pop());
      if (type && type instanceof Type && type.group) features.message_encoding = "DELIMITED";
    }
    if (this.getOption("packed") === true) features.repeated_field_encoding = "PACKED";
    else if (this.getOption("packed") === false) features.repeated_field_encoding = "EXPANDED";
    return features;
  };
  Field.prototype._resolveFeatures = function (edition) {
    return ReflectionObject.prototype._resolveFeatures.call(this, this._edition || edition);
  };
  Field.d = function (fieldId, fieldType, fieldRule, defaultValue) {
    if (typeof fieldType === "function") fieldType = util.decorateType(fieldType).name;
    else if (fieldType && typeof fieldType === "object") fieldType = util.decorateEnum(fieldType).name;
    return function (prototype, fieldName) {
      util.decorateType(prototype.constructor).add(
        new Field(fieldName, fieldId, fieldType, fieldRule, {
          default: defaultValue,
        }),
      );
    };
  };
  Field._configure = function (Type_) {
    Type = Type_;
  };
});
export { require_field };
