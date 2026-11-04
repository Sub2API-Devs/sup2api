/**
 * services/startupAnnouncements.ts
 *
 * 启动公告（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dwh5z7zb.js (7)
 * attribution: placement 7
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { create_15, create, create_2, create_3, create_6 } from "../../vendor/zod/lib/index.mjs";
import { getDynamicConfig_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { isModelAllowed } from "../utils/model/modelAllowlist.js";
import { getGlobalConfig } from "../utils/config.js";
import { announcementState } from "./announcements/announcementState.js";
import { holdsUnusedReset, refreshUnusedResetStatus } from "./usageCreditOffers.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-dwh5z7zb.js:393-662 placement
var STARTUP_ANNOUNCEMENT_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var EMPTY_ANNOUNCEMENTS;
deferInit("chunk-dwh5z7zb.js:393", () => {
  STARTUP_ANNOUNCEMENT_SCHEMA = DoctorLazy(() =>
    create_15(
      create({
        id: create_2(),
        title: create_2().optional(),
        text: create_2(),
        textIfUnusedLimitReset: create_2().optional().catch(undefined),
        footer: create_2().optional(),
        priority: create_3().default(0),
        maxImpressions: create_3().default(3),
        accentBar: create_6().default(true),
        requiresModel: create_2().optional(),
      }),
    ).default([]),
  );
  EMPTY_ANNOUNCEMENTS = [];
});
//@ chunk-dwh5z7zb.js:662-762 placement
function readStartupAnnouncements() {
  let dynamicConfig_CACHED_MAY_BE_STALE = getDynamicConfig_CACHED_MAY_BE_STALE(
    "tengu_startup_announcements",
    EMPTY_ANNOUNCEMENTS,
  );
  let parsed = STARTUP_ANNOUNCEMENT_SCHEMA().safeParse(dynamicConfig_CACHED_MAY_BE_STALE);
  return parsed.success ? parsed.data : EMPTY_ANNOUNCEMENTS;
}
//@ chunk-dwh5z7zb.js:762-829 placement
function announcementModelAllowed(announcement) {
  return announcement.requiresModel === undefined || isModelAllowed(announcement.requiresModel);
}
//@ chunk-dwh5z7zb.js:829-941 placement
function eligibleAnnouncements() {
  let announcementImpressions = getGlobalConfig().announcementImpressions ?? {};
  return readStartupAnnouncements().filter(
    (announcement) =>
      (announcementImpressions[announcement.id] ?? 0) < announcement.maxImpressions &&
      announcementModelAllowed(announcement),
  );
}
//@ chunk-dwh5z7zb.js:941-1215 placement
/**
 * 选出要显示的启动公告（未达显示次数上限、按优先级），限额未用时使用替代文本；可缓存选择结果。
 */
function pickStartupAnnouncement(persist) {
  let state = announcementState();
  if (state.startupAnnouncementPick !== undefined) return state.startupAnnouncementPick;
  let top = eligibleAnnouncements().sort(
    (leftAnnouncement, rightAnnouncement) => rightAnnouncement.priority - leftAnnouncement.priority,
  )[0];
  let chosen =
    top?.textIfUnusedLimitReset && holdsUnusedReset()
      ? {
          ...top,
          text: top.textIfUnusedLimitReset,
        }
      : top;
  if (persist && chosen !== undefined) state.startupAnnouncementPick = chosen;
  return chosen;
}
//@ chunk-dwh5z7zb.js:1215-1285 placement
/**
 * 若可展示公告里有依赖「本周重置未使用」的，刷新该状态。
 */
function refreshUnusedResetIfNeeded(credentials, storageV5) {
  if (eligibleAnnouncements().some((announcement) => announcement.textIfUnusedLimitReset))
    refreshUnusedResetStatus(credentials, storageV5);
}
//@ chunk-dwh5z7zb.js:1285-1456 placement (2.1.88 match: getNext, 0.452)
/**
 * 可展示公告中优先级最高的一个（id/title/text/footer）的 JSON，没有则 false。旧版名 getNext 不准确；只被 headless 使用，疑似归错文件。
 */
function getNextAnnouncementJson() {
  let best = readStartupAnnouncements()
    .filter(announcementModelAllowed)
    .sort((min, other) => other.priority - min.priority)[0];
  if (best === undefined) return false;
  return JSON.stringify({
    id: best.id,
    title: best.title,
    text: best.text,
    footer: best.footer,
  });
}
export { refreshUnusedResetIfNeeded, pickStartupAnnouncement, getNextAnnouncementJson };
