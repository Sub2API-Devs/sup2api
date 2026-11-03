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
  if (e.loadedFrom === undefined) return Boolean(e.isMcp);
  switch (e.loadedFrom) {
    case "skills":
    case "commands_DEPRECATED":
    case "plugin":
    case "managed":
    case "bundled":
      return false;
    case "syncedSkills":
    case "mcp":
    case "memoryStore":
    case "attachedFolder":
      return true;
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
    hooks: undefined,
    allowedTools: [],
    disallowedTools: [],
    executionContext: undefined,
    agent: undefined,
    background: undefined,
    model: undefined,
    effort: undefined,
    shell: undefined,
    paths: undefined,
    fallback: undefined,
    createdBy: undefined,
    displayName: undefined,
    metadata: undefined,
  };
}
//@ chunk-g54kbxqw.js:34733-34942 placement
function escapedSkillFields(e) {
  return {
    description: escapeXmlKeepJoiners(e.description),
    argumentHint: e.argumentHint === undefined ? undefined : escapeXmlKeepJoiners(e.argumentHint),
    whenToUse: e.whenToUse === undefined ? undefined : escapeXmlKeepJoiners(e.whenToUse),
    argumentNames: e.argumentNames.map(escapeXmlKeepJoiners),
  };
}
//@ chunk-g54kbxqw.js:34942-35039 placement
function displaySkillFields(e) {
  return {
    ...escapedSkillFields(e),
    argumentHint: e.argumentHint === undefined ? undefined : normalizeKeepJoiners(e.argumentHint),
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
