/**
 * commands/color/index.ts
 *
 * /color 命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/color/index.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-pghq0ca2.js (1)
 * attribution: fingerprint 1, placement 1
 */
import { AGENT_COLOR_NAMES } from "../../tools/AgentTool/agentColorManager.js";
import { getIsInteractive, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { isScreenReaderMode } from "../../utils/accessibility/screenReader.js";

/**
 * /color 命令对象（local-jsx）；描述：Set the prompt bar color for this session；isHidden: {return Vd()&&Zee()&&wd()&&!ym()}；实现 chunk-b5scw0qq.js 的 Xzi。
 */
//@ chunk-e6aww6q8.js:1687135-1687693 fingerprint = color (0.589)
var colorCommandDefinition = {
    type: "local-jsx",
    name: "color",
    description: "Set the prompt bar color for this session",
    immediate: !0,
    argumentHint: `[${[...AGENT_COLOR_NAMES, "default"].join("|")}]`,
    requires: { ink: !0 },
    terminalOriented: !0,
    get isHidden() {
      return getIsInteractive() && Zee() && isFullscreenEnvEnabled() && !isScreenReaderMode();
    },
    load: () => import("./chunk-b5scw0qq.js"),
  },
  colorNonInteractiveCommand = {
    type: "local",
    name: "color",
    terminalOriented: !0,
    supportsNonInteractive: !0,
    description: "Set the prompt bar color for this session",
    argumentHint: `[${[...AGENT_COLOR_NAMES, "default"].join("|")}]`,
    isEnabled: () => getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-evjaj4jh.js"),
  },
  colorCommand = colorCommandDefinition;
//@ chunk-pghq0ca2.js:191-215 placement
function Zee() {
  return !1;
}

export { Zee, colorCommand, colorNonInteractiveCommand };
