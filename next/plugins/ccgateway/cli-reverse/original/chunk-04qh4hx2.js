
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Oe,Qo}from"./chunk-ndkzc8d3.js";import{Sr}from"./chunk-gehzbwn8.js";var iyn={};Sr(iyn,{booleanOfInput:()=>Iot,default:()=>iyn,isHeldTrue:()=>fVr,numberInputHint:()=>oyn,numberOfInput:()=>syn});var Iot=(n)=>Oe(n)?!0:Qo(n)?!1:void 0;var fVr=(n)=>n===!0||n==="true";function oyn(n){return`It takes a number${n.min!==void 0||n.max!==void 0?` between ${n.min??"-\u221E"} and ${n.max??"\u221E"}`:""}.`}function syn(n,e){let r=n.trim(),t=Number(r);return r!==""&&Number.isFinite(t)&&(e.min===void 0||t>=e.min)&&(e.max===void 0||t<=e.max)?t:void 0}export{Iot,fVr,oyn,syn,iyn};
