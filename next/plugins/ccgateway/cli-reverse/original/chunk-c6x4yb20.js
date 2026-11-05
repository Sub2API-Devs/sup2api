
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{di}from"./chunk-5ythzcas.js";import{Al}from"./chunk-sbrfdm61.js";import{HLs,Nvo}from"./chunk-85eyj5gy.js";import{a}from"./chunk-my2r02mp.js";import{w2i}from"./chunk-7kayq7nc.js";import{L}from"./chunk-xea05003.js";async function Kfo(r){let e=L([di(),Al()]).filter((t)=>t!==null);for(let t of e)try{let o=await HLs(r,t);if(o!==void 0){let i=await w2i(t,o.gitRoot,r);if(typeof i==="string")Nvo(i,o.gitRoot,o.canonicalRoot)}}catch(o){a(o)}}
export{Kfo};
