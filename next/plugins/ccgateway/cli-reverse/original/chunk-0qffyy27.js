
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
class W{#o;#r=new WeakMap;constructor(o){this.#o=o}of(o){let e=this.#r.get(o);if(e!==void 0)return e;let s=this.#o();return this.#r.set(o,s),s}}var r={isDiskless:()=>!1,isDisklessProcess:()=>!1,reportBuilt:()=>{}};function s9i(o){r=o}function Fie(){return r.isDiskless()}function i9i(){return r.isDisklessProcess()}var a9i=new W(()=>({}));var t="NoConfigHomeError";function Rbt(o){try{return typeof o==="object"&&o!==null&&"name"in o&&o.name===t}catch{return!1}}
export{W,s9i,Fie,i9i,a9i,Rbt};
