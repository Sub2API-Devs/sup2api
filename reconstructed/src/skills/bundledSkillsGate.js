/**
 * skills/bundledSkillsGate.ts
 *
 * 内置技能开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9acpp0pb.js (9)
 * attribution: placement 9
 */
import { env } from "../utils/env.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import {
  isPolicyAllowed,
  rememberedCoreSkills,
  policyDeniedReason,
} from "../services/policyLimits/policyVerdicts.js";
import { BUILTIN_SKILL_NAMES } from "./bundled/builtinSkillNames.js";

//@ chunk-9acpp0pb.js:342-438 placement
function I3(e) {
  return env.CLAUDE_CODE_DISABLE_BUNDLED_SKILLS || (e ?? getInitialSettings_2()).disableBundledSkills === !0;
}
//@ chunk-9acpp0pb.js:438-469 placement
var ALLOW_BUNDLED_SKILLS = "allow_bundled_skills";
//@ chunk-9acpp0pb.js:469-499 placement
function e6e() {
  return !isPolicyAllowed(ALLOW_BUNDLED_SKILLS);
}
//@ chunk-9acpp0pb.js:499-530 placement
function n() {
  return rememberedCoreSkills() ?? BUILTIN_SKILL_NAMES;
}
//@ chunk-9acpp0pb.js:530-576 placement
function D4(e) {
  return e6e() && !n().includes(e);
}
//@ chunk-9acpp0pb.js:576-614 placement
function Jme(e, t) {
  return I3(t) || D4(e);
}
//@ chunk-9acpp0pb.js:614-667 placement
function WSi() {
  return policyDeniedReason(ALLOW_BUNDLED_SKILLS, "Bundled skills", "are");
}
//@ chunk-9acpp0pb.js:667-739 placement
function ppr(e) {
  let t = e6e();
  return `${I3(e)}:${t}:${t ? n().join(",") : ""}`;
}
//@ chunk-9acpp0pb.js:739-819 placement
function eto(e, t) {
  return e.type === "prompt" && e.source === "builtin" && Jme(e.name, t);
}

export { I3, D4, e6e, ALLOW_BUNDLED_SKILLS, Jme, eto, ppr, WSi };
