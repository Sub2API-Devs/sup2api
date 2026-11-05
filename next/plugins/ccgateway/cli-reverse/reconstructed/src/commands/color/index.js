/**
 * commands/color/index.ts
 *
 * /color 命令
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/color/index.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-d8ygv17y.js (1)
 * attribution: fingerprint 1, placement 1
 */
import { AGENT_COLOR_NAMES } from "../../tools/AgentTool/agentColorManager.js";
import { getIsInteractive, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { isScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-d8ygv17y.js:191-215 placement
/**
 * 恒返回 false：/color 命令在本构建里不额外隐藏。
 */
function isColorCommandForceHidden() {
  return false;
}
//@ chunk-5xgkngpb.js:1762344-1762902 fingerprint (2.1.88 match: color, 0.589)
/**
 * /color 命令对象（local-jsx）；描述：Set the prompt bar color for this session；isHidden: {return Vd()&&Zee()&&wd()&&!ym()}；实现 chunk-b5scw0qq.js 的 Xzi。
 */
var colorCommandDefinition; // deferred: uses AGENT_COLOR_TO_THEME_COLOR (../../tools/AgentTool/agentColorManager.js) of its import cycle while loading; runs once the cycle is complete
var colorNonInteractiveCommand;
var colorCommand;
deferInit("chunk-5xgkngpb.js:1762344", () => {
  colorCommandDefinition = {
    type: "local-jsx",
    name: "color",
    description: "Set the prompt bar color for this session",
    immediate: true,
    argumentHint: `[${[...AGENT_COLOR_NAMES, "default"].join("|")}]`,
    requires: {
      ink: true,
    },
    terminalOriented: true,
    get isHidden() {
      return (
        getIsInteractive() && isColorCommandForceHidden() && isFullscreenEnvEnabled() && !isScreenReaderMode()
      );
    },
    load: () => import("./setColor.js"),
  };
  colorNonInteractiveCommand = {
    type: "local",
    name: "color",
    terminalOriented: true,
    supportsNonInteractive: true,
    description: "Set the prompt bar color for this session",
    argumentHint: `[${[...AGENT_COLOR_NAMES, "default"].join("|")}]`,
    isEnabled: () => getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./call.lazy.js"),
  };
  colorCommand = colorCommandDefinition;
});
export { colorCommand, colorNonInteractiveCommand, isColorCommandForceHidden };
