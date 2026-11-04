/**
 * commands/chrome/index.ts
 *
 * /chrome 命令对象（仅 claude.ai，需 allow_claude_browser_extension 策略）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/chrome/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isClaudeInChromeAllowed } from "../../utils/claudeInChrome/setup.js";

//@ chunk-e6aww6q8.js:2034576-2034776 fingerprint (2.1.88 match: command, 0.668)
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
