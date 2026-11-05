
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{H_}from"./chunk-7kayq7nc.js";import{Ie}from"./chunk-gehzbwn8.js";var s=Ie(H_(),1),i=["dev","engine","aot"];function Wwt(n){return i.find((e)=>n.includes(`-${e}.`))??null}function ffn(n){return Wwt(n)!==null}function Gwt(n,e){if(!n)return!1;let t=Wwt(n),r=Wwt(e);return t!==null&&r!==null&&t!==r}var o=new RegExp(`-(?:${i.join("|")})\\.(\\d{8})\\.t(\\d{6})(?:\\.|$)`,"g");function zwt(n){let e;for(let u of n.matchAll(o))e=u;let t=e?.[1],r=e?.[2];if(!t||!r)return null;let l=Date.UTC(Number(t.slice(0,4)),Number(t.slice(4,6))-1,Number(t.slice(6,8)),Number(r.slice(0,2)),Number(r.slice(2,4)),Number(r.slice(4,6)));return new Date(l).toISOString().slice(0,19).replace(/[-:]/g,"").replace("T","t")===`${t}t${r}`?l:null}function qVs(n,e){let t=zwt(n),r=zwt(e);return t!==null&&r!==null&&r<t}function Iqe(n,e){let t=zwt(n),r=zwt(e);if(t!==null&&r!==null){if(Wwt(n)!==Wwt(e))return!1;return t>r}if(ffn(n)||ffn(e))return!1;return s.valid(n)!==null&&s.valid(e)!==null&&s.gt(n,e)}function fBr(n,e,t){if(!n)return!1;if(n===t)return!0;let r=zwt(n);if(r!==null)return r>=e.commitMs;if(ffn(n))return!1;return s.valid(n)!==null&&s.gte(n,e.release)}
export{Wwt,ffn,Gwt,zwt,qVs,Iqe,fBr};
