/**
 * @opentelemetry/resources/build/src/detectors/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_EnvDetector } from "./EnvDetector.js";
import { require_platform_6 } from "./platform/index.js";
import { require_NoopDetector } from "./NoopDetector.js";

//@ chunk-7kayq7nc.js:147906-148734 cjs-fingerprint
var require_detectors = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.noopDetector =
    cjsExports.serviceInstanceIdDetector =
    cjsExports.processDetector =
    cjsExports.osDetector =
    cjsExports.hostDetector =
    cjsExports.envDetector =
      undefined;
  var EnvDetector_1 = require_EnvDetector();
  Object.defineProperty(cjsExports, "envDetector", {
    enumerable: true,
    get: function () {
      return EnvDetector_1.envDetector;
    },
  });
  var platform_1 = require_platform_6();
  Object.defineProperty(cjsExports, "hostDetector", {
    enumerable: true,
    get: function () {
      return platform_1.hostDetector;
    },
  });
  Object.defineProperty(cjsExports, "osDetector", {
    enumerable: true,
    get: function () {
      return platform_1.osDetector;
    },
  });
  Object.defineProperty(cjsExports, "processDetector", {
    enumerable: true,
    get: function () {
      return platform_1.processDetector;
    },
  });
  Object.defineProperty(cjsExports, "serviceInstanceIdDetector", {
    enumerable: true,
    get: function () {
      return platform_1.serviceInstanceIdDetector;
    },
  });
  var NoopDetector_1 = require_NoopDetector();
  Object.defineProperty(cjsExports, "noopDetector", {
    enumerable: true,
    get: function () {
      return NoopDetector_1.noopDetector;
    },
  });
});
export { require_detectors };
