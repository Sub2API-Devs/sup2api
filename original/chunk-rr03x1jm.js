
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Oe}from"./chunk-0777tkjc.js";import{a}from"./chunk-8kte1b36.js";import{MDn}from"./chunk-c5gdqf78.js";import{t}from"./chunk-cgr0tezp.js";import{dke}from"./chunk-j3nx1xyn.js";import{Yp,ym}from"./chunk-vd0bcd16.js";import{H1s}from"./chunk-1k64h7rw.js";import{openSync as o}from"fs";import{ReadStream as s}from"tty";function p(){if(process.stdin.isTTY)return{kind:"stdin"};if(Oe(!1))return{kind:"unavailable",reason:"ci"};if(MDn()==="mcp")return{kind:"unavailable",reason:"mcp"};try{let n=o("/dev/tty","r"),e=new s(n);return dke(e),e.on("error",(r)=>{a("tengu_tty_stream_error",Yp(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,{kind:"override",stream:e}}catch(n){return t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),{kind:"unavailable",reason:"tty_unavailable"}}}class i{input=null;get(){return this.input??=p()}reset(){this.input=null}}var JLe=new i;function ST(n=!1){H1s();let e=JLe.get(),r={exitOnCtrlC:n};if(e.kind==="override")r.stdin=e.stream;return r.isScreenReaderEnabled=ym(),r}
export{JLe,ST};
