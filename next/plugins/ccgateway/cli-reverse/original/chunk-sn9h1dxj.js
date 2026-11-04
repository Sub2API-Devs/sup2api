
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{c}from"./chunk-0wqny7vr.js";import{i}from"./chunk-jhrww53q.js";import{Uhe,uV}from"./chunk-7dqf31r1.js";import{Te}from"./chunk-v9tcvh08.js";import{a}from"./chunk-8kte1b36.js";import{zn,VO}from"./chunk-q8cqcff6.js";import{v}from"./chunk-aepeg2w5.js";import{Uie}from"./chunk-hwmsct5x.js";import{Y}from"./chunk-byeye1yp.js";function Kan(){return VO("feedbackDrafts")[0]??"notify"}function mIo(){if(Uie()!==null)return!1;if(Uhe())return!1;if(uV())return!1;if(Te()!=="firstParty")return!1;let e=i.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return v("tengu_juniper_relay",!1);return v("tengu_juniper_relay",!1)}function R5(){return Kan()!=="off"&&mIo()}function wKn(e,{storageV5:t,via:r}){let n=Y()&&t!==void 0?zn("userSettings",{feedbackDrafts:e},void 0,t):zn("userSettings",{feedbackDrafts:e});return a("tengu_feedback_drafts_setting_changed",{value:c(e),via:c(r)}),n}
export{Kan,mIo,R5,wKn};
