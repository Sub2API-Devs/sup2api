/**
 * @opentelemetry/core/build/src/platform/node/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_environment } from "./environment.js";
import { require_globalThis_2 } from "../../common/globalThis.js";
import { require_sdk_info } from "./sdk-info.js";

//@ chunk-7kayq7nc.js:116624-117507 cjs-require-graph
var require_platform_3 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.otperformance =
    cjsExports.SDK_INFO =
    cjsExports._globalThis =
    cjsExports.getStringListFromEnv =
    cjsExports.getNumberFromEnv =
    cjsExports.getBooleanFromEnv =
    cjsExports.getStringFromEnv =
      undefined;
  var environment_1 = require_environment();
  Object.defineProperty(cjsExports, "getStringFromEnv", {
    enumerable: true,
    get: function () {
      return environment_1.getStringFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getBooleanFromEnv", {
    enumerable: true,
    get: function () {
      return environment_1.getBooleanFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getNumberFromEnv", {
    enumerable: true,
    get: function () {
      return environment_1.getNumberFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getStringListFromEnv", {
    enumerable: true,
    get: function () {
      return environment_1.getStringListFromEnv;
    },
  });
  var globalThis_1 = require_globalThis_2();
  Object.defineProperty(cjsExports, "_globalThis", {
    enumerable: true,
    get: function () {
      return globalThis_1._globalThis;
    },
  });
  var sdk_info_1 = require_sdk_info();
  Object.defineProperty(cjsExports, "SDK_INFO", {
    enumerable: true,
    get: function () {
      return sdk_info_1.SDK_INFO;
    },
  });
  cjsExports.otperformance = performance;
});
export { require_platform_3 };
