/**
 * tools/PushNotificationTool/prompt.ts
 *
 * 2.1.316 新增：PushNotification 工具提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m89kxfpp.js (6)
 * attribution: placement 6
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";

//@ chunk-m89kxfpp.js:298-324 placement
/**
 * 定时例程通知的包裹标签。
 */
var ROUTINE_SUMMARY_TAG = "<routine_summary>";
//@ chunk-m89kxfpp.js:324-386 placement
/**
 * 读取 tengu_kairos_push_notifications 开关。
 */
function isKairosPushEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_push_notifications", false);
}
//@ chunk-m89kxfpp.js:386-447 placement
/**
 * 读取 tengu_kairos_input_needed_push 开关。
 */
function isKairosInputNeededPushEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_input_needed_push", false);
}
//@ chunk-m89kxfpp.js:447-513 placement
/**
 * Kairos 推送开启且设置项 agentPushNotifEnabled 为真时才启用推送工具。
 */
function isAgentPushNotificationEnabled() {
  return isKairosPushEnabled() && resolveSetting("agentPushNotifEnabled", false).value;
}
//@ chunk-m89kxfpp.js:513-2244 placement
/**
 * PushNotification 工具的简述与提示词（何时该发、怎么写），以及定时例程场景的附加说明。
 */
var PUSH_NOTIFICATION_DESCRIPTION =
  "Send a notification to the user via their terminal and, when Remote Control is connected, also push to their mobile device";
var PUSH_NOTIFICATION_PROMPT = `This tool sends a desktop notification in the user's terminal. If Remote Control is connected, it also pushes to their phone. Either way, it pulls their attention from whatever they're doing \u2014 a meeting, another task, dinner \u2014 to this session. That's the cost. The benefit is they learn something now that they'd want to know now: a long task finished while they were away, a build is ready, you've hit something that needs their decision before you can continue.

Because a notification they didn't need is annoying in a way that accumulates, err toward not sending one. Don't notify for routine progress, or to announce you've answered something they asked seconds ago and are clearly still watching, or when a quick task completes. Notify when there's a real chance they've walked away and there's something worth coming back for \u2014 or when they've explicitly asked you to notify them.

Keep the message under 200 characters, one line, no markdown. Lead with what they'd act on \u2014 "build failed: 2 auth tests" tells them more than "task done" and more than a status dump.

When the user is actively at the terminal, your output already reaches them \u2014 a notification on top of it would be a duplicate, so the tool skips it and says so. A "not sent" result is expected and only ever about this one notification: it was redundant, turned off, or had nowhere to go.`;
var ROUTINE_NOTIFICATION_SUFFIX = `

This is a scheduled routine \u2014 the notification is how the run reaches its owner. Wrap the message in ${ROUTINE_SUMMARY_TAG} tags: the first sentence becomes the phone banner, the full text becomes the email body.`;
//@ chunk-m89kxfpp.js:2244-2277 placement
/**
 * 按入口类型返回推送通知提示词（Agent SDK 时附加定时例程说明）。
 */
function pushNotificationPrompt() {
  return isAgentSdkEntrypoint()
    ? PUSH_NOTIFICATION_PROMPT + ROUTINE_NOTIFICATION_SUFFIX
    : PUSH_NOTIFICATION_PROMPT;
}
export {
  isKairosPushEnabled,
  isAgentPushNotificationEnabled,
  PUSH_NOTIFICATION_DESCRIPTION,
  pushNotificationPrompt,
  isKairosInputNeededPushEnabled,
};
