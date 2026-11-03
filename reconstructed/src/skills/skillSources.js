/**
 * skills/skillSources.ts
 *
 * 2.1.316 新增：技能来源判定与展示字段
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (6)
 * attribution: placement 6
 */
import { remoteToolsState } from "../remote/tools/callResults.js";
import { env } from "../utils/env.js";
import { isRemoteCowork } from "../utils/entrypointKinds.js";
import { escapeXmlKeepJoiners, normalizeKeepJoiners } from "../utils/permissions/checkRegistry.js";

//@ chunk-g54kbxqw.js:34049-34302 placement
function isSkillFromUserSource(e) {
  if (e.loadedFrom === void 0) return Boolean(e.isMcp);
  switch (e.loadedFrom) {
    case "skills":
    case "commands_DEPRECATED":
    case "plugin":
    case "managed":
    case "bundled":
      return !1;
    case "syncedSkills":
    case "mcp":
    case "memoryStore":
    case "attachedFolder":
      return !0;
  }
}
//@ chunk-g54kbxqw.js:34302-34394 placement
function isSkillShownToModel(e) {
  if (e.loadedFrom === "syncedSkills") return !isRemoteOrCowork() || remoteToolsState().textAlone;
  return isSkillFromUserSource(e);
}
//@ chunk-g54kbxqw.js:34394-34486 placement
function isRemoteOrCowork() {
  return Boolean(env.CLAUDE_CODE_REMOTE) || Boolean(env.CLAUDE_CODE_IS_COWORK) || isRemoteCowork();
}
//@ chunk-g54kbxqw.js:34486-34733 placement
function emptySkillFrontmatter() {
  return {
    hooks: void 0,
    allowedTools: [],
    disallowedTools: [],
    executionContext: void 0,
    agent: void 0,
    background: void 0,
    model: void 0,
    effort: void 0,
    shell: void 0,
    paths: void 0,
    fallback: void 0,
    createdBy: void 0,
    displayName: void 0,
    metadata: void 0,
  };
}
//@ chunk-g54kbxqw.js:34733-34942 placement
function escapedSkillFields(e) {
  return {
    description: escapeXmlKeepJoiners(e.description),
    argumentHint: e.argumentHint === void 0 ? void 0 : escapeXmlKeepJoiners(e.argumentHint),
    whenToUse: e.whenToUse === void 0 ? void 0 : escapeXmlKeepJoiners(e.whenToUse),
    argumentNames: e.argumentNames.map(escapeXmlKeepJoiners),
  };
}
//@ chunk-g54kbxqw.js:34942-35039 placement
function displaySkillFields(e) {
  return {
    ...escapedSkillFields(e),
    argumentHint: e.argumentHint === void 0 ? void 0 : normalizeKeepJoiners(e.argumentHint),
  };
}

export {
  displaySkillFields,
  isSkillShownToModel,
  isRemoteOrCowork,
  isSkillFromUserSource,
  emptySkillFrontmatter,
  escapedSkillFields,
};
