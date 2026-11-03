/**
 * skills/skillVisibility.ts
 *
 * 2.1.316 新增：技能可见性。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1x527z82.js (3)
 * attribution: placement 3
 */
import { D4, I3 } from "./bundledSkillsGate.js";
import { WORKFLOW_AUTHORING } from "./bundled/bundledSkillNames.js";
import { isWorkflowsAvailable } from "../utils/workflows/workflowGates.js";
import { getDisableSlashCommands, getSessionSkillAllowlist } from "../bootstrap/state.js";
import { env } from "../utils/env.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { toolMatchesName } from "../Tool.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";

//@ chunk-1x527z82.js:484-540 placement
function RGe(o) {
  return isWorkflowAuthoringSkillAvailable() && !D4(WORKFLOW_AUTHORING) && (o === void 0 || r(o));
}
//@ chunk-1x527z82.js:540-788 placement
function isWorkflowAuthoringSkillAvailable() {
  if (!isWorkflowsAvailable()) return !1;
  if (I3() || getDisableSlashCommands()) return !1;
  if (env.CLAUDE_CODE_ENTRYPOINT === "local-agent") return !1;
  let o = getInitialSettings_2().skillOverrides?.[WORKFLOW_AUTHORING];
  if (o === "off" || o === "user-invocable-only") return !1;
  let e = getSessionSkillAllowlist();
  if (e !== void 0 && !e.includes(WORKFLOW_AUTHORING)) return !1;
  return !0;
}
//@ chunk-1x527z82.js:788-831 placement
function r(o) {
  return o.some((e) => toolMatchesName(e, SKILL));
}

export { RGe };
