
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import"./chunk-ndkzc8d3.js";import"./chunk-3jnp0k38.js";import"./chunk-5ythzcas.js";import"./chunk-0993wma0.js";import"./chunk-vwtpw18x.js";import"./chunk-63094ahz.js";import"./chunk-yxxb6qww.js";import"./chunk-za46rn2f.js";import"./chunk-0qffyy27.js";import"./chunk-cdyva2jv.js";import"./chunk-89fdmwf8.js";import"./chunk-qjh8ew63.js";import"./chunk-3gbv0jkm.js";import"./chunk-8824h7w7.js";import{go}from"./chunk-c41z4928.js";import{p}from"./chunk-k6qypy1d.js";import{o,A,u}from"./chunk-m4y44r15.js";import"./chunk-r4yj9pae.js";var t=p(()=>A(u({name:o(),authTool:o()})));function c(r){let e=t().safeParse(r.servers);return e.success?e.data:[]}function i(r){return r.map((e)=>`MCP server ${go(e.name)} needs authentication before its tools answer; its ${e.authTool} tool is callable from a script.`).join(`
`)}export{i as renderReplMcpNeedsAuthNotice,c as replMcpNeedsAuthServersOf};
