/**
 * @opentelemetry/sdk-metrics/build/src/view/AttributesProcessor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-wrv5s6k4.js:50125-51247 cjs-fingerprint
var require_AttributesProcessor = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createDenyListAttributesProcessor =
    cjsExports.createAllowListAttributesProcessor =
    cjsExports.createMultiAttributesProcessor =
    cjsExports.createNoopAttributesProcessor =
      undefined;
  class NoopAttributesProcessor {
    process(incoming, _context) {
      return incoming;
    }
  }
  class MultiAttributesProcessor {
    _processors;
    constructor(processors) {
      this._processors = processors;
    }
    process(incoming, context) {
      let filteredAttributes = incoming;
      for (let processor of this._processors)
        filteredAttributes = processor.process(filteredAttributes, context);
      return filteredAttributes;
    }
  }
  class AllowListProcessor {
    _allowedAttributeNames;
    constructor(allowedAttributeNames) {
      this._allowedAttributeNames = new Set(allowedAttributeNames);
    }
    process(incoming, _context) {
      let filteredAttributes = {};
      for (let attributeName in incoming)
        if (
          Object.prototype.hasOwnProperty.call(incoming, attributeName) &&
          this._allowedAttributeNames.has(attributeName)
        )
          filteredAttributes[attributeName] = incoming[attributeName];
      return filteredAttributes;
    }
  }
  class DenyListProcessor {
    _deniedAttributeNames;
    constructor(deniedAttributeNames) {
      this._deniedAttributeNames = new Set(deniedAttributeNames);
    }
    process(incoming, _context) {
      let filteredAttributes = {};
      for (let attributeName in incoming)
        if (
          Object.prototype.hasOwnProperty.call(incoming, attributeName) &&
          !this._deniedAttributeNames.has(attributeName)
        )
          filteredAttributes[attributeName] = incoming[attributeName];
      return filteredAttributes;
    }
  }
  function createNoopAttributesProcessor() {
    return NOOP;
  }
  cjsExports.createNoopAttributesProcessor = createNoopAttributesProcessor;
  function createMultiAttributesProcessor(processors) {
    return new MultiAttributesProcessor(processors);
  }
  cjsExports.createMultiAttributesProcessor = createMultiAttributesProcessor;
  function createAllowListAttributesProcessor(attributeAllowList) {
    return new AllowListProcessor(attributeAllowList);
  }
  cjsExports.createAllowListAttributesProcessor = createAllowListAttributesProcessor;
  function createDenyListAttributesProcessor(attributeDenyList) {
    return new DenyListProcessor(attributeDenyList);
  }
  cjsExports.createDenyListAttributesProcessor = createDenyListAttributesProcessor;
  var NOOP = new NoopAttributesProcessor();
});
export { require_AttributesProcessor };
