/**
 * @opentelemetry/otlp-transformer/build/src/trace/internal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_internal } from "../common/internal.js";
import { require_utils } from "../common/utils.js";

//@ chunk-vxhm2nqe.js:250252-252616 cjs-fingerprint
var require_internal_4 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createExportTraceServiceRequest =
    cjsExports.toOtlpSpanEvent =
    cjsExports.toOtlpLink =
    cjsExports.sdkSpanToOtlpSpan =
      undefined;
  var internal_1 = require_internal();
  var utils_1 = require_utils();
  var SPAN_FLAGS_CONTEXT_HAS_IS_REMOTE_MASK = 256;
  var SPAN_FLAGS_CONTEXT_IS_REMOTE_MASK = 512;
  function buildSpanFlagsFrom(traceFlags, isRemote) {
    let flags = (traceFlags & 255) | SPAN_FLAGS_CONTEXT_HAS_IS_REMOTE_MASK;
    if (isRemote) flags |= SPAN_FLAGS_CONTEXT_IS_REMOTE_MASK;
    return flags;
  }
  function sdkSpanToOtlpSpan(span, encoder) {
    let ctx = span.spanContext();
    let status = span.status;
    let parentSpanId = span.parentSpanContext?.spanId
      ? encoder.encodeSpanContext(span.parentSpanContext?.spanId)
      : undefined;
    return {
      traceId: encoder.encodeSpanContext(ctx.traceId),
      spanId: encoder.encodeSpanContext(ctx.spanId),
      parentSpanId,
      traceState: ctx.traceState?.serialize(),
      name: span.name,
      kind: span.kind == null ? 0 : span.kind + 1,
      startTimeUnixNano: encoder.encodeHrTime(span.startTime),
      endTimeUnixNano: encoder.encodeHrTime(span.endTime),
      attributes: internal_1.toAttributes(span.attributes),
      droppedAttributesCount: span.droppedAttributesCount,
      events: span.events.map((event) => toOtlpSpanEvent(event, encoder)),
      droppedEventsCount: span.droppedEventsCount,
      status: {
        code: status.code,
        message: status.message,
      },
      links: span.links.map((link) => toOtlpLink(link, encoder)),
      droppedLinksCount: span.droppedLinksCount,
      flags: buildSpanFlagsFrom(ctx.traceFlags, span.parentSpanContext?.isRemote),
    };
  }
  cjsExports.sdkSpanToOtlpSpan = sdkSpanToOtlpSpan;
  function toOtlpLink(link, encoder) {
    return {
      attributes: link.attributes ? internal_1.toAttributes(link.attributes) : [],
      spanId: encoder.encodeSpanContext(link.context.spanId),
      traceId: encoder.encodeSpanContext(link.context.traceId),
      traceState: link.context.traceState?.serialize(),
      droppedAttributesCount: link.droppedAttributesCount || 0,
      flags: buildSpanFlagsFrom(link.context.traceFlags, link.context.isRemote),
    };
  }
  cjsExports.toOtlpLink = toOtlpLink;
  function toOtlpSpanEvent(timedEvent, encoder) {
    return {
      attributes: timedEvent.attributes ? internal_1.toAttributes(timedEvent.attributes) : [],
      name: timedEvent.name,
      timeUnixNano: encoder.encodeHrTime(timedEvent.time),
      droppedAttributesCount: timedEvent.droppedAttributesCount || 0,
    };
  }
  cjsExports.toOtlpSpanEvent = toOtlpSpanEvent;
  function createExportTraceServiceRequest(spans, options) {
    let encoder = utils_1.getOtlpEncoder(options);
    return {
      resourceSpans: spanRecordsToResourceSpans(spans, encoder),
    };
  }
  cjsExports.createExportTraceServiceRequest = createExportTraceServiceRequest;
  function createResourceMap(readableSpans) {
    let resourceMap = new Map();
    for (let record of readableSpans) {
      let ilsMap = resourceMap.get(record.resource);
      if (!ilsMap) {
        ilsMap = new Map();
        resourceMap.set(record.resource, ilsMap);
      }
      let instrumentationScopeKey = `${record.instrumentationScope.name}@${record.instrumentationScope.version || ""}:${record.instrumentationScope.schemaUrl || ""}`;
      let records = ilsMap.get(instrumentationScopeKey);
      if (!records) {
        records = [];
        ilsMap.set(instrumentationScopeKey, records);
      }
      records.push(record);
    }
    return resourceMap;
  }
  function spanRecordsToResourceSpans(readableSpans, encoder) {
    let resourceMap = createResourceMap(readableSpans);
    let out = [];
    let entryIterator = resourceMap.entries();
    let entry = entryIterator.next();
    while (!entry.done) {
      let [resource, ilmMap] = entry.value;
      let scopeResourceSpans = [];
      let ilmIterator = ilmMap.values();
      let ilmEntry = ilmIterator.next();
      while (!ilmEntry.done) {
        let scopeSpans = ilmEntry.value;
        if (scopeSpans.length > 0) {
          let spans = scopeSpans.map((readableSpan) => sdkSpanToOtlpSpan(readableSpan, encoder));
          scopeResourceSpans.push({
            scope: internal_1.createInstrumentationScope(scopeSpans[0].instrumentationScope),
            spans,
            schemaUrl: scopeSpans[0].instrumentationScope.schemaUrl,
          });
        }
        ilmEntry = ilmIterator.next();
      }
      let processedResource = internal_1.createResource(resource);
      let transformedSpans = {
        resource: processedResource,
        scopeSpans: scopeResourceSpans,
        schemaUrl: processedResource.schemaUrl,
      };
      out.push(transformedSpans);
      entry = entryIterator.next();
    }
    return out;
  }
});
export { require_internal_4 };
