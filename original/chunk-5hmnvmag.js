
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Pe}from"./chunk-aepeg2w5.js";import{oUn}from"./chunk-tbfde207.js";function wce({newState:e,oldState:t},n,s,p){if(oUn({newState:e,oldState:t},n,void 0,s,p),e.expandedView!==t.expandedView){let a=e.expandedView==="tasks";Pe((o)=>{if(o.showExpandedTodos===a)return o;return{...o,showExpandedTodos:a}},s)}}
export{wce};
