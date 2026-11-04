/**
 * @grpc/grpc-js/build/src/metadata.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_logging } from "./logging.js";
import { require_constants } from "./constants.js";
import { require_error } from "./error.js";

//@ chunk-pwh5dx3n.js:6294-8822 cjs-fingerprint
var require_metadata = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Metadata = undefined;
  var logging_1 = require_logging();
  var constants_1 = require_constants();
  var error_1 = require_error();
  var LEGAL_KEY_REGEX = /^[:0-9a-z_.-]+$/;
  var LEGAL_NON_BINARY_VALUE_REGEX = /^[ -~]*$/;
  function isLegalKey(key) {
    return LEGAL_KEY_REGEX.test(key);
  }
  function isLegalNonBinaryValue(value) {
    return LEGAL_NON_BINARY_VALUE_REGEX.test(value);
  }
  function isBinaryKey(key) {
    return key.endsWith("-bin");
  }
  function isCustomMetadata(key) {
    return !key.startsWith("grpc-");
  }
  function normalizeKey(key) {
    return key.toLowerCase();
  }
  function validate(key, value) {
    if (!isLegalKey(key)) throw Error('Metadata key "' + key + '" contains illegal characters');
    if (value !== null && value !== undefined)
      if (isBinaryKey(key)) {
        if (!Buffer.isBuffer(value)) throw Error("keys that end with '-bin' must have Buffer values");
      } else {
        if (Buffer.isBuffer(value)) throw Error("keys that don't end with '-bin' must have String values");
        if (!isLegalNonBinaryValue(value))
          throw Error('Metadata string value "' + value + '" contains illegal characters');
      }
  }
  class Metadata {
    constructor(options = {}) {
      this.internalRepr = new Map();
      this.opaqueData = new Map();
      this.options = options;
    }
    set(key, value) {
      key = normalizeKey(key);
      validate(key, value);
      this.internalRepr.set(key, [value]);
    }
    add(key, value) {
      key = normalizeKey(key);
      validate(key, value);
      let existingValue = this.internalRepr.get(key);
      if (existingValue === undefined) this.internalRepr.set(key, [value]);
      else existingValue.push(value);
    }
    remove(key) {
      key = normalizeKey(key);
      this.internalRepr.delete(key);
    }
    get(key) {
      key = normalizeKey(key);
      return this.internalRepr.get(key) || [];
    }
    getMap() {
      let result = {};
      for (let [key, values] of this.internalRepr)
        if (values.length > 0) {
          let v = values[0];
          result[key] = Buffer.isBuffer(v) ? Buffer.from(v) : v;
        }
      return result;
    }
    clone() {
      let newMetadata = new Metadata(this.options);
      let newInternalRepr = newMetadata.internalRepr;
      for (let [key, value] of this.internalRepr) {
        let clonedValue = value.map((v) => {
          if (Buffer.isBuffer(v)) return Buffer.from(v);
          else return v;
        });
        newInternalRepr.set(key, clonedValue);
      }
      return newMetadata;
    }
    merge(other) {
      for (let [key, values] of other.internalRepr) {
        let mergedValue = (this.internalRepr.get(key) || []).concat(values);
        this.internalRepr.set(key, mergedValue);
      }
    }
    setOptions(options) {
      this.options = options;
    }
    getOptions() {
      return this.options;
    }
    toHttp2Headers() {
      let result = {};
      for (let [key, values] of this.internalRepr) {
        if (key.startsWith(":")) continue;
        result[key] = values.map(bufToString);
      }
      return result;
    }
    toJSON() {
      let result = {};
      for (let [key, values] of this.internalRepr) result[key] = values;
      return result;
    }
    setOpaque(key, value) {
      this.opaqueData.set(key, value);
    }
    getOpaque(key) {
      return this.opaqueData.get(key);
    }
    static fromHttp2Headers(headers) {
      let result = new Metadata();
      for (let key of Object.keys(headers)) {
        if (key.charAt(0) === ":") continue;
        let values = headers[key];
        try {
          if (isBinaryKey(key)) {
            if (Array.isArray(values))
              values.forEach((value) => {
                result.add(key, Buffer.from(value, "base64"));
              });
            else if (values !== undefined)
              if (isCustomMetadata(key))
                values.split(",").forEach((v) => {
                  result.add(key, Buffer.from(v.trim(), "base64"));
                });
              else result.add(key, Buffer.from(values, "base64"));
          } else if (Array.isArray(values))
            values.forEach((value) => {
              result.add(key, value);
            });
          else if (values !== undefined) result.add(key, values);
        } catch (error) {
          let message = `Failed to add metadata entry ${key}: ${values}. ${error_1.getErrorMessage(error)}. For more information see https://github.com/grpc/grpc-node/issues/1173`;
          logging_1.log(constants_1.LogVerbosity.ERROR, message);
        }
      }
      return result;
    }
  }
  cjsExports.Metadata = Metadata;
  var bufToString = (val) => (Buffer.isBuffer(val) ? val.toString("base64") : val);
});
export { require_metadata };
