
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ezs}from"./chunk-1dth5azr.js";import{Spi}from"./chunk-g54kbxqw.js";function hdn(a,n){let e=Spi(a);if(e.outcome==="drop")return{verdict:"drop",cause:"schema_unsupported",reason:e.reason};if(e.outcome==="normalized"&&!n.normalizeEnabled)return{verdict:"drop",cause:"normalize_gated",reason:`its input schema uses top-level ${e.combinators.join("/")}, which the Anthropic API does not accept`};let o=e.outcome==="normalized"?{schema:e.schema,note:e.note,combinators:e.combinators}:void 0,i=ezs(o?.schema??a);if(i.valid)return{verdict:"send",normalized:o,apiWouldReject:void 0};if(!n.apiValidateEnabled)return{verdict:"send",normalized:o,apiWouldReject:i};return{verdict:"drop",cause:"api_invalid",normalized:o,rejection:i}}
export{hdn};
