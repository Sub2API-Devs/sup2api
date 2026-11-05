/**
 * @bufbuild/protobuf/dist/cjs/reflect/names.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-qg41pqt6.js:322052-322993 cjs-require-graph
var require_names = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.qualifiedName = qualifiedName;
  cjsExports.protoCamelCase = protoCamelCase;
  cjsExports.protoSnakeCase = protoSnakeCase;
  cjsExports.safeObjectProperty = safeObjectProperty;
  function qualifiedName(desc) {
    switch (desc.kind) {
      case "field":
      case "oneof":
      case "rpc":
        return desc.parent.typeName + "." + desc.name;
      case "enum_value": {
        let p = desc.parent.parent ? desc.parent.parent.typeName : desc.parent.file.proto.package;
        return p + (p.length > 0 ? "." : "") + desc.name;
      }
      case "service":
      case "message":
      case "enum":
      case "extension":
        return desc.typeName;
      case "file":
        return desc.proto.name;
    }
  }
  function protoCamelCase(snakeCase) {
    let capNext = false;
    let b = [];
    for (let i = 0; i < snakeCase.length; i++) {
      let c = snakeCase.charAt(i);
      switch (c) {
        case "_":
          capNext = true;
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          b.push(c);
          capNext = false;
          break;
        default:
          if (capNext) {
            capNext = false;
            c = c.toUpperCase();
          }
          b.push(c);
          break;
      }
    }
    return b.join("");
  }
  function protoSnakeCase(lowerCamelCase) {
    return lowerCamelCase.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
  }
  var reservedObjectProperties = new Set(["constructor", "toString", "toJSON", "valueOf"]);
  function safeObjectProperty(name) {
    return reservedObjectProperties.has(name) ? name + "$" : name;
  }
});
export { require_names };
