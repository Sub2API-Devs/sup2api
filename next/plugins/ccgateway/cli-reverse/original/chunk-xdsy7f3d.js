
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{For,oCt}from"./chunk-5xgkngpb.js";var l=/^[CDG][A-Z0-9]{6,}$/;function dqo(e){let n=e.replace(/^#/,"");return l.test(n)?`https://slack.com/app_redirect?channel=${n}`:null}var t=new Set(["slack_send_message","slack_post_message"]),cqo="mcp-slack-send";function der(e){return t.has(e)}function Hri(e){let n=e.channel_id??e.channel;if(typeof n!=="string")return null;let r=For(n);if(!r)return null;return{label:`#${r.replace(/^#/,"")}`,url:dqo(n)}}function cer(){return{uiTableKey:cqo,userFacingName(){return"Slacked"},renderToolUseMessage(e,n){return n.verbose?oCt(e,n):""}}}
export{dqo,cqo,der,Hri,cer};
