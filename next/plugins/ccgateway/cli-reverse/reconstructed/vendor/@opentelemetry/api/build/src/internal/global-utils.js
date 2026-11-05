/**
 * @opentelemetry/api/build/src/internal/global-utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_platform_2 } from "../platform/index.js";
import { require_version } from "../version.js";
import { require_semver_2 } from "./semver.js";

//@ chunk-7kayq7nc.js:29773-30891 cjs-fingerprint
var require_global_utils = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.unregisterGlobal = cjsExports.getGlobal = cjsExports.registerGlobal = undefined;
  var platform_1 = require_platform_2();
  var version_1 = require_version();
  var semver_1 = require_semver_2();
  var major = version_1.VERSION.split(".")[0];
  var GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for(`opentelemetry.js.api.${major}`);
  var _global = platform_1._globalThis;
  function registerGlobal(type, instance, diag, allowOverride = false) {
    var _a;
    let api = (_global[GLOBAL_OPENTELEMETRY_API_KEY] =
      (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== undefined
        ? _a
        : {
            version: version_1.VERSION,
          });
    if (!allowOverride && api[type]) {
      let err = Error(`@opentelemetry/api: Attempted duplicate registration of API: ${type}`);
      diag.error(err.stack || err.message);
      return false;
    }
    if (api.version !== version_1.VERSION) {
      let err = Error(
        `@opentelemetry/api: Registration of version v${api.version} for ${type} does not match previously registered API v${version_1.VERSION}`,
      );
      diag.error(err.stack || err.message);
      return false;
    }
    api[type] = instance;
    diag.debug(`@opentelemetry/api: Registered a global for ${type} v${version_1.VERSION}.`);
    return true;
  }
  cjsExports.registerGlobal = registerGlobal;
  function getGlobal(type) {
    var _a;
    var _b;
    let globalVersion =
      (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === undefined ? undefined : _a.version;
    if (!globalVersion || !semver_1.isCompatible(globalVersion)) return;
    return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === undefined ? undefined : _b[type];
  }
  cjsExports.getGlobal = getGlobal;
  function unregisterGlobal(type, diag) {
    diag.debug(`@opentelemetry/api: Unregistering a global for ${type} v${version_1.VERSION}.`);
    let api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
    if (api) delete api[type];
  }
  cjsExports.unregisterGlobal = unregisterGlobal;
});
export { require_global_utils };
