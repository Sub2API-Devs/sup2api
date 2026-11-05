/**
 * cli/backgroundSessionVerbs.ts
 *
 * 2.1.316 新增：后台会话子命令（attach/logs/stop 等）动词表与识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nhaxap13.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Help, Command } from "../../vendor/commander/esm.mjs";

//@ chunk-nhaxap13.js:22806-23047 placement
function addBackgroundVerbsToHelp(program) {
  program.configureHelp({
    ...program.configureHelp(),
    visibleCommands(cmd) {
      let commands = Help.prototype.visibleCommands.call(this, cmd);
      if (cmd !== program) return commands;
      let merged = [...commands, ...getBackgroundSessionVerbCommands()];
      return this.sortSubcommands ? merged.sort((a, b) => a.name().localeCompare(b.name())) : merged;
    },
  });
}
//@ chunk-nhaxap13.js:23047-23953 placement
/**
 * 后台会话动词（attach/logs/stop|kill/respawn/rm）的 commander 定义；只用于根帮助显示，真正执行在 cli.js 快速路径。
 */
function getBackgroundSessionVerbCommands() {
  return [
    new Command("attach")
      .argument("<id|name>")
      .description(
        "Open a background session in this terminal. <id> is the short id that `claude --bg` prints and `claude agents` lists. Part of the session name works too",
      ),
    new Command("logs")
      .argument("<id|name>")
      .description("Print a background session's recent terminal output"),
    new Command("stop")
      .alias("kill")
      .argument("<id>")
      .description(
        "Stop a background session. Its conversation is kept: `claude attach <id>` opens it again, `claude --resume` works once it is stopped",
      ),
    ...[],
    new Command("respawn")
      .argument("[id]")
      .option("--all", "Restart every running background session")
      .description(
        "Restart a background session, or all of them with --all, so it runs the current Claude Code version",
      ),
    new Command("rm")
      .argument("<id>")
      .description(
        "Delete a background session, and its worktree when that is safe. Works on sessions that have already exited",
      ),
    ...[],
  ];
}
export { addBackgroundVerbsToHelp };
