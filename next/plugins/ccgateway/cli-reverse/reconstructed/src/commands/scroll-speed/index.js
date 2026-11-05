/**
 * commands/scroll-speed/index.ts
 *
 * 2.1.316 新增：/scroll-speed 命令对象：调整全屏滚动速度
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 */
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { getAttacherCaps } from "../../bootstrap/state.js";
import { JETBRAINS_IDES } from "../../utils/env.js";
import { terminalDetector } from "../../ink/terminalColorSupport.js";

//@ chunk-5xgkngpb.js:1811007-1811058 placement (2.1.88 match: default, 1)
var stubScrollSpeedCommand = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:1811058-1811109 placement (2.1.88 match: default, 1)
var stubScrollSpeedCommand_2 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:1811109-1811323 placement
/**
 * /scroll-speed 命令对象（local-jsx）；描述：Adjust mouse wheel scroll speed；isEnabled: ()=>{if(!wd())return!1;let e=_u();return!(e?jhe.includes(e.terminal??""):DA.isJetBrainsIdeTerminal())}；实现 chunk-myhtjy4v.js 的 gr。
 */
var scrollSpeedCommandDefinition = {
  type: "local-jsx",
  name: "scroll-speed",
  description: "Adjust mouse wheel scroll speed",
  isEnabled: () => {
    if (!isFullscreenEnvEnabled()) return false;
    let attacherCaps = getAttacherCaps();
    return !(attacherCaps
      ? JETBRAINS_IDES.includes(attacherCaps.terminal ?? "")
      : terminalDetector.isJetBrainsIdeTerminal());
  },
};
var scrollSpeedCommandAlias = scrollSpeedCommandDefinition;
export { scrollSpeedCommandAlias, stubScrollSpeedCommand_2, stubScrollSpeedCommand };
