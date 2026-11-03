/**
 * utils/messageOrigin.ts
 *
 * 2.1.316 新增：消息来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";

//@ chunk-e6aww6q8.js:74091-74167 placement
var g_t = new Set(["scheduled-trigger", "peer-send-message", "projects-relay"]);
//@ chunk-e6aww6q8.js:74167-74191 placement
var LNe = (e) => g_t.has(e);
/**
 * 把提交来源描述转成消息来源：human 区分桥接与输入框，plugin/channel/task-notification 保留细节，其余只保留 kind。
 */
//@ chunk-e6aww6q8.js:74191-74690 placement
function originFromSubmission(e, n) {
  switch (e.kind) {
    case "human":
      return n === !0 ? { kind: "bridge" } : { kind: "composer" };
    case "plugin":
      return e.asUser === !0
        ? { kind: "plugin", name: e.name, asUser: !0 }
        : { kind: "plugin", name: e.name };
    case "channel":
      return { kind: "channel", server: e.server };
    case "task-notification": {
      let { subkind: subkind } = e;
      return subkind !== void 0 && LNe(subkind) ? { kind: subkind } : { kind: "task-notification" };
    }
    case "peer":
    case "coordinator":
    case "unclassified":
    case "observer":
    case "auto-continuation":
    case "observer-activity":
    case "slack-ping":
      return { kind: e.kind };
  }
}
//@ chunk-e6aww6q8.js:74690-74787 placement
function L1r(e) {
  if (!isPlainObject_4(e)) return { kind: "unclassified" };
  return originFromSubmission(e, void 0) ?? { kind: "unclassified" };
}
/**
 * 推断用户消息的来源：有显式来源就转换，否则按任务通知、定时唤醒或提示来源（sdk/typed/queued 等）判断。
 */
//@ chunk-e6aww6q8.js:74787-75143 placement
function resolveMessageOrigin({
  origin: origin,
  bridgeOrigin: bridgeOrigin,
  wakeupSource: wakeupSource,
  mode: mode,
  promptSource: promptSource,
}) {
  if (origin) return originFromSubmission(origin, bridgeOrigin);
  if (mode === "task-notification") return { kind: "task-notification" };
  if (wakeupSource) return { kind: "scheduled-trigger" };
  switch (promptSource) {
    case "typed":
    case "queued":
    case "suggestion_accepted":
      return { kind: "unclassified" };
    case "sdk":
      return { kind: "sdk" };
    case "system":
      return { kind: "unclassified" };
  }
}
/**
 * 由桥接消息的元数据推断来源：human→bridge、任务通知子类、peer/coordinator（带插件）、slack-ping，其余 unclassified。
 */
//@ chunk-e6aww6q8.js:75143-75506 placement
function originFromBridgeMetadata(e) {
  if (!e) return { kind: "unclassified" };
  let { kind: kind, subkind: subkind } = e;
  switch (kind) {
    case "human":
      return { kind: "bridge" };
    case "task-notification":
      return { kind: subkind !== void 0 && LNe(subkind) ? subkind : "task-notification" };
    case "peer":
    case "coordinator": {
      let { plugin: plugin } = e;
      return { kind: kind, ...(plugin !== void 0 && { plugin: plugin }) };
    }
    case "slack-ping":
      return { kind: "slack-ping" };
    default:
      return { kind: "unclassified" };
  }
}
/**
 * 由提交来源、是否经桥接与提示来源推断消息来源（mode=prompt）。
 */
//@ chunk-e6aww6q8.js:84692-84851 placement
var resolvePromptOrigin = ({
  submissionOrigin: submissionOrigin,
  dispatchedOverBridge: dispatchedOverBridge,
  promptSource: promptSource,
}) =>
  resolveMessageOrigin({
    origin: submissionOrigin,
    bridgeOrigin: dispatchedOverBridge,
    wakeupSource: void 0,
    mode: "prompt",
    promptSource: promptSource ?? "typed",
  });
//@ chunk-e6aww6q8.js:84851-84862 placement
var $_t = 80;

export { resolvePromptOrigin, originFromBridgeMetadata, L1r, resolveMessageOrigin, $_t };
