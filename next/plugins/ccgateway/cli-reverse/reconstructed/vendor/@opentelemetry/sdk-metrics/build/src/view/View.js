/**
 * @opentelemetry/sdk-metrics/build/src/view/View.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_Predicate } from "./Predicate.js";
import { require_AttributesProcessor } from "./AttributesProcessor.js";
import { require_InstrumentSelector } from "./InstrumentSelector.js";
import { require_MeterSelector } from "./MeterSelector.js";
import { require_AggregationOption } from "./AggregationOption.js";

//@ chunk-q87n5wsq.js:56311-57680 cjs-fingerprint
var require_View = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.View = undefined;
  var Predicate_1 = require_Predicate();
  var AttributesProcessor_1 = require_AttributesProcessor();
  var InstrumentSelector_1 = require_InstrumentSelector();
  var MeterSelector_1 = require_MeterSelector();
  var AggregationOption_1 = require_AggregationOption();
  function isSelectorNotProvided(options) {
    return (
      options.instrumentName == null &&
      options.instrumentType == null &&
      options.instrumentUnit == null &&
      options.meterName == null &&
      options.meterVersion == null &&
      options.meterSchemaUrl == null
    );
  }
  function validateViewOptions(viewOptions) {
    if (isSelectorNotProvided(viewOptions))
      throw Error("Cannot create view with no selector arguments supplied");
    if (
      viewOptions.name != null &&
      (viewOptions?.instrumentName == null ||
        Predicate_1.PatternPredicate.hasWildcard(viewOptions.instrumentName))
    )
      throw Error(
        "Views with a specified name must be declared with an instrument selector that selects at most one instrument per meter.",
      );
  }
  class View {
    name;
    description;
    aggregation;
    attributesProcessor;
    instrumentSelector;
    meterSelector;
    aggregationCardinalityLimit;
    constructor(viewOptions) {
      validateViewOptions(viewOptions);
      if (viewOptions.attributesProcessors != null)
        this.attributesProcessor = AttributesProcessor_1.createMultiAttributesProcessor(
          viewOptions.attributesProcessors,
        );
      else this.attributesProcessor = AttributesProcessor_1.createNoopAttributesProcessor();
      this.name = viewOptions.name;
      this.description = viewOptions.description;
      this.aggregation = AggregationOption_1.toAggregation(
        viewOptions.aggregation ?? {
          type: AggregationOption_1.AggregationType.DEFAULT,
        },
      );
      this.instrumentSelector = new InstrumentSelector_1.InstrumentSelector({
        name: viewOptions.instrumentName,
        type: viewOptions.instrumentType,
        unit: viewOptions.instrumentUnit,
      });
      this.meterSelector = new MeterSelector_1.MeterSelector({
        name: viewOptions.meterName,
        version: viewOptions.meterVersion,
        schemaUrl: viewOptions.meterSchemaUrl,
      });
      this.aggregationCardinalityLimit = viewOptions.aggregationCardinalityLimit;
    }
  }
  cjsExports.View = View;
});
export { require_View };
