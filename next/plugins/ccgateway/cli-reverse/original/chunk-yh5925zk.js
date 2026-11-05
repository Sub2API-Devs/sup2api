
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Yn}from"./chunk-vwtpw18x.js";var n=new Set(["starting","running","resuming","adopted","crashed","working","blocked","done","stopped","failed","busy","shell","idle","waiting"]);function b3(e){if(e===void 0)return;return Yn(n.has(e)?e:"other")}var t=new Set(["cold","spare","adopted"]);function hGt(e){return typeof e==="string"&&t.has(e)?e:void 0}
export{b3,hGt};
