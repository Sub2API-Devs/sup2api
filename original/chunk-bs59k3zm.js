
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{O}from"./chunk-m41h77x8.js";import{doe}from"./chunk-hcckvqyb.js";import{St}from"./chunk-cbe70hjy.js";import{en}from"./chunk-xkeryp4t.js";var Y0s=(t)=>`${t.path} (${en(t.bytes)})`;var cTo=(t,r)=>[t].filter((e)=>e>0).map((e)=>`and ${e} more ${O(e,r)} not named here`);var IOr=(t)=>(/^ */.exec(t)?.[0]??"")+St(t,doe);var uTo=(t)=>[t].filter((r)=>r>0).map((r)=>`${r} ${O(r,"entry stays","entries stay")} on this machine (secrets, links, ignored files)`);var fTo=(t)=>[t??[]].flat().flatMap((r)=>[`Writes this manifest first, to ${r.path}:`,...r.text.trimEnd().split(`
`)]);var a=(t)=>`stays here: ${t.path} (${t.words})`;var pTo=(t)=>[...t.files.map(Y0s),...cTo(t.unnamed?.files??0,"file"),...t.stays.map(a),...cTo(t.unnamed?.stays??0,"entry")].map(IOr);export{Y0s,cTo,IOr,uTo,fTo,pTo};
