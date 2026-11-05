/**
 * @opentelemetry/core/build/src/platform/node/environment.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../../api/build/src/index.js";

//@ chunk-7kayq7nc.js:58722-59645 cjs-fingerprint
var require_environment = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getStringListFromEnv =
    cjsExports.getBooleanFromEnv =
    cjsExports.getStringFromEnv =
    cjsExports.getNumberFromEnv =
      undefined;
  var api_1 = require_api();
  var util_1 = importMetaRequire("util");
  function getNumberFromEnv(key) {
    let raw = process.env[key];
    if (raw == null || raw.trim() === "") return;
    let value = Number(raw);
    if (isNaN(value)) {
      api_1.diag.warn(`Unknown value ${util_1.inspect(raw)} for ${key}, expected a number, using defaults`);
      return;
    }
    return value;
  }
  cjsExports.getNumberFromEnv = getNumberFromEnv;
  function getStringFromEnv(key) {
    let raw = process.env[key];
    if (raw == null || raw.trim() === "") return;
    return raw;
  }
  cjsExports.getStringFromEnv = getStringFromEnv;
  function getBooleanFromEnv(key) {
    let raw = process.env[key]?.trim().toLowerCase();
    if (raw == null || raw === "") return false;
    if (raw === "true") return true;
    else if (raw === "false") return false;
    else {
      api_1.diag.warn(
        `Unknown value ${util_1.inspect(raw)} for ${key}, expected 'true' or 'false', falling back to 'false' (default)`,
      );
      return false;
    }
  }
  cjsExports.getBooleanFromEnv = getBooleanFromEnv;
  function getStringListFromEnv(key) {
    return getStringFromEnv(key)
      ?.split(",")
      .map((v) => v.trim())
      .filter((item) => item !== "");
  }
  cjsExports.getStringListFromEnv = getStringListFromEnv;
});
export { require_environment };
