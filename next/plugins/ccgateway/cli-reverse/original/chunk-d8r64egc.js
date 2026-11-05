
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{X2t}from"./chunk-b9gx6r6h.js";import{vL}from"./chunk-5xgkngpb.js";import{Y3e,ta}from"./chunk-7jxyna5q.js";import{jte,M3,gzo,yzo,z2t}from"./chunk-fcmdaxcr.js";function FWt(){return X2t()||Y3e("auto_mode_off")||z2t()||Y3e("unattended_serving_off")}function UWt(n){try{if(X2t())return vL()==="settings"?"settings":"breaker";if(Y3e("auto_mode_off"))return"settings";let e=Y3e("unattended_serving_off");if(!z2t(n)&&!e)return"none";if(M3()||e)return"consent_forced_off";let t=jte();if(t==="declined")return"consent_declined";if(t==="accepted"||gzo())return"consent_unknown";return yzo()?"sandbox_off":"consent_unset"}catch{return"consent_unknown"}}function lLo(n){let e=UWt();if(e==="none")return;return{key:`served-auto-off-${e==="consent_unset"||e==="consent_declined"?"consent":e}`,text:ta.auto_off_notice(n,ta[`auto_off.reason.${e}`])}}export{FWt,UWt,lLo};
