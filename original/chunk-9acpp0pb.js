
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{dw,mRi,y8}from"./chunk-1rckdhfn.js";import{i}from"./chunk-jhrww53q.js";import{ft}from"./chunk-q8cqcff6.js";import{wpr}from"./chunk-ey3hxakn.js";function I3(e){return i.CLAUDE_CODE_DISABLE_BUNDLED_SKILLS||(e??ft()).disableBundledSkills===!0}var Zeo="allow_bundled_skills";function e6e(){return!dw(Zeo)}function n(){return mRi()??wpr}function D4(e){return e6e()&&!n().includes(e)}function Jme(e,t){return I3(t)||D4(e)}function WSi(){return y8(Zeo,"Bundled skills","are")}function ppr(e){let t=e6e();return`${I3(e)}:${t}:${t?n().join(","):""}`}function eto(e,t){return e.type==="prompt"&&e.source==="builtin"&&Jme(e.name,t)}
export{I3,Zeo,e6e,D4,Jme,WSi,ppr,eto};
