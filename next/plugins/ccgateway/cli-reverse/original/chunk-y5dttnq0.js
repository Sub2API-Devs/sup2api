
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{c}from"./chunk-0wqny7vr.js";import{d}from"./chunk-2g090z7k.js";import{Pe}from"./chunk-aepeg2w5.js";import{t}from"./chunk-cgr0tezp.js";import{jr}from"./chunk-8nhse09v.js";async function pJe(o,r,n){try{await Promise.all([Pe((e)=>e.managedSettingsNoticeSeenOrg===o?e:{...e,managedSettingsNoticeSeenOrg:o},n),jr("remote_managed_settings_login_notice",{surface:c(r)})])}catch(e){t(`managed settings notice: not recorded as shown: ${d(e)}`,{level:"error"})}}
export{pJe};
