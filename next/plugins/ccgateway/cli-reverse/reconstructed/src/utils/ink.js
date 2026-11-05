/**
 * utils/ink.ts
 *
 * Ink 颜色转换：主题色名/ansi:/rgb/#hex 转 Ink 颜色，子代理默认色
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ink.ts
 * pieces: chunk-hhr6kfwg.js (1), chunk-jnsr1ny1.js (2)
 * attribution: fingerprint 1, callgraph-fingerprint 1, shared-adjacent 1
 */
import { ANSI_COLOR_NAME_SET } from "../ink/terminalColorSupport.js";
import { isAgentColorName, AGENT_COLOR_TO_THEME_COLOR } from "../tools/AgentTool/agentColorManager.js";

//@ chunk-hhr6kfwg.js:21158-21443 fingerprint (2.1.88 match: toInkColor, 1)
/**
 * 颜色值是否合法：rgb(r,g,b)、#RGB/#RRGGBB、ansi256(n)、ansi:<名字>。
 */
function isValidThemeColor(color) {
  if (typeof color !== "string") return false;
  if (/^rgb\(\s?\d{1,3},\s?\d{1,3},\s?\d{1,3}\s?\)$/.test(color)) return true;
  if (/^#[0-9a-fA-F]{6}$/.test(color) || /^#[0-9a-fA-F]{3}$/.test(color)) return true;
  if (/^ansi256\(\d{1,3}\)$/.test(color)) return true;
  if (color.startsWith("ansi:")) return ANSI_COLOR_NAME_SET.has(color.slice(5));
  return false;
}
//@ chunk-jnsr1ny1.js:559-591 callgraph-fingerprint (2.1.88 match: DEFAULT_AGENT_THEME_COLOR, 1)
var DEFAULT_AGENT_THEME_COLOR = "cyan_FOR_SUBAGENTS_ONLY";
//@ chunk-jnsr1ny1.js:591-661 shared-adjacent (2.1.88 match: toInkColor, 1)
function toInkColor(color) {
  if (!color) return DEFAULT_AGENT_THEME_COLOR;
  if (isAgentColorName(color)) return AGENT_COLOR_TO_THEME_COLOR[color];
  return `ansi:${color}`;
}
export { toInkColor, isValidThemeColor };
