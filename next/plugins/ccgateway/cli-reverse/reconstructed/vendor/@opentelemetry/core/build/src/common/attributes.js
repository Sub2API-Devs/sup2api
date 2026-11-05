/**
 * @opentelemetry/core/build/src/common/attributes.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";

//@ chunk-7kayq7nc.js:57069-58005 cjs-fingerprint
var require_attributes = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isAttributeValue = cjsExports.isAttributeKey = cjsExports.sanitizeAttributes = undefined;
  var api_1 = require_api();
  function sanitizeAttributes(attributes) {
    let out = {};
    if (typeof attributes !== "object" || attributes == null) return out;
    for (let key in attributes) {
      if (!Object.prototype.hasOwnProperty.call(attributes, key)) continue;
      if (!isAttributeKey(key)) {
        api_1.diag.warn(`Invalid attribute key: ${key}`);
        continue;
      }
      let val = attributes[key];
      if (!isAttributeValue(val)) {
        api_1.diag.warn(`Invalid attribute value set for key: ${key}`);
        continue;
      }
      if (Array.isArray(val)) out[key] = val.slice();
      else out[key] = val;
    }
    return out;
  }
  cjsExports.sanitizeAttributes = sanitizeAttributes;
  function isAttributeKey(key) {
    return typeof key === "string" && key !== "";
  }
  cjsExports.isAttributeKey = isAttributeKey;
  function isAttributeValue(val) {
    if (val == null) return true;
    if (Array.isArray(val)) return isHomogeneousAttributeValueArray(val);
    return isValidPrimitiveAttributeValueType(typeof val);
  }
  cjsExports.isAttributeValue = isAttributeValue;
  function isHomogeneousAttributeValueArray(arr) {
    let type;
    for (let element of arr) {
      if (element == null) continue;
      let elementType = typeof element;
      if (elementType === type) continue;
      if (!type) {
        if (isValidPrimitiveAttributeValueType(elementType)) {
          type = elementType;
          continue;
        }
        return false;
      }
      return false;
    }
    return true;
  }
  function isValidPrimitiveAttributeValueType(valType) {
    switch (valType) {
      case "number":
      case "boolean":
      case "string":
        return true;
    }
    return false;
  }
});
export { require_attributes };
