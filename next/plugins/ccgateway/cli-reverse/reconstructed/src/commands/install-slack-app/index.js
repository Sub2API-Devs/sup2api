/**
 * commands/install-slack-app/index.ts
 *
 * /install-slack-app 命令对象（仅 claude-ai）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-slack-app/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:1807713-1807904 fingerprint (2.1.88 match: installSlackApp, 0.894)
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
