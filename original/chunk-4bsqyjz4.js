
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{X3n,ySt}from"./chunk-e6aww6q8.js";var l=/^[CDG][A-Z0-9]{6,}$/;function KDo(e){let n=e.replace(/^#/,"");return l.test(n)?`https://slack.com/app_redirect?channel=${n}`:null}var t=new Set(["slack_send_message","slack_post_message"]),VDo="mcp-slack-send";function k4n(e){return t.has(e)}function rzs(e){let n=e.channel_id??e.channel;if(typeof n!=="string")return null;let r=X3n(n);if(!r)return null;return{label:`#${r.replace(/^#/,"")}`,url:KDo(n)}}function T4n(){return{uiTableKey:VDo,userFacingName(){return"Slacked"},renderToolUseMessage(e,n){return n.verbose?ySt(e,n):""}}}
export{KDo,VDo,k4n,rzs,T4n};
