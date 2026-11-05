/**
 * utils/messages/ccrSessionNotice.ts
 *
 * 2.1.316 新增：云会话提示消息
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity as identity_2 } from "../identity.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_VELVETY_RIPPLE } from "./apiNormalization.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isDiskless } from "../../bootstrap/state.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:142420-142538 placement
/**
 * CCR 会话提示渲染打点的去重集合（按键、按 uuid）、进程启动时间与模块加载时间。
 */
var reportedNoticeKeys; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var reportedNoticeUuids;
var PROCESS_START_MS;
var now;
deferInit("chunk-5xgkngpb.js:142420", () => {
  reportedNoticeKeys = identity_2(new Set(), (set) => set.clear());
  reportedNoticeUuids = identity_2(new Set(), (set) => set.clear());
  PROCESS_START_MS = Date.now() - process.uptime() * 1000;
  now = Date.now();
});
//@ chunk-5xgkngpb.js:142538-142932 placement
/**
 * CCR 会话提示渲染异常时打点（同一 uuid+原因只打一次）：是否受保护、是否本次进程产生的新记录、是否首次上报、开关取值与来源。
 */
function logSessionNoticeRender(notice) {
  try {
    let noticeKey = `${notice.uuid}:${notice.guarded}:${notice.reason}`;
    if (reportedNoticeKeys.has(noticeKey)) return;
    reportedNoticeKeys.add(noticeKey);
    let timestampMs = notice.timestamp === undefined ? NaN : Date.parse(notice.timestamp);
    let firstReport = !reportedNoticeUuids.has(notice.uuid);
    reportedNoticeUuids.add(notice.uuid);
    let gate = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_VELVETY_RIPPLE, false);
    logFeatureSad("ccr_session_notice_render", notice.reason, {
      guarded: notice.guarded,
      new_record: Number.isFinite(timestampMs) && timestampMs >= (isDiskless() ? now : PROCESS_START_MS),
      first_report: firstReport,
      outcome: fromEnum(notice.outcome),
      gate_on: gate.value,
      gate_source: fromEnum(gate.source),
    });
  } catch {}
}
export { logSessionNoticeRender };
