
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{aE,DVi,UX}from"./chunk-f3md3zsc.js";import{i}from"./chunk-xjnnz630.js";import{gt}from"./chunk-5fn9rb8r.js";import{ZTr}from"./chunk-1qptc25v.js";function Q9(e){return i.CLAUDE_CODE_DISABLE_BUNDLED_SKILLS||(e??gt()).disableBundledSkills===!0}var Bho="allow_bundled_skills";function YJe(){return!aE(Bho)}function n(){return DVi()??ZTr}function I5(e){return YJe()&&!n().includes(e)}function T_e(e,t){return Q9(t)||I5(e)}function KBi(){return UX(Bho,"Bundled skills","are")}function BTr(e){let t=YJe();return`${Q9(e)}:${t}:${t?n().join(","):""}`}function jho(e,t){return e.type==="prompt"&&e.source==="builtin"&&T_e(e.name,t)}
export{Q9,Bho,YJe,I5,T_e,KBi,BTr,jho};
