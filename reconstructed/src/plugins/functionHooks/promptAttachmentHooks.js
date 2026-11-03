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
import { ge } from "../../utils/identity.js";

/**
 * prompt.attachment 答案缓存：answerOf/pendingOf 查询，settle/resolve 写入（带代号防旧结果覆盖），可整体失效。
 */
//@ chunk-e6aww6q8.js:85695-86018 placement
function createPromptAttachmentCache() {
  let e = new Map(),
    n = new Map(),
    r = 0;
  return {
    answerOf: (s) => e.get(s),
    pendingOf: (s) => n.get(s),
    settle: (s, h) => {
      e.set(s, h);
    },
    resolve: (s, h) => {
      let y = r,
        S = h.then((w) => {
          if (y === r) (e.set(s, w), n.delete(s));
          return w;
        });
      return (
        n.set(s, S),
        S.catch(() => {
          if (y === r) n.delete(s);
        }),
        S
      );
    },
    invalidatePromptAttachments: () => {
      ((r += 1), e.clear(), n.clear());
    },
  };
}
//@ chunk-e6aww6q8.js:86018-86072 placement
var iA = ge(createPromptAttachmentCache(), (e) => e.invalidatePromptAttachments());
//@ chunk-e6aww6q8.js:86072-86092 placement
var answerOf = iA.answerOf;
//@ chunk-e6aww6q8.js:86092-86131 placement
var invalidatePromptAttachments = iA.invalidatePromptAttachments;
//@ chunk-e6aww6q8.js:86131-86152 placement
var pendingOf = iA.pendingOf;
//@ chunk-e6aww6q8.js:86152-86171 placement
var resolve = iA.resolve;
//@ chunk-e6aww6q8.js:86171-86189 placement
var settle = iA.settle;

export { answerOf, pendingOf, settle, resolve, invalidatePromptAttachments };
