/**
 * @opentelemetry/sdk-metrics/build/src/state/MetricStorage.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_InstrumentDescriptor } from "../InstrumentDescriptor.js";

//@ chunk-q87n5wsq.js:36515-37064 cjs-fingerprint
var require_MetricStorage = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MetricStorage = undefined;
  var InstrumentDescriptor_1 = require_InstrumentDescriptor();
  class MetricStorage {
    _instrumentDescriptor;
    constructor(instrumentDescriptor) {
      this._instrumentDescriptor = instrumentDescriptor;
    }
    getInstrumentDescriptor() {
      return this._instrumentDescriptor;
    }
    updateDescription(description) {
      this._instrumentDescriptor = InstrumentDescriptor_1.createInstrumentDescriptor(
        this._instrumentDescriptor.name,
        this._instrumentDescriptor.type,
        {
          description,
          valueType: this._instrumentDescriptor.valueType,
          unit: this._instrumentDescriptor.unit,
          advice: this._instrumentDescriptor.advice,
        },
      );
    }
  }
  cjsExports.MetricStorage = MetricStorage;
});
export { require_MetricStorage };
