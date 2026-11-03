/**
 * tools/AgentTool/agentColorManager.ts
 *
 * 子代理颜色：颜色名到主题色映射、合法性判断、按代理类型取色
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/agentColorManager.ts
 * pieces: chunk-g86zfxfd.js (5)
 * attribution: fingerprint 2, layout 2, placement 1
 */
import { getAgentColorMap } from "../../bootstrap/state.js";

/**
 * 代理颜色名到 *_FOR_SUBAGENTS_ONLY 主题色的映射及颜色名列表。
 */
//@ chunk-g86zfxfd.js:228-516 fingerprint = AGENT_COLOR_TO_THEME_COLOR (1)
var AGENT_COLOR_TO_THEME_COLOR = {
    red: "red_FOR_SUBAGENTS_ONLY",
    blue: "blue_FOR_SUBAGENTS_ONLY",
    green: "green_FOR_SUBAGENTS_ONLY",
    yellow: "yellow_FOR_SUBAGENTS_ONLY",
    purple: "purple_FOR_SUBAGENTS_ONLY",
    orange: "orange_FOR_SUBAGENTS_ONLY",
    pink: "pink_FOR_SUBAGENTS_ONLY",
    cyan: "cyan_FOR_SUBAGENTS_ONLY",
  },
  AGENT_COLOR_NAMES = Object.keys(AGENT_COLOR_TO_THEME_COLOR);
/**
 * 是否是合法代理颜色名。
 */
//@ chunk-g86zfxfd.js:516-565 layout
function isAgentColorName(e) {
  return e !== void 0 && AGENT_COLOR_NAMES.includes(e);
}
/**
 * 用户覆盖色优先，否则代理定义色。
 */
//@ chunk-g86zfxfd.js:565-627 layout
function getEffectiveAgentColor(e) {
  return e.userOverride ?? e.agentDefinitionColor;
}
/**
 * 从全局颜色表取代理类型的主题色（general-purpose 无色）。
 */
//@ chunk-g86zfxfd.js:627-735 fingerprint = getAgentColor (1)
function getAgentColor(agentType) {
  if (agentType === "general-purpose") return;
  let existingColor = getAgentColorMap().get(agentType);
  if (existingColor && AGENT_COLOR_NAMES.includes(existingColor))
    return AGENT_COLOR_TO_THEME_COLOR[existingColor];
  return;
}
//@ chunk-g86zfxfd.js:735-820 placement
function setAgentColor(agentType, color) {
  let agentColorMap = getAgentColorMap();
  if (!color) {
    agentColorMap.delete(agentType);
    return;
  }
  if (AGENT_COLOR_NAMES.includes(color)) agentColorMap.set(agentType, color);
}

export {
  getAgentColor,
  getEffectiveAgentColor,
  AGENT_COLOR_NAMES,
  AGENT_COLOR_TO_THEME_COLOR,
  setAgentColor,
  isAgentColorName,
};
