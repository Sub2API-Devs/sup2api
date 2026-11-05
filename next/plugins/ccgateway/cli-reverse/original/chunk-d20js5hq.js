
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{_}from"./chunk-6hadbefe.js";import{vi}from"./chunk-8824h7w7.js";import{kh}from"./chunk-75pf2504.js";function VRn(t,e,n,r){return{method:"project_read",path:t,...e!==void 0&&{version:e},...n,...r}}function Fss(t){return{method:"project_read",path:t}}var $pr="tengu_glittery_crayon",c=500,o="A doc of this project.";function Vvi(t){let e=vi(t.path,c);return{type:"document",source:{type:"text",media_type:"text/plain",data:t.content},...e!==""&&{title:e},context:t.version!==void 0&&kh.test(t.version)?`${o} version: ${t.version}`:o}}function Aro(t){return t.type==="document"&&typeof t.source==="object"&&t.source!==null&&"type"in t.source&&t.source.type==="text"&&typeof t.context==="string"&&t.context.startsWith(o)}function Fpr({docId:t,read:e}){return{input:_(Fss(t)),result:_(e)}}
export{VRn,Fss,$pr,Vvi,Aro,Fpr};
