/**
 * utils/cronFireTexts.ts
 *
 * 2.1.316 新增：定时任务触发文案
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSnugWallOn } from "./permissions/serverClassifier/context.js";
import { isSystemLocalCommandMessage } from "../bootstrap/sessionSlices.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { identity as identity_2 } from "./identity.js";
import { countWhere } from "./collections.js";
import { logError } from "./log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2558707-2558890 placement
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
//@ chunk-5xgkngpb.js:2558890-2558981 placement
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
//@ chunk-5xgkngpb.js:2558981-2559016 placement
/**
 * 已上报过的 cron 文本键集合。
 */
var loggedCronFireTextKeys; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2558981", () => {
  loggedCronFireTextKeys = identity_2(new Set(), (keys) => keys.clear());
});
//@ chunk-5xgkngpb.js:2559016-2559081 placement
/**
 * 记录一次 cron 插入文本被列表更新丢弃。
 */
function logCronTextDropped(key) {
  if (!loggedCronFireTextKeys.has(key)) {
    loggedCronFireTextKeys.add(key);
    logFeatureSad("cron_fire_texts", key);
  }
}
//@ chunk-5xgkngpb.js:2559081-2559226 placement
/**
 * 检查插入文本条目是否在列表更新中被丢弃，是则记录 list_shed。
 */
function checkInsertedTextShed(nextRows, prevRows) {
  try {
    if (
      countWhere(prevRows, (row) => row.provenance === "inserted_text_at") <
      countWhere(nextRows, (row) => row.provenance === "inserted_text_at")
    )
      logCronTextDropped("list_shed");
  } catch (error) {
    logError(error);
  }
}
export { checkInsertedTextShed, wakeupSourceField, logCronTextDropped, markCronWakeupMessages };
