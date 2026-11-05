
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{IJn}from"./chunk-hvqbmbtb.js";import{P3,Eae}from"./chunk-vxhm2nqe.js";import"./chunk-q87n5wsq.js";import{Ie}from"./chunk-gehzbwn8.js";var o=Ie(IJn()),p=Ie(P3()),r=Ie(Eae());class t extends o.OTLPMetricExporterBase{constructor(e){super(r.createOtlpHttpExportDelegate(r.convertLegacyHttpOptions(e??{},"METRICS","v1/metrics",{"Content-Type":"application/x-protobuf"}),p.ProtobufMetricsSerializer),e)}}export{t as OTLPMetricExporter};
