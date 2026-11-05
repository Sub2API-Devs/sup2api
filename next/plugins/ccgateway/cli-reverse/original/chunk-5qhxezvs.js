
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{D}from"./chunk-zhh3qac9.js";var An="SendMessage",WUn="ccd_session_mgmt",_$t=200,ISo=["type","recipient","recipient_kind","content","request_id","approve"];function ixs(e){return"to"in e&&(("message"in e)||("notify_when_idle"in e))}function ron(e){if(!D(e)||!ixs(e)||!ISo.some((n)=>(n in e)))return;let o={...e};for(let n of ISo)delete o[n];return o}
export{An,WUn,_$t,ISo,ixs,ron};
