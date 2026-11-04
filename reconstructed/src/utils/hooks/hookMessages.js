/**
 * utils/hooks/hookMessages.ts
 *
 * 2.1.316 新增：钩子消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 12
 */
import { escapeSystemReminderTags } from "../../services/api/promptCacheBreakParts.js";
import { confusableTagScrubPattern, escapedCharPrefix, escapeXml_2 as escapeXml } from "../confusables.js";
import {
  USER_INPUT_WRAPPER_TAGS,
  TASK_ID,
  TOOL_USE_ID,
  TASK_TYPE,
  OUTPUT_FILE,
  STATUS,
  SUMMARY,
  RESOURCE_UPDATE_TAGS,
} from "../../constants/xml.js";
import { enqueuePendingNotification } from "../messageQueueManager.js";
import { formatTaskNotification } from "../xmlTags.js";
import { wrapInSystemReminder } from "../messages.js";
import { mainAgentId, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../hostScoped.js";
import { createStore } from "../../state/store.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { normalizeForDisplay } from "../resultError.js";
import { logForDebugging } from "../debug.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { sameMessageOrShape } from "../../plugins/functionHooks/sites/sessionSites.js";
import { isHostEntrypoint } from "../entrypointKinds.js";
import { isNoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import { errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:947704-947712 placement (moved: shares a binding it assigns)
/**
 * 缓存的钩子展示文本构造器。
 */
var cachedHookDisplayBuilder;
//@ chunk-e6aww6q8.js:947712-947779 placement
/**
 * 清洗钩子输出中的 system-reminder 标签（转义结尾的单独 `<`）。
 */
function scrubHookOutputTags(text) {
  return escapeSystemReminderTags(text).replace(/<(?=\s*(?:\/\s*)?$)/, "&lt;");
}
//@ chunk-e6aww6q8.js:947779-947909 placement
function scrubHookOutputTags_2(text) {
  cachedHookDisplayBuilder ??= [
    confusableTagScrubPattern([
      ...USER_INPUT_WRAPPER_TAGS,
      TASK_ID,
      TOOL_USE_ID,
      TASK_TYPE,
      OUTPUT_FILE,
      STATUS,
      SUMMARY,
      "duration_ms",
    ]),
    confusableTagScrubPattern(RESOURCE_UPDATE_TAGS, () => ""),
  ];
  return cachedHookDisplayBuilder.reduce((acc, pattern) => acc.replace(pattern, escapedCharPrefix), text);
}
//@ chunk-e6aww6q8.js:947909-948214 placement
/**
 * 把 hook 产生的任务通知加入消息队列（摘要、正文、优先级、来源等）。
 */
function enqueueHookTaskNotification({
  summary,
  body,
  priority,
  stopHookActive,
  queue,
  origin,
  turnAttribution,
}) {
  (queue === undefined ? enqueuePendingNotification : queue.enqueuePendingNotification)(
    {
      value: formatTaskNotification({
        summary: escapeXml(summary),
        trailing: `
${wrapInSystemReminder(body)}`,
      }),
      mode: "task-notification",
      agentId: mainAgentId(),
      priority,
      stopHookActive,
      origin,
      skipAttachments: true,
    },
    {
      turnAttribution,
    },
  );
}
//@ chunk-e6aww6q8.js:948214-948240 placement
var runningHooksStoreRegistry; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:948214", () => {
  runningHooksStoreRegistry = new HostScoped(() => createStore([]));
});
//@ chunk-e6aww6q8.js:948240-948273 placement
/**
 * 取指定宿主的"运行中钩子"存储。
 */
function runningHooksStoreOf(host) {
  return runningHooksStoreRegistry.of(host);
}
//@ chunk-e6aww6q8.js:948273-948312 placement
function currentRunningHooksStore() {
  return runningHooksStoreRegistry.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:948312-948725 placement
/**
 * 登记正在运行的一组 hook（事件、子代理、工具名），并返回结束时移除的函数。
 */
function trackRunningHooks({ hookEvent, hooks, agentId, toolName }) {
  let store = currentRunningHooksStore();
  let entry = {
    hookEvent,
    hooks,
    settled: new Set(),
    agentId,
    toolName,
  };
  store.setState((entries) => [...entries, entry]);
  return {
    settle: (hook) =>
      store.setState((entries) => {
        let index = entries.indexOf(entry);
        if (index === -1 || entry.settled.has(hook)) return entries;
        entry = {
          ...entry,
          settled: new Set(entry.settled).add(hook),
        };
        return entries.toSpliced(index, 1, entry);
      }),
    [Symbol.dispose]: () =>
      store.setState((entries) => {
        let index = entries.indexOf(entry);
        return index === -1 ? entries : entries.toSpliced(index, 1);
      }),
  };
}
//@ chunk-e6aww6q8.js:948725-948773 placement
/**
 * 判断宿主持有显示的开关（tengu_linear_owl）是否开启。
 */
function isHostDisplayFeatureOn() {
  return getFeatureValue_SESSION_PINNED("tengu_linear_owl", false);
}
//@ chunk-e6aww6q8.js:948773-949257 placement
/**
 * 判断回调型 hook 是否由 SDK 宿主持有 stdin 直接处理。
 */
function sanitizeHostPermissionDisplay(permissionDisplay, hook, source) {
  let hostOwns =
    hook.type === "callback" &&
    source?.sdkHost === true &&
    source.hostOwnsStdin === true &&
    source.deviceForwarded !== true &&
    source.pluginId === undefined &&
    source.pluginRoot === undefined &&
    source.skillRoot === undefined;
  if (permissionDisplay === undefined || !hostOwns || !isHostDisplayFeatureOn()) return;
  if (
    ![permissionDisplay.title, permissionDisplay.description, permissionDisplay.displayName].every((text) =>
      text
        .split(
          `
`,
        )
        .every((line) => normalizeForDisplay(line) === line),
    )
  ) {
    logForDebugging(
      "PreToolUse permissionDisplay ignored: its text holds a character a permission card could not show as written",
    );
    logFeatureSad("permission_host_worded_ask", "unshowable_character");
    return;
  }
  return permissionDisplay;
}
//@ chunk-e6aww6q8.js:949257-949441 placement
function dropStaleHostDisplay(result, input) {
  if (result.hostDisplay === undefined || sameMessageOrShape(result.hostDisplayInput, input)) return result;
  logFeatureSad("permission_host_worded_ask", "input_rewritten");
  let { hostDisplay, hostDisplayInput, ...rest } = result;
  return rest;
}
//@ chunk-e6aww6q8.js:949441-949642 placement
function hostNoResponseMessage(hookEvent) {
  let appName = isHostEntrypoint() ? "Claude Desktop" : "The app driving this session";
  return hookEvent === "SessionStart"
    ? `${appName} didn't respond; carried on without it.`
    : `${appName} didn't respond, so this turn ended without it.`;
}
//@ chunk-e6aww6q8.js:2075498-2075584 placement
/**
 * 记录钩子执行失败（"未运行"类错误只记 debug 日志）。
 */
function logHookExecutionFailure(error) {
  if (isNoProjectDirectoryError(error)) {
    logForDebugging(`Hooks did not run: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
  logError(error);
}
export {
  scrubHookOutputTags,
  runningHooksStoreOf,
  logHookExecutionFailure,
  enqueueHookTaskNotification,
  scrubHookOutputTags_2,
  trackRunningHooks,
  hostNoResponseMessage,
  sanitizeHostPermissionDisplay,
  dropStaleHostDisplay,
  isHostDisplayFeatureOn,
};
