
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{f}from"./chunk-vwtpw18x.js";import{d}from"./chunk-63094ahz.js";import{Le}from"./chunk-exfmq47h.js";import{t}from"./chunk-6hadbefe.js";import{Ir}from"./chunk-47b8txen.js";async function bnt(o,r,n){try{await Promise.all([Le((e)=>e.managedSettingsNoticeSeenOrg===o?e:{...e,managedSettingsNoticeSeenOrg:o},n),Ir("remote_managed_settings_login_notice",{surface:f(r)})])}catch(e){t(`managed settings notice: not recorded as shown: ${d(e)}`,{level:"error"})}}
export{bnt};
