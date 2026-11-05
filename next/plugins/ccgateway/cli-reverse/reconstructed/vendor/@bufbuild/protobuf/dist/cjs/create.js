/**
 * @bufbuild/protobuf/dist/cjs/create.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_is_message } from "./is-message.js";
import { require_descriptors } from "./descriptors.js";
import { require_scalar } from "../commonjs/reflect/scalar.js";
import { require_guard } from "./reflect/guard.js";
import { require_unsafe } from "./reflect/unsafe.js";
import { require_wrappers } from "./wkt/wrappers.js";

//@ chunk-qg41pqt6.js:343886-346488 cjs-require-graph
var require_create = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.create = create;
  var is_message_js_1 = require_is_message();
  var descriptors_js_1 = require_descriptors();
  var scalar_js_1 = require_scalar();
  var guard_js_1 = require_guard();
  var unsafe_js_1 = require_unsafe();
  var wrappers_js_1 = require_wrappers();
  var EDITION_PROTO3 = 999;
  var EDITION_PROTO2 = 998;
  var IMPLICIT = 2;
  function create(schema, init) {
    if (is_message_js_1.isMessage(init, schema)) return init;
    let message = createZeroMessage(schema);
    if (init !== undefined) initMessage(schema, message, init);
    return message;
  }
  function initMessage(messageDesc, message, init) {
    for (let member of messageDesc.members) {
      let value = init[member.localName];
      if (value == null) continue;
      let field;
      if (member.kind == "oneof") {
        let oneofField = unsafe_js_1.unsafeOneofCase(init, member);
        if (!oneofField) continue;
        field = oneofField;
        value = unsafe_js_1.unsafeGet(init, oneofField);
      } else field = member;
      switch (field.fieldKind) {
        case "message":
          value = toMessage(field, value);
          break;
        case "scalar":
          value = initScalar(field, value);
          break;
        case "list":
          value = initList(field, value);
          break;
        case "map":
          value = initMap(field, value);
          break;
      }
      unsafe_js_1.unsafeSet(message, field, value);
    }
    return message;
  }
  function initScalar(field, value) {
    if (field.scalar == descriptors_js_1.ScalarType.BYTES) return toU8Arr(value);
    return value;
  }
  function initMap(field, value) {
    if (guard_js_1.isObject(value)) {
      if (field.scalar == descriptors_js_1.ScalarType.BYTES) return convertObjectValues(value, toU8Arr);
      if (field.mapKind == "message") return convertObjectValues(value, (val) => toMessage(field, val));
    }
    return value;
  }
  function initList(field, value) {
    if (Array.isArray(value)) {
      if (field.scalar == descriptors_js_1.ScalarType.BYTES) return value.map(toU8Arr);
      if (field.listKind == "message") return value.map((item) => toMessage(field, item));
    }
    return value;
  }
  function toMessage(field, value) {
    if (field.fieldKind == "message" && !field.oneof && wrappers_js_1.isWrapperDesc(field.message))
      return initScalar(field.message.fields[0], value);
    if (guard_js_1.isObject(value)) {
      if (
        field.message.typeName == "google.protobuf.Struct" &&
        field.parent.typeName !== "google.protobuf.Value"
      )
        return value;
      if (!is_message_js_1.isMessage(value, field.message)) return create(field.message, value);
    }
    return value;
  }
  function toU8Arr(value) {
    return Array.isArray(value) ? new Uint8Array(value) : value;
  }
  function convertObjectValues(obj, fn) {
    let ret = {};
    for (let entry of Object.entries(obj)) ret[entry[0]] = fn(entry[1]);
    return ret;
  }
  var tokenZeroMessageField = Symbol();
  var messagePrototypes = new WeakMap();
  function createZeroMessage(desc) {
    let msg;
    if (!needsPrototypeChain(desc)) {
      msg = {
        $typeName: desc.typeName,
      };
      for (let member of desc.members)
        if (member.kind == "oneof" || member.presence == IMPLICIT)
          msg[member.localName] = createZeroField(member);
    } else {
      let cached = messagePrototypes.get(desc);
      let prototype;
      let members;
      if (cached) ({ prototype, members } = cached);
      else {
        prototype = {};
        members = new Set();
        for (let member of desc.members) {
          if (member.kind == "oneof") continue;
          if (member.fieldKind != "scalar" && member.fieldKind != "enum") continue;
          if (member.presence == IMPLICIT) continue;
          members.add(member);
          prototype[member.localName] = createZeroField(member);
        }
        messagePrototypes.set(desc, {
          prototype,
          members,
        });
      }
      msg = Object.create(prototype);
      msg.$typeName = desc.typeName;
      for (let member of desc.members) {
        if (members.has(member)) continue;
        if (member.kind == "field") {
          if (member.fieldKind == "message") continue;
          if (member.fieldKind == "scalar" || member.fieldKind == "enum") {
            if (member.presence != IMPLICIT) continue;
          }
        }
        msg[member.localName] = createZeroField(member);
      }
    }
    return msg;
  }
  function needsPrototypeChain(desc) {
    switch (desc.file.edition) {
      case EDITION_PROTO3:
        return false;
      case EDITION_PROTO2:
        return true;
      default:
        return desc.fields.some((f) => f.presence != IMPLICIT && f.fieldKind != "message" && !f.oneof);
    }
  }
  function createZeroField(field) {
    if (field.kind == "oneof")
      return {
        case: undefined,
      };
    if (field.fieldKind == "list") return [];
    if (field.fieldKind == "map") return {};
    if (field.fieldKind == "message") return tokenZeroMessageField;
    let defaultValue = field.getDefaultValue();
    if (defaultValue !== undefined)
      return field.fieldKind == "scalar" && field.longAsString ? defaultValue.toString() : defaultValue;
    return field.fieldKind == "scalar"
      ? scalar_js_1.scalarZeroValue(field.scalar, field.longAsString)
      : field.enum.values[0].number;
  }
});
export { require_create };
