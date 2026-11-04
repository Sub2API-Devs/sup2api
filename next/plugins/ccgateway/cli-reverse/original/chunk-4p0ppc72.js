
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{c}from"./chunk-0wqny7vr.js";import{a}from"./chunk-8kte1b36.js";import{Fn}from"./chunk-gda5w2fs.js";import{Fe,Ct}from"./chunk-bwbq4xvm.js";import{cXr,uXr}from"./chunk-sfy7bm1n.js";var p=["userSettings","projectSettings","localSettings","flagSettings","cliArg","session"];function s(l){if(l===Fe)return Fe;if(l===Ct)return Ct;return null}function m(l,e){let o=s(l);if(o===null)return null;if(e===void 0||e===""||/^[\s*]+$/.test(e))return"bare";return(o===Fe?cXr(o,e):uXr(o,e))?"dangerous_prefix":"scoped"}function y(l){let e={},o=0;for(let r of p)for(let t of l[r]??[]){let{toolName:f,ruleContent:S}=Fn(t),n=s(f);if(n===null)continue;let i=m(n,S);if(i===null)continue;let u=`${r}_${n}_${i}`;e[u]=(e[u]??0)+1,o++}return e.total_shell_allow_rules=o,e}function D0s(l){a("tengu_shell_allow_rules_at_init",y(l))}function wOr(l){for(let e of l){if(e.type!=="addRules"||e.behavior!=="allow")continue;for(let o of e.rules){let r=s(o.toolName);if(r===null)continue;let t=m(o.toolName,o.ruleContent);if(t===null)continue;a("tengu_shell_allow_rule_added",{toolName:c(r),category:c(t),destination:c(e.destination)})}}}
export{D0s,wOr};
