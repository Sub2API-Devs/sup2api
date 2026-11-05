
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{v,Le,fe}from"./chunk-exfmq47h.js";import{b,ce}from"./chunk-vwtpw18x.js";import{l}from"./chunk-nkv493nm.js";import{bg}from"./chunk-jjgqpk90.js";import{Se,Kn}from"./chunk-5fn9rb8r.js";import{K4}from"./chunk-9q0d7bhm.js";function sPo(u,{requireOnboarding:n=!0}={}){let o=fe();if(n&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!v("tengu_maple_pier",!0))return null;let e=Se("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((r)=>Se(r)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&K4(u))return e;return null}function iPo(u,n,o){if(fe().hasSeenAutoDefaultNudge)return;let e=bg(n.current_mode);if(u==="shown"){l("tengu_auto_default_nudge_shown",{current_mode:ce(e),surface:b("ide")});return}let t=n.choice==="accept"?"accept":"decline";if(t==="accept")Kn("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);Le((r)=>r.hasSeenAutoDefaultNudge?r:{...r,hasSeenAutoDefaultNudge:!0},o),l("tengu_auto_default_nudge_resolved",{choice:b(t),outcome:t==="accept"?b("switched"):b("declined"),current_mode:ce(e),surface:b("ide")})}
export{sPo,iPo};
