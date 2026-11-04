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
import { isSnugWallOn } from "./permissions/serverClassifier/context.js";
import { isSystemLocalCommandMessage } from "../bootstrap/sessionSlices.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { identity as identity_2 } from "./identity.js";
import { count } from "./collections.js";
import { logError } from "./log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2515646-2515829 placement
/**
 * 给定时任务触发的消息标记唤醒来源（开启时还标记为非用户输入的文本）。
 */
function markCronWakeupMessages(messages, wakeupSource) {
  if (wakeupSource === undefined) return;
  let isSnugWall = isSnugWallOn();
  for (let message of messages)
    if (message.type === "user") {
      message.wakeupSource = wakeupSource;
      if (isSnugWall) message.textNotTyped = true;
    } else if (isSystemLocalCommandMessage(message)) message.wakeupSource = wakeupSource;
  if (isSnugWall) logFeatureOk("cron_fire_texts");
}
//@ chunk-e6aww6q8.js:2515829-2515920 placement
/**
 * 需要上报时返回 {wakeupSource}，否则 undefined。
 */
function wakeupSourceField(message) {
  return message.wakeupSource !== undefined && isSnugWallOn()
    ? {
        wakeupSource: message.wakeupSource,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:2515920-2515955 placement
/**
 * 已上报过的 cron 文本键集合。
 */
var loggedCronFireTextKeys; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2515920", () => {
  loggedCronFireTextKeys = identity_2(new Set(), (keys) => keys.clear());
});
//@ chunk-e6aww6q8.js:2515955-2516020 placement
/**
 * 记录一次 cron 插入文本被列表更新丢弃。
 */
function logCronTextDropped(key) {
  if (!loggedCronFireTextKeys.has(key)) {
    loggedCronFireTextKeys.add(key);
    logFeatureSad("cron_fire_texts", key);
  }
}
//@ chunk-e6aww6q8.js:2516020-2516165 placement
/**
 * 检查插入文本条目是否在列表更新中被丢弃，是则记录 list_shed。
 */
function checkInsertedTextShed(nextRows, prevRows) {
  try {
    if (
      count(prevRows, (row) => row.provenance === "inserted_text_at") <
      count(nextRows, (row) => row.provenance === "inserted_text_at")
    )
      logCronTextDropped("list_shed");
  } catch (error) {
    logError(error);
  }
}
export { wakeupSourceField, checkInsertedTextShed, markCronWakeupMessages, logCronTextDropped };
