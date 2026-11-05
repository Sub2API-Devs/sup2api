
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{pf,iLn,duo,tq}from"./chunk-k0v80sg8.js";import{_g}from"./chunk-z20c443b.js";var owe="request_reauthored",n=5000;function Dqs(o,e){if(e.gate_mark!==owe||o.tool_use_id!==e.tool_use_id)return{ok:!1,why:"malformed"};let i={v:pf,call_id:o.tool_use_id,expires_in_ms:tq(e.deadline_ms-n)},s={kind:"ccr_container",tool_host_interface:o.tool_host_interface};switch(o.step){case"check":return{ok:!1,why:"malformed"};case"run":return duo({...i,caller:{...s,permission_mode:o.permission_context.mode,model:o.main_loop_model,..._g(o,[iLn,"conversation_id","compaction_id"])},...o.approval!==void 0&&{approval:{ask_id:o.approval.ask_digest,decision:"allow",..._g(o.approval,["attested","permission_updates"])}}});case"decline":return duo({...i,caller:s,approval:{ask_id:o.ask_digest,decision:"deny"}})}}
export{owe,Dqs};
