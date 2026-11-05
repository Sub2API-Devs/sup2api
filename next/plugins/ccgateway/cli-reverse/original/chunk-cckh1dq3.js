
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{Ul}from"./chunk-8824h7w7.js";import{jt}from"./chunk-exfmq47h.js";import{Mkt}from"./chunk-5kksf9ax.js";function RYs(){return!jt()}function yEt(o){return o.filter((r)=>!r.mcpErrorMetadata&&!r.statusOnly&&!r.startupFatal)}function _Et(o){let r=[],i=[];for(let n of o)(n.statusOnly?r:i).push(n);return{statusNotices:r,invalidEntries:i}}function bEt(o){for(let r of o)t(`Invalid setting skipped without dialog (automated session): ${Ul(Mkt(r.file))}: ${r.path}: ${r.message}`,{level:"error"})}
export{RYs,yEt,_Et,bEt};
