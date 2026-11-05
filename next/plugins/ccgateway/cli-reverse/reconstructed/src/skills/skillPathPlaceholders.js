/**
 * skills/skillPathPlaceholders.ts
 *
 * 2.1.316 新增：技能路径占位符
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identityPath_2 } from "./loadSkillsDir.js";
import { isSkillShownToModel } from "./skillSources.js";
import { getProjectConfigRoot, getProjectRoot, getSessionId } from "../bootstrap/state.js";

//@ chunk-5xgkngpb.js:3211142-3211256 placement
/**
 * 技能正文中的路径占位符与检测正则。
 */
var PROJECT_DIR_PLACEHOLDER = "${CLAUDE_PROJECT_DIR}";
var SKILL_DIR_PLACEHOLDER = "${CLAUDE_SKILL_DIR}";
var PROJECT_DIR_REF_RE = /\bCLAUDE_PROJECT_DIR\b/;
var SKILL_DIR_REF_RE = /\bCLAUDE_SKILL_DIR\b/;
//@ chunk-5xgkngpb.js:3236953-3237294 placement
/**
 * 替换技能正文中的 ${CLAUDE_SKILL_DIR}、${CLAUDE_PROJECT_DIR}、${CLAUDE_SESSION_ID}、${CLAUDE_EFFORT}。
 */
function expandSkillPlaceholders(text, { baseDir, loadedFrom, effortLevel }, resolve = (value) => value) {
  let expanded = text;
  if (baseDir) {
    let skillDir = resolve(identityPath_2(baseDir));
    expanded = expanded.replaceAll("${CLAUDE_SKILL_DIR}", () => skillDir);
  }
  if (
    !isSkillShownToModel({
      loadedFrom,
    })
  ) {
    expanded = expanded.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, () =>
      resolve(identityPath_2(getProjectConfigRoot() ?? getProjectRoot())),
    );
    let sessionId = resolve(getSessionId());
    expanded = expanded.replace(/\$\{CLAUDE_SESSION_ID\}/g, () => sessionId);
  }
  let effort = resolve(effortLevel);
  return expanded.replaceAll("${CLAUDE_EFFORT}", () => effort);
}
export {
  SKILL_DIR_PLACEHOLDER,
  SKILL_DIR_REF_RE,
  PROJECT_DIR_REF_RE,
  PROJECT_DIR_PLACEHOLDER,
  expandSkillPlaceholders,
};
