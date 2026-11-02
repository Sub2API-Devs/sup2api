
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
var _8e=String.raw`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}`;function Ove(e){return new RegExp(_8e).test(e)}function GOn(e){let n=[],r=0;for(let t of e.matchAll(new RegExp(_8e,"g")))n.push(e.slice(r,t.index)),r=t.index+t[0].length;return n.push(e.slice(r)),n}function zOn(e){return e.replace(new RegExp(_8e,"g"),(n)=>"x".repeat(n.length))}function M1e(e){return e.replace(new RegExp(_8e,"g"),(n,r)=>`\${${r}}`)}
export{_8e,Ove,GOn,zOn,M1e};
