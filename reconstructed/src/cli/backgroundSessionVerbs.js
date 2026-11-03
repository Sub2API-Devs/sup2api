/**
 * cli/backgroundSessionVerbs.ts
 *
 * 2.1.316 新增：后台会话子命令（attach/logs/stop 等）动词表与识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-shkzs7rp.js (2)
 * attribution: placement 2
 */
import { Help, Command } from "../../vendor/commander/esm.mjs";

//@ chunk-shkzs7rp.js:21325-21566 placement
function addBackgroundVerbsToHelp(n) {
  n.configureHelp({
    ...n.configureHelp(),
    visibleCommands(e) {
      let S = Help.prototype.visibleCommands.call(this, e);
      if (e !== n) return S;
      let A = [...S, ...getBackgroundSessionVerbCommands()];
      return this.sortSubcommands ? A.sort((r, s) => r.name().localeCompare(s.name())) : A;
    },
  });
}
/**
 * 后台会话动词（attach/logs/stop|kill/respawn/rm）的 commander 定义；只用于根帮助显示，真正执行在 cli.js 快速路径。
 */
//@ chunk-shkzs7rp.js:21566-22472 placement
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
