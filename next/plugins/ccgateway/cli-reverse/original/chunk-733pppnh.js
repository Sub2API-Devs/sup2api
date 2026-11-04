
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{D9,A5,Eoe}from"./chunk-798ashq9.js";import"./chunk-wrv5s6k4.js";import{Re}from"./chunk-rshven70.js";var t=Re(D9()),o=Re(A5()),r=Re(Eoe());class e extends t.OTLPExporterBase{constructor(p={}){super(r.createOtlpHttpExportDelegate(r.convertLegacyHttpOptions(p,"TRACES","v1/traces",{"Content-Type":"application/json"}),o.JsonTraceSerializer))}}export{e as OTLPTraceExporter};
