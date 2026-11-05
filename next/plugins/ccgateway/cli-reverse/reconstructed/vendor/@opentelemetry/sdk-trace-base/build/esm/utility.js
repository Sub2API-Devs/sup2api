/**
 * @opentelemetry/sdk-trace-base/build/esm/utility.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../core/build/src/index.js";
import { buildSamplerFromEnv, loadDefaultConfig } from "../src/config.js";

//@ chunk-3wgj3rdg.js:15368-15398 esm-layout
var import_core_8 = __toESM(require_core());
var DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
var DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = 1 / 0;
//@ chunk-3wgj3rdg.js:15398-15607 esm-fingerprint
function mergeConfig(userConfig) {
  let perInstanceDefaults = {
    sampler: buildSamplerFromEnv(),
  };
  let DEFAULT_CONFIG = loadDefaultConfig();
  let target = Object.assign({}, DEFAULT_CONFIG, perInstanceDefaults, userConfig);
  target.generalLimits = Object.assign({}, DEFAULT_CONFIG.generalLimits, userConfig.generalLimits || {});
  target.spanLimits = Object.assign({}, DEFAULT_CONFIG.spanLimits, userConfig.spanLimits || {});
  return target;
}
export { import_core_8, DEFAULT_ATTRIBUTE_COUNT_LIMIT, DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT, mergeConfig };
