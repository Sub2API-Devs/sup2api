
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{yi}from"./chunk-ndmse9kj.js";import{gl}from"./chunk-fnk5kvbf.js";import{iys,Dlo}from"./chunk-t0gq9gyw.js";import{l}from"./chunk-bbtre4r8.js";import{QTi}from"./chunk-bwbq4xvm.js";import{H}from"./chunk-q3kq8hyf.js";async function e7r(r){let e=H([yi(),gl()]).filter((t)=>t!==null);for(let t of e)try{let o=await iys(r,t);if(o!==void 0){let i=await QTi(t,o.gitRoot,r);if(typeof i==="string")Dlo(i,o.gitRoot,o.canonicalRoot)}}catch(o){l(o)}}
export{e7r};
