/**
 * gaxios/build/cjs/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: gaxios@7.1.4
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios } from "./gaxios.js";
import { require_common } from "./common.js";
import { require_interceptor } from "./interceptor.js";

//@ chunk-e8d3a8an.js:17413-18271 cjs-fingerprint
var require_gaxios_2 = __commonJS(function (cjsExports) {
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
    function (m, mod) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(mod, p)) __createBinding(mod, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.instance = cjsExports.Gaxios = cjsExports.GaxiosError = undefined;
  cjsExports.request = request;
  var gaxios_js_1 = require_gaxios();
  Object.defineProperty(cjsExports, "Gaxios", {
    enumerable: true,
    get: function () {
      return gaxios_js_1.Gaxios;
    },
  });
  var common_js_1 = require_common();
  Object.defineProperty(cjsExports, "GaxiosError", {
    enumerable: true,
    get: function () {
      return common_js_1.GaxiosError;
    },
  });
  __exportStar(require_interceptor(), cjsExports);
  cjsExports.instance = new gaxios_js_1.Gaxios();
  async function request(opts) {
    return cjsExports.instance.request(opts);
  }
});
export { require_gaxios_2 };
