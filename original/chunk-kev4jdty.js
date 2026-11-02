
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{vO}from"./chunk-cmb6vxf9.js";var Uf=Symbol("untrustedArray.unreadable"),E3="<unreadable list>";function lS(e){let n;try{if(!Array.isArray(e))return;n=e.length}catch{return Uf}if(typeof n!=="number"||!Number.isSafeInteger(n)||n<0||n>vO)return Uf;let u=[];for(let r=0;r<n;r++){let t;try{t=e[r]}catch{t=void 0}u.push(t)}return u}function Eae(e){let n=lS(e);return n===Uf?void 0:n}
export{Uf,E3,lS,Eae};
