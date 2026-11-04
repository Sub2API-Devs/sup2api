
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{D}from"./chunk-n3a8e1qg.js";function n(r,e){if(D(e)){let o=Object.create(null);for(let t of Object.keys(e).toSorted())Object.defineProperty(o,t,{value:e[t],enumerable:!0});return o}return e}var f="\x00unserializable:";function s(){let r=0;return()=>`${f}${++r}`}var u=s();function Rs(r){try{return JSON.stringify(r,n)}catch{return u()}}export{Rs};
