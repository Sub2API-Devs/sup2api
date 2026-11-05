/**
 * commands/feedback/index.ts
 *
 * /bug（别名 share）命令对象：报错或分享对话
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/feedback/index.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 1, fingerprint 1
 */
//@ chunk-5xgkngpb.js:1761586-1761749 placement
/**
 * /feedback 命令对象（local-jsx）；描述：Send feedback to Anthropic or report a bug；实现 chunk-dnxbqwmv.js 的 EWi。
 */
var feedbackCommandDefinition = {
  type: "local-jsx",
  name: "feedback",
  description: "Send feedback to Anthropic or report a bug",
  argumentHint: "[report]",
  immediate: true,
  requires: {
    ink: true,
  },
};
var feedbackNonInteractiveCommand = feedbackCommandDefinition;
//@ chunk-5xgkngpb.js:1761749-1761922 fingerprint (2.1.88 match: feedback, 0.418)
/**
 * /bug 命令对象（local-jsx）；描述：Report a bug or share your conversation；别名 ["share"]；实现 chunk-myrezy36.js 的 t。
 */
var bugCommandDefinition = {
  aliases: ["share"],
  type: "local-jsx",
  name: "bug",
  description: "Report a bug or share your conversation",
  argumentHint: "[report]",
  immediate: true,
  requires: {
    ink: true,
  },
};
var bugNonInteractiveCommand = bugCommandDefinition;
export { feedbackNonInteractiveCommand, bugNonInteractiveCommand };
