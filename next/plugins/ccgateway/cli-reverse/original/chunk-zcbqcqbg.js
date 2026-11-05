
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Of}from"./chunk-0e3nf8ec.js";import{xe}from"./chunk-90nja2dk.js";function LWe(o){let t=xe().loadedModules.find((s)=>s.name===o);return t===void 0||Of(t)}function Uhs(){let o=new Map,t=new Map,s=new Set;return{list:(e)=>LWe(e)?[...o.get(e)?.values()??[]]:[],own:(e)=>{let r=o.get(e)??new Map;return o.set(e,r),r},serverKey:(e)=>t.get(e),ownerOfKey:(e)=>[...t.entries()].find(([,r])=>r===e)?.[0],keyed:(e,r)=>{t.set(e,r),s.add(r)},minted:(e)=>s.has(e),forget:(e)=>{o.delete(e),t.delete(e)}}}var Y0=Uhs();export{LWe,Uhs,Y0};
