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

//@ chunk-dwh5z7zb.js:393-662 placement
var STARTUP_ANNOUNCEMENT_SCHEMA = DoctorLazy(() =>
    create_15(
      create({
        id: create_2(),
        title: create_2().optional(),
        text: create_2(),
        textIfUnusedLimitReset: create_2()
          .optional()
          .catch(void 0),
        footer: create_2().optional(),
        priority: create_3().default(0),
        maxImpressions: create_3().default(3),
        accentBar: create_6().default(!0),
        requiresModel: create_2().optional(),
      }),
    ).default([]),
  ),
  o = [];
//@ chunk-dwh5z7zb.js:662-762 placement
function readStartupAnnouncements() {
  let e = getDynamicConfig_CACHED_MAY_BE_STALE("tengu_startup_announcements", o),
    safeParse = STARTUP_ANNOUNCEMENT_SCHEMA().safeParse(e);
  return safeParse.success ? safeParse.data : o;
}
//@ chunk-dwh5z7zb.js:762-829 placement
function s(e) {
  return e.requiresModel === void 0 || isModelAllowed(e.requiresModel);
}
//@ chunk-dwh5z7zb.js:829-941 placement
function eligibleAnnouncements() {
  let e = getGlobalConfig().announcementImpressions ?? {};
  return readStartupAnnouncements().filter((t) => (e[t.id] ?? 0) < t.maxImpressions && s(t));
}
/**
 * 选出要显示的启动公告（未达显示次数上限、按优先级），限额未用时使用替代文本；可缓存选择结果。
 */
//@ chunk-dwh5z7zb.js:941-1215 placement
function pickStartupAnnouncement(e) {
  let t = announcementState();
  if (t.startupAnnouncementPick !== void 0) return t.startupAnnouncementPick;
  let n = eligibleAnnouncements().sort((a, c) => c.priority - a.priority)[0],
    r = n?.textIfUnusedLimitReset && holdsUnusedReset() ? { ...n, text: n.textIfUnusedLimitReset } : n;
  if (e && r !== void 0) t.startupAnnouncementPick = r;
  return r;
}
//@ chunk-dwh5z7zb.js:1215-1285 placement
function lxs(e, t) {
  if (eligibleAnnouncements().some((n) => n.textIfUnusedLimitReset)) refreshUnusedResetStatus(e, t);
}
/**
 * 可展示公告中优先级最高的一个（id/title/text/footer）的 JSON，没有则 false。旧版名 getNext 不准确；只被 headless 使用，疑似归错文件。
 */
//@ chunk-dwh5z7zb.js:1285-1456 placement = getNext (0.452)
function getNextAnnouncementJson() {
  let e = readStartupAnnouncements()
    .filter(s)
    .sort((min, n) => n.priority - min.priority)[0];
  if (e === void 0) return !1;
  return JSON.stringify({ id: e.id, title: e.title, text: e.text, footer: e.footer });
}

export { lxs, pickStartupAnnouncement, getNextAnnouncementJson };
