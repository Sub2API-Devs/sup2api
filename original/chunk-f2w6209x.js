
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{az}from"./chunk-cgr0tezp.js";import{F8,Ur,$ut,mo}from"./chunk-fb1cwb1a.js";import{qQ}from"./chunk-9mf2agcn.js";function q1e(r){return r.replace(/:\d+$/,"")}var e="gitlab.com",o="bitbucket.org",KIi={github:Ur,gitlab:e,bitbucket:o},n={"ssh.github.com":"github","altssh.gitlab.com":"gitlab","altssh.bitbucket.org":"bitbucket"};function tL(r){if(r=q1e(r),mo(r))return"github";let t=$ut(r),i=n[t];if(i)return i;if(t===e)return"gitlab";if(t===o)return"bitbucket";return"other"}function TMt(r){let t=r.trim();if(F8(t)||az(t)||qQ(t))return null;if(t.includes("://"))try{return new URL(t).hostname||null}catch{return null}return/^(?:[^@:/]+@)?([^:/]+):/.exec(t)?.[1]??null}function kMn(r){let t=/^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);return t&&!az(r)?{user:t[1],host:t[2],path:t[3]}:null}
export{q1e,KIi,tL,TMt,kMn};
