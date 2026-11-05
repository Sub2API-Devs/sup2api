/**
 * skills/bundled/claudeInChrome.ts
 *
 * claude-in-chrome 内置 skill 注册（Chrome 扩展可用时启用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/claudeInChrome.ts
 * pieces: chunk-ne2890fx.js (1), chunk-y8m17a3e.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { chromeToolSuffix } from "../../utils/claudeInChrome/chromeToolNames.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { isClaudeInChromeWiredThisSession } from "../../utils/claudeInChrome/setup.js";
import { shouldOfferChromeInstallUpsell } from "../../utils/claudeInChrome/installUpsell.js";
import { chromeSkillGuidance } from "../../utils/claudeInChrome/skillAvailability.js";

//@ chunk-y8m17a3e.js:656-729 fingerprint (2.1.88 match: CLAUDE_IN_CHROME_MCP_TOOLS, 1)
/**
 * 判断工具名是否属于 Claude in Chrome MCP 工具集。
 */
function CLAUDE_IN_CHROME_MCP_TOOLS(tool) {
  let suffixedTool = chromeToolSuffix(tool);
  return suffixedTool === null ? tool : "mcp__claude-in-chrome__" + suffixedTool;
}
//@ chunk-ne2890fx.js:48367-49226 fingerprint (2.1.88 match: registerClaudeInChromeSkill, 0.867)
/**
 * 注册 claude-in-chrome 内置 skill；disabled（CLAUDE_CODE_DISABLE_CFC_PROMPT 等）为假且 Chrome 扩展可用时启用。
 */
function registerClaudeInChromeSkill({ disabled = false } = {}) {
  registerBundledSkill({
    name: "claude-in-chrome",
    menuDescription: "Let Claude browse and interact with pages in your Chrome",
    description:
      "Automates your Chrome browser to interact with web pages - clicking elements, filling forms, capturing screenshots, reading console logs, and navigating sites. Opens pages in new tabs within your existing Chrome session. Requires site-level permissions before executing (configured in the extension).",
    whenToUse:
      "When the user wants to interact with web pages, automate browser tasks, capture screenshots, read console logs, or perform any browser-based actions. Always invoke BEFORE attempting to use any mcp__claude-in-chrome__* tools.",
    allowedTools: [],
    userInvocable: true,
    isEnabled: () => !disabled && (isClaudeInChromeWiredThisSession() || shouldOfferChromeInstallUpsell()),
    async getPromptForCommand(args, context) {
      let prompt = await chromeSkillGuidance(context);
      if (args)
        prompt += `

## Task

${args}`;
      return [
        {
          type: "text",
          text: prompt,
        },
      ];
    },
  });
}
export { CLAUDE_IN_CHROME_MCP_TOOLS, registerClaudeInChromeSkill };
