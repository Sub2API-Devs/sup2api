/**
 * @modelcontextprotocol/sdk/dist/cjs/validation/ajv-provider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { isPlainObject } from "../../esm/shared/protocol.js";
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_ajv } from "../../../../../ajv/dist/ajv.js";
import { require_ajv_formats } from "../../../../../ajv-formats/dist/index.js";
import { deferInit } from "../../../../../../runtime/deferred-init.js";

//@ chunk-zykv69v4.js:27574-27722 esm-layout
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
//@ chunk-zykv69v4.js:27722-27755 esm-layout
var import_ajv; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_ajv_formats;
deferInit("chunk-zykv69v4.js:27722", () => {
  import_ajv = __toESM(require_ajv(), 1);
  import_ajv_formats = __toESM(require_ajv_formats(), 1);
});
//@ chunk-zykv69v4.js:27755-27876 esm-fingerprint
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
//@ chunk-zykv69v4.js:27876-28190 esm-fingerprint
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
