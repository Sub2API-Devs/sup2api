
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var l=[];class _ae{#n=()=>l;#l=()=>!0;#t=()=>!1;#e=l;#s=()=>!1;#o;#i=new WeakMap;provide(o,t=()=>!0,e=()=>!1){this.#n=o,this.#l=t,this.#t=e,this.#o=void 0}presentUntilAnnounced(o,t){this.#e=o,this.#s=t,this.#o=void 0}presentable(){return this.#l()}tools(){let o=this.#n();if(this.#e.some(({machine:e})=>this.#t(e))){let e=this.#e.filter(({machine:n})=>!this.#t(n));this.#e=e.length>0?e:l}let t=this.#s()?this.#e:l;if(this.#o===void 0||this.#o.source!==o||this.#o.pending!==t){let e=[...o,...t.filter(({tool:n,machine:s})=>!o.some((i)=>i.machine===s&&i.tool.name===n.name))];for(let{tool:n,machine:s}of e)this.#i.set(n,s);this.#o={source:o,pending:t,tools:e.map(({tool:n})=>n)}}return this.#o.tools}machineFor(o){return this.tools(),this.#i.get(o)}}function qvt(o){return o.toolState?.get(_ae).tools()??a}var a=[];
export{_ae,qvt};
