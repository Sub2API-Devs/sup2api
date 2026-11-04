
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{gxn,iOe,n9t,IO,ue}from"./chunk-aepeg2w5.js";import{Po}from"./chunk-5hsd6qen.js";import{eg,be,zn}from"./chunk-q8cqcff6.js";var qPe=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function ei(n,i){let o=Po();for(let e=o.length-1;e>=0;e--){let t=o[e],s=be(t)?.[n];if(s===void 0)continue;if(t==="projectSettings"&&o.includes("userSettings")&&eg())continue;return{value:s,source:t}}if(qPe.includes(n)){let e=n,t=ue()[e];if(t!==void 0&&t!==IO[e]){let s=gxn(e)?n9t(e,t):iOe(e,t);if(s!==void 0)return{value:s,source:"legacyGlobalConfig"}}}return{value:i,source:"default"}}function y3(n,i,o){zn("userSettings",{[n]:i},void 0,o)}
export{qPe,ei,y3};
