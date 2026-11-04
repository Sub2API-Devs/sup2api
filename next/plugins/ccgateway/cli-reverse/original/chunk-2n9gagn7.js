
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{$at}from"./chunk-2mbp91tg.js";import{tt}from"./chunk-ndmse9kj.js";var r=$at("computerUseMcpState",void 0);class Tgt{#e;constructor(e){this.#e=e}static over(e){return new Tgt(r(e.getState,e.setState))}get(){return this.#e.get()}update(e){this.#e.set(e)}}class t{owner=void 0;acquire(e){if(this.owner)return()=>{};return this.owner=e,()=>{if(this.owner===e)this.owner=void 0}}}var fNt=new tt(()=>new t);function bMs(e){return fNt.of(e).owner}
export{Tgt,fNt,bMs};
