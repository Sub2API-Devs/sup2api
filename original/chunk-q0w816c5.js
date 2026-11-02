
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{o,E,M,A,u}from"./chunk-7vp249v4.js";var e=p(()=>u({path:o(),text:o(),chars:E().int().min(0),clipped:M().optional()}));function bWn(){return{init_references:u({docs:A(e()),unavailable:A(u({path:o(),why:o()})).optional()}).optional()}}function asn(){return{design_system:u({url:o().optional(),default:o().optional(),title:o().optional(),store:M().optional(),docs:A(e()).optional(),unavailable:o().optional()}).optional()}}var t=p(()=>u({dir:o(),files:A(u({path:o(),bytes:E()})),skipped:A(u({path:o(),reason:o()}))})),SWn=p(()=>u({type:t().optional(),system_url:o().optional(),system:t().optional(),skill_in_result:M(),capabilities_skill:M(),repl_tool:M().optional()}));
export{bWn,asn,SWn};
