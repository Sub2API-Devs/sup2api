/**
 * @opentelemetry/sdk-trace-base/build/src/Tracer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-9vvvg0d3.js (1)
 * attribution: esm-fingerprint 1
 */
import { mergeConfig } from "../esm/utility.js";
import { RandomIdGenerator } from "../esm/platform/node/RandomIdGenerator.js";
import { import_api_2, import_core_4 } from "../esm/enums.js";
import { SpanImpl } from "./Span.js";

//@ chunk-9vvvg0d3.js:19579-21506 esm-fingerprint
class Tracer {
  _sampler;
  _generalLimits;
  _spanLimits;
  _idGenerator;
  instrumentationScope;
  _resource;
  _spanProcessor;
  constructor(instrumentationScope, config, resource, spanProcessor) {
    let localConfig = mergeConfig(config);
    this._sampler = localConfig.sampler;
    this._generalLimits = localConfig.generalLimits;
    this._spanLimits = localConfig.spanLimits;
    this._idGenerator = config.idGenerator || new RandomIdGenerator();
    this._resource = resource;
    this._spanProcessor = spanProcessor;
    this.instrumentationScope = instrumentationScope;
  }
  startSpan(name, options = {}, context = import_api_2.context.active()) {
    if (options.root) context = import_api_2.trace.deleteSpan(context);
    let parentSpan = import_api_2.trace.getSpan(context);
    if (import_core_4.isTracingSuppressed(context)) {
      import_api_2.diag.debug("Instrumentation suppressed, returning Noop Span");
      return import_api_2.trace.wrapSpanContext(import_api_2.INVALID_SPAN_CONTEXT);
    }
    let parentSpanContext = parentSpan?.spanContext();
    let spanId = this._idGenerator.generateSpanId();
    let validParentSpanContext;
    let traceId;
    let traceState;
    if (!parentSpanContext || !import_api_2.trace.isSpanContextValid(parentSpanContext))
      traceId = this._idGenerator.generateTraceId();
    else {
      traceId = parentSpanContext.traceId;
      traceState = parentSpanContext.traceState;
      validParentSpanContext = parentSpanContext;
    }
    let spanKind = options.kind ?? import_api_2.SpanKind.INTERNAL;
    let links = (options.links ?? []).map((link) => ({
      context: link.context,
      attributes: import_core_4.sanitizeAttributes(link.attributes),
    }));
    let attributes = import_core_4.sanitizeAttributes(options.attributes);
    let samplingResult = this._sampler.shouldSample(context, traceId, name, spanKind, attributes, links);
    traceState = samplingResult.traceState ?? traceState;
    let traceFlags =
      samplingResult.decision === import_api_2.SamplingDecision.RECORD_AND_SAMPLED
        ? import_api_2.TraceFlags.SAMPLED
        : import_api_2.TraceFlags.NONE;
    let spanContext = {
      traceId,
      spanId,
      traceFlags,
      traceState,
    };
    if (samplingResult.decision === import_api_2.SamplingDecision.NOT_RECORD) {
      import_api_2.diag.debug("Recording is off, propagating context in a non-recording span");
      return import_api_2.trace.wrapSpanContext(spanContext);
    }
    let initAttributes = import_core_4.sanitizeAttributes(
      Object.assign(attributes, samplingResult.attributes),
    );
    return new SpanImpl({
      resource: this._resource,
      scope: this.instrumentationScope,
      context,
      spanContext,
      name,
      kind: spanKind,
      links,
      parentSpanContext: validParentSpanContext,
      attributes: initAttributes,
      startTime: options.startTime,
      spanProcessor: this._spanProcessor,
      spanLimits: this._spanLimits,
    });
  }
  startActiveSpan(name, arg2, arg3, arg4) {
    let opts;
    let ctx;
    let fn;
    if (arguments.length < 2) return;
    else if (arguments.length === 2) fn = arg2;
    else if (arguments.length === 3) {
      opts = arg2;
      fn = arg3;
    } else {
      opts = arg2;
      ctx = arg3;
      fn = arg4;
    }
    let parentContext = ctx ?? import_api_2.context.active();
    let span = this.startSpan(name, opts, parentContext);
    let contextWithSpanSet = import_api_2.trace.setSpan(parentContext, span);
    return import_api_2.context.with(contextWithSpanSet, fn, undefined, span);
  }
  getGeneralLimits() {
    return this._generalLimits;
  }
  getSpanLimits() {
    return this._spanLimits;
  }
}
export { Tracer };
