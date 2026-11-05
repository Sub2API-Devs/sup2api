/**
 * @bufbuild/protobuf/dist/commonjs/reflect/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_error_2 } from "../../cjs/reflect/error.js";
import { require_names } from "../../cjs/reflect/names.js";
import { require_nested_types } from "../../cjs/reflect/nested-types.js";
import { require_reflect } from "../../cjs/reflect/reflect.js";
import { require_reflect_types } from "./reflect-types.js";
import { require_scalar } from "./scalar.js";
import { require_path } from "./path.js";
import { require_guard } from "../../cjs/reflect/guard.js";

//@ chunk-qg41pqt6.js:358746-359708 cjs-fingerprint
var require_reflect_2 = __commonJS(function (cjsExports) {
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
  cjsExports.isReflectMessage = cjsExports.isReflectMap = cjsExports.isReflectList = undefined;
  __exportStar(require_error_2(), cjsExports);
  __exportStar(require_names(), cjsExports);
  __exportStar(require_nested_types(), cjsExports);
  __exportStar(require_reflect(), cjsExports);
  __exportStar(require_reflect_types(), cjsExports);
  __exportStar(require_scalar(), cjsExports);
  __exportStar(require_path(), cjsExports);
  var guard_js_1 = require_guard();
  Object.defineProperty(cjsExports, "isReflectList", {
    enumerable: true,
    get: function () {
      return guard_js_1.isReflectList;
    },
  });
  Object.defineProperty(cjsExports, "isReflectMap", {
    enumerable: true,
    get: function () {
      return guard_js_1.isReflectMap;
    },
  });
  Object.defineProperty(cjsExports, "isReflectMessage", {
    enumerable: true,
    get: function () {
      return guard_js_1.isReflectMessage;
    },
  });
});
export { require_reflect_2 };
