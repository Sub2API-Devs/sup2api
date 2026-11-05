/**
 * commands/exit/exit.tsx
 *
 * 并入旧版已有路径：/exit 命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/exit/exit.tsx
 * pieces: chunk-7kcg75y3.js (1), chunk-czq1j3j2.js (1), chunk-dtzk9y3z.js (1)
 * attribution: placement 2, fingerprint 1
 */
import { spawnSync } from "child_process";
import { env } from "../../utils/env.js";
import { resolveExecutableSafely } from "../../utils/findExecutableWindows.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { _tmuxGlobalEnvOutputHasMarker } from "../../utils/teammate.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { ExitFlow } from "../../components/ExitFlow.js";
import { submittedMessages, isMidTurnStreaming } from "../../utils/promptSubmissionOrigin.js";

//@ chunk-dtzk9y3z.js:2533-2852 fingerprint (2.1.88 match: call, 0.371)
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
//@ chunk-7kcg75y3.js:13240-13419 placement
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
//@ chunk-czq1j3j2.js:1752645-1752661 placement
function noopExitHandler() {}
export { noopExitHandler, call, runExitCommand };
