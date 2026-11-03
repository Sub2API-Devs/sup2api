/**
 * skills/bundled/artifactDesign.ts
 *
 * 2.1.316 新增：内置 artifact 设计技能
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getBundledSkills, registerBundledSkill } from "../bundledSkills.js";
import { DATAVIZ, ARTIFACT_DESIGN } from "./bundledSkillNames.js";
import { isArtifactToolRegistered } from "../../services/artifacts/artifactToolGates.js";
import { isBuiltInArtifactHiddenForMcp } from "../../services/artifacts/artifactsMcpTools.js";
import { uNs, loadDatavizSkillContent } from "./datavizCallout.js";

//@ chunk-hantmvxa.js:25849-26040 placement
var ARTIFACT_DESIGN_DESCRIPTION = "Design guidance and fundamentals for Artifacts.",
  ARTIFACT_DESIGN_WHEN_TO_USE =
    "Load before writing any artifact, including a skill-instructed Markdown one - Markdown is never a shortcut past the design pass.";
/**
 * 开关打开且内置 dataviz 技能存在时，返回图表与示意图设计的补充提示词。
 */
//@ chunk-hantmvxa.js:26040-26445 placement
function getDatavizDesignAddendum() {
  if (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_dataviz", !1) &&
    getBundledSkills().some((e) => e.name === DATAVIZ)
  )
    return `**When adding charts or diagrams** The craft shifts from identity to honesty \u2014 pick the form the data's shape calls for, keep encodings from exaggerating, title the finding rather than the axes. Load the \`${DATAVIZ}\` skill for the specifics; this skill continues to govern the page the chart sits in.`;
  return "";
}
//@ chunk-hantmvxa.js:26445-26478 placement
function jn() {
  return isArtifactToolRegistered() && !isBuiltInArtifactHiddenForMcp();
}
/**
 * 注册 artifact-design 内置 skill（模型可调用、用户不可见），isEnabled 由 artifact 功能门控。旧版此处匹配为 registerLoopSkill，实为不同 skill。
 */
//@ chunk-hantmvxa.js:26478-26641 placement = registerLoopSkill (0.574)
function registerArtifactDesignSkill() {
  (uNs(getDatavizDesignAddendum),
    registerBundledSkill({
      name: ARTIFACT_DESIGN,
      description: ARTIFACT_DESIGN_DESCRIPTION,
      whenToUse: ARTIFACT_DESIGN_WHEN_TO_USE,
      isEnabled: jn,
      userInvocable: !1,
      async getPromptForCommand() {
        return [{ type: "text", text: await loadDatavizSkillContent() }];
      },
    }));
}

export { registerArtifactDesignSkill };
