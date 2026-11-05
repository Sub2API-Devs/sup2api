
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Qqr}from"./chunk-tvg2fa4x.js";import{t}from"./chunk-6hadbefe.js";import{Xi}from"./chunk-4k8902rt.js";function pia(e){let r=Xi(),d=r.lastSentPreferredDeviceId,i=r.browserHints!==void 0&&r.browserHints.preferredDeviceId===void 0&&d!==void 0&&e.preferredDeviceId===d;r.lastSentPreferredDeviceId=e.preferredDeviceId,r.browserHints=e.preferredDeviceId===void 0&&e.localDeviceIds.length===0?void 0:i?{...e,preferredDeviceId:void 0}:e,t(`[Claude in Chrome] browser hints: preferred=${e.preferredDeviceId?.slice(0,8)??"none"} local=${e.localDeviceIds.length}${i?" (re-send; in-session pick stands)":""}`);let n=r.bridgeBinding;if(n&&e.preferredDeviceId!==void 0&&e.preferredDeviceId!==d&&n.socketClient.getSelectedDeviceId?.()!==e.preferredDeviceId)Qqr(n.socketClient)}function IBo(e){let r=Xi(),d=r.browserHints;if(!d||d.preferredDeviceId===void 0||d.preferredDeviceId===e)return;r.browserHints={...d,preferredDeviceId:void 0}}function OBo(e){return Xi().browserHints?.preferredDeviceId??e()}function MBo(){let e=Xi().browserHints;if(!e)return;return new Map(e.localDeviceIds.map((r)=>[r,"live"]))}function DBo(){return Xi().browserHints?.hostPlatform}
export{pia,IBo,OBo,MBo,DBo};
