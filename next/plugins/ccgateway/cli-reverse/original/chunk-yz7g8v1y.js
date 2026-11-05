
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{te}from"./chunk-bjf8bvwf.js";import{randomUUID as s}from"crypto";var m=256;function uZn(e=s(),t){if(t!==void 0){let o=te().laneNoticeSlugs;o.set(e,t),r(o)}return e}function mri(e){return te().laneNoticeSlugs.get(e)}function hri(e,t,o){let n=te(),i=Date.now();if(e!==void 0)n.commentReads.set(e,{slug:t,ownWordsOnly:o}),r(n.commentReads);if(n.commentReadAtBySlug.delete(t),n.commentReadAtBySlug.set(t,i),r(n.commentReadAtBySlug)||!o)n.lastOthersCommentReadAt=i}function gri(e){return te().commentReads.get(e)}function fZn(e,t){for(let[o,n]of te().commentReadAtBySlug)if(o!==e&&!(Number.isFinite(t)&&n<t))return!0;return!1}function pZn(){return te().lastOthersCommentReadAt}function r(e){if(e.size<=m)return!1;let t=e.keys().next().value;if(t!==void 0)e.delete(t);return!0}
export{uZn,mri,hri,gri,fZn,pZn};
