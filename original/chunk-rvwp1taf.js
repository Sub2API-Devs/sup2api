
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{D}from"./chunk-n3a8e1qg.js";var Dn="SendMessage",QPn="ccd_session_mgmt",VIt=200,Oso=["type","recipient","recipient_kind","content","request_id","approve"];function jcs(e){return"to"in e&&(("message"in e)||("notify_when_idle"in e))}function yXt(e){if(!D(e)||!jcs(e)||!Oso.some((n)=>(n in e)))return;let o={...e};for(let n of Oso)delete o[n];return o}
export{Dn,QPn,VIt,Oso,jcs,yXt};
