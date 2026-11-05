/**
 * @opentelemetry/sdk-metrics/build/src/InstrumentDescriptor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_utils } from "./utils.js";

//@ chunk-q87n5wsq.js:31700-32677 cjs-fingerprint
var require_InstrumentDescriptor = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isValidName =
    cjsExports.isDescriptorCompatibleWith =
    cjsExports.createInstrumentDescriptorWithView =
    cjsExports.createInstrumentDescriptor =
      undefined;
  var api_1 = require_api();
  var utils_1 = require_utils();
  function createInstrumentDescriptor(name, type, options) {
    if (!isValidName(name))
      api_1.diag.warn(
        `Invalid metric name: "${name}". The metric name should be a ASCII string with a length no greater than 255 characters.`,
      );
    return {
      name,
      type,
      description: options?.description ?? "",
      unit: options?.unit ?? "",
      valueType: options?.valueType ?? api_1.ValueType.DOUBLE,
      advice: options?.advice ?? {},
    };
  }
  cjsExports.createInstrumentDescriptor = createInstrumentDescriptor;
  function createInstrumentDescriptorWithView(view, instrument) {
    return {
      name: view.name ?? instrument.name,
      description: view.description ?? instrument.description,
      type: instrument.type,
      unit: instrument.unit,
      valueType: instrument.valueType,
      advice: instrument.advice,
    };
  }
  cjsExports.createInstrumentDescriptorWithView = createInstrumentDescriptorWithView;
  function isDescriptorCompatibleWith(descriptor, otherDescriptor) {
    return (
      utils_1.equalsCaseInsensitive(descriptor.name, otherDescriptor.name) &&
      descriptor.unit === otherDescriptor.unit &&
      descriptor.type === otherDescriptor.type &&
      descriptor.valueType === otherDescriptor.valueType
    );
  }
  cjsExports.isDescriptorCompatibleWith = isDescriptorCompatibleWith;
  var NAME_REGEXP = /^[a-z][a-z0-9_.\-/]{0,254}$/i;
  function isValidName(name) {
    return NAME_REGEXP.test(name);
  }
  cjsExports.isValidName = isValidName;
});
export { require_InstrumentDescriptor };
