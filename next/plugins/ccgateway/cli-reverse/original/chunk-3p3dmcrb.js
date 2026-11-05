
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{y7,P3,Eae}from"./chunk-vxhm2nqe.js";import"./chunk-q87n5wsq.js";import{Ie}from"./chunk-gehzbwn8.js";var t=Ie(y7()),o=Ie(P3()),r=Ie(Eae());class e extends t.OTLPExporterBase{constructor(p={}){super(r.createOtlpHttpExportDelegate(r.convertLegacyHttpOptions(p,"TRACES","v1/traces",{"Content-Type":"application/json"}),o.JsonTraceSerializer))}}export{e as OTLPTraceExporter};
