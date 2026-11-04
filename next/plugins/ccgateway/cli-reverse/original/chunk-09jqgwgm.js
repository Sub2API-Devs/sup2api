
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{W$r}from"./chunk-w2264jxg.js";import{t}from"./chunk-cgr0tezp.js";import{Yi}from"./chunk-3q7pey4p.js";function ozi(e){let r=Yi(),d=r.lastSentPreferredDeviceId,i=r.browserHints!==void 0&&r.browserHints.preferredDeviceId===void 0&&d!==void 0&&e.preferredDeviceId===d;r.lastSentPreferredDeviceId=e.preferredDeviceId,r.browserHints=e.preferredDeviceId===void 0&&e.localDeviceIds.length===0?void 0:i?{...e,preferredDeviceId:void 0}:e,t(`[Claude in Chrome] browser hints: preferred=${e.preferredDeviceId?.slice(0,8)??"none"} local=${e.localDeviceIds.length}${i?" (re-send; in-session pick stands)":""}`);let n=r.bridgeBinding;if(n&&e.preferredDeviceId!==void 0&&e.preferredDeviceId!==d&&n.socketClient.getSelectedDeviceId?.()!==e.preferredDeviceId)W$r(n.socketClient)}function FAo(e){let r=Yi(),d=r.browserHints;if(!d||d.preferredDeviceId===void 0||d.preferredDeviceId===e)return;r.browserHints={...d,preferredDeviceId:void 0}}function UAo(e){return Yi().browserHints?.preferredDeviceId??e()}function BAo(){let e=Yi().browserHints;if(!e)return;return new Map(e.localDeviceIds.map((r)=>[r,"live"]))}function jAo(){return Yi().browserHints?.hostPlatform}
export{ozi,FAo,UAo,BAo,jAo};
