
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
function VE(t){return t}function Er(t){return t}var wBt="hook-agent-";function lK(t){return typeof t==="string"&&t.length<=200&&/^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(t)&&!/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(t)}var r="[\\w-]{1,63}",s=new RegExp(`^${r}$`),u=/^[\w-]{1,128}$/;function IU(t){return u.test(t)}var c=new RegExp(`^a(?:${r}-)?[0-9a-f]{16}$`);function sm(t){return c.test(t)?t:null}import{createHash as i,randomBytes as a,randomUUID as dpe}from"crypto";var g=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,d=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;function GLr(t){return d.test(t)}function bI(t,o){let f=Buffer.from(o.replace(/-/g,""),"hex"),n=i("sha1").update(f).update(Buffer.from(t,"utf8")).digest();n[6]=n[6]&15|80,n[8]=n[8]&63|128;let e=n.subarray(0,16).toString("hex");return`${e.slice(0,8)}-${e.slice(8,12)}-${e.slice(12,16)}-${e.slice(16,20)}-${e.slice(20,32)}`}function Ut(t){if(typeof t!=="string")return null;return g.test(t)?t:null}function oS(t){if(t&&!s.test(t))t=t.replace(/[^\w-]/g,"").slice(0,63);let o=a(8).toString("hex");return t?`a${t}-${o}`:`a${o}`}
export{VE,Er,wBt,lK,IU,sm,dpe,GLr,bI,Ut,oS};
