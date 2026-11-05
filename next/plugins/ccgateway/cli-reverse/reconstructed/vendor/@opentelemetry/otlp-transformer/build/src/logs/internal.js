/**
 * @opentelemetry/otlp-transformer/build/src/logs/internal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_utils } from "../common/utils.js";
import { require_internal } from "../common/internal.js";

//@ chunk-vxhm2nqe.js:244551-245925 cjs-fingerprint
var require_internal_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.toLogAttributes = cjsExports.createExportLogsServiceRequest = undefined;
  var utils_1 = require_utils();
  var internal_1 = require_internal();
  function createExportLogsServiceRequest(logRecords, options) {
    let encoder = utils_1.getOtlpEncoder(options);
    return {
      resourceLogs: logRecordsToResourceLogs(logRecords, encoder),
    };
  }
  cjsExports.createExportLogsServiceRequest = createExportLogsServiceRequest;
  function createResourceMap(logRecords) {
    let resourceMap = new Map();
    for (let record of logRecords) {
      let {
        resource,
        instrumentationScope: { name, version = "", schemaUrl = "" },
      } = record;
      let ismMap = resourceMap.get(resource);
      if (!ismMap) {
        ismMap = new Map();
        resourceMap.set(resource, ismMap);
      }
      let ismKey = `${name}@${version}:${schemaUrl}`;
      let records = ismMap.get(ismKey);
      if (!records) {
        records = [];
        ismMap.set(ismKey, records);
      }
      records.push(record);
    }
    return resourceMap;
  }
  function logRecordsToResourceLogs(logRecords, encoder) {
    let resourceMap = createResourceMap(logRecords);
    return Array.from(resourceMap, ([resource, ismMap]) => {
      let processedResource = internal_1.createResource(resource);
      return {
        resource: processedResource,
        scopeLogs: Array.from(ismMap, ([, scopeLogs]) => ({
          scope: internal_1.createInstrumentationScope(scopeLogs[0].instrumentationScope),
          logRecords: scopeLogs.map((log) => toLogRecord(log, encoder)),
          schemaUrl: scopeLogs[0].instrumentationScope.schemaUrl,
        })),
        schemaUrl: processedResource.schemaUrl,
      };
    });
  }
  function toLogRecord(log, encoder) {
    return {
      timeUnixNano: encoder.encodeHrTime(log.hrTime),
      observedTimeUnixNano: encoder.encodeHrTime(log.hrTimeObserved),
      severityNumber: toSeverityNumber(log.severityNumber),
      severityText: log.severityText,
      body: internal_1.toAnyValue(log.body),
      eventName: log.eventName,
      attributes: toLogAttributes(log.attributes),
      droppedAttributesCount: log.droppedAttributesCount,
      flags: log.spanContext?.traceFlags,
      traceId: encoder.encodeOptionalSpanContext(log.spanContext?.traceId),
      spanId: encoder.encodeOptionalSpanContext(log.spanContext?.spanId),
    };
  }
  function toSeverityNumber(severityNumber) {
    return severityNumber;
  }
  function toLogAttributes(attributes) {
    return Object.keys(attributes).map((key) => internal_1.toKeyValue(key, attributes[key]));
  }
  cjsExports.toLogAttributes = toLogAttributes;
});
export { require_internal_2 };
