
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";import{Nko,Wu,gT,vp,Qee}from"./chunk-9ys74nhz.js";import{on}from"./chunk-wtzc5s1n.js";import{Amt}from"./chunk-exfmq47h.js";function r(){if(gT()||Qee())return null;if(on()){let t=Wu();if(t===void 0||!t.startsWith("remote")||Nko.has(t))return null;return Amt()?null:"cloud"}if(i.CLAUDE_CODE_REMOTE)return null;return vp()?"desktop":null}function Knr(){return i.CLAUDE_CODE_ARTIFACT_SHARE===!0&&r()!==null}
export{Knr};
