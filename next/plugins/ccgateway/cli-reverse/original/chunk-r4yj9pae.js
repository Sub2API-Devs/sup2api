
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
function oM(e){return{subscribe(t){return e().subscribe(t)},emit(...t){e().emit(...t)},clear(){e().clear()}}}class Je{#t;#e=new WeakMap;constructor(e){this.#t=e}peek(e){return this.#e.get(e.root)}of(e){let t=e.root,r=this.#e.get(t);if(r!==void 0)return r;let o=this.#t();return this.#e.set(t,o),o}drop(e){this.#e.delete(e.root)}}
export{oM,Je};
