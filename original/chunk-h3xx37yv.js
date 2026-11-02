
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{D}from"./chunk-n3a8e1qg.js";function eOs(e,l){let t=new Map,o=[];if(e===void 0||e===null)return{manifests:t,malformedField:!1,malformedServerNames:o};if(!D(e))return{manifests:t,malformedField:!0,malformedServerNames:o};for(let r of l){if(!Object.hasOwn(e,r))continue;let n=e[r],s=D(n)?n.initializeResult:void 0,i=D(n)&&n.toolsListResult!==null?n.toolsListResult:void 0;if(D(s)&&(i===void 0||D(i)))t.set(r,i===void 0?{initializeResult:s}:{initializeResult:s,toolsListResult:i});else o.push(r)}return{manifests:t,malformedField:!1,malformedServerNames:o}}var d="notifications/tools/list_changed";function yBn(e){return D(e)&&!("id"in e)&&e.method===d}
export{eOs,yBn};
