/**
 * utils/settings/customizationDisabled.ts
 *
 * 2.1.316 新增。判断某类定制（CLAUDE.md、skills、hooks、插件等）是否被 --bare 或环境变量禁用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2xdyp70v.js (3)
 * attribution: placement 3
 */
import { isDiskless, getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { isSafeMode, isBareMode } from "../envUtils.js";
import { env } from "../env.js";

/**
 * 定制项开关表
 */
//@ chunk-2xdyp70v.js:303-1057 placement
var CUSTOMIZATION_KINDS = {
    claudeMd: !0,
    skills: !0,
    workflows: !1,
    plugins: !0,
    pluginMonitors: !1,
    themes: !1,
    hljsLanguages: !0,
    hooks: !0,
    statusLine: !1,
    fileSuggestion: !1,
    mcpAutoDiscovered: !1,
    mcpClaudeAi: !1,
    mcpAgentFrontmatter: !0,
    agents: !0,
    outputStyles: !1,
    lspServers: !0,
    keybindings: !1,
  },
  l = {
    claudeMd: !1,
    skills: !1,
    workflows: !1,
    plugins: !1,
    pluginMonitors: !1,
    themes: !1,
    hljsLanguages: !1,
    hooks: !0,
    statusLine: !0,
    fileSuggestion: !0,
    mcpAutoDiscovered: !1,
    mcpClaudeAi: !1,
    mcpAgentFrontmatter: !1,
    agents: !1,
    outputStyles: !1,
    lspServers: !1,
    keybindings: !1,
  },
  a = {
    claudeMd: !1,
    skills: !1,
    workflows: !1,
    plugins: !1,
    pluginMonitors: !1,
    themes: !1,
    hljsLanguages: !1,
    hooks: !1,
    statusLine: !0,
    fileSuggestion: !0,
    mcpAutoDiscovered: !1,
    mcpClaudeAi: !1,
    mcpAgentFrontmatter: !1,
    agents: !1,
    outputStyles: !1,
    lspServers: !1,
    keybindings: !0,
  };
/**
 * 判断某类定制（CLAUDE.md、skills、hooks、插件等）是否被 --bare 或环境变量禁用。
 */
//@ chunk-2xdyp70v.js:1057-1174 placement
function isCustomizationDisabled(e, s) {
  if (a[e] && isDiskless()) return !0;
  if (isSafeMode() && !l[e]) return !0;
  if (isBareMode() && !s?.explicitlyRequested) return CUSTOMIZATION_KINDS[e];
  return !1;
}
//@ chunk-2xdyp70v.js:1174-1289 placement
function isClaudeMdLoadingDisabled() {
  return Boolean(
    env.CLAUDE_CODE_DISABLE_CLAUDE_MDS ||
    isCustomizationDisabled("claudeMd", {
      explicitlyRequested: getAdditionalDirectoriesForClaudeMd().length > 0,
    }),
  );
}

export { isClaudeMdLoadingDisabled, isCustomizationDisabled };
