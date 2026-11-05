/**
 * utils/settings/customizationDisabled.ts
 *
 * 2.1.316 新增。判断某类定制（CLAUDE.md、skills、hooks、插件等）是否被 --bare 或环境变量禁用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xgnymg3j.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDiskless, getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { isSafeMode, isBareMode } from "../envUtils.js";
import { env } from "../env.js";

//@ chunk-xgnymg3j.js:303-1057 placement
/**
 * 定制项开关表
 */
var CUSTOMIZATION_KINDS_2 = {
  claudeMd: true,
  skills: true,
  workflows: false,
  plugins: true,
  pluginMonitors: false,
  themes: false,
  hljsLanguages: true,
  hooks: true,
  statusLine: false,
  fileSuggestion: false,
  mcpAutoDiscovered: false,
  mcpClaudeAi: false,
  mcpAgentFrontmatter: true,
  agents: true,
  outputStyles: false,
  lspServers: true,
  keybindings: false,
};
var CUSTOMIZATION_KINDS = {
  claudeMd: false,
  skills: false,
  workflows: false,
  plugins: false,
  pluginMonitors: false,
  themes: false,
  hljsLanguages: false,
  hooks: true,
  statusLine: true,
  fileSuggestion: true,
  mcpAutoDiscovered: false,
  mcpClaudeAi: false,
  mcpAgentFrontmatter: false,
  agents: false,
  outputStyles: false,
  lspServers: false,
  keybindings: false,
};
var CUSTOMIZATION_KINDS_COPY = {
  claudeMd: false,
  skills: false,
  workflows: false,
  plugins: false,
  pluginMonitors: false,
  themes: false,
  hljsLanguages: false,
  hooks: false,
  statusLine: true,
  fileSuggestion: true,
  mcpAutoDiscovered: false,
  mcpClaudeAi: false,
  mcpAgentFrontmatter: false,
  agents: false,
  outputStyles: false,
  lspServers: false,
  keybindings: true,
};
//@ chunk-xgnymg3j.js:1057-1174 placement
/**
 * 判断某类定制（CLAUDE.md、skills、hooks、插件等）是否被 --bare 或环境变量禁用。
 */
function isCustomizationDisabled(kind, options) {
  if (CUSTOMIZATION_KINDS_COPY[kind] && isDiskless()) return true;
  if (isSafeMode() && !CUSTOMIZATION_KINDS[kind]) return true;
  if (isBareMode() && !options?.explicitlyRequested) return CUSTOMIZATION_KINDS_2[kind];
  return false;
}
//@ chunk-xgnymg3j.js:1174-1289 placement
function isClaudeMdLoadingDisabled() {
  return Boolean(
    env.CLAUDE_CODE_DISABLE_CLAUDE_MDS ||
    isCustomizationDisabled("claudeMd", {
      explicitlyRequested: getAdditionalDirectoriesForClaudeMd().length > 0,
    }),
  );
}
export { isCustomizationDisabled, isClaudeMdLoadingDisabled };
