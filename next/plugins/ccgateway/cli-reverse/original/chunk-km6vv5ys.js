
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
var o7t="pasted_content",GDn=4,CDi='<pasted_content id="',G_s=`">
`,RDi='</pasted_content id="';function Gwr(t){return`<pasted_content id="${t}">
`}function zDn(t){return`</pasted_content id="${t}">
`}function z_s(t){if(t.length!==4)return!1;for(let e=0;e<t.length;e++){let n=t.charCodeAt(e);if(!(n>=48&&n<=57||n>=97&&n<=102))return!1}return!0}var K_s=/[([{"'`]/,V_s=/[)\]}"'`.,;:!?]/;function q_s(t,e=0,n=t.length){let s=e;while(s<n&&V_s.test(t[s]))s++;return s>=n||/\s/.test(t[s])}function yDt(t){let e=[],n=0,s=0;for(;;){let c=t.indexOf('<pasted_content id="',s);if(c===-1)break;let r=c+20,o=t.slice(r,r+4);if(!z_s(o)||!t.startsWith(`">
`,r+4)){s=r;continue}let i=r+4+3,f=zDn(o).slice(0,-1),l=t.indexOf(`
${f}`,i-1)+1;if(l===0)break;let d=c;for(let a=0;a<2&&d>n&&t[d-1]===`
`;a++)d--;if(d>n)e.push({kind:"text",text:t.slice(n,d)});n=l+f.length;for(let a=0;a<2&&t[n]===`
`;a++)n++;e.push({kind:"block",id:o,body:t.slice(i,l-1),raw:t.slice(d,n)}),s=n}if(n<t.length)e.push({kind:"text",text:t.slice(n)});return e}function xDi(t){let e=yDt(t);if(!e.some((n)=>n.kind==="block"))return t;return e.map((n)=>n.kind==="text"?n.text:n.body).join(`

`).trim()}function Tde(t){let e=yDt(t);if(e.length===1&&e[0].kind==="text")return t;return e.map((n)=>n.kind==="text"?n.text:n.body).join("")}function Y_s(t,e){let n=yDt(t);if(!n.some((r)=>r.kind==="block"&&r.id===e))return t;let s="",c=!1;for(let[r,o]of n.entries()){let i=n[r+1],u=i?.kind==="block"&&i.id===e;if(o.kind==="text"||o.id!==e){let E=o.kind==="text"?o.text:o.raw;if(c)E=E.replace(/^\s+/,"");if(u&&i.body.includes(`
`))E=E.replace(/\s+$/,"");if(E==="")continue;if(c&&s!=="")s+=`
`;s+=E,c=!1;continue}let f=o.body.includes(`
`),l=s.length;while(l>0&&K_s.test(s[l-1]))l--;let d=l===0||/\s/.test(s[l-1]);if((f||c||!d)&&s!=="")s+=`
`;s+=o.body;let a=i===void 0?"":i.kind==="text"?i.text:i.raw;c=f||u||/^\s\s/.test(a)||!q_s(a)}return s}function zhe(t){let e=0;for(let n=0;n<t.length;n++)e=(e<<5)-e+t.charCodeAt(n)|0;return e}function sT(t){return Bun.hash(t).toString()}function hDt(t,e){return Bun.hash(e,Bun.hash(t)).toString()}
export{zhe,sT,hDt,o7t,GDn,CDi,G_s,RDi,Gwr,zDn,z_s,K_s,V_s,q_s,yDt,xDi,Tde,Y_s};
