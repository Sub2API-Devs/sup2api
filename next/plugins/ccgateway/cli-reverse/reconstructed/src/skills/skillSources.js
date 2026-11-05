/**
 * skills/skillSources.ts
 *
 * 2.1.316 新增：技能来源判定与展示字段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2c3jp4kn.js (6)
 * attribution: placement 6
 */
import { remoteToolsState } from "../remote/tools/callResults.js";
import { env } from "../utils/env.js";
import { isRemoteCowork } from "../utils/entrypointKinds.js";
import { escapeXmlKeepJoiners, normalizeKeepJoiners } from "../utils/permissions/checkRegistry.js";

//@ chunk-2c3jp4kn.js:2957-3210 placement
function isSkillFromUserSource(command) {
  if (command.loadedFrom === undefined) return Boolean(command.isMcp);
  switch (command.loadedFrom) {
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
//@ chunk-2c3jp4kn.js:3210-3302 placement
function isSkillShownToModel(command) {
  if (command.loadedFrom === "syncedSkills") return !isRemoteOrCowork() || remoteToolsState().textAlone;
  return isSkillFromUserSource(command);
}
//@ chunk-2c3jp4kn.js:3302-3394 placement
function isRemoteOrCowork() {
  return Boolean(env.CLAUDE_CODE_REMOTE) || Boolean(env.CLAUDE_CODE_IS_COWORK) || isRemoteCowork();
}
//@ chunk-2c3jp4kn.js:3394-3641 placement
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
//@ chunk-2c3jp4kn.js:3641-3846 placement
function escapedSkillFields(command) {
  return {
    description: escapeXmlKeepJoiners(command.description),
    argumentHint: command.argumentHint === undefined ? undefined : escapeXmlKeepJoiners(command.argumentHint),
    whenToUse: command.whenToUse === undefined ? undefined : escapeXmlKeepJoiners(command.whenToUse),
    argumentNames: command.argumentNames.map(escapeXmlKeepJoiners),
  };
}
//@ chunk-2c3jp4kn.js:3846-3942 placement
function displaySkillFields(command) {
  return {
    ...escapedSkillFields(command),
    argumentHint: command.argumentHint === undefined ? undefined : normalizeKeepJoiners(command.argumentHint),
  };
}
export {
  isSkillFromUserSource,
  displaySkillFields,
  isRemoteOrCowork,
  isSkillShownToModel,
  emptySkillFrontmatter,
  escapedSkillFields,
};
