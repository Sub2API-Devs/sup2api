
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{tKn}from"./chunk-3crdpfrs.js";import{A5,Eoe}from"./chunk-798ashq9.js";import"./chunk-wrv5s6k4.js";import{Re}from"./chunk-rshven70.js";var o=Re(tKn()),p=Re(A5()),r=Re(Eoe());class t extends o.OTLPMetricExporterBase{constructor(e){super(r.createOtlpHttpExportDelegate(r.convertLegacyHttpOptions(e??{},"METRICS","v1/metrics",{"Content-Type":"application/x-protobuf"}),p.ProtobufMetricsSerializer),e)}}export{t as OTLPMetricExporter};
