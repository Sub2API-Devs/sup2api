/**
 * commands/statusline.tsx
 *
 * /statusline 提示词命令：让模型配置状态栏
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/statusline.tsx
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { AGENT } from "../tools/AgentTool/constants.js";
import { isSafeMode, getSafeModeExitHint } from "../utils/envUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2049127-2050093 fingerprint (2.1.88 match: statusline, 0.865)
/**
 * /statusline 命令对象（prompt）；描述：Set up Claude Code's status line UI。
 */
var statuslineCommandDefinition; // deferred: uses AGENT (../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var statuslineCommand;
deferInit("chunk-e6aww6q8.js:2049127", () => {
  statuslineCommandDefinition = {
    type: "prompt",
    description: "Set up Claude Code's status line UI",
    contentLength: 0,
    aliases: [],
    name: "statusline",
    progressMessage: "setting up statusLine",
    allowedTools: [AGENT, "Read(~/**)", "Edit(~/.claude/settings.json)"],
    source: "builtin",
    terminalOriented: true,
    disableNonInteractive: true,
    disableModelInvocation: true,
    requires: {
      workspace: true,
    },
    async getPromptForCommand(args) {
      if (isSafeMode())
        return [
          {
            type: "text",
            text: `Tell the user: /statusline is unavailable in safe mode. The setup flow saves the status line to ~/.claude/settings.json, but safe mode only displays the managed (policy) status line, so the result would never render. To set up a status line, ${getSafeModeExitHint()}, then run /statusline again.

Do not run the statusline-setup agent and do not edit any settings files. Simply inform the user.`,
          },
        ];
      let prompt = args.trim() || "Configure my statusLine from my shell PS1 configuration";
      return [
        {
          type: "text",
          text: `Create an ${AGENT} with subagent_type "statusline-setup" and the prompt "${prompt}"`,
        },
      ];
    },
  };
  statuslineCommand = statuslineCommandDefinition;
});
export { statuslineCommand };
