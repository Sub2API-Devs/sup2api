
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{oK}from"./chunk-2jb250pa.js";import{cJ,$r,S_t,ao}from"./chunk-w5050tnt.js";import{Fee}from"./chunk-p126a53v.js";function SKe(r){return r.replace(/:\d+$/,"")}var e="gitlab.com",o="bitbucket.org",k5i={github:$r,gitlab:e,bitbucket:o},n={"ssh.github.com":"github","altssh.gitlab.com":"gitlab","altssh.bitbucket.org":"bitbucket"};function PH(r){if(r=SKe(r),ao(r))return"github";let t=S_t(r),i=n[t];if(i)return i;if(t===e)return"gitlab";if(t===o)return"bitbucket";return"other"}function JFt(r){let t=r.trim();if(cJ(t)||oK(t)||Fee(t))return null;if(t.includes("://"))try{return new URL(t).hostname||null}catch{return null}return/^(?:[^@:/]+@)?([^:/]+):/.exec(t)?.[1]??null}function gjn(r){let t=/^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);return t&&!oK(r)?{user:t[1],host:t[2],path:t[3]}:null}
export{SKe,k5i,PH,JFt,gjn};
