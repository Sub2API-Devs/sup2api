
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{f}from"./chunk-vwtpw18x.js";import{l}from"./chunk-nkv493nm.js";import{yr}from"./chunk-ap4nnw1y.js";import{Pe}from"./chunk-p223w7hd.js";import{qdo,Ydo}from"./chunk-gg17c06d.js";import{yt}from"./chunk-8yc04s9d.js";var p=["userSettings","projectSettings","localSettings","flagSettings","cliArg","session"];function i(r){if(r===Pe)return Pe;if(r===yt)return yt;return null}function m(r,e){let o=i(r);if(o===null)return null;if(e===void 0||e===""||/^[\s*]+$/.test(e))return"bare";return(o===Pe?qdo(o,e):Ydo(o,e))?"dangerous_prefix":"scoped"}function y(r){let e={},o=0;for(let t of p)for(let n of r[t]??[]){let{toolName:c,ruleContent:S}=yr(n),s=i(c);if(s===null)continue;let u=m(s,S);if(u===null)continue;let a=`${t}_${s}_${u}`;e[a]=(e[a]??0)+1,o++}return e.total_shell_allow_rules=o,e}function p9s(r){l("tengu_shell_allow_rules_at_init",y(r))}function aGr(r){for(let e of r){if(e.type!=="addRules"||e.behavior!=="allow")continue;for(let o of e.rules){let t=i(o.toolName);if(t===null)continue;let n=m(o.toolName,o.ruleContent);if(n===null)continue;l("tengu_shell_allow_rule_added",{toolName:f(t),category:f(n),destination:f(e.destination)})}}}
export{p9s,aGr};
