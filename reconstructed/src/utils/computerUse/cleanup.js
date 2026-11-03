/**
 * utils/computerUse/cleanup.ts
 *
 * 回合结束时清理 computer-use：恢复隐藏的应用、注销 ESC 热键并发系统通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/cleanup.ts
 * pieces: chunk-ha3km179.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { bMs } from "./computerUseMcpState.js";
import { isComputerUseActiveThisTurn, clearComputerUseActiveThisTurn } from "../claudemd/contextRouting.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { unregisterEscHotkey } from "./escHotkey.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";

/**
 * 回合结束时等待 unhide 应用的上限 5s。
 */
//@ chunk-ha3km179.js:52183-52195 affinity
var UNHIDE_TIMEOUT_MS = 5000;
/**
 * 回合结束清理 computer-use：恢复本回合隐藏的应用（最多等 5s，超时上报 unhide_timeout），若本回合用过则注销 ESC 热键并产出系统通知 "Claude is done using your computer"。
 */
//@ chunk-ha3km179.js:52195-52979 fingerprint = cleanupComputerUseAfterTurn (0.693)
async function* cleanupComputerUseAfterTurn(ctx) {
  let cuSessionState = bMs(ctx.session),
    hidden = cuSessionState?.get()?.hiddenDuringTurn,
    hasHiddenApps = !!(hidden && hidden.size > 0),
    wasActiveThisTurn = isComputerUseActiveThisTurn();
  if (!hasHiddenApps && !wasActiveThisTurn) return;
  let unhideTimedOut = !1;
  if (hasHiddenApps) {
    let { unhideComputerUseApps: unhideComputerUseApps } = await import("./chunk-hrs3dad1.js"),
      unhideSettled = !1,
      R = unhideComputerUseApps([...hidden]).then(
        () => {
          unhideSettled = !0;
        },
        (err) => {
          ((unhideSettled = !0),
            logForDebugging(`[Computer Use MCP] auto-unhide failed: ${errorMessage(err)}`));
        },
      ),
      withResolvers = Promise.withResolvers(),
      timer = setTimeout(withResolvers.resolve, UNHIDE_TIMEOUT_MS);
    if ((await Promise.race([R, withResolvers.promise]).finally(() => clearTimeout(timer)), !unhideSettled))
      unhideTimedOut = !0;
    cuSessionState?.update((prev) =>
      prev?.hiddenDuringTurn === void 0 ? prev : { ...prev, hiddenDuringTurn: void 0 },
    );
  }
  if (wasActiveThisTurn) {
    try {
      unregisterEscHotkey();
    } catch (err) {
      logForDebugging(`[Computer Use MCP] unregisterEscHotkey failed: ${errorMessage(err)}`);
    }
    (clearComputerUseActiveThisTurn(),
      yield {
        type: "os_notification",
        message: "Claude is done using your computer",
        notificationType: "computer_use_exit",
      });
  }
  if (unhideTimedOut) logFeatureBad("computeruse_turn_cleanup", "unhide_timeout");
  else logFeatureOk("computeruse_turn_cleanup");
}

export { cleanupComputerUseAfterTurn };
