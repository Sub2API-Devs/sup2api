/**
 * @opentelemetry/resources/build/src/detectors/EnvDetector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_error_3 } from "../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_core } from "../../../../core/build/src/index.js";

//@ chunk-7kayq7nc.js:139879-141363 cjs-require-graph
var require_EnvDetector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.envDetector = undefined;
  var api_1 = require_api();
  var semantic_conventions_1 = require_error_3();
  var core_1 = require_core();
  class EnvDetector {
    _MAX_LENGTH = 255;
    _COMMA_SEPARATOR = ",";
    _LABEL_KEY_VALUE_SPLITTER = "=";
    detect(_config) {
      let attributes = {};
      let rawAttributes = core_1.getStringFromEnv("OTEL_RESOURCE_ATTRIBUTES");
      let serviceName = core_1.getStringFromEnv("OTEL_SERVICE_NAME");
      if (rawAttributes)
        try {
          let parsedAttributes = this._parseResourceAttributes(rawAttributes);
          Object.assign(attributes, parsedAttributes);
        } catch (e) {
          api_1.diag.debug(`EnvDetector failed: ${e instanceof Error ? e.message : e}`);
        }
      if (serviceName) attributes[semantic_conventions_1.ATTR_SERVICE_NAME] = serviceName;
      return {
        attributes,
      };
    }
    _parseResourceAttributes(rawEnvAttributes) {
      if (!rawEnvAttributes) return {};
      let attributes = {};
      let rawAttributes = rawEnvAttributes.split(this._COMMA_SEPARATOR).filter((attr) => attr.trim() !== "");
      for (let rawAttribute of rawAttributes) {
        let keyValuePair = rawAttribute.split(this._LABEL_KEY_VALUE_SPLITTER);
        if (keyValuePair.length !== 2)
          throw Error(
            `Invalid format for OTEL_RESOURCE_ATTRIBUTES: "${rawAttribute}". Expected format: key=value. The ',' and '=' characters must be percent-encoded in keys and values.`,
          );
        let [rawKey, rawValue] = keyValuePair;
        let key = rawKey.trim();
        let value = rawValue.trim();
        if (key.length === 0)
          throw Error(`Invalid OTEL_RESOURCE_ATTRIBUTES: empty attribute key in "${rawAttribute}".`);
        let decodedKey;
        let decodedValue;
        try {
          decodedKey = decodeURIComponent(key);
          decodedValue = decodeURIComponent(value);
        } catch (e) {
          throw Error(
            `Failed to percent-decode OTEL_RESOURCE_ATTRIBUTES entry "${rawAttribute}": ${e instanceof Error ? e.message : e}`,
          );
        }
        if (decodedKey.length > this._MAX_LENGTH)
          throw Error(
            `Attribute key exceeds the maximum length of ${this._MAX_LENGTH} characters: "${decodedKey}".`,
          );
        if (decodedValue.length > this._MAX_LENGTH)
          throw Error(
            `Attribute value exceeds the maximum length of ${this._MAX_LENGTH} characters for key "${decodedKey}".`,
          );
        attributes[decodedKey] = decodedValue;
      }
      return attributes;
    }
  }
  cjsExports.envDetector = new EnvDetector();
});
export { require_EnvDetector };
