
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ee}from"./chunk-enbhzjw4.js";import{randomUUID as s}from"crypto";var m=256;function hqn(e=s(),t){if(t!==void 0){let o=ee().laneNoticeSlugs;o.set(e,t),r(o)}return e}function fGs(e){return ee().laneNoticeSlugs.get(e)}function pGs(e,t,o){let n=ee(),i=Date.now();if(e!==void 0)n.commentReads.set(e,{slug:t,ownWordsOnly:o}),r(n.commentReads);if(n.commentReadAtBySlug.delete(t),n.commentReadAtBySlug.set(t,i),r(n.commentReadAtBySlug)||!o)n.lastOthersCommentReadAt=i}function mGs(e){return ee().commentReads.get(e)}function yqn(e,t){for(let[o,n]of ee().commentReadAtBySlug)if(o!==e&&!(Number.isFinite(t)&&n<t))return!0;return!1}function _qn(){return ee().lastOthersCommentReadAt}function r(e){if(e.size<=m)return!1;let t=e.keys().next().value;if(t!==void 0)e.delete(t);return!0}
export{hqn,fGs,pGs,mGs,yqn,_qn};
