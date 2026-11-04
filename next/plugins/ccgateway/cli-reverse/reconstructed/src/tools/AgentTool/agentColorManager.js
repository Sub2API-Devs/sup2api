/**
 * tools/AgentTool/agentColorManager.ts
 *
 * 子代理颜色：颜色名到主题色映射、合法性判断、按代理类型取色
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/agentColorManager.ts
 * pieces: chunk-g86zfxfd.js (5), chunk-gfcxsygg.js (2)
 * attribution: fingerprint 2, layout 2, placement 3
 */
import { getAgentColorMap } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g86zfxfd.js:228-516 fingerprint = AGENT_COLOR_TO_THEME_COLOR (1)
/**
 * 代理颜色名到 *_FOR_SUBAGENTS_ONLY 主题色的映射及颜色名列表。
 */
var AGENT_COLOR_TO_THEME_COLOR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var AGENT_COLOR_NAMES;
deferInit("chunk-g86zfxfd.js:228", () => {
  AGENT_COLOR_TO_THEME_COLOR = {
    red: "red_FOR_SUBAGENTS_ONLY",
    blue: "blue_FOR_SUBAGENTS_ONLY",
    green: "green_FOR_SUBAGENTS_ONLY",
    yellow: "yellow_FOR_SUBAGENTS_ONLY",
    purple: "purple_FOR_SUBAGENTS_ONLY",
    orange: "orange_FOR_SUBAGENTS_ONLY",
    pink: "pink_FOR_SUBAGENTS_ONLY",
    cyan: "cyan_FOR_SUBAGENTS_ONLY",
  };
  AGENT_COLOR_NAMES = Object.keys(AGENT_COLOR_TO_THEME_COLOR);
});
//@ chunk-g86zfxfd.js:516-565 layout
/**
 * 是否是合法代理颜色名。
 */
function isAgentColorName(color) {
  return color !== undefined && AGENT_COLOR_NAMES.includes(color);
}
//@ chunk-g86zfxfd.js:565-627 layout
/**
 * 用户覆盖色优先，否则代理定义色。
 */
function getEffectiveAgentColor(colorInfo) {
  return colorInfo.userOverride ?? colorInfo.agentDefinitionColor;
}
//@ chunk-g86zfxfd.js:627-735 fingerprint = getAgentColor (1)
/**
 * 从全局颜色表取代理类型的主题色（general-purpose 无色）。
 */
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
//@ chunk-gfcxsygg.js:1251-1295 placement
/**
 * 导出函数 `NO_OP_COLOR_ASSIGNER`。
 */
var NO_OP_COLOR_ASSIGNER = {
  assign: () => AGENT_COLOR_NAMES[0],
  get: () => {
    return;
  },
};
//@ chunk-gfcxsygg.js:1295-1586 placement
/**
 * 按出现顺序为键分配代理颜色（循环使用颜色表），同一键始终返回同一颜色；get 只查不分配。
 */
function createColorAssigner(channel) {
  return {
    assign(slug) {
      let state = channel.get();
      let existing = state.assignments.get(slug);
      if (existing) return existing;
      let name = AGENT_COLOR_NAMES[state.index % AGENT_COLOR_NAMES.length];
      channel.set((state) => {
        if (state.assignments.has(slug)) return state;
        let assignments = new Map(state.assignments);
        assignments.set(slug, name);
        return {
          assignments,
          index: state.index + 1,
        };
      });
      return name;
    },
    get(slug) {
      return channel.get().assignments.get(slug);
    },
  };
}
export {
  getAgentColor,
  getEffectiveAgentColor,
  AGENT_COLOR_NAMES,
  AGENT_COLOR_TO_THEME_COLOR,
  setAgentColor,
  isAgentColorName,
  createColorAssigner,
  NO_OP_COLOR_ASSIGNER,
};
