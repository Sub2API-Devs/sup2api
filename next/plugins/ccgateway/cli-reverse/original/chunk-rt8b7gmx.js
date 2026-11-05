
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{q}from"./chunk-5ythzcas.js";import{Bs}from"./chunk-0fzr619q.js";import{zf}from"./chunk-a2q0x549.js";import{KJt}from"./chunk-3katra73.js";import{sep as i}from"path";function Hxt(t){if(q())return null;let e=`${KJt()}${i}`,n=".output";if(t.startsWith(e)&&t.endsWith(n)){let r=t.slice(e.length,-n.length);if(r.length>0&&r.length<=20&&/^[a-zA-Z0-9_-]+$/.test(r))return r}return null}function i_i(t){if(t?.file_path?.startsWith(zf()))return"Reading Plan";if(t?.file_path&&Hxt(t.file_path))return"Read agent output";return"Read"}function Ets(t){if(!t?.file_path)return null;let e=Hxt(t.file_path);if(e)return e;return Bs(t.file_path)}
export{Hxt,i_i,Ets};
