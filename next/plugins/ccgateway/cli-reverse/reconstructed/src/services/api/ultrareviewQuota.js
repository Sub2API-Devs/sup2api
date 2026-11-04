/**
 * services/api/ultrareviewQuota.ts
 *
 * Ultrareview 配额查询（可用 CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE 注入测试数据）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/ultrareviewQuota.ts
 * pieces: chunk-twvgrhqz.js (18)
 * attribution: fingerprint 1, placement 17
 */
import { env } from "../../utils/env.js";
import { checkOverageGate_2 } from "../../commands/review/reviewRemote.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { apiClient } from "../routines/routinesApi.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isUltrareviewWithBridge } from "../../commands/review/ultrareviewPreconditions.js";
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { CODE_REVIEW } from "../../skills/bundled/bundledSkillNames.js";
import { tipLifetimeShownCount, recordTipShown } from "../tips/tipIds.js";
import { getSessionsSinceTipShown } from "../tips/tipHistory.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-twvgrhqz.js:809-1486 fingerprint (2.1.88 match: fetchUltrareviewQuota, 0.33)
/**
 * 拉取 ultrareview 配额；fixture 环境变量优先。
 */
async function fetchUltrareviewQuota(credentials) {
  let CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE = env.CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE;
  if (CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE)
    try {
      let parsed = checkOverageGate_2().safeParse(jsonParse(CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE));
      return parsed.success ? parsed.data : null;
    } catch (error) {
      logForDebugging(`fetchUltrareviewQuota fixture parse failed: ${error}`);
      return null;
    }
  try {
    let response = await apiClient.get("/v1/ultrareview/quota", {
      auth: "teleport-org",
      timeout: 3000,
      credentials,
    });
    if (!response.ok) {
      logFeatureSad("api_ultrareview_quota", "request_failed");
      return null;
    }
    let parsed = checkOverageGate_2().safeParse(response.data);
    if (!parsed.success) {
      logForDebugging(`fetchUltrareviewQuota schema mismatch: ${parsed.error.message}`);
      logFeatureSad("api_ultrareview_quota", "schema_mismatch");
      return null;
    }
    logFeatureOk("api_ultrareview_quota");
    return parsed.data;
  } catch (error) {
    logForDebugging(`fetchUltrareviewQuota failed: ${error}`);
    logFeatureSad("api_ultrareview_quota", "request_failed");
    return null;
  }
}
//@ chunk-twvgrhqz.js:1486-1520 placement
class UltrareviewQuotaState {
  quota = undefined;
  fetch = undefined;
}
//@ chunk-twvgrhqz.js:1520-1543 placement
var ultrareviewQuotaSlot; // deferred: uses UltrareviewQuotaState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-twvgrhqz.js:1520", () => {
  ultrareviewQuotaSlot = new HostScoped(() => new UltrareviewQuotaState());
});
//@ chunk-twvgrhqz.js:1543-1578 placement
function ultrareviewQuotaState() {
  return ultrareviewQuotaSlot.of(getRootSession().host);
}
//@ chunk-twvgrhqz.js:1578-1647 placement
/**
 * 导出函数 `refreshUltrareviewQuota`：参数 e。
 */
async function refreshUltrareviewQuota(credentials) {
  let state = ultrareviewQuotaState();
  state.fetch ??= fetchUltrareviewQuota(credentials);
  state.quota = await state.fetch;
}
//@ chunk-twvgrhqz.js:1647-1727 placement
/**
 * 导出函数 `ultrareviewQuota`：参数 e，返回 (uPo(e), null); return r.quota。
 */
function ultrareviewQuota(credentials) {
  let state = ultrareviewQuotaState();
  if (state.quota === undefined) {
    refreshUltrareviewQuota(credentials);
    return null;
  }
  return state.quota;
}
//@ chunk-twvgrhqz.js:1727-1763 placement
var TENGU_ULTRAREVIEW_AWARENESS = "tengu_ultrareview_awareness";
//@ chunk-twvgrhqz.js:1763-1797 placement
function ultrareviewAwarenessFlags() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ULTRAREVIEW_AWARENESS, null) ?? {};
}
//@ chunk-twvgrhqz.js:1797-1891 placement
/**
 * 导出函数 `isUltrareviewSurfaceOn`：参数 e，返回 !1; if (!isPolicyAllowed("allow_remote_sessions")) return !1; return U()[e] === !0。
 */
function isUltrareviewSurfaceOn(surface) {
  if (!isUltrareviewWithBridge()) return false;
  if (!isPolicyAllowed("allow_remote_sessions")) return false;
  return ultrareviewAwarenessFlags()[surface] === true;
}
//@ chunk-twvgrhqz.js:1891-1941 placement
/**
 * 导出函数 `hasRunUltrareview`：返回 getGlobalConfig().hasRunUltrareview === !0。
 */
function hasRunUltrareview() {
  return getGlobalConfig().hasRunUltrareview === true;
}
//@ chunk-twvgrhqz.js:1941-2018 placement
/**
 * 导出函数 `markUltrareviewRun`：参数 e。
 */
function markUltrareviewRun(storageV5) {
  saveGlobalConfig(
    (config) =>
      config.hasRunUltrareview
        ? config
        : {
            ...config,
            hasRunUltrareview: true,
          },
    storageV5,
  );
}
//@ chunk-twvgrhqz.js:2018-2086 placement
function logAwarenessShown(surface) {
  logEvent("tengu_ultrareview_awareness_shown", {
    surface: fromEnum(surface),
  });
}
//@ chunk-twvgrhqz.js:2086-2153 placement
/**
 * 导出函数 `freeReviewsBadge`：参数 e，返回 `${e} free ${e === 1 ? "review" : "reviews"} left`。
 */
function freeReviewsBadge(reviewsRemaining) {
  return `${reviewsRemaining} free ${reviewsRemaining === 1 ? "review" : "reviews"} left`;
}
//@ chunk-twvgrhqz.js:2153-2400 placement
/**
 * 斜杠菜单中 ultrareview 与 code review 的免费次数徽标文字。
 */
function ultrareviewMenuBadge(commandName) {
  if (commandName !== "ultrareview" && commandName !== CODE_REVIEW) return "";
  if (!isUltrareviewSurfaceOn("slash_menu")) return "";
  let quota = ultrareviewQuota();
  if (quota === null || quota.reviews_remaining <= 0) return "";
  let reviewsRemaining = quota.reviews_remaining;
  return commandName === "ultrareview"
    ? `${reviewsRemaining} free left \xB7 `
    : `${reviewsRemaining} free /ultrareview \xB7 `;
}
//@ chunk-twvgrhqz.js:2400-2466 placement
/**
 * ultrareview 提示的两种 key（prose-pointer、post-commit）与同一提示最多显示 5 次。
 */
var ULTRAREVIEW_PROSE_POINTER = "ultrareview-prose-pointer";
var ULTRAREVIEW_POST_COMMIT = "ultrareview-post-commit";
var MAX_TIP_SHOWS = 5;
//@ chunk-twvgrhqz.js:2466-2696 placement
function ultrareviewTip(surface, tipKey, format, storage, credentials) {
  if (!isUltrareviewSurfaceOn(surface)) return null;
  if (hasRunUltrareview()) return null;
  if (tipLifetimeShownCount(tipKey) >= MAX_TIP_SHOWS) return null;
  if (getSessionsSinceTipShown(tipKey) === 0) return null;
  recordTipShown(tipKey, storage);
  logAwarenessShown(surface);
  let quota = ultrareviewQuota(credentials);
  let suffix =
    quota !== null && quota.reviews_remaining > 0
      ? ` \u2014 ${freeReviewsBadge(quota.reviews_remaining)}`
      : "";
  return format(suffix);
}
//@ chunk-twvgrhqz.js:2696-2823 placement
/**
 * 生成 /review 提示末尾推荐 /ultrareview 的提示文字（按展示规则与次数）。
 */
function ultrareviewProseTip(storage, credentials) {
  return ultrareviewTip(
    "prose_pointer",
    ULTRAREVIEW_PROSE_POINTER,
    (suffix) => `Tip: For a deeper cloud-based review, try /ultrareview next time${suffix}.`,
    storage,
    credentials,
  );
}
//@ chunk-twvgrhqz.js:2823-2976 placement
/**
 * 生成提交后推荐运行 /ultrareview 的提示文字。
 */
function ultrareviewPostCommitTip(storage) {
  return ultrareviewTip(
    "post_commit",
    ULTRAREVIEW_POST_COMMIT,
    (suffix) =>
      `Tip: Run /ultrareview before you push to catch bugs with a cloud-based multi-agent review${suffix}.`,
    storage,
    undefined,
  );
}
export {
  ultrareviewMenuBadge,
  ultrareviewQuota,
  freeReviewsBadge,
  isUltrareviewSurfaceOn,
  hasRunUltrareview,
  refreshUltrareviewQuota,
  ultrareviewPostCommitTip,
  ultrareviewProseTip,
  markUltrareviewRun,
};
