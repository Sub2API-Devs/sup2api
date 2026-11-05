/**
 * @opentelemetry/core/build/src/baggage/propagation/W3CBaggagePropagator.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../../api/build/src/index.js";
import { require_suppress_tracing } from "../../trace/suppress-tracing.js";
import { require_constants_2 } from "../constants.js";
import { require_utils } from "../utils.js";

//@ chunk-7kayq7nc.js:55798-56705 cjs-fingerprint
var require_W3CBaggagePropagator = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.W3CBaggagePropagator = undefined;
  var api_1 = require_api();
  var suppress_tracing_1 = require_suppress_tracing();
  var constants_1 = require_constants_2();
  var utils_1 = require_utils();
  class W3CBaggagePropagator {
    inject(context, carrier, setter) {
      let baggage = api_1.propagation.getBaggage(context);
      if (!baggage || suppress_tracing_1.isTracingSuppressed(context)) return;
      let keyPairs = utils_1
        .getKeyPairs(baggage)
        .filter((pair) => pair.length <= constants_1.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS)
        .slice(0, constants_1.BAGGAGE_MAX_NAME_VALUE_PAIRS);
      let headerValue = utils_1.serializeKeyPairs(keyPairs);
      if (headerValue.length > 0) setter.set(carrier, constants_1.BAGGAGE_HEADER, headerValue);
    }
    extract(context, carrier, getter) {
      let headerValue = getter.get(carrier, constants_1.BAGGAGE_HEADER);
      let baggageString = Array.isArray(headerValue)
        ? headerValue.join(constants_1.BAGGAGE_ITEMS_SEPARATOR)
        : headerValue;
      if (!baggageString) return context;
      let baggage = {};
      if (baggageString.length === 0) return context;
      baggageString.split(constants_1.BAGGAGE_ITEMS_SEPARATOR).forEach((entry) => {
        let keyPair = utils_1.parsePairKeyValue(entry);
        if (keyPair) {
          let baggageEntry = {
            value: keyPair.value,
          };
          if (keyPair.metadata) baggageEntry.metadata = keyPair.metadata;
          baggage[keyPair.key] = baggageEntry;
        }
      });
      if (Object.entries(baggage).length === 0) return context;
      return api_1.propagation.setBaggage(context, api_1.propagation.createBaggage(baggage));
    }
    fields() {
      return [constants_1.BAGGAGE_HEADER];
    }
  }
  cjsExports.W3CBaggagePropagator = W3CBaggagePropagator;
});
export { require_W3CBaggagePropagator };
