/**
 * protobufjs/src/oneof.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_object } from "./object.js";
import { require_field } from "./field.js";
import { require_util_2 } from "./util.js";

//@ chunk-3k21nfa0.js:119864-121933 cjs-fingerprint
var require_oneof = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = OneOf;
  var ReflectionObject = require_object();
  ((OneOf.prototype = Object.create(ReflectionObject.prototype)).constructor = OneOf).className = "OneOf";
  var Field = require_field();
  var util = require_util_2();
  function OneOf(name, fieldNames, options, comment) {
    if (!Array.isArray(fieldNames)) {
      options = fieldNames;
      fieldNames = undefined;
    }
    ReflectionObject.call(this, name, options);
    if (!(fieldNames === undefined || Array.isArray(fieldNames)))
      throw TypeError("fieldNames must be an Array");
    this.oneof = fieldNames || [];
    this.fieldsArray = [];
    this.comment = comment;
  }
  OneOf.fromJSON = function (name, json) {
    return new OneOf(name, json.oneof, json.options, json.comment);
  };
  OneOf.prototype.toJSON = function (toJSONOptions) {
    var keepComments = toJSONOptions ? Boolean(toJSONOptions.keepComments) : false;
    return util.toObject([
      "options",
      this.options,
      "oneof",
      this.oneof,
      "comment",
      keepComments ? this.comment : undefined,
    ]);
  };
  function addFieldsToParent(oneof) {
    if (oneof.parent) {
      for (var i = 0; i < oneof.fieldsArray.length; ++i)
        if (!oneof.fieldsArray[i].parent) oneof.parent.add(oneof.fieldsArray[i]);
    }
  }
  OneOf.prototype.add = function (field) {
    if (!(field instanceof Field)) throw TypeError("field must be a Field");
    if (field.parent && field.parent !== this.parent) field.parent.remove(field);
    this.oneof.push(field.name);
    this.fieldsArray.push(field);
    field.partOf = this;
    addFieldsToParent(this);
    return this;
  };
  OneOf.prototype.remove = function (field) {
    if (!(field instanceof Field)) throw TypeError("field must be a Field");
    var index = this.fieldsArray.indexOf(field);
    if (index < 0) throw Error(field + " is not a member of " + this);
    this.fieldsArray.splice(index, 1);
    index = this.oneof.indexOf(field.name);
    if (index > -1) this.oneof.splice(index, 1);
    field.partOf = null;
    return this;
  };
  OneOf.prototype.onAdd = function (parent) {
    ReflectionObject.prototype.onAdd.call(this, parent);
    var owner = this;
    for (var idx = 0; idx < this.oneof.length; ++idx) {
      var field = parent.get(this.oneof[idx]);
      if (field && !field.partOf) {
        field.partOf = owner;
        owner.fieldsArray.push(field);
      }
    }
    addFieldsToParent(this);
  };
  OneOf.prototype.onRemove = function (parent) {
    for (var i_2 = 0, field; i_2 < this.fieldsArray.length; ++i_2)
      if ((field = this.fieldsArray[i_2]).parent) field.parent.remove(field);
    ReflectionObject.prototype.onRemove.call(this, parent);
  };
  Object.defineProperty(OneOf.prototype, "isProto3Optional", {
    get: function () {
      if (this.fieldsArray == null || this.fieldsArray.length !== 1) return false;
      var field = this.fieldsArray[0];
      return field.options != null && field.options.proto3_optional === true;
    },
  });
  OneOf.d = function () {
    var fieldNames = Array(arguments.length);
    var index = 0;
    while (index < arguments.length) fieldNames[index] = arguments[index++];
    return function (prototype, oneofName) {
      util.decorateType(prototype.constructor).add(new OneOf(oneofName, fieldNames));
      Object.defineProperty(prototype, oneofName, {
        get: util.oneOfGetter(fieldNames),
        set: util.oneOfSetter(fieldNames),
      });
    };
  };
});
export { require_oneof };
