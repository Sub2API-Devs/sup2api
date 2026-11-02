
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{sp}from"./chunk-cgr0tezp.js";import{mMn}from"./chunk-hq88884p.js";function YXo(s,e,o){let n=sp()?mMn(s,o):void 0;if(!n)return;let{tls:r,...t}=e??{},d=e?.proxy===void 0&&e?.unix===void 0?t:e;return(i)=>n.fetch(i,d)}function pAt(s,e,o){let n=e.proxy===void 0&&o?.()?YXo("ccr",e,void 0):void 0;return n?n(s):fetch(s,e)}
export{YXo,pAt};
