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
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";

//@ chunk-e6aww6q8.js:74091-74167 placement
var SUBMISSION_SUBKINDS = new Set(["scheduled-trigger", "peer-send-message", "projects-relay"]);
//@ chunk-e6aww6q8.js:74167-74191 placement
var isKnownSubmissionSubkind = (subkind) => SUBMISSION_SUBKINDS.has(subkind);
//@ chunk-e6aww6q8.js:74191-74690 placement
/**
 * 把提交来源描述转成消息来源：human 区分桥接与输入框，plugin/channel/task-notification 保留细节，其余只保留 kind。
 */
function originFromSubmission(submission, fromBridge) {
  switch (submission.kind) {
    case "human":
      return fromBridge === true
        ? {
            kind: "bridge",
          }
        : {
            kind: "composer",
          };
    case "plugin":
      return submission.asUser === true
        ? {
            kind: "plugin",
            name: submission.name,
            asUser: true,
          }
        : {
            kind: "plugin",
            name: submission.name,
          };
    case "channel":
      return {
        kind: "channel",
        server: submission.server,
      };
    case "task-notification": {
      let { subkind } = submission;
      return subkind !== undefined && isKnownSubmissionSubkind(subkind)
        ? {
            kind: subkind,
          }
        : {
            kind: "task-notification",
          };
    }
    case "peer":
    case "coordinator":
    case "unclassified":
    case "observer":
    case "auto-continuation":
    case "observer-activity":
    case "slack-ping":
      return {
        kind: submission.kind,
      };
  }
}
//@ chunk-e6aww6q8.js:74690-74787 placement
/**
 * 把未知来源对象解析成消息来源，无法识别时归为 unclassified。
 */
function originFromUnknown(unknown) {
  if (!isPlainObject_5(unknown))
    return {
      kind: "unclassified",
    };
  return (
    originFromSubmission(unknown, undefined) ?? {
      kind: "unclassified",
    }
  );
}
//@ chunk-e6aww6q8.js:74787-75143 placement
/**
 * 推断用户消息的来源：有显式来源就转换，否则按任务通知、定时唤醒或提示来源（sdk/typed/queued 等）判断。
 */
function resolveMessageOrigin({ origin, bridgeOrigin, wakeupSource, mode, promptSource }) {
  if (origin) return originFromSubmission(origin, bridgeOrigin);
  if (mode === "task-notification")
    return {
      kind: "task-notification",
    };
  if (wakeupSource)
    return {
      kind: "scheduled-trigger",
    };
  switch (promptSource) {
    case "typed":
    case "queued":
    case "suggestion_accepted":
      return {
        kind: "unclassified",
      };
    case "sdk":
      return {
        kind: "sdk",
      };
    case "system":
      return {
        kind: "unclassified",
      };
  }
}
//@ chunk-e6aww6q8.js:75143-75506 placement
/**
 * 由桥接消息的元数据推断来源：human→bridge、任务通知子类、peer/coordinator（带插件）、slack-ping，其余 unclassified。
 */
function originFromBridgeMetadata(metadata) {
  if (!metadata)
    return {
      kind: "unclassified",
    };
  let { kind, subkind } = metadata;
  switch (kind) {
    case "human":
      return {
        kind: "bridge",
      };
    case "task-notification":
      return {
        kind: subkind !== undefined && isKnownSubmissionSubkind(subkind) ? subkind : "task-notification",
      };
    case "peer":
    case "coordinator": {
      let { plugin } = metadata;
      return {
        kind,
        ...(plugin !== undefined && {
          plugin,
        }),
      };
    }
    case "slack-ping":
      return {
        kind: "slack-ping",
      };
    default:
      return {
        kind: "unclassified",
      };
  }
}
//@ chunk-e6aww6q8.js:84692-84851 placement
/**
 * 由提交来源、是否经桥接与提示来源推断消息来源（mode=prompt）。
 */
var resolvePromptOrigin = ({ submissionOrigin, dispatchedOverBridge, promptSource }) =>
  resolveMessageOrigin({
    origin: submissionOrigin,
    bridgeOrigin: dispatchedOverBridge,
    wakeupSource: undefined,
    mode: "prompt",
    promptSource: promptSource ?? "typed",
  });
//@ chunk-e6aww6q8.js:84851-84862 placement
/**
 * 来源描述文本的最大字符数。
 */
var MAX_ORIGIN_TEXT_CHARS = 80;
export {
  resolvePromptOrigin,
  originFromBridgeMetadata,
  originFromUnknown,
  resolveMessageOrigin,
  MAX_ORIGIN_TEXT_CHARS,
};
