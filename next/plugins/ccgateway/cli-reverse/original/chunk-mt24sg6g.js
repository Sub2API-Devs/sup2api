
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{f}from"./chunk-vwtpw18x.js";import{i}from"./chunk-xjnnz630.js";import{fSe,p4}from"./chunk-9ys74nhz.js";import{Ae}from"./chunk-5m8x0kb6.js";import{l}from"./chunk-nkv493nm.js";import{Kn,xD}from"./chunk-5fn9rb8r.js";import{v}from"./chunk-exfmq47h.js";import{rce}from"./chunk-vn3g7zt8.js";import{X}from"./chunk-mycxs6m3.js";function lyn(){return xD("feedbackDrafts")[0]??"notify"}function hzo(){if(rce()!==null)return!1;if(fSe())return!1;if(p4())return!1;if(Ae()!=="firstParty")return!1;let e=i.CLAUDE_CODE_SEND_FEEDBACK;if(e===!1)return!1;if(e===!0)return v("tengu_juniper_relay",!1);return v("tengu_juniper_relay",!1)}function O3(){return lyn()!=="off"&&hzo()}function ZJn(e,{storageV5:t,via:r}){let n=X()&&t!==void 0?Kn("userSettings",{feedbackDrafts:e},void 0,t):Kn("userSettings",{feedbackDrafts:e});return l("tengu_feedback_drafts_setting_changed",{value:f(e),via:f(r)}),n}
export{lyn,hzo,O3,ZJn};
