
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{nFn,jHe,Dnn,pD,fe}from"./chunk-exfmq47h.js";import{jo}from"./chunk-sq9ffh11.js";import{Gm,Se,Kn}from"./chunk-5fn9rb8r.js";var OLe=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function gi(n,i){let o=jo();for(let e=o.length-1;e>=0;e--){let t=o[e],s=Se(t)?.[n];if(s===void 0)continue;if(t==="projectSettings"&&o.includes("userSettings")&&Gm())continue;return{value:s,source:t}}if(OLe.includes(n)){let e=n,t=fe()[e];if(t!==void 0&&t!==pD[e]){let s=nFn(e)?Dnn(e,t):jHe(e,t);if(s!==void 0)return{value:s,source:"legacyGlobalConfig"}}}return{value:i,source:"default"}}function B9(n,i,o){Kn("userSettings",{[n]:i},void 0,o)}
export{OLe,gi,B9};
