/**
 * utils/relaunchTerminalSize.ts
 *
 * 2.1.316 新增：重启时通过 CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE 传递终端尺寸
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a04avcpz.js (3)
 * attribution: placement 3
 */
import { env } from "./env.js";

//@ chunk-a04avcpz.js:226-271 placement
var CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE = "CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE";
//@ chunk-a04avcpz.js:271-368 placement
function getRelaunchTerminalSizeEnv() {
  let { columns, rows } = process.stdout;
  if (!columns || !rows) return {};
  return {
    [CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE]: `${columns}x${rows}`,
  };
}
//@ chunk-a04avcpz.js:368-628 placement
function applyRelaunchTerminalSize() {
  let CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE_2 = env.CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE;
  delete process.env[CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE];
  if (CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE_2 === undefined || !process.stdout.isTTY) return;
  let match = /^([1-9]\d{0,3})x([1-9]\d{0,3})$/.exec(CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE_2);
  if (!match) return;
  process.stdout.columns ||= Number(match[1]);
  process.stdout.rows ||= Number(match[2]);
}
export { applyRelaunchTerminalSize, CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE, getRelaunchTerminalSizeEnv };
