/**
 * skills/bundled/artifactDiagram.ts
 *
 * 2.1.316 新增。Artifact 画图指导内置技能。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (3)
 * attribution: placement 3
 */
import { isArtifactToolRegistered } from "../../services/artifacts/artifactToolGates.js";
import { isBuiltInArtifactHiddenForMcp } from "../../services/artifacts/artifactsMcpTools.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { ARTIFACT_DIAGRAMMING } from "./bundledSkillNames.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-ne2890fx.js:26789-26980 placement
var ARTIFACT_DIAGRAM_SKILL_DESCRIPTION =
  "Diagramming know-how for Artifacts - when a picture earns its place, how to draw one that shows the real mechanism, and the inline-SVG mechanics that keep it legible in both themes.";
//@ chunk-ne2890fx.js:26980-27013 placement
function isArtifactDiagramSkillEnabled() {
  return isArtifactToolRegistered() && !isBuiltInArtifactHiddenForMcp();
}
//@ chunk-ne2890fx.js:27013-27274 placement
/**
 * 注册 Artifacts 画图指导 bundled skill（"Diagramming guidance for Artifacts"），正文从 chunk-84d2fjs2.js 的 SKILL_MD 懒加载并去掉 frontmatter。
 */
function registerArtifactDiagramSkill() {
  registerBundledSkill({
    name: ARTIFACT_DIAGRAMMING,
    menuDescription: "Diagramming guidance for Artifacts",
    description: ARTIFACT_DIAGRAM_SKILL_DESCRIPTION,
    isEnabled: isArtifactDiagramSkillEnabled,
    userInvocable: true,
    async getPromptForCommand() {
      let { SKILL_MD } = await import("./SKILL_MD_2.lazy.js");
      return [
        {
          type: "text",
          text: parseFrontmatter(SKILL_MD).content.trimStart(),
        },
      ];
    },
  });
}
export { registerArtifactDiagramSkill };
