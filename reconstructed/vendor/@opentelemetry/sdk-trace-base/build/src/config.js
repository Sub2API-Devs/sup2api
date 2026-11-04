/**
 * @opentelemetry/sdk-trace-base/build/src/config.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-9vvvg0d3.js (6)
 * attribution: esm-layout 2, esm-fingerprint 4
 */
import { import_core_6, import_api_4 } from "../esm/Sampler.js";
import { AlwaysOnSampler } from "../esm/sampler/AlwaysOnSampler.js";
import { AlwaysOffSampler } from "../esm/sampler/AlwaysOffSampler.js";
import { ParentBasedSampler } from "./sampler/ParentBasedSampler.js";
import { TraceIdRatioBasedSampler } from "./sampler/TraceIdRatioBasedSampler.js";

//@ chunk-9vvvg0d3.js:13166-13172 esm-layout
var TracesSamplerValues;
//@ chunk-9vvvg0d3.js:13172-13423 esm-fingerprint
(function (TracesSamplerValues) {
  TracesSamplerValues.AlwaysOff = "always_off";
  TracesSamplerValues.AlwaysOn = "always_on";
  TracesSamplerValues.ParentBasedAlwaysOff = "parentbased_always_off";
  TracesSamplerValues.ParentBasedAlwaysOn = "parentbased_always_on";
  TracesSamplerValues.ParentBasedTraceIdRatio = "parentbased_traceidratio";
  TracesSamplerValues.TraceIdRatio = "traceidratio";
})(TracesSamplerValues || (TracesSamplerValues = {}));
//@ chunk-9vvvg0d3.js:13423-13432 esm-layout
var DEFAULT_RATIO = 1;
//@ chunk-9vvvg0d3.js:13432-14190 esm-fingerprint
function loadDefaultConfig() {
  return {
    sampler: buildSamplerFromEnv(),
    forceFlushTimeoutMillis: 30000,
    generalLimits: {
      attributeValueLengthLimit: import_core_6.getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? 1 / 0,
      attributeCountLimit: import_core_6.getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? 128,
    },
    spanLimits: {
      attributeValueLengthLimit:
        import_core_6.getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? 1 / 0,
      attributeCountLimit: import_core_6.getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT") ?? 128,
      linkCountLimit: import_core_6.getNumberFromEnv("OTEL_SPAN_LINK_COUNT_LIMIT") ?? 128,
      eventCountLimit: import_core_6.getNumberFromEnv("OTEL_SPAN_EVENT_COUNT_LIMIT") ?? 128,
      attributePerEventCountLimit:
        import_core_6.getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT") ?? 128,
      attributePerLinkCountLimit:
        import_core_6.getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT") ?? 128,
    },
  };
}
//@ chunk-9vvvg0d3.js:14190-14695 esm-fingerprint
function buildSamplerFromEnv() {
  let sampler =
    import_core_6.getStringFromEnv("OTEL_TRACES_SAMPLER") ?? TracesSamplerValues.ParentBasedAlwaysOn;
  switch (sampler) {
    case TracesSamplerValues.AlwaysOn:
      return new AlwaysOnSampler();
    case TracesSamplerValues.AlwaysOff:
      return new AlwaysOffSampler();
    case TracesSamplerValues.ParentBasedAlwaysOn:
      return new ParentBasedSampler({
        root: new AlwaysOnSampler(),
      });
    case TracesSamplerValues.ParentBasedAlwaysOff:
      return new ParentBasedSampler({
        root: new AlwaysOffSampler(),
      });
    case TracesSamplerValues.TraceIdRatio:
      return new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv());
    case TracesSamplerValues.ParentBasedTraceIdRatio:
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv()),
      });
    default:
      import_api_4.diag.error(
        `OTEL_TRACES_SAMPLER value "${sampler}" invalid, defaulting to "${TracesSamplerValues.ParentBasedAlwaysOn}".`,
      );
      return new ParentBasedSampler({
        root: new AlwaysOnSampler(),
      });
  }
}
//@ chunk-9vvvg0d3.js:14695-14996 esm-fingerprint
function getSamplerProbabilityFromEnv() {
  let probability = import_core_6.getNumberFromEnv("OTEL_TRACES_SAMPLER_ARG");
  if (probability == null) {
    import_api_4.diag.error(`OTEL_TRACES_SAMPLER_ARG is blank, defaulting to ${DEFAULT_RATIO}.`);
    return DEFAULT_RATIO;
  }
  if (probability < 0 || probability > 1) {
    import_api_4.diag.error(
      `OTEL_TRACES_SAMPLER_ARG=${probability} was given, but it is out of range ([0..1]), defaulting to ${DEFAULT_RATIO}.`,
    );
    return DEFAULT_RATIO;
  }
  return probability;
}
export { buildSamplerFromEnv, loadDefaultConfig };
