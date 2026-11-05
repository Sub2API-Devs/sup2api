/**
 * @modelcontextprotocol/sdk/dist/cjs/validation/ajv-provider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-efaj9q04.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject } from "../../esm/shared/protocol.js";
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_ajv } from "../../../../../ajv/dist/ajv.js";
import { require_ajv_formats } from "../../../../../ajv-formats/dist/index.js";
import { deferInit } from "../../../../../../runtime/deferred-init.js";

//@ chunk-efaj9q04.js:27577-27725 esm-layout
function mergeCapabilities(mod, capabilities) {
  let result = {
    ...mod,
  };
  for (let key in capabilities) {
    let capabilityKey = key;
    let value = capabilities[capabilityKey];
    if (value === undefined) continue;
    let current = result[capabilityKey];
    if (isPlainObject(current) && isPlainObject(value))
      result[capabilityKey] = {
        ...current,
        ...value,
      };
    else result[capabilityKey] = value;
  }
  return result;
}
//@ chunk-efaj9q04.js:27725-27758 esm-layout
var import_ajv; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_ajv_formats;
deferInit("chunk-efaj9q04.js:27725", () => {
  import_ajv = __toESM(require_ajv(), 1);
  import_ajv_formats = __toESM(require_ajv_formats(), 1);
});
//@ chunk-efaj9q04.js:27758-27879 esm-fingerprint
function createDefaultAjvInstance() {
  let ajv = new import_ajv.default({
    strict: false,
    validateFormats: true,
    validateSchema: false,
    allErrors: true,
  });
  import_ajv_formats.default(ajv);
  return ajv;
}
//@ chunk-efaj9q04.js:27879-28193 esm-fingerprint
class AjvJsonSchemaValidator {
  constructor(ajv) {
    this._ajv = ajv ?? createDefaultAjvInstance();
  }
  getValidator(schema) {
    let ajvValidator =
      "$id" in schema && typeof schema.$id === "string"
        ? (this._ajv.getSchema(schema.$id) ?? this._ajv.compile(schema))
        : this._ajv.compile(schema);
    return (input) => {
      if (ajvValidator(input))
        return {
          valid: true,
          data: input,
          errorMessage: undefined,
        };
      else
        return {
          valid: false,
          data: undefined,
          errorMessage: this._ajv.errorsText(ajvValidator.errors),
        };
    };
  }
}
export { AjvJsonSchemaValidator, mergeCapabilities };
