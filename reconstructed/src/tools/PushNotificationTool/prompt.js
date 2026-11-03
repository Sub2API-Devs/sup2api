/**
 * tools/PushNotificationTool/prompt.ts
 *
 * 2.1.316 新增：PushNotification 工具提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r9pxxwfb.js (6)
 * attribution: placement 6
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";

//@ chunk-r9pxxwfb.js:298-324 placement
var t = "<routine_summary>";
//@ chunk-r9pxxwfb.js:324-386 placement
function qrt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_push_notifications", !1);
}
//@ chunk-r9pxxwfb.js:386-447 placement
function Jnr() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_input_needed_push", !1);
}
//@ chunk-r9pxxwfb.js:447-513 placement
function h$e() {
  return qrt() && resolveSetting("agentPushNotifEnabled", !1).value;
}
/**
 * PushNotification 工具的简述与提示词（何时该发、怎么写），以及定时例程场景的附加说明。
 */
//@ chunk-r9pxxwfb.js:513-2244 placement
var PUSH_NOTIFICATION_DESCRIPTION =
    "Send a notification to the user via their terminal and, when Remote Control is connected, also push to their mobile device",
  PUSH_NOTIFICATION_PROMPT = `This tool sends a desktop notification in the user's terminal. If Remote Control is connected, it also pushes to their phone. Either way, it pulls their attention from whatever they're doing \u2014 a meeting, another task, dinner \u2014 to this session. That's the cost. The benefit is they learn something now that they'd want to know now: a long task finished while they were away, a build is ready, you've hit something that needs their decision before you can continue.

Because a notification they didn't need is annoying in a way that accumulates, err toward not sending one. Don't notify for routine progress, or to announce you've answered something they asked seconds ago and are clearly still watching, or when a quick task completes. Notify when there's a real chance they've walked away and there's something worth coming back for \u2014 or when they've explicitly asked you to notify them.

Keep the message under 200 characters, one line, no markdown. Lead with what they'd act on \u2014 "build failed: 2 auth tests" tells them more than "task done" and more than a status dump.

When the user is actively at the terminal, your output already reaches them \u2014 a notification on top of it would be a duplicate, so the tool skips it and says so. A "not sent" result is expected and only ever about this one notification: it was redundant, turned off, or had nowhere to go.`,
  ROUTINE_NOTIFICATION_SUFFIX = `

This is a scheduled routine \u2014 the notification is how the run reaches its owner. Wrap the message in ${t} tags: the first sentence becomes the phone banner, the full text becomes the email body.`;
//@ chunk-r9pxxwfb.js:2244-2277 placement
function Hsi() {
  return isAgentSdkEntrypoint()
    ? PUSH_NOTIFICATION_PROMPT + ROUTINE_NOTIFICATION_SUFFIX
    : PUSH_NOTIFICATION_PROMPT;
}

export { qrt, PUSH_NOTIFICATION_DESCRIPTION, Hsi, Jnr, h$e };
