
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{x}from"./chunk-8824h7w7.js";import{lae}from"./chunk-crzaj3q3.js";import{kt}from"./chunk-k51y52jw.js";import{en}from"./chunk-j78f68ax.js";var T9s=(t)=>`${t.path} (${en(t.bytes)})`;var fUo=(t,r)=>[t].filter((e)=>e>0).map((e)=>`and ${e} more ${x(e,r)} not named here`);var pGr=(t)=>(/^ */.exec(t)?.[0]??"")+kt(t,lae);var pUo=(t)=>[t].filter((r)=>r>0).map((r)=>`${r} ${x(r,"entry stays","entries stay")} on this machine (secrets, links, ignored files)`);var mUo=(t)=>[t??[]].flat().flatMap((r)=>[`Writes this manifest first, to ${r.path}:`,...r.text.trimEnd().split(`
`)]);var a=(t)=>`stays here: ${t.path} (${t.words})`;var hUo=(t)=>[...t.files.map(T9s),...fUo(t.unnamed?.files??0,"file"),...t.stays.map(a),...fUo(t.unnamed?.stays??0,"entry")].map(pGr);export{T9s,fUo,pGr,pUo,mUo,hUo};
