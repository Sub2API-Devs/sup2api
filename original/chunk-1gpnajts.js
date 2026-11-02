
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{i}from"./chunk-jhrww53q.js";import{Fdo,wm,MR,Gf,o7}from"./chunk-7dqf31r1.js";import{mn}from"./chunk-4vzb3taj.js";import{Kat}from"./chunk-aepeg2w5.js";function r(){if(MR()||o7())return null;if(mn()){let t=wm();if(t===void 0||!t.startsWith("remote")||Fdo.has(t))return null;return Kat()?null:"cloud"}if(i.CLAUDE_CODE_REMOTE)return null;return Gf()?"desktop":null}function a6n(){return i.CLAUDE_CODE_ARTIFACT_SHARE===!0&&r()!==null}
export{a6n};
