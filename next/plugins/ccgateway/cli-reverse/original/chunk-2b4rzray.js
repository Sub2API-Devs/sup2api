
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{v,Pe,ue}from"./chunk-aepeg2w5.js";import{b,de}from"./chunk-0wqny7vr.js";import{a}from"./chunk-8kte1b36.js";import{Pg}from"./chunk-ktpw8eqa.js";import{be,zn}from"./chunk-q8cqcff6.js";import{qV}from"./chunk-n4pvm0gt.js";function rgo(u,{requireOnboarding:n=!0}={}){let o=ue();if(n&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!v("tengu_maple_pier",!0))return null;let e=be("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((r)=>be(r)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&qV(u))return e;return null}function ogo(u,n,o){if(ue().hasSeenAutoDefaultNudge)return;let e=Pg(n.current_mode);if(u==="shown"){a("tengu_auto_default_nudge_shown",{current_mode:de(e),surface:b("ide")});return}let t=n.choice==="accept"?"accept":"decline";if(t==="accept")zn("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);Pe((r)=>r.hasSeenAutoDefaultNudge?r:{...r,hasSeenAutoDefaultNudge:!0},o),a("tengu_auto_default_nudge_resolved",{choice:b(t),outcome:t==="accept"?b("switched"):b("declined"),current_mode:de(e),surface:b("ide")})}
export{rgo,ogo};
