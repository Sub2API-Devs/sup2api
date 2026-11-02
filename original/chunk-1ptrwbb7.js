
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{t}from"./chunk-cgr0tezp.js";import{ql}from"./chunk-m41h77x8.js";import{Ft}from"./chunk-aepeg2w5.js";import{Vyt}from"./chunk-zg1bje4s.js";function _Ds(){return!Ft()}function Lgt(o){return o.filter((r)=>!r.mcpErrorMetadata&&!r.statusOnly&&!r.startupFatal)}function Hgt(o){let r=[],i=[];for(let n of o)(n.statusOnly?r:i).push(n);return{statusNotices:r,invalidEntries:i}}function Ngt(o){for(let r of o)t(`Invalid setting skipped without dialog (automated session): ${ql(Vyt(r.file))}: ${r.path}: ${r.message}`,{level:"error"})}
export{_Ds,Lgt,Hgt,Ngt};
