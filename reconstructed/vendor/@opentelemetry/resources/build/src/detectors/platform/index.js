/**
 * @opentelemetry/resources/build/src/detectors/platform/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-bwbq4xvm.js (2)
 * attribution: cjs-fingerprint 2
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_HostDetector } from "./node/HostDetector.js";
import { require_OSDetector } from "./node/OSDetector.js";
import { require_ProcessDetector } from "./node/ProcessDetector.js";
import { require_ServiceInstanceIdDetector } from "./node/ServiceInstanceIdDetector.js";

//@ chunk-bwbq4xvm.js:146406-147025 cjs-fingerprint
var require_platform_5 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.serviceInstanceIdDetector =
    cjsExports.processDetector =
    cjsExports.osDetector =
    cjsExports.hostDetector =
      undefined;
  var hostDetectorModule = require_HostDetector();
  Object.defineProperty(cjsExports, "hostDetector", {
    enumerable: true,
    get: function () {
      return hostDetectorModule.hostDetector;
    },
  });
  var osDetectorModule = require_OSDetector();
  Object.defineProperty(cjsExports, "osDetector", {
    enumerable: true,
    get: function () {
      return osDetectorModule.osDetector;
    },
  });
  var processDetectorModule = require_ProcessDetector();
  Object.defineProperty(cjsExports, "processDetector", {
    enumerable: true,
    get: function () {
      return processDetectorModule.processDetector;
    },
  });
  var serviceInstanceIdDetectorModule = require_ServiceInstanceIdDetector();
  Object.defineProperty(cjsExports, "serviceInstanceIdDetector", {
    enumerable: true,
    get: function () {
      return serviceInstanceIdDetectorModule.serviceInstanceIdDetector;
    },
  });
});
//@ chunk-bwbq4xvm.js:147025-147608 cjs-fingerprint
var require_platform_6 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.serviceInstanceIdDetector =
    cjsExports.processDetector =
    cjsExports.osDetector =
    cjsExports.hostDetector =
      undefined;
  var node_1 = require_platform_5();
  Object.defineProperty(cjsExports, "hostDetector", {
    enumerable: true,
    get: function () {
      return node_1.hostDetector;
    },
  });
  Object.defineProperty(cjsExports, "osDetector", {
    enumerable: true,
    get: function () {
      return node_1.osDetector;
    },
  });
  Object.defineProperty(cjsExports, "processDetector", {
    enumerable: true,
    get: function () {
      return node_1.processDetector;
    },
  });
  Object.defineProperty(cjsExports, "serviceInstanceIdDetector", {
    enumerable: true,
    get: function () {
      return node_1.serviceInstanceIdDetector;
    },
  });
});
export { require_platform_6 };
