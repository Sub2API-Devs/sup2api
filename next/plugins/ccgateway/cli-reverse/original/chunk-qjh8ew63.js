
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var fZe=String.raw`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}`;function _6(e){return new RegExp(fZe).test(e)}function pZe(e){let n=[],r=0;for(let t of e.matchAll(new RegExp(fZe,"g")))n.push(e.slice(r,t.index)),r=t.index+t[0].length;return n.push(e.slice(r)),n}function Esn(e){return e.replace(new RegExp(fZe,"g"),(n)=>"x".repeat(n.length))}function Q2e(e){return e.replace(new RegExp(fZe,"g"),(n,r)=>`\${${r}}`)}
export{fZe,_6,pZe,Esn,Q2e};
