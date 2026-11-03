/**
 * utils/cronFireTexts.ts
 *
 * 2.1.316 新增：定时任务触发文案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { tQe } from "./permissions/serverClassifier/context.js";
import { isSystemLocalCommandMessage } from "../bootstrap/sessionSlices.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { ge } from "./identity.js";
import { count } from "./collections.js";
import { logError } from "./log.js";

/**
 * 给定时任务触发的消息标记唤醒来源（开启时还标记为非用户输入的文本）。
 */
//@ chunk-e6aww6q8.js:2515646-2515829 placement
function markCronWakeupMessages(e, n) {
  if (n === void 0) return;
  let r = tQe();
  for (let s of e)
    if (s.type === "user") {
      if (((s.wakeupSource = n), r)) s.textNotTyped = !0;
    } else if (isSystemLocalCommandMessage(s)) s.wakeupSource = n;
  if (r) logFeatureOk("cron_fire_texts");
}
//@ chunk-e6aww6q8.js:2515829-2515920 placement
function bmn(e) {
  return e.wakeupSource !== void 0 && tQe() ? { wakeupSource: e.wakeupSource } : void 0;
}
//@ chunk-e6aww6q8.js:2515920-2515955 placement
var Xdn = ge(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:2515955-2516020 placement
function Gve(e) {
  if (!Xdn.has(e)) (Xdn.add(e), logFeatureSad("cron_fire_texts", e));
}
/**
 * 检查插入文本条目是否在列表更新中被丢弃，是则记录 list_shed。
 */
//@ chunk-e6aww6q8.js:2516020-2516165 placement
function checkInsertedTextShed(e, n) {
  try {
    if (
      count(n, (r) => r.provenance === "inserted_text_at") <
      count(e, (r) => r.provenance === "inserted_text_at")
    )
      Gve("list_shed");
  } catch (error) {
    logError(error);
  }
}

export { bmn, checkInsertedTextShed, markCronWakeupMessages, Gve };
