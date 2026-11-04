/**
 * commands/install-slack-app/index.ts
 *
 * /install-slack-app 命令对象（仅 claude-ai）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-slack-app/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:1732261-1732452 fingerprint (2.1.88 match: installSlackApp, 0.894)
/**
 * /install-slack-app 命令对象（local）；描述：Install the Claude Slack app；availability ["claude-ai"]；实现 chunk-xarcg2hx.js 的 p。
 */
var installSlackAppCommandDefinition = {
  type: "local",
  name: "install-slack-app",
  description: "Install the Claude Slack app",
  availability: ["claude-ai"],
  supportsNonInteractive: false,
  load: () => import("./install-slack-app.js"),
};
var installSlackAppCommand = installSlackAppCommandDefinition;
export { installSlackAppCommand };
