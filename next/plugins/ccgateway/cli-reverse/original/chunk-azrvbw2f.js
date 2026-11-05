
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{o,E,O,A,u}from"./chunk-m4y44r15.js";var e=p(()=>u({path:o(),text:o(),chars:E().int().min(0),clipped:O().optional()}));function A3n(){return{init_references:u({docs:A(e()),unavailable:A(u({path:o(),why:o()})).optional()}).optional()}}function umn(){return{design_system:u({url:o().optional(),default:o().optional(),title:o().optional(),store:O().optional(),docs:A(e()).optional(),unavailable:o().optional()}).optional()}}var t=p(()=>u({dir:o(),files:A(u({path:o(),bytes:E()})),skipped:A(u({path:o(),reason:o()}))})),C3n=p(()=>u({type:t().optional(),system_url:o().optional(),system:t().optional(),skill_in_result:O(),capabilities_skill:O(),repl_tool:O().optional()}));
export{A3n,umn,C3n};
