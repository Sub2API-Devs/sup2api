
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{qgn}from"./chunk-3k21nfa0.js";import{y7,P3}from"./chunk-vxhm2nqe.js";import"./chunk-q87n5wsq.js";import{I}from"./chunk-gehzbwn8.js";var s=I(function(p){Object.defineProperty(p,"__esModule",{value:!0});p.OTLPTraceExporter=void 0;var e=qgn(),t=P3(),o=y7();class c extends o.OTLPExporterBase{constructor(u={}){super(e.createOtlpGrpcExportDelegate(e.convertLegacyOtlpGrpcOptions(u,"TRACES"),t.ProtobufTraceSerializer,"TraceExportService","/opentelemetry.proto.collector.trace.v1.TraceService/Export"))}}p.OTLPTraceExporter=c});var l=I(function(r){Object.defineProperty(r,"__esModule",{value:!0});r.OTLPTraceExporter=void 0;var i=s();Object.defineProperty(r,"OTLPTraceExporter",{enumerable:!0,get:function(){return i.OTLPTraceExporter}})});export default l();
