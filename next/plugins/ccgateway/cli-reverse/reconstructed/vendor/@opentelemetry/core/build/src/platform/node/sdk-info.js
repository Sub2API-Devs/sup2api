/**
 * @opentelemetry/core/build/src/platform/node/sdk-info.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_version_2 } from "../../version.js";
import { require_error_3 } from "../../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_semconv } from "../../semconv.js";

//@ chunk-7kayq7nc.js:116290-116624 cjs-fingerprint
var require_sdk_info = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SDK_INFO = undefined;
  var version_1 = require_version_2();
  var semantic_conventions_1 = require_error_3();
  var semconv_1 = require_semconv();
  cjsExports.SDK_INFO = {
    [semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME]: "opentelemetry",
    [semconv_1.ATTR_PROCESS_RUNTIME_NAME]: "node",
    [semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE]:
      semantic_conventions_1.TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS,
    [semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION]: version_1.VERSION,
  };
});
export { require_sdk_info };
