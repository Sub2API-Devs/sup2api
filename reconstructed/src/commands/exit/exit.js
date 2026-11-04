/**
 * commands/exit/exit.tsx
 *
 * 并入旧版已有路径：/exit 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/exit/exit.tsx
 * pieces: chunk-18hwfzwa.js (3), chunk-f55t9a8b.js (1), chunk-fxf1mb10.js (1)
 * attribution: placement 2, fingerprint 3
 */
import { spawnSync } from "child_process";
import { env } from "../../utils/env.js";
import { resolveExecutableSafely } from "../../utils/findExecutableWindows.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { _tmuxGlobalEnvOutputHasMarker } from "../../utils/teammate.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { ExitFlow } from "../../components/ExitFlow.js";
import { submittedMessages, isMidTurnStreaming } from "../../utils/promptSubmissionOrigin.js";
import { sampleAlias } from "../../components/Spinner/spinnerStatus.js";

//@ chunk-fxf1mb10.js:2534-2853 fingerprint = call (0.371)
function call() {
  if (!env.TMUX) return "absent";
  let executable = resolveExecutableSafely("tmux");
  if (executable === null) return "unknown";
  let exitCode;
  try {
    exitCode = spawnSync(executable, ["show-environment", "-g"], {
      encoding: "utf8",
      timeout: 250,
      stdio: ["ignore", "pipe", "ignore"],
      cwd: undefined,
      env: subprocessEnv(),
      windowsHide: true,
    });
  } catch {
    return "unknown";
  }
  if (exitCode.status !== 0) return "unknown";
  return _tmuxGlobalEnvOutputHasMarker(exitCode.stdout) ? "ambient" : "absent";
}
//@ chunk-f55t9a8b.js:12092-12271 placement
/**
 * /exit 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runExitCommand(args, context) {
  if (isBgSession())
    return {
      type: "text",
      value: "Session keeps running. Use /stop to end it.",
    };
  await ExitFlow(
    submittedMessages(context),
    {
      responseStreaming: isMidTurnStreaming(context),
    },
    context.storageV5,
  );
  return {
    type: "skip",
  };
}
//@ chunk-18hwfzwa.js:1706346-1706362 placement
function noopExitHandler() {}
//@ chunk-18hwfzwa.js:1706362-1706419 fingerprint = GOODBYE_MESSAGES (1)
var GOODBYE_MESSAGES = ["Goodbye!", "See ya!", "Bye!", "Catch you later!"];
//@ chunk-18hwfzwa.js:1706419-1706461 fingerprint = getRandomGoodbyeMessage (1)
function getRandomGoodbyeMessage() {
  return sampleAlias(GOODBYE_MESSAGES) ?? "Goodbye!";
}
export { getRandomGoodbyeMessage, noopExitHandler, call, runExitCommand };
