/**
 * @opentelemetry/core/build/src/platform/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_platform_3 } from "./node/index.js";

//@ chunk-7kayq7nc.js:117507-118435 cjs-fingerprint
var require_platform_4 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getStringListFromEnv =
    cjsExports.getNumberFromEnv =
    cjsExports.getStringFromEnv =
    cjsExports.getBooleanFromEnv =
    cjsExports.otperformance =
    cjsExports._globalThis =
    cjsExports.SDK_INFO =
      undefined;
  var node_1 = require_platform_3();
  Object.defineProperty(cjsExports, "SDK_INFO", {
    enumerable: true,
    get: function () {
      return node_1.SDK_INFO;
    },
  });
  Object.defineProperty(cjsExports, "_globalThis", {
    enumerable: true,
    get: function () {
      return node_1._globalThis;
    },
  });
  Object.defineProperty(cjsExports, "otperformance", {
    enumerable: true,
    get: function () {
      return node_1.otperformance;
    },
  });
  Object.defineProperty(cjsExports, "getBooleanFromEnv", {
    enumerable: true,
    get: function () {
      return node_1.getBooleanFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getStringFromEnv", {
    enumerable: true,
    get: function () {
      return node_1.getStringFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getNumberFromEnv", {
    enumerable: true,
    get: function () {
      return node_1.getNumberFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getStringListFromEnv", {
    enumerable: true,
    get: function () {
      return node_1.getStringListFromEnv;
    },
  });
});
export { require_platform_4 };
