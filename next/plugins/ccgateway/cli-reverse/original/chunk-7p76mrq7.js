
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Fb,v}from"./chunk-exfmq47h.js";import{Xq}from"./chunk-jjgqpk90.js";import{ePe}from"./chunk-nw438tyx.js";import{il}from"./chunk-5xgkngpb.js";function G3n(e,r,n,s,i){return s||Fb(n)||e.suppressesAlwaysAllowRule?.(r,!v("tengu_valiant_crayon",!1))===!0&&!(i??[]).some((o)=>(o.type==="addRules"||o.type==="replaceRules")&&o.behavior==="allow"&&o.rules.some((t)=>t.ruleContent!==void 0))||void 0}function czt(e,r,n){if(il(e.decisionReason,Xq)!==void 0||ePe(n))return!0;if(r.requiresUserInteraction?.())return!0;return e.forcedByCaller===!0||e.personOnly===!0}
export{G3n,czt};
