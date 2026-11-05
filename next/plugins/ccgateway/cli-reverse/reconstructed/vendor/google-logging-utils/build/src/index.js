/**
 * google-logging-utils/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-logging-utils@1.0.1..1.1.3
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_logging_utils } from "./logging-utils.js";

//@ chunk-e8d3a8an.js:49774-50294 cjs-require-graph
var require_google_logging_utils = __commonJS(function (cjsExports) {
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
    function (m, target) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(target, p))
          __createBinding(target, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  __exportStar(require_logging_utils(), cjsExports);
});
export { require_google_logging_utils };
