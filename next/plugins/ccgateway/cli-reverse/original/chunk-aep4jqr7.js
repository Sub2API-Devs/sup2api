
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{jYs}from"./chunk-v6da31bp.js";import{ds}from"./chunk-2jb250pa.js";import{ng,Gf}from"./chunk-3bj63apf.js";function s0o(n,t){let o=Array.isArray(n?.questions)&&typeof n.questions[0]?.question==="string"?n.questions[0].question:void 0,r=typeof n?.description==="string"?n.description:"",e=o??jYs(r)?.running??(r||(t()??""));return e?Gf(ds(e).replace(/\s+/g," ").trim(),ng):""}
export{s0o};
