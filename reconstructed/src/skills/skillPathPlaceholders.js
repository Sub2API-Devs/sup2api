/**
 * skills/skillPathPlaceholders.ts
 *
 * 2.1.316 新增：技能路径占位符
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { identityPath_2 } from "./loadSkillsDir.js";
import { isSkillShownToModel } from "./skillSources.js";
import { getProjectConfigRoot, getProjectRoot, getSessionId } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:3124614-3124728 placement
/**
 * 技能正文中的路径占位符与检测正则。
 */
var PROJECT_DIR_PLACEHOLDER = "${CLAUDE_PROJECT_DIR}";
var SKILL_DIR_PLACEHOLDER = "${CLAUDE_SKILL_DIR}";
var PROJECT_DIR_REF_RE = /\bCLAUDE_PROJECT_DIR\b/;
var SKILL_DIR_REF_RE = /\bCLAUDE_SKILL_DIR\b/;
//@ chunk-e6aww6q8.js:3150334-3150675 placement
/**
 * 替换技能正文中的 ${CLAUDE_SKILL_DIR}、${CLAUDE_PROJECT_DIR}、${CLAUDE_SESSION_ID}、${CLAUDE_EFFORT}。
 */
function expandSkillPlaceholders(e, { baseDir, loadedFrom, effortLevel }, h = (y) => y) {
  let y = e;
  if (baseDir) {
    let w = h(identityPath_2(baseDir));
    y = y.replaceAll("${CLAUDE_SKILL_DIR}", () => w);
  }
  if (
    !isSkillShownToModel({
      loadedFrom,
    })
  ) {
    y = y.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, () =>
      h(identityPath_2(getProjectConfigRoot() ?? getProjectRoot())),
    );
    let w = h(getSessionId());
    y = y.replace(/\$\{CLAUDE_SESSION_ID\}/g, () => w);
  }
  let S = h(effortLevel);
  return y.replaceAll("${CLAUDE_EFFORT}", () => S);
}
export {
  SKILL_DIR_PLACEHOLDER,
  SKILL_DIR_REF_RE,
  PROJECT_DIR_REF_RE,
  PROJECT_DIR_PLACEHOLDER,
  expandSkillPlaceholders,
};
