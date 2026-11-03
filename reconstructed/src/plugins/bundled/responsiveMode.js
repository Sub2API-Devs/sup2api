/**
 * plugins/bundled/responsiveMode.ts
 *
 * 2.1.316 新增：内置插件 cc-plugin-responsive-mode（先用一句话回复再思考/用工具，tengu_quiet_ember）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7008vnkm.js (5)
 * attribution: placement 5
 */
import { envSessionKind } from "../../utils/sessionShape.js";
import { isChatOrTeams } from "../../utils/entrypointKinds.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { promptMediaSources } from "../../utils/attachmentMedia.js";
import { isBundledModLive } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-7008vnkm.js:411-476 placement
function rGn(e) {
  let trimmed = e.trim();
  return trimmed !== "" && !trimmed.startsWith("/");
}
//@ chunk-7008vnkm.js:476-491 placement
var sAo = () => !1;
//@ chunk-7008vnkm.js:491-547 placement
var iAo = () =>
  envSessionKind() && !isChatOrTeams() && getFeatureValue_SESSION_PINNED("tengu_quiet_ember", sAo());
//@ chunk-7008vnkm.js:547-739 placement
var RESPONSIVE_MODE_PLUGIN = {
  name: "cc-plugin-responsive-mode",
  description:
    "Responsive mode: Claude replies to you in a sentence before thinking or using tools, on every prompt",
  isAvailable: iAo,
  defaultEnabled: !1,
};
//@ chunk-7008vnkm.js:739-904 placement
function shouldUseResponsiveMode({
  text: text,
  pastedContents: pastedContents,
  isSentByPerson: isSentByPerson,
  wait: wait,
}) {
  if (!isSentByPerson || wait || !rGn(text)) return !1;
  try {
    return (
      promptMediaSources(text, pastedContents).length === 0 && isBundledModLive(RESPONSIVE_MODE_PLUGIN.name)
    );
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}

export { shouldUseResponsiveMode, RESPONSIVE_MODE_PLUGIN, iAo, sAo, rGn };
