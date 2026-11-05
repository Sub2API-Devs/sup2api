/**
 * commands/chrome/index.ts
 *
 * /chrome 命令对象（仅 claude.ai，需 allow_claude_browser_extension 策略）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/chrome/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isClaudeInChromeAllowed } from "../../utils/claudeInChrome/setup.js";

//@ chunk-5xgkngpb.js:2090393-2090593 fingerprint (2.1.88 match: command, 0.667)
/**
 * /chrome 命令对象（local-jsx）；描述：Open Claude in Chrome settings；availability ["claude-ai"]；isEnabled: ()=>!_e()&&ox()；实现 chunk-1ztfztfw.js 的 Uo。
 */
var chromeCommandDefinition = {
  name: "chrome",
  description: "Open Claude in Chrome settings",
  availability: ["claude-ai"],
  isEnabled: () => !getIsNonInteractiveSession() && isClaudeInChromeAllowed(),
  policyGate: {
    policy: "allow_claude_browser_extension",
  },
  type: "local-jsx",
};
var chromeCommand = chromeCommandDefinition;
export { chromeCommand };
