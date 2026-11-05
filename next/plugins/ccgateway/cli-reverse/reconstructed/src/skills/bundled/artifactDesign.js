/**
 * skills/bundled/artifactDesign.ts
 *
 * 2.1.316 新增：内置 artifact 设计技能
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getBundledSkills, registerBundledSkill } from "../bundledSkills.js";
import { DATAVIZ, ARTIFACT_DESIGN } from "./bundledSkillNames.js";
import { isArtifactToolRegistered } from "../../services/artifacts/artifactToolGates.js";
import { isBuiltInArtifactHiddenForMcp } from "../../services/artifacts/artifactsMcpTools.js";
import { setPageContractHeaderProvider, loadDatavizSkillContent } from "./datavizCallout.js";

//@ chunk-ne2890fx.js:25997-26188 placement
var ARTIFACT_DESIGN_DESCRIPTION = "Design guidance and fundamentals for Artifacts.";
var ARTIFACT_DESIGN_WHEN_TO_USE =
  "Load before writing any artifact, including a skill-instructed Markdown one - Markdown is never a shortcut past the design pass.";
//@ chunk-ne2890fx.js:26188-26593 placement
/**
 * 开关打开且内置 dataviz 技能存在时，返回图表与示意图设计的补充提示词。
 */
function getDatavizDesignAddendum() {
  if (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_dataviz", false) &&
    getBundledSkills().some((skill) => skill.name === DATAVIZ)
  )
    return `**When adding charts or diagrams** The craft shifts from identity to honesty \u2014 pick the form the data's shape calls for, keep encodings from exaggerating, title the finding rather than the axes. Load the \`${DATAVIZ}\` skill for the specifics; this skill continues to govern the page the chart sits in.`;
  return "";
}
//@ chunk-ne2890fx.js:26593-26626 placement
/**
 * 判断 artifact-design 内置技能是否启用（依赖 Artifact 工具可用）。
 */
function isArtifactDesignSkillEnabled() {
  return isArtifactToolRegistered() && !isBuiltInArtifactHiddenForMcp();
}
//@ chunk-ne2890fx.js:26626-26789 placement (2.1.88 match: registerLoopSkill, 0.574)
/**
 * 注册 artifact-design 内置 skill（模型可调用、用户不可见），isEnabled 由 artifact 功能门控。旧版此处匹配为 registerLoopSkill，实为不同 skill。
 */
function registerArtifactDesignSkill() {
  setPageContractHeaderProvider(getDatavizDesignAddendum);
  registerBundledSkill({
    name: ARTIFACT_DESIGN,
    description: ARTIFACT_DESIGN_DESCRIPTION,
    whenToUse: ARTIFACT_DESIGN_WHEN_TO_USE,
    isEnabled: isArtifactDesignSkillEnabled,
    userInvocable: false,
    async getPromptForCommand() {
      return [
        {
          type: "text",
          text: await loadDatavizSkillContent(),
        },
      ];
    },
  });
}
export { registerArtifactDesignSkill };
