
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{_}from"./chunk-6hadbefe.js";import{x,Z}from"./chunk-8824h7w7.js";import{basename as c,resolve as C}from"path";var h=100,l=900,a=300;function Hae(t){return _(t).replace(/[^\x20-\x7e]/g,(e)=>`\\u${e.charCodeAt(0).toString(16).padStart(4,"0")}`)}function cTt(t){let e=Hae(t);if(e.length<=a)return e;let n=[...t],r=n.length,i=5;while(r>0){if(i+=Hae(n[r-1]).length-2,i>a)break;r--}return Hae(`...${n.slice(r).join("")}`)}function bri(t){let e=[],n=0;for(let{path:i,name:o,size:g}of t){let s=`${cTt(i)}${c(i)===o?"":`, the file ${cTt(o)}`} (${g} bytes)`;if(n+=s.length+2,n>l)break;e.push(s)}let r=t.length-e.length;return`Attaches ${t.length} ${x(t.length,"file")}: ${e.join("; ")}${r>0?`; and ${r} more`:""}`}function Sri(t){if(t==="")return;let e=t.slice(1).split("/").map((n)=>n.replaceAll("~1","/").replaceAll("~0","~")).map((n,r)=>r===0?n:/^\d+$/.test(n)?`[${n}]`:`.${n}`).join("");return ene(e)}function ene(t){return Hae(t.length>h?`${Z(t,h)}...`:t)}
export{Hae,cTt,bri,Sri,ene};
