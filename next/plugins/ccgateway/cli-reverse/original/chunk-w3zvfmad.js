
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{wM,$ne}from"./chunk-5xgkngpb.js";import{br}from"./chunk-5fn9rb8r.js";function Tme(t,e){if(e)return t?`agent:builtin:${t}`:"agent:default";return t?`agent:custom:${t}`:"agent:custom"}function lot(){let e=br()?.outputStyle??wM;if(e===wM)return"repl_main_thread";return Object.hasOwn($ne,e)?`repl_main_thread:outputStyle:${e}`:"repl_main_thread:outputStyle:custom"}
export{Tme,lot};
