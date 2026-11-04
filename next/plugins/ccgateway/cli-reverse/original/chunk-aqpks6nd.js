
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Oe,Go}from"./chunk-0777tkjc.js";import{Ar}from"./chunk-rshven70.js";var Gan={};Ar(Gan,{booleanOfInput:()=>h7e,default:()=>Gan,isHeldTrue:()=>CHr,numberInputHint:()=>jan,numberOfInput:()=>Wan});var h7e=(n)=>Oe(n)?!0:Go(n)?!1:void 0;var CHr=(n)=>n===!0||n==="true";function jan(n){return`It takes a number${n.min!==void 0||n.max!==void 0?` between ${n.min??"-\u221E"} and ${n.max??"\u221E"}`:""}.`}function Wan(n,e){let r=n.trim(),t=Number(r);return r!==""&&Number.isFinite(t)&&(e.min===void 0||t>=e.min)&&(e.max===void 0||t<=e.max)?t:void 0}export{h7e,CHr,jan,Wan,Gan};
