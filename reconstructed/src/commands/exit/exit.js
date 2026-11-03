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
import { wz } from "../../components/Spinner/spinnerStatus.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { ExitFlow } from "../../components/ExitFlow.js";
import { yN, XRe } from "../../utils/promptSubmissionOrigin.js";
import { env } from "../../utils/env.js";
import { resolveExecutableSafely } from "../../utils/findExecutableWindows.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { _tmuxGlobalEnvOutputHasMarker } from "../../utils/teammate.js";

//@ chunk-18hwfzwa.js:1706346-1706362 placement
function DVo() {}
//@ chunk-18hwfzwa.js:1706362-1706419 fingerprint = GOODBYE_MESSAGES (1)
var GOODBYE_MESSAGES = ["Goodbye!", "See ya!", "Bye!", "Catch you later!"];
//@ chunk-18hwfzwa.js:1706419-1706461 fingerprint = getRandomGoodbyeMessage (1)
function getRandomGoodbyeMessage() {
  return wz(GOODBYE_MESSAGES) ?? "Goodbye!";
}
/**
 * /exit 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-f55t9a8b.js:12092-12271 placement
async function runExitCommand(args, context) {
  if (isBgSession()) return { type: "text", value: "Session keeps running. Use /stop to end it." };
  return (
    await ExitFlow(yN(context), { responseStreaming: XRe(context) }, context.storageV5),
    { type: "skip" }
  );
}
//@ chunk-fxf1mb10.js:2534-2853 fingerprint = call (0.371)
function call() {
  if (!env.TMUX) return "absent";
  let e = resolveExecutableSafely("tmux");
  if (e === null) return "unknown";
  let t;
  try {
    t = spawnSync(e, ["show-environment", "-g"], {
      encoding: "utf8",
      timeout: 250,
      stdio: ["ignore", "pipe", "ignore"],
      cwd: void 0,
      env: subprocessEnv(),
      windowsHide: !0,
    });
  } catch {
    return "unknown";
  }
  if (t.status !== 0) return "unknown";
  return _tmuxGlobalEnvOutputHasMarker(t.stdout) ? "ambient" : "absent";
}

export { getRandomGoodbyeMessage, DVo, call };
