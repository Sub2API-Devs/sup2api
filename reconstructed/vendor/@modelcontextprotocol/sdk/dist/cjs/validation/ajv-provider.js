/**
 * @modelcontextprotocol/sdk/dist/cjs/validation/ajv-provider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { isPlainObject } from "../../esm/shared/protocol.js";
import { Re } from "../../../../../../runtime/bun-runtime.js";
import { require_ajv } from "../../../../../ajv/dist/ajv.js";
import { require_ajv_formats } from "../../../../../ajv-formats/dist/index.js";

//@ chunk-zykv69v4.js:27574-27722 esm-layout
function vGn(mod, capabilities) {
  let r = {
    ...mod,
  };
  for (let key in capabilities) {
    let n = key;
    let s = capabilities[n];
    if (s === undefined) continue;
    let o = r[n];
    if (isPlainObject(o) && isPlainObject(s))
      r[n] = {
        ...o,
        ...s,
      };
    else r[n] = s;
  }
  return r;
}
//@ chunk-zykv69v4.js:27722-27755 esm-layout
var import_ajv = Re(require_ajv(), 1);
var import_ajv_formats = Re(require_ajv_formats(), 1);
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
class Gsn {
  constructor(ajv) {
    this._ajv = ajv ?? createDefaultAjvInstance();
  }
  getValidator(schema) {
    let ajvValidator =
      "$id" in schema && typeof schema.$id === "string"
        ? (this._ajv.getSchema(schema.$id) ?? this._ajv.compile(schema))
        : this._ajv.compile(schema);
    return (r) => {
      if (ajvValidator(r))
        return {
          valid: true,
          data: r,
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
export { Gsn, vGn };
