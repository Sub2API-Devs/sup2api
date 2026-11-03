/**
 * commands/desktop/index.ts
 *
 * /desktop（别名 app）命令对象；构建期 isDesktopHandoffBuilt=false，实际恒禁用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/desktop/index.ts
 * pieces: chunk-9d1pf3s4.js (1), chunk-e6aww6q8.js (3)
 * attribution: fingerprint 2, placement 2
 */
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { muslTargetTriple } from "../../utils/envDynamic.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-e6aww6q8.js:1687845-1687869 placement
/**
 * isDesktopHandoffBuilt：构建期常量 false。
 */
function isDesktopCommandForceHidden() {
  return false;
}
//@ chunk-e6aww6q8.js:1687869-1687904 placement
/**
 * isDesktopCommandEnabled：/desktop 的 isEnabled。
 */
function isDesktopCommandEnabled() {
  return isDesktopCommandForceHidden() && !isRemoteSessionAvailable();
}
//@ chunk-e6aww6q8.js:1687904-1688101 fingerprint = desktop (0.971)
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
//@ chunk-9d1pf3s4.js:765-800 fingerprint = isSupportedPlatform (0.437)
function isSupportedPlatform() {
  return muslTargetTriple(getPlatform(), "x64");
}
export { isDesktopCommandEnabled, desktopCommand, isSupportedPlatform };
