
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{B,yi,bf}from"./chunk-ndmse9kj.js";import{W}from"./chunk-x7vma94a.js";import{le}from"./chunk-cgr0tezp.js";import{H}from"./chunk-q3kq8hyf.js";class i{directories=[];announced=new Set;get(){return this.directories}publish(o){let t=H([...o.additionalWorkingDirectories.values()].map((e)=>e.path)).sort(),n=this.directories;if(n.length===t.length&&n.every((e,s)=>e===t[s]))return!1;return this.directories=t,!0}noteAnnounced(o){for(let t of o)this.announced.add(t)}everAnnounced(){return[...this.announced]}reset(){this.directories=[],this.announced.clear()}}var d=new W(()=>new i);function r(){return d.of(B().host)}function Noe(){let o=r(),t=yi(),n=bf();return o.noteAnnounced([...t===null?[]:[t],...n===null?[]:[n],...c(),...o.get()]),o.get()}function szs(){return r().everAnnounced()}function P4n(o){return r().publish(o)}function c(){try{return[le().cwd()]}catch{return[]}}
export{Noe,szs,P4n};
