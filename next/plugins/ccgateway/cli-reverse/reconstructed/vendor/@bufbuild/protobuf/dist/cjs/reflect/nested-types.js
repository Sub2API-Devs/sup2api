/**
 * @bufbuild/protobuf/dist/cjs/reflect/nested-types.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-qg41pqt6.js:322993-323939 cjs-require-graph
var require_nested_types = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.nestedTypes = nestedTypes;
  cjsExports.usedTypes = usedTypes;
  cjsExports.parentTypes = parentTypes;
  function* nestedTypes(desc) {
    switch (desc.kind) {
      case "file":
        for (let message of desc.messages) {
          yield message;
          yield* nestedTypes(message);
        }
        yield* desc.enums;
        yield* desc.services;
        yield* desc.extensions;
        break;
      case "message":
        for (let message of desc.nestedMessages) {
          yield message;
          yield* nestedTypes(message);
        }
        yield* desc.nestedEnums;
        yield* desc.nestedExtensions;
        break;
    }
  }
  function usedTypes(descMessage) {
    return usedTypesInternal(descMessage, new Set());
  }
  function* usedTypesInternal(descMessage, seen) {
    var _a;
    var _b;
    for (let field of descMessage.fields) {
      let ref =
        (_b = (_a = field.enum) !== null && _a !== undefined ? _a : field.message) !== null &&
        _b !== undefined
          ? _b
          : undefined;
      if (!ref || seen.has(ref.typeName)) continue;
      seen.add(ref.typeName);
      yield ref;
      if (ref.kind == "message") yield* usedTypesInternal(ref, seen);
    }
  }
  function parentTypes(desc) {
    let parents = [];
    while (desc.kind !== "file") {
      let p = parent(desc);
      desc = p;
      parents.push(p);
    }
    return parents;
  }
  function parent(desc) {
    var _a;
    switch (desc.kind) {
      case "enum_value":
      case "field":
      case "oneof":
      case "rpc":
        return desc.parent;
      case "service":
        return desc.file;
      case "extension":
      case "enum":
      case "message":
        return (_a = desc.parent) !== null && _a !== undefined ? _a : desc.file;
    }
  }
});
export { require_nested_types };
