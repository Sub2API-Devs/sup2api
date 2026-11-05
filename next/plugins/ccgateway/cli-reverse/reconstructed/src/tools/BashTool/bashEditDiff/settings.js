/**
 * tools/BashTool/bashEditDiff/settings.ts
 *
 * 2.1.316 新增：bashEditDiff 开关与设置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../../utils/env.js";
import {
  getSecuritySensitiveSetting,
  getSettingsForSourceTightenOnly,
  getInitialSettings,
} from "../../../utils/settings/settings.js";
import { isThriftySonicEnabled, isModelCapabilityEnabled } from "../../../utils/model/promptBundles.js";
import { getMainLoopModel } from "../../../utils/model/model.js";
import { getCanonicalName } from "../../../utils/model/canonicalModelName.js";
import { isRemoteManagedEnvironment } from "../../../utils/remoteEnvironment.js";
import { isOnClaudeCodeSessionSurface } from "../../../utils/teammate.js";
import { getIsNonInteractiveSession } from "../../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { OwnClientPromptState } from "./gitEnv.js";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";

//@ chunk-5xgkngpb.js:4905004-4905372 placement
/**
 * 判断是否为 Bash 命令显示编辑 diff：环境变量 CLAUDE_CODE_BASH_EDIT_DIFF 优先，其次安全设置/用户设置 bashEditDiffEnabled，未设置时仅在 auto/bypass 模式按模型能力开启。
 */
function isBashEditDiffEnabled(mode) {
  if (env.CLAUDE_CODE_BASH_EDIT_DIFF !== undefined) return env.CLAUDE_CODE_BASH_EDIT_DIFF;
  let enabledSetting =
    getSecuritySensitiveSetting("bashEditDiffEnabled")[0] ??
    (getSettingsForSourceTightenOnly("userSettings")?.bashEditDiffEnabled === false ? false : undefined);
  if (enabledSetting === false || getInitialSettings().bashEditDiffEnabled === false) return false;
  if (enabledSetting === true) return true;
  if (mode !== "auto" && mode !== "bypassPermissions") return false;
  if (isThriftySonicEnabled()) return true;
  let mainLoopModel = getMainLoopModel();
  return isModelCapabilityEnabled("bash_edit_diff", getCanonicalName(mainLoopModel), mainLoopModel);
}
//@ chunk-5xgkngpb.js:4905372-4905695 placement
/**
 * 判断 Bash 编辑差异功能为何跳过：未开启（非无头/开关关）、已显式开启、Claude Code 客户端自己发的提示、读取方未知或监视运行中。
 */
function getEditDiffSkipReason(toolState, outsideResultReader, isWatchRunning) {
  if (
    !isRemoteManagedEnvironment() ||
    isOnClaudeCodeSessionSurface() ||
    !getIsNonInteractiveSession() ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_badger", false)
  )
    return "ungated";
  if (
    env.CLAUDE_CODE_BASH_EDIT_DIFF === true ||
    getSecuritySensitiveSetting("bashEditDiffEnabled")[0] === true
  )
    return "turned_on";
  if (toolState.get(OwnClientPromptState).ownClientSentPrompt) return "claude_code_client";
  return (
    (outsideResultReader === undefined ? "readers_unknown" : outsideResultReader("bash_edit_diff")) ??
    (isWatchRunning ? "watch_running" : undefined)
  );
}
//@ chunk-5xgkngpb.js:4905695-4905888 placement
/**
 * 判断是否跳过 Bash 编辑差异，并按原因上报一次遥测。
 */
function shouldSkipEditDiff(toolState, outsideResultReader, isWatchRunning) {
  let editDiffSkipReason = getEditDiffSkipReason(toolState, outsideResultReader, isWatchRunning);
  let { countedReasons } = toolState.get(OwnClientPromptState);
  if (editDiffSkipReason === undefined) logFeatureOk("bash_edit_diff_skip");
  else if (editDiffSkipReason !== "ungated" && !countedReasons.has(editDiffSkipReason)) {
    countedReasons.add(editDiffSkipReason);
    logFeatureSad("bash_edit_diff_skip", editDiffSkipReason);
  }
  return editDiffSkipReason !== undefined;
}
export { isBashEditDiffEnabled, shouldSkipEditDiff };
