/**
 * plugins/functionHooks/promptAttachmentHooks.ts
 *
 * 2.1.316 新增：prompt.attachment 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity as identity_2 } from "../../utils/identity.js";

//@ chunk-5xgkngpb.js:88500-88823 placement
/**
 * prompt.attachment 答案缓存：answerOf/pendingOf 查询，settle/resolve 写入（带代号防旧结果覆盖），可整体失效。
 */
function createPromptAttachmentCache() {
  let answers = new Map();
  let pending = new Map();
  let generation = 0;
  return {
    answerOf: (key) => answers.get(key),
    pendingOf: (key) => pending.get(key),
    settle: (key, answer) => {
      answers.set(key, answer);
    },
    resolve: (key, promise) => {
      let startGeneration = generation;
      let tracked = promise.then((value) => {
        if (startGeneration === generation) {
          answers.set(key, value);
          pending.delete(key);
        }
        return value;
      });
      pending.set(key, tracked);
      tracked.catch(() => {
        if (startGeneration === generation) pending.delete(key);
      });
      return tracked;
    },
    invalidatePromptAttachments: () => {
      generation += 1;
      answers.clear();
      pending.clear();
    },
  };
}
//@ chunk-5xgkngpb.js:88823-88877 placement
/**
 * 提示附件缓存
 */
var promptAttachmentCache = identity_2(createPromptAttachmentCache(), (cache) =>
  cache.invalidatePromptAttachments(),
);
//@ chunk-5xgkngpb.js:88877-88897 placement
var answerOf = promptAttachmentCache.answerOf;
//@ chunk-5xgkngpb.js:88897-88936 placement
var invalidatePromptAttachments = promptAttachmentCache.invalidatePromptAttachments;
//@ chunk-5xgkngpb.js:88936-88957 placement
var pendingOf = promptAttachmentCache.pendingOf;
//@ chunk-5xgkngpb.js:88957-88976 placement
var resolve = promptAttachmentCache.resolve;
//@ chunk-5xgkngpb.js:88976-88994 placement
var settle = promptAttachmentCache.settle;
export { answerOf, invalidatePromptAttachments, pendingOf, settle, resolve };
