/**
 * @opentelemetry/resources/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_detect_resources } from "./detect-resources.js";
import { require_detectors } from "./detectors/index.js";
import { require_ResourceImpl } from "./ResourceImpl.js";
import { require_default_service_name } from "./default-service-name.js";

//@ chunk-bwbq4xvm.js:148632-149990 cjs-fingerprint
var require_resources = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.defaultServiceName =
    cjsExports.emptyResource =
    cjsExports.defaultResource =
    cjsExports.resourceFromAttributes =
    cjsExports.serviceInstanceIdDetector =
    cjsExports.processDetector =
    cjsExports.osDetector =
    cjsExports.hostDetector =
    cjsExports.envDetector =
    cjsExports.detectResources =
      undefined;
  var detect_resources_1 = require_detect_resources();
  Object.defineProperty(cjsExports, "detectResources", {
    enumerable: true,
    get: function () {
      return detect_resources_1.detectResources;
    },
  });
  var detectors_1 = require_detectors();
  Object.defineProperty(cjsExports, "envDetector", {
    enumerable: true,
    get: function () {
      return detectors_1.envDetector;
    },
  });
  Object.defineProperty(cjsExports, "hostDetector", {
    enumerable: true,
    get: function () {
      return detectors_1.hostDetector;
    },
  });
  Object.defineProperty(cjsExports, "osDetector", {
    enumerable: true,
    get: function () {
      return detectors_1.osDetector;
    },
  });
  Object.defineProperty(cjsExports, "processDetector", {
    enumerable: true,
    get: function () {
      return detectors_1.processDetector;
    },
  });
  Object.defineProperty(cjsExports, "serviceInstanceIdDetector", {
    enumerable: true,
    get: function () {
      return detectors_1.serviceInstanceIdDetector;
    },
  });
  var ResourceImpl_1 = require_ResourceImpl();
  Object.defineProperty(cjsExports, "resourceFromAttributes", {
    enumerable: true,
    get: function () {
      return ResourceImpl_1.resourceFromAttributes;
    },
  });
  Object.defineProperty(cjsExports, "defaultResource", {
    enumerable: true,
    get: function () {
      return ResourceImpl_1.defaultResource;
    },
  });
  Object.defineProperty(cjsExports, "emptyResource", {
    enumerable: true,
    get: function () {
      return ResourceImpl_1.emptyResource;
    },
  });
  var platform_1 = require_default_service_name();
  Object.defineProperty(cjsExports, "defaultServiceName", {
    enumerable: true,
    get: function () {
      return platform_1.defaultServiceName;
    },
  });
});
export { require_resources };
