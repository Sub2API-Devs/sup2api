/**
 * plugins/functionHooks/promptAttachmentHooks.ts
 *
 * 2.1.316 新增：prompt.attachment 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { identity as identity_2 } from "../../utils/identity.js";

//@ chunk-e6aww6q8.js:85695-86018 placement
/**
 * prompt.attachment 答案缓存：answerOf/pendingOf 查询，settle/resolve 写入（带代号防旧结果覆盖），可整体失效。
 */
function createPromptAttachmentCache() {
  let e = new Map();
  let n = new Map();
  let r = 0;
  return {
    answerOf: (s) => e.get(s),
    pendingOf: (s) => n.get(s),
    settle: (s, h) => {
      e.set(s, h);
    },
    resolve: (s, h) => {
      let y = r;
      let S = h.then((w) => {
        if (y === r) {
          e.set(s, w);
          n.delete(s);
        }
        return w;
      });
      n.set(s, S);
      S.catch(() => {
        if (y === r) n.delete(s);
      });
      return S;
    },
    invalidatePromptAttachments: () => {
      r += 1;
      e.clear();
      n.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:86018-86072 placement
/**
 * 提示附件缓存
 */
var promptAttachmentCache = identity_2(createPromptAttachmentCache(), (e) => e.invalidatePromptAttachments());
//@ chunk-e6aww6q8.js:86072-86092 placement
var answerOf = promptAttachmentCache.answerOf;
//@ chunk-e6aww6q8.js:86092-86131 placement
var invalidatePromptAttachments = promptAttachmentCache.invalidatePromptAttachments;
//@ chunk-e6aww6q8.js:86131-86152 placement
var pendingOf = promptAttachmentCache.pendingOf;
//@ chunk-e6aww6q8.js:86152-86171 placement
var resolve = promptAttachmentCache.resolve;
//@ chunk-e6aww6q8.js:86171-86189 placement
var settle = promptAttachmentCache.settle;
export { answerOf, pendingOf, settle, resolve, invalidatePromptAttachments };
