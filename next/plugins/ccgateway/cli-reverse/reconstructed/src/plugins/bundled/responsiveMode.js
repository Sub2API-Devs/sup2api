/**
 * plugins/bundled/responsiveMode.ts
 *
 * 2.1.316 新增：内置插件 cc-plugin-responsive-mode（先用一句话回复再思考/用工具，tengu_quiet_ember）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e2ve218f.js (5)
 * attribution: placement 5
 */
import { envSessionKind } from "../../utils/sessionShape.js";
import { isChatOrTeams } from "../../utils/entrypointKinds.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { promptMediaSources } from "../../utils/attachmentMedia.js";
import { isBundledModLive } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-e2ve218f.js:411-476 placement
/**
 * 去空白后非空且不以 / 开头
 */
function isRealUserPrompt(text) {
  let trimmed = text.trim();
  return trimmed !== "" && !trimmed.startsWith("/");
}
//@ chunk-e2ve218f.js:476-491 placement
/**
 * 默认关闭
 */
var responsiveModeDefault = () => false;
//@ chunk-e2ve218f.js:491-547 placement
/**
 * tengu_quiet_ember 开关
 */
var isResponsiveModeOn = () =>
  envSessionKind() &&
  !isChatOrTeams() &&
  getFeatureValue_SESSION_PINNED("tengu_quiet_ember", responsiveModeDefault());
//@ chunk-e2ve218f.js:547-739 placement
var RESPONSIVE_MODE_PLUGIN = {
  name: "cc-plugin-responsive-mode",
  description:
    "Responsive mode: Claude replies to you in a sentence before thinking or using tools, on every prompt",
  isAvailable: isResponsiveModeOn,
  defaultEnabled: false,
};
//@ chunk-e2ve218f.js:739-904 placement
function shouldUseResponsiveMode({ text, pastedContents, isSentByPerson, wait }) {
  if (!isSentByPerson || wait || !isRealUserPrompt(text)) return false;
  try {
    return (
      promptMediaSources(text, pastedContents).length === 0 && isBundledModLive(RESPONSIVE_MODE_PLUGIN.name)
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
export {
  shouldUseResponsiveMode,
  RESPONSIVE_MODE_PLUGIN,
  isResponsiveModeOn,
  responsiveModeDefault,
  isRealUserPrompt,
};
