/**
 * @opentelemetry/api/build/src/baggage/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_diag } from "../api/diag.js";
import { require_baggage_impl } from "./internal/baggage-impl.js";
import { require_symbol } from "./internal/symbol.js";

//@ chunk-bwbq4xvm.js:34278-34777 cjs-fingerprint
var require_utils_5 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.baggageEntryMetadataFromString = cjsExports.createBaggage = undefined;
  var diag_1 = require_diag();
  var baggage_impl_1 = require_baggage_impl();
  var symbol_1 = require_symbol();
  var diag = diag_1.DiagAPI.instance();
  function createBaggage(entries = {}) {
    return new baggage_impl_1.BaggageImpl(new Map(Object.entries(entries)));
  }
  cjsExports.createBaggage = createBaggage;
  function baggageEntryMetadataFromString(str) {
    if (typeof str !== "string") {
      diag.error(`Cannot create baggage metadata from unknown type: ${typeof str}`);
      str = "";
    }
    return {
      __TYPE__: symbol_1.baggageEntryMetadataSymbol,
      toString() {
        return str;
      },
    };
  }
  cjsExports.baggageEntryMetadataFromString = baggageEntryMetadataFromString;
});
export { require_utils_5 };
