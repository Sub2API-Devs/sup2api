/**
 * utils/messages/ccrSessionNotice.ts
 *
 * 2.1.316 新增：云会话提示消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { ge } from "../identity.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_VELVETY_RIPPLE } from "./apiNormalization.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isDiskless } from "../../bootstrap/state.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

/**
 * CCR 会话提示渲染打点的去重集合（按键、按 uuid）、进程启动时间与模块加载时间。
 */
//@ chunk-e6aww6q8.js:148502-148620 placement
var reportedNoticeKeys = ge(new Set(), (e) => e.clear()),
  reportedNoticeUuids = ge(new Set(), (e) => e.clear()),
  PROCESS_START_MS = Date.now() - process.uptime() * 1000,
  now = Date.now();
/**
 * CCR 会话提示渲染异常时打点（同一 uuid+原因只打一次）：是否受保护、是否本次进程产生的新记录、是否首次上报、开关取值与来源。
 */
//@ chunk-e6aww6q8.js:148620-149014 placement
function logSessionNoticeRender(e) {
  try {
    let n = `${e.uuid}:${e.guarded}:${e.reason}`;
    if (reportedNoticeKeys.has(n)) return;
    reportedNoticeKeys.add(n);
    let r = e.timestamp === void 0 ? NaN : Date.parse(e.timestamp),
      s = !reportedNoticeUuids.has(e.uuid);
    reportedNoticeUuids.add(e.uuid);
    let h = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_VELVETY_RIPPLE, !1);
    logFeatureSad("ccr_session_notice_render", e.reason, {
      guarded: e.guarded,
      new_record: Number.isFinite(r) && r >= (isDiskless() ? now : PROCESS_START_MS),
      first_report: s,
      outcome: fromEnum(e.outcome),
      gate_on: h.value,
      gate_source: fromEnum(h.source),
    });
  } catch {}
}

export { logSessionNoticeRender };
