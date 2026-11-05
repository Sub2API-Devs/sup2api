
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{IJn}from"./chunk-hvqbmbtb.js";import{qgn}from"./chunk-3k21nfa0.js";import{P3}from"./chunk-vxhm2nqe.js";import"./chunk-q87n5wsq.js";import{I}from"./chunk-gehzbwn8.js";var u=I(function(i){Object.defineProperty(i,"__esModule",{value:!0});i.OTLPMetricExporter=void 0;var o=IJn(),e=qgn(),c=P3();class p extends o.OTLPMetricExporterBase{constructor(t){super(e.createOtlpGrpcExportDelegate(e.convertLegacyOtlpGrpcOptions(t??{},"METRICS"),c.ProtobufMetricsSerializer,"MetricsExportService","/opentelemetry.proto.collector.metrics.v1.MetricsService/Export"),t)}}i.OTLPMetricExporter=p});var n=I(function(r){Object.defineProperty(r,"__esModule",{value:!0});r.OTLPMetricExporter=void 0;var l=u();Object.defineProperty(r,"OTLPMetricExporter",{enumerable:!0,get:function(){return l.OTLPMetricExporter}})});export default n();
