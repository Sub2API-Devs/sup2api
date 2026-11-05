/**
 * @opentelemetry/resources/build/src/detect-resources.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_ResourceImpl } from "./ResourceImpl.js";

//@ chunk-7kayq7nc.js:139434-139879 cjs-fingerprint
var require_detect_resources = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.detectResources = undefined;
  var api_1 = require_api();
  var ResourceImpl_1 = require_ResourceImpl();
  var detectResources = (config = {}) =>
    (config.detectors || [])
      .map((d) => {
        try {
          let resource = ResourceImpl_1.resourceFromDetectedResource(d.detect(config));
          api_1.diag.debug(`${d.constructor.name} found resource.`, resource);
          return resource;
        } catch (e) {
          api_1.diag.debug(`${d.constructor.name} failed: ${e.message}`);
          return ResourceImpl_1.emptyResource();
        }
      })
      .reduce((acc, resource) => acc.merge(resource), ResourceImpl_1.emptyResource());
  cjsExports.detectResources = detectResources;
});
export { require_detect_resources };
