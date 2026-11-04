
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Gn}from"./chunk-0wqny7vr.js";var n=new Set(["starting","running","resuming","adopted","crashed","working","blocked","done","stopped","failed","busy","shell","idle","waiting"]);function m5(e){if(e===void 0)return;return Gn(n.has(e)?e:"other")}var t=new Set(["cold","spare","adopted"]);function ENt(e){return typeof e==="string"&&t.has(e)?e:void 0}
export{m5,ENt};
