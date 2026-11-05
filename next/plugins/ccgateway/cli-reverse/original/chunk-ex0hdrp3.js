
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Oe}from"./chunk-ndkzc8d3.js";import{l}from"./chunk-nkv493nm.js";import{AWn}from"./chunk-3hvemz80.js";import{t}from"./chunk-6hadbefe.js";import{mRe}from"./chunk-ndcj3jv5.js";import{Um,Bm}from"./chunk-018s34f2.js";import{pei}from"./chunk-a04avcpz.js";import{openSync as o}from"fs";import{ReadStream as a}from"tty";function s(){if(process.stdin.isTTY)return{kind:"stdin"};if(Oe(!1))return{kind:"unavailable",reason:"ci"};if(AWn()==="mcp")return{kind:"unavailable",reason:"mcp"};try{let n=o("/dev/tty","r"),e=new a(n);return mRe(e),e.on("error",(r)=>{l("tengu_tty_stream_error",Um(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,{kind:"override",stream:e}}catch(n){return t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),{kind:"unavailable",reason:"tty_unavailable"}}}class i{input=null;get(){return this.input??=s()}reset(){this.input=null}}var VFe=new i;function MA(n=!1){pei();let e=VFe.get(),r={exitOnCtrlC:n};if(e.kind==="override")r.stdin=e.stream;return r.isScreenReaderEnabled=Bm(),r}
export{VFe,MA};
