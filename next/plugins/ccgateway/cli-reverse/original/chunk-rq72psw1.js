
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Qs}from"./chunk-w10mwqe3.js";import{De}from"./chunk-ndkzc8d3.js";import{Je}from"./chunk-r4yj9pae.js";var t="repl-ask-declined",pNo=new DOMException(t,"AbortError");function Dpn(e){return e.aborted&&Qs(e.reason)===t}class o{#e=0;#t=De();subscribe=(e)=>this.#t.subscribe(e);getSnapshot=()=>this.#e>0;hold(){if(this.#e++,this.#e===1)this.#t.emit();let e=!1;return()=>{if(e)return;if(e=!0,this.#e--,this.#e===0)this.#t.emit()}}}var mNo=new Je(()=>new o);
export{pNo,Dpn,mNo};
