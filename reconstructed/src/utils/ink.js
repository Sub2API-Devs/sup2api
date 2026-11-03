/**
 * utils/ink.ts
 *
 * Ink 颜色转换：主题色名/ansi:/rgb/#hex 转 Ink 颜色，子代理默认色
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ink.ts
 * pieces: chunk-32akb2g2.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 1
 */
import { isAgentColorName, AGENT_COLOR_TO_THEME_COLOR } from "../tools/AgentTool/agentColorManager.js";

//@ chunk-32akb2g2.js:559-591 callgraph-fingerprint = DEFAULT_AGENT_THEME_COLOR (1)
var DEFAULT_AGENT_THEME_COLOR = "cyan_FOR_SUBAGENTS_ONLY";
//@ chunk-32akb2g2.js:591-661 fingerprint = toInkColor (1)
function toInkColor(color) {
  if (!color) return DEFAULT_AGENT_THEME_COLOR;
  if (isAgentColorName(color)) return AGENT_COLOR_TO_THEME_COLOR[color];
  return `ansi:${color}`;
}
export { toInkColor };
