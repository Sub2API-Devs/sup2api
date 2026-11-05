/**
 * commands/stop/stop.ts
 *
 * 2.1.316 新增：/stop 命令：停止当前回合（桥接会话可跳过）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hhxd8j4d.js (1), chunk-ppewqv2a.js (1)
 * attribution: placement 2
 */
import { getRootSessionOverride } from "../../context/replRootContext.js";
import { stopBackgroundSession } from "../../utils/background/stopBackgroundSession.js";
import { noopBackgroundConfirm } from "../../screens/repl/backgroundConfirm.js";

//@ chunk-hhxd8j4d.js:13005-13135 placement
/**
 * 停止命令：关闭当前桥接，或停止 bridge 服务。
 */
async function callStopCommand(args, context) {
  let rootSessionOverride = getRootSessionOverride();
  if (rootSessionOverride !== null) {
    rootSessionOverride.close();
    return {
      type: "skip",
    };
  }
  await stopBackgroundSession("bridge", context.storageV5);
  return {
    type: "skip",
  };
}
//@ chunk-ppewqv2a.js:302-432 placement
/**
 * /stop 命令入口。
 */
async function call(onDone, context) {
  onDone();
  let rootSessionOverride = getRootSessionOverride();
  if (rootSessionOverride !== null) {
    rootSessionOverride.close();
    return null;
  }
  await stopBackgroundSession("stop_command", context.storageV5, noopBackgroundConfirm());
  return null;
}
export { call, callStopCommand };
