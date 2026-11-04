
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{X}from"./chunk-ndmse9kj.js";import{Cs}from"./chunk-847rdpmn.js";import{of}from"./chunk-82kqcve8.js";import{x4t}from"./chunk-1dp9p908.js";import{sep as i}from"path";function jEt(t){if(X())return null;let e=`${x4t()}${i}`,n=".output";if(t.startsWith(e)&&t.endsWith(n)){let r=t.slice(e.length,-n.length);if(r.length>0&&r.length<=20&&/^[a-zA-Z0-9_-]+$/.test(r))return r}return null}function zJs(t){if(t?.file_path?.startsWith(of()))return"Reading Plan";if(t?.file_path&&jEt(t.file_path))return"Read agent output";return"Read"}function A2o(t){if(!t?.file_path)return null;let e=jEt(t.file_path);if(e)return e;return Cs(t.file_path)}
export{jEt,zJs,A2o};
