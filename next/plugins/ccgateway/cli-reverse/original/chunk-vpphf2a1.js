
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{lUt}from"./chunk-zfbhezv9.js";import{LM}from"./chunk-e6aww6q8.js";import{sqe,Ui}from"./chunk-s61vbvea.js";import{tZ,x5,gIo,hIo,oUt}from"./chunk-dw613xrm.js";function mNt(){return lUt()||sqe("auto_mode_off")||oUt()||sqe("unattended_serving_off")}function gNt(n){try{if(lUt())return LM()==="settings"?"settings":"breaker";if(sqe("auto_mode_off"))return"settings";let e=sqe("unattended_serving_off");if(!oUt(n)&&!e)return"none";if(x5()||e)return"consent_forced_off";let t=tZ();if(t==="declined")return"consent_declined";if(t==="accepted"||gIo())return"consent_unknown";return hIo()?"sandbox_off":"consent_unset"}catch{return"consent_unknown"}}function wSo(n){let e=gNt();if(e==="none")return;return{key:`served-auto-off-${e==="consent_unset"||e==="consent_declined"?"consent":e}`,text:Ui.auto_off_notice(n,Ui[`auto_off.reason.${e}`])}}export{mNt,gNt,wSo};
