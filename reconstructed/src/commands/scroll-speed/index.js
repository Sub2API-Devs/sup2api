/**
 * commands/scroll-speed/index.ts
 *
 * 2.1.316 新增：/scroll-speed 命令对象：调整全屏滚动速度
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { getAttacherCaps } from "../../bootstrap/state.js";
import { JETBRAINS_IDES } from "../../utils/env.js";
import { terminalDetector } from "../../ink/terminalColorSupport.js";

//@ chunk-e6aww6q8.js:1735556-1735607 placement = default (1)
var Men = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:1735607-1735658 placement = default (1)
var Oen = { isEnabled: () => !1, isHidden: !0, name: "stub" };
/**
 * /scroll-speed 命令对象（local-jsx）；描述：Adjust mouse wheel scroll speed；isEnabled: ()=>{if(!wd())return!1;let e=_u();return!(e?jhe.includes(e.terminal??""):DA.isJetBrainsIdeTerminal())}；实现 chunk-myhtjy4v.js 的 gr。
 */
//@ chunk-e6aww6q8.js:1735658-1735872 placement
var scrollSpeedCommandDefinition = {
    type: "local-jsx",
    name: "scroll-speed",
    description: "Adjust mouse wheel scroll speed",
    isEnabled: () => {
      if (!isFullscreenEnvEnabled()) return !1;
      let e = getAttacherCaps();
      return !(e ? JETBRAINS_IDES.includes(e.terminal ?? "") : terminalDetector.isJetBrainsIdeTerminal());
    },
  },
  scrollSpeedCommand = scrollSpeedCommandDefinition;

export { Oen, Men, scrollSpeedCommand };
