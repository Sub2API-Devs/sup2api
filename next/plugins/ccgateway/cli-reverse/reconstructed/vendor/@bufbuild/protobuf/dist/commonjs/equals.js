/**
 * @bufbuild/protobuf/dist/commonjs/equals.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_scalar } from "./reflect/scalar.js";
import { require_reflect } from "../cjs/reflect/reflect.js";
import { require_descriptors } from "../cjs/descriptors.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_extensions } from "./extensions.js";

//@ chunk-qg41pqt6.js:443819-446449 cjs-fingerprint
var require_equals = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.equals = equals;
  var scalar_js_1 = require_scalar();
  var reflect_js_1 = require_reflect();
  var descriptors_js_1 = require_descriptors();
  var index_js_1 = require_error_4();
  var extensions_js_1 = require_extensions();
  function equals(schema, a, b, options) {
    if (a.$typeName != schema.typeName || b.$typeName != schema.typeName) return false;
    if (a === b) return true;
    return reflectEquals(reflect_js_1.reflect(schema, a), reflect_js_1.reflect(schema, b), options);
  }
  function reflectEquals(a, b, opts) {
    if (
      a.desc.typeName === "google.protobuf.Any" &&
      (opts === null || opts === undefined ? undefined : opts.unpackAny) == true
    )
      return anyUnpackedEquals(a.message, b.message, opts);
    for (let f of a.fields) if (!fieldEquals(f, a, b, opts)) return false;
    if (
      (opts === null || opts === undefined ? undefined : opts.unknown) == true &&
      !unknownEquals(a, b, opts.registry)
    )
      return false;
    if (
      (opts === null || opts === undefined ? undefined : opts.extensions) == true &&
      !extensionsEquals(a, b, opts)
    )
      return false;
    return true;
  }
  function fieldEquals(f, a, b, opts) {
    if (!a.isSet(f) && !b.isSet(f)) return true;
    if (!a.isSet(f) || !b.isSet(f)) return false;
    switch (f.fieldKind) {
      case "scalar":
        return scalar_js_1.scalarEquals(f.scalar, a.get(f), b.get(f));
      case "enum":
        return a.get(f) === b.get(f);
      case "message":
        return reflectEquals(a.get(f), b.get(f), opts);
      case "map": {
        let mapA = a.get(f);
        let mapB = b.get(f);
        let keys = [];
        for (let k of mapA.keys()) {
          if (!mapB.has(k)) return false;
          keys.push(k);
        }
        for (let k of mapB.keys()) if (!mapA.has(k)) return false;
        for (let key of keys) {
          let va = mapA.get(key);
          let vb = mapB.get(key);
          if (va === vb) continue;
          switch (f.mapKind) {
            case "enum":
              return false;
            case "message":
              if (!reflectEquals(va, vb, opts)) return false;
              break;
            case "scalar":
              if (!scalar_js_1.scalarEquals(f.scalar, va, vb)) return false;
              break;
          }
        }
        break;
      }
      case "list": {
        let listA = a.get(f);
        let listB = b.get(f);
        if (listA.size != listB.size) return false;
        for (let i = 0; i < listA.size; i++) {
          let va = listA.get(i);
          let vb = listB.get(i);
          if (va === vb) continue;
          switch (f.listKind) {
            case "enum":
              return false;
            case "message":
              if (!reflectEquals(va, vb, opts)) return false;
              break;
            case "scalar":
              if (!scalar_js_1.scalarEquals(f.scalar, va, vb)) return false;
              break;
          }
        }
        break;
      }
    }
    return true;
  }
  function anyUnpackedEquals(a, b, opts) {
    if (a.typeUrl !== b.typeUrl) return false;
    let unpackedA = index_js_1.anyUnpack(a, opts.registry);
    let unpackedB = index_js_1.anyUnpack(b, opts.registry);
    if (unpackedA && unpackedB) {
      let schema = opts.registry.getMessage(unpackedA.$typeName);
      if (schema) return equals(schema, unpackedA, unpackedB, opts);
    }
    return scalar_js_1.scalarEquals(descriptors_js_1.ScalarType.BYTES, a.value, b.value);
  }
  function unknownEquals(a, b, registry) {
    function getTrulyUnknown(msg, registry) {
      var _a;
      let u = (_a = msg.getUnknown()) !== null && _a !== undefined ? _a : [];
      return registry ? u.filter((uf) => !registry.getExtensionFor(msg.desc, uf.no)) : u;
    }
    let unknownA = getTrulyUnknown(a, registry);
    let unknownB = getTrulyUnknown(b, registry);
    if (unknownA.length != unknownB.length) return false;
    for (let i = 0; i < unknownA.length; i++) {
      let a = unknownA[i];
      let b = unknownB[i];
      if (a.no != b.no) return false;
      if (a.wireType != b.wireType) return false;
      if (!scalar_js_1.scalarEquals(descriptors_js_1.ScalarType.BYTES, a.data, b.data)) return false;
    }
    return true;
  }
  function extensionsEquals(a, b, opts) {
    function getSetExtensions(msg, registry) {
      var _a;
      return ((_a = msg.getUnknown()) !== null && _a !== undefined ? _a : [])
        .map((uf) => registry.getExtensionFor(msg.desc, uf.no))
        .filter((e) => e != null)
        .filter((e, index, arr) => arr.indexOf(e) === index);
    }
    let extensionsA = getSetExtensions(a, opts.registry);
    let extensionsB = getSetExtensions(b, opts.registry);
    if (extensionsA.length != extensionsB.length || extensionsA.some((e) => !extensionsB.includes(e)))
      return false;
    for (let extension of extensionsA) {
      let [containerA, field] = extensions_js_1.createExtensionContainer(
        extension,
        extensions_js_1.getExtension(a.message, extension),
      );
      let [containerB] = extensions_js_1.createExtensionContainer(
        extension,
        extensions_js_1.getExtension(b.message, extension),
      );
      if (!fieldEquals(field, containerA, containerB, opts)) return false;
    }
    return true;
  }
});
export { require_equals };
