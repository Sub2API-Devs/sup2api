/**
 * commands/feedback/index.ts
 *
 * /bug（别名 share）命令对象：报错或分享对话
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/feedback/index.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 1, fingerprint 1
 */

/**
 * /feedback 命令对象（local-jsx）；描述：Send feedback to Anthropic or report a bug；实现 chunk-dnxbqwmv.js 的 EWi。
 */
//@ chunk-e6aww6q8.js:1686377-1686540 placement
var feedbackCommandDefinition = {
    type: "local-jsx",
    name: "feedback",
    description: "Send feedback to Anthropic or report a bug",
    argumentHint: "[report]",
    immediate: !0,
    requires: { ink: !0 },
  },
  feedbackCommand = feedbackCommandDefinition;
/**
 * /bug 命令对象（local-jsx）；描述：Report a bug or share your conversation；别名 ["share"]；实现 chunk-myrezy36.js 的 t。
 */
//@ chunk-e6aww6q8.js:1686540-1686713 fingerprint = feedback (0.417)
var bugCommandDefinition = {
    aliases: ["share"],
    type: "local-jsx",
    name: "bug",
    description: "Report a bug or share your conversation",
    argumentHint: "[report]",
    immediate: !0,
    requires: { ink: !0 },
  },
  bugCommand = bugCommandDefinition;

export { feedbackCommand, bugCommand };
