
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ae}from"./chunk-gcy2kcsb.js";function c(r){return ae()?u(r):null}function u(r){let o=/^<repl-output(?: [^>\n]*)?>\n/.exec(r);if(o===null)return null;let e={logs:[]},s=/<(log|result|error)\/>|<(log|result|error)>([\s\S]*?)<\/\2>/g;for(let t of r.slice(o[0].length).matchAll(s)){let l=t[1]??t[2],n=p(t[3]??"");if(l==="log")e.logs.push(n);else if(l==="result")e.result=n;else if(l==="error")e.error=n}return e}function p(r){return r.replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&amp;","&")}export{c as parseOutputEnvelope};
