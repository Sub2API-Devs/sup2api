
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{zI,GZ}from"./chunk-e6aww6q8.js";import{ur}from"./chunk-q8cqcff6.js";function nue(t,e){if(e)return t?`agent:builtin:${t}`:"agent:default";return t?`agent:custom:${t}`:"agent:custom"}function n7e(){let e=ur()?.outputStyle??zI;if(e===zI)return"repl_main_thread";return Object.hasOwn(GZ,e)?`repl_main_thread:outputStyle:${e}`:"repl_main_thread:outputStyle:custom"}
export{nue,n7e};
