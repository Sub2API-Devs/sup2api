
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
class W{#o;#r=new WeakMap;constructor(o){this.#o=o}of(o){let e=this.#r.get(o);if(e!==void 0)return e;let s=this.#o();return this.#r.set(o,s),s}}var r={isDiskless:()=>!1,isDisklessProcess:()=>!1,reportBuilt:()=>{}};function vLi(o){r=o}function Wre(){return r.isDiskless()}function kLi(){return r.isDisklessProcess()}var TLi=new W(()=>({}));var t="NoConfigHomeError";function zft(o){try{return typeof o==="object"&&o!==null&&"name"in o&&o.name===t}catch{return!1}}
export{W,vLi,Wre,kLi,TLi,zft};
