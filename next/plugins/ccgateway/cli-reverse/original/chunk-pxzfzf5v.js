
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{_mt}from"./chunk-8zzj4j31.js";import{Je}from"./chunk-r4yj9pae.js";var r=_mt("computerUseMcpState",void 0);class lEt{#e;constructor(e){this.#e=e}static over(e){return new lEt(r(e.getState,e.setState))}get(){return this.#e.get()}update(e){this.#e.set(e)}}class t{owner=void 0;acquire(e){if(this.owner)return()=>{};return this.owner=e,()=>{if(this.owner===e)this.owner=void 0}}}var $Wt=new Je(()=>new t);function w4s(e){return $Wt.of(e).owner}
export{lEt,$Wt,w4s};
