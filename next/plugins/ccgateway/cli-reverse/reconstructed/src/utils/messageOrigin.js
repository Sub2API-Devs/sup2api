/**
 * utils/messageOrigin.ts
 *
 * 2.1.316 新增：消息来源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 */
import { isPlainObject as isPlainObject_6 } from "./isPlainObject.js";

//@ chunk-5xgkngpb.js:76641-76717 placement
var SUBMISSION_SUBKINDS = new Set(["scheduled-trigger", "peer-send-message", "projects-relay"]);
//@ chunk-5xgkngpb.js:76717-76741 placement
var isKnownSubmissionSubkind = (subkind) => SUBMISSION_SUBKINDS.has(subkind);
//@ chunk-5xgkngpb.js:76741-77240 placement
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
//@ chunk-5xgkngpb.js:77240-77337 placement
/**
 * 把未知来源对象解析成消息来源，无法识别时归为 unclassified。
 */
function originFromUnknown(unknown) {
  if (!isPlainObject_6(unknown))
    return {
      kind: "unclassified",
    };
  return (
    originFromSubmission(unknown, undefined) ?? {
      kind: "unclassified",
    }
  );
}
//@ chunk-5xgkngpb.js:77337-77693 placement
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
//@ chunk-5xgkngpb.js:77693-78056 placement
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
//@ chunk-5xgkngpb.js:87242-87401 placement
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
//@ chunk-5xgkngpb.js:87401-87412 placement
/**
 * 来源描述文本的最大字符数。
 */
var MAX_ORIGIN_TEXT_CHARS = 80;
export {
  originFromBridgeMetadata,
  resolvePromptOrigin,
  MAX_ORIGIN_TEXT_CHARS,
  originFromUnknown,
  resolveMessageOrigin,
};
