/**
 * @bufbuild/protobuf/dist/commonjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_types } from "./types.js";
import { require_is_message } from "../cjs/is-message.js";
import { require_create } from "../cjs/create.js";
import { require_clone } from "./clone.js";
import { require_descriptors } from "../cjs/descriptors.js";
import { require_equals } from "./equals.js";
import { require_fields } from "./fields.js";
import { require_registry } from "../cjs/registry.js";
import { require_to_binary } from "../cjs/to-binary.js";
import { require_from_binary } from "./from-binary.js";
import { require_to_json } from "./to-json.js";
import { require_from_json } from "./from-json.js";
import { require_merge } from "./merge.js";
import { require_extensions } from "./extensions.js";
import { require_proto_int64 } from "./proto-int64.js";

//@ chunk-qg41pqt6.js:466692-468374 cjs-fingerprint
var require_protobuf = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getOption =
    cjsExports.hasOption =
    cjsExports.clearExtension =
    cjsExports.setExtension =
    cjsExports.getExtension =
    cjsExports.hasExtension =
    cjsExports.mergeFromBinary =
    cjsExports.fromBinary =
    cjsExports.toBinary =
      undefined;
  __exportStar(require_types(), cjsExports);
  __exportStar(require_is_message(), cjsExports);
  __exportStar(require_create(), cjsExports);
  __exportStar(require_clone(), cjsExports);
  __exportStar(require_descriptors(), cjsExports);
  __exportStar(require_equals(), cjsExports);
  __exportStar(require_fields(), cjsExports);
  __exportStar(require_registry(), cjsExports);
  var to_binary_js_1 = require_to_binary();
  Object.defineProperty(cjsExports, "toBinary", {
    enumerable: true,
    get: function () {
      return to_binary_js_1.toBinary;
    },
  });
  var from_binary_js_1 = require_from_binary();
  Object.defineProperty(cjsExports, "fromBinary", {
    enumerable: true,
    get: function () {
      return from_binary_js_1.fromBinary;
    },
  });
  Object.defineProperty(cjsExports, "mergeFromBinary", {
    enumerable: true,
    get: function () {
      return from_binary_js_1.mergeFromBinary;
    },
  });
  __exportStar(require_to_json(), cjsExports);
  __exportStar(require_from_json(), cjsExports);
  __exportStar(require_merge(), cjsExports);
  var extensions_js_1 = require_extensions();
  Object.defineProperty(cjsExports, "hasExtension", {
    enumerable: true,
    get: function () {
      return extensions_js_1.hasExtension;
    },
  });
  Object.defineProperty(cjsExports, "getExtension", {
    enumerable: true,
    get: function () {
      return extensions_js_1.getExtension;
    },
  });
  Object.defineProperty(cjsExports, "setExtension", {
    enumerable: true,
    get: function () {
      return extensions_js_1.setExtension;
    },
  });
  Object.defineProperty(cjsExports, "clearExtension", {
    enumerable: true,
    get: function () {
      return extensions_js_1.clearExtension;
    },
  });
  Object.defineProperty(cjsExports, "hasOption", {
    enumerable: true,
    get: function () {
      return extensions_js_1.hasOption;
    },
  });
  Object.defineProperty(cjsExports, "getOption", {
    enumerable: true,
    get: function () {
      return extensions_js_1.getOption;
    },
  });
  __exportStar(require_proto_int64(), cjsExports);
});
export { require_protobuf };
