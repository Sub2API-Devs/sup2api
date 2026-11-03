/**
 * utils/hooks/hookMessages.ts
 *
 * 2.1.316 新增：钩子消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { escapeSystemReminderTags } from "../../services/api/promptCacheBreakParts.js";
import { PUt } from "./hookCommandResolution.js";
import { confusableTagScrubPattern, QBe, escapeXml_2 as escapeXml } from "../confusables.js";
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
import { XAn } from "../../plugins/functionHooks/sites/sessionSites.js";
import { isHostEntrypoint } from "../entrypointKinds.js";
import { cke } from "../../bootstrap/sessionSlices.js";
import { errorMessage } from "../errors.js";
import { logError } from "../log.js";

//@ chunk-e6aww6q8.js:947712-947779 placement
function TA(e) {
  return escapeSystemReminderTags(e).replace(/<(?=\s*(?:\/\s*)?$)/, "&lt;");
}
//@ chunk-e6aww6q8.js:947779-947909 placement
function scrubHookOutputTags(e) {
  return (
    (PUt ??= [
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
    ]),
    PUt.reduce((n, r) => n.replace(r, QBe), e)
  );
}
/**
 * 把 hook 产生的任务通知加入消息队列（摘要、正文、优先级、来源等）。
 */
//@ chunk-e6aww6q8.js:947909-948214 placement
function enqueueHookTaskNotification({
  summary: summary,
  body: body,
  priority: priority,
  stopHookActive: stopHookActive,
  queue: queue,
  origin: origin,
  turnAttribution: turnAttribution,
}) {
  (queue === void 0 ? enqueuePendingNotification : queue.enqueuePendingNotification)(
    {
      value: formatTaskNotification({
        summary: escapeXml(summary),
        trailing: `
${wrapInSystemReminder(body)}`,
      }),
      mode: "task-notification",
      agentId: mainAgentId(),
      priority: priority,
      stopHookActive: stopHookActive,
      origin: origin,
      skipAttachments: !0,
    },
    { turnAttribution: turnAttribution },
  );
}
//@ chunk-e6aww6q8.js:948214-948240 placement
var MUt = new HostScoped(() => createStore([]));
//@ chunk-e6aww6q8.js:948240-948273 placement
function yFo(e) {
  return MUt.of(e);
}
//@ chunk-e6aww6q8.js:948273-948312 placement
function gxo() {
  return MUt.of(getRootSession().host);
}
/**
 * 登记正在运行的一组 hook（事件、子代理、工具名），并返回结束时移除的函数。
 */
//@ chunk-e6aww6q8.js:948312-948725 placement
function trackRunningHooks({ hookEvent: hookEvent, hooks: hooks, agentId: agentId, toolName: toolName }) {
  let h = gxo(),
    y = { hookEvent: hookEvent, hooks: hooks, settled: new Set(), agentId: agentId, toolName: toolName };
  return (
    h.setState((S) => [...S, y]),
    {
      settle: (S) =>
        h.setState((w) => {
          let index = w.indexOf(y);
          if (index === -1 || y.settled.has(S)) return w;
          return ((y = { ...y, settled: new Set(y.settled).add(S) }), w.toSpliced(index, 1, y));
        }),
      [Symbol.dispose]: () =>
        h.setState((S) => {
          let index = S.indexOf(y);
          return index === -1 ? S : S.toSpliced(index, 1);
        }),
    }
  );
}
//@ chunk-e6aww6q8.js:948725-948773 placement
function _Fo() {
  return getFeatureValue_SESSION_PINNED("tengu_linear_owl", !1);
}
/**
 * 判断回调型 hook 是否由 SDK 宿主持有 stdin 直接处理。
 */
//@ chunk-e6aww6q8.js:948773-949257 placement
function OUt(e, n, r) {
  let s =
    n.type === "callback" &&
    r?.sdkHost === !0 &&
    r.hostOwnsStdin === !0 &&
    r.deviceForwarded !== !0 &&
    r.pluginId === void 0 &&
    r.pluginRoot === void 0 &&
    r.skillRoot === void 0;
  if (e === void 0 || !s || !_Fo()) return;
  if (
    ![e.title, e.description, e.displayName].every((y) =>
      y
        .split(
          `
`,
        )
        .every((S) => normalizeForDisplay(S) === S),
    )
  ) {
    (logForDebugging(
      "PreToolUse permissionDisplay ignored: its text holds a character a permission card could not show as written",
    ),
      logFeatureSad("permission_host_worded_ask", "unshowable_character"));
    return;
  }
  return e;
}
//@ chunk-e6aww6q8.js:949257-949441 placement
function dropStaleHostDisplay(e, n) {
  if (e.hostDisplay === void 0 || XAn(e.hostDisplayInput, n)) return e;
  logFeatureSad("permission_host_worded_ask", "input_rewritten");
  let { hostDisplay: hostDisplay, hostDisplayInput: hostDisplayInput, ...h } = e;
  return h;
}
//@ chunk-e6aww6q8.js:949441-949642 placement
function hostNoResponseMessage(e) {
  let n = isHostEntrypoint() ? "Claude Desktop" : "The app driving this session";
  return e === "SessionStart"
    ? `${n} didn't respond; carried on without it.`
    : `${n} didn't respond, so this turn ended without it.`;
}
//@ chunk-e6aww6q8.js:2075498-2075584 placement
function hq(e) {
  if (cke(e)) {
    logForDebugging(`Hooks did not run: ${errorMessage(e)}`, { level: "error" });
    return;
  }
  logError(e);
}

export {
  TA,
  yFo,
  hq,
  enqueueHookTaskNotification,
  scrubHookOutputTags,
  trackRunningHooks,
  hostNoResponseMessage,
  OUt,
  dropStaleHostDisplay,
  _Fo,
};
