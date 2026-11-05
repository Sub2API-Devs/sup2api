
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F,di,lf}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";import{le}from"./chunk-6hadbefe.js";import{L}from"./chunk-xea05003.js";class i{directories=[];announced=new Set;get(){return this.directories}publish(o){let t=L([...o.additionalWorkingDirectories.values()].map((e)=>e.path)).sort(),n=this.directories;if(n.length===t.length&&n.every((e,s)=>e===t[s]))return!1;return this.directories=t,!0}noteAnnounced(o){for(let t of o)this.announced.add(t)}everAnnounced(){return[...this.announced]}reset(){this.directories=[],this.announced.clear()}}var d=new W(()=>new i);function r(){return d.of(F().host)}function Nae(){let o=r(),t=di(),n=lf();return o.noteAnnounced([...t===null?[]:[t],...n===null?[]:[n],...c(),...o.get()]),o.get()}function Bri(){return r().everAnnounced()}function Ser(o){return r().publish(o)}function c(){try{return[le().cwd()]}catch{return[]}}
export{Nae,Bri,Ser};
