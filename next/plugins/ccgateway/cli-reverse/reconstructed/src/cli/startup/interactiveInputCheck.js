/**
 * cli/startup/interactiveInputCheck.ts
 *
 * 2.1.316 新增：交互输入（TTY）检测与无法读取键盘时的退出说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (6)
 * attribution: placement 6
 */
import { fstat } from "fs";
import { logFeatureSadAsync } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { printCliError, cliErrorAfterAnalyticsFlush } from "../exit.js";

//@ chunk-3wek6r2k.js:13428-14161 placement
/**
 * 无 TTY 时按平台给出提示行与备选输入读取器（Windows 说明无法回退到控制台）。
 */
var NO_TTY_MESSAGES =
  "Claude Code can't read the keyboard here: stdin is not a terminal (it is piped, redirected, or supplied by the program that launched claude)";
var NO_TTY_GUIDANCE_BY_PLATFORM = {
  windows: {
    lines: [
      `${NO_TTY_MESSAGES}, and on Windows it can't fall back to the console for input yet.`,
      "Run claude directly in Windows Terminal, PowerShell, or Command Prompt, without piping or redirecting its input.",
    ],
    reader: "type",
  },
  ci: {
    lines: [
      `${NO_TTY_MESSAGES}, and the CI environment variable is set, so it doesn't fall back to the terminal for input.`,
      "Unset the CI environment variable to work interactively.",
    ],
    reader: "cat",
  },
  tty_unavailable: {
    lines: [
      `${NO_TTY_MESSAGES}, and the terminal device (/dev/tty) couldn't be opened to read the keyboard instead.`,
      "Start claude directly from a terminal.",
    ],
    reader: "cat",
  },
};
//@ chunk-3wek6r2k.js:14161-14206 placement
function noTtyMessage(platform) {
  return NO_TTY_GUIDANCE_BY_PLATFORM[platform].lines.join(`
`);
}
//@ chunk-3wek6r2k.js:14206-14307 placement
async function logInteractiveInputFailure(reason) {
  try {
    await logFeatureSadAsync("startup_interactive_input", reason, {
      stdin_kind: fromEnum(await detectStdinKind()),
    });
  } catch {}
}
//@ chunk-3wek6r2k.js:14307-14408 placement
/**
 * 交互模式下 stdin 不是终端（且无法回退 /dev/tty 或控制台）时打印说明并退出。
 */
async function exitWithoutInteractiveInput(platform) {
  let { lines, reader } = NO_TTY_GUIDANCE_BY_PLATFORM[platform];
  printCliError(
    [...lines, printModeHint(reader)].join(`
`),
  );
  await logInteractiveInputFailure(platform);
  return cliErrorAfterAnalyticsFlush();
}
//@ chunk-3wek6r2k.js:14408-14602 placement
function printModeHint(example) {
  return `To send text as a prompt and print the reply instead, add -p; it also works with --continue and --resume <session-id> (for example: ${example} notes.md | claude -p --continue).`;
}
//@ chunk-3wek6r2k.js:14602-14860 placement
async function detectStdinKind() {
  let promise = await new Promise((resolve) => {
    fstat(0, (error, stats) => resolve(error ? undefined : stats));
  });
  if (promise === undefined) return "unknown";
  if (promise.isFIFO()) return "pipe";
  if (promise.isFile()) return "file";
  if (promise.isSocket()) return "socket";
  if (promise.isCharacterDevice()) return "character_device";
  return "other";
}
export { logInteractiveInputFailure, noTtyMessage, exitWithoutInteractiveInput };
