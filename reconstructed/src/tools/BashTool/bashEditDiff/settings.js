/**
 * tools/BashTool/bashEditDiff/settings.ts
 *
 * 2.1.316 新增：bashEditDiff 开关与设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { env } from "../../../utils/env.js";
import {
  getSecuritySensitiveSetting,
  getSettingsForSourceTightenOnly,
  getInitialSettings_2,
} from "../../../utils/settings/settings.js";
import { isThriftySonicEnabled, isModelCapabilityEnabled } from "../../../utils/model/promptBundles.js";
import { getMainLoopModel } from "../../../utils/model/model.js";
import { getCanonicalName } from "../../../utils/model/canonicalModelName.js";
import { mn } from "../../../utils/remoteEnvironment.js";
import { isOnClaudeCodeSessionSurface } from "../../../utils/teammate.js";
import { getIsNonInteractiveSession } from "../../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { $ie } from "./gitEnv.js";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";

/**
 * 判断是否为 Bash 命令显示编辑 diff：环境变量 CLAUDE_CODE_BASH_EDIT_DIFF 优先，其次安全设置/用户设置 bashEditDiffEnabled，未设置时仅在 auto/bypass 模式按模型能力开启。
 */
//@ chunk-e6aww6q8.js:4772679-4773047 placement
function isBashEditDiffEnabled(e) {
  if (env.CLAUDE_CODE_BASH_EDIT_DIFF !== void 0) return env.CLAUDE_CODE_BASH_EDIT_DIFF;
  let n =
    getSecuritySensitiveSetting("bashEditDiffEnabled")[0] ??
    (getSettingsForSourceTightenOnly("userSettings")?.bashEditDiffEnabled === !1 ? !1 : void 0);
  if (n === !1 || getInitialSettings_2().bashEditDiffEnabled === !1) return !1;
  if (n === !0) return !0;
  if (e !== "auto" && e !== "bypassPermissions") return !1;
  if (isThriftySonicEnabled()) return !0;
  let r = getMainLoopModel();
  return isModelCapabilityEnabled("bash_edit_diff", getCanonicalName(r), r);
}
/**
 * 判断 Bash 编辑差异功能为何跳过：未开启（非无头/开关关）、已显式开启、Claude Code 客户端自己发的提示、读取方未知或监视运行中。
 */
//@ chunk-e6aww6q8.js:4773047-4773355 placement
function getEditDiffSkipReason(e, n, r) {
  if (
    !mn() ||
    isOnClaudeCodeSessionSurface() ||
    !getIsNonInteractiveSession() ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_badger", !1)
  )
    return "ungated";
  if (env.CLAUDE_CODE_BASH_EDIT_DIFF === !0 || getSecuritySensitiveSetting("bashEditDiffEnabled")[0] === !0)
    return "turned_on";
  if (e.get($ie).ownClientSentPrompt) return "claude_code_client";
  return (n === void 0 ? "readers_unknown" : n()) ?? (r ? "watch_running" : void 0);
}
/**
 * 判断是否跳过 Bash 编辑差异，并按原因上报一次遥测。
 */
//@ chunk-e6aww6q8.js:4773355-4773548 placement
function shouldSkipEditDiff(e, n, r) {
  let s = getEditDiffSkipReason(e, n, r),
    { countedReasons: countedReasons } = e.get($ie);
  if (s === void 0) logFeatureOk("bash_edit_diff_skip");
  else if (s !== "ungated" && !countedReasons.has(s))
    (countedReasons.add(s), logFeatureSad("bash_edit_diff_skip", s));
  return s !== void 0;
}

export { isBashEditDiffEnabled, shouldSkipEditDiff };
