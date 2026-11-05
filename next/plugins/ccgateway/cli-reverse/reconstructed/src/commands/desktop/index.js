/**
 * commands/desktop/index.ts
 *
 * /desktop（别名 app）命令对象；构建期 isDesktopHandoffBuilt=false，实际恒禁用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/desktop/index.ts
 * pieces: chunk-5xgkngpb.js (3), chunk-wbfnm169.js (1)
 * attribution: placement 2, fingerprint 2
 */
import { muslTargetTriple } from "../../utils/envDynamic.js";
import { getPlatform } from "../../utils/platform.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";

//@ chunk-wbfnm169.js:765-800 fingerprint (2.1.88 match: isSupportedPlatform, 0.437)
function isSupportedPlatform() {
  return muslTargetTriple(getPlatform(), "x64");
}
//@ chunk-5xgkngpb.js:1763054-1763078 placement
/**
 * isDesktopHandoffBuilt：构建期常量 false。
 */
function isDesktopCommandForceHidden() {
  return false;
}
//@ chunk-5xgkngpb.js:1763078-1763113 placement
/**
 * isDesktopCommandEnabled：/desktop 的 isEnabled。
 */
function isDesktopCommandEnabled() {
  return isDesktopCommandForceHidden() && !isRemoteSessionAvailable();
}
//@ chunk-5xgkngpb.js:1763113-1763310 fingerprint (2.1.88 match: desktop, 0.97)
/**
 * /desktop 命令对象（local-jsx）；描述：Continue the current session in Claude Desktop；别名 ["app"]；availability ["claude-ai"]；isEnabled: lRe；isHidden: {return!lRe()}；实现 chunk-ds2d8kad.js 的 ue。
 */
var desktopCommandDefinition = {
  type: "local-jsx",
  name: "desktop",
  aliases: ["app"],
  description: "Continue the current session in Claude Desktop",
  availability: ["claude-ai"],
  isEnabled: isDesktopCommandEnabled,
  get isHidden() {
    return !isDesktopCommandEnabled();
  },
};
var desktopCommand = desktopCommandDefinition;
export { desktopCommand, isSupportedPlatform, isDesktopCommandEnabled };
