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
import { getComputerUseOwner } from "./computerUseMcpState.js";
import { isComputerUseActiveThisTurn, clearComputerUseActiveThisTurn } from "../claudemd/contextRouting.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { unregisterEscHotkey } from "./escHotkey.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-ha3km179.js:52183-52195 affinity
/**
 * 回合结束时等待 unhide 应用的上限 5s。
 */
var UNHIDE_TIMEOUT_MS = 5000;
//@ chunk-ha3km179.js:52195-52979 fingerprint (2.1.88 match: cleanupComputerUseAfterTurn, 0.693)
/**
 * 回合结束清理 computer-use：恢复本回合隐藏的应用（最多等 5s，超时上报 unhide_timeout），若本回合用过则注销 ESC 热键并产出系统通知 "Claude is done using your computer"。
 */
async function* cleanupComputerUseAfterTurn(ctx) {
  let cuSessionState = getComputerUseOwner(ctx.session);
  let hidden = cuSessionState?.get()?.hiddenDuringTurn;
  let hasHiddenApps = !!(hidden && hidden.size > 0);
  let wasActiveThisTurn = isComputerUseActiveThisTurn();
  if (!hasHiddenApps && !wasActiveThisTurn) return;
  let unhideTimedOut = false;
  if (hasHiddenApps) {
    let { unhideComputerUseApps } = await import("./executor.js");
    let unhideSettled = false;
    let unhide = unhideComputerUseApps([...hidden]).then(
      () => {
        unhideSettled = true;
      },
      (err) => {
        unhideSettled = true;
        logForDebugging(`[Computer Use MCP] auto-unhide failed: ${errorMessage(err)}`);
      },
    );
    let timeout = Promise.withResolvers();
    let timer = setTimeout(timeout.resolve, UNHIDE_TIMEOUT_MS);
    await Promise.race([unhide, timeout.promise]).finally(() => clearTimeout(timer));
    if (!unhideSettled) unhideTimedOut = true;
    cuSessionState?.update((prev) =>
      prev?.hiddenDuringTurn === undefined
        ? prev
        : {
            ...prev,
            hiddenDuringTurn: undefined,
          },
    );
  }
  if (wasActiveThisTurn) {
    try {
      unregisterEscHotkey();
    } catch (err) {
      logForDebugging(`[Computer Use MCP] unregisterEscHotkey failed: ${errorMessage(err)}`);
    }
    clearComputerUseActiveThisTurn();
    yield {
      type: "os_notification",
      message: "Claude is done using your computer",
      notificationType: "computer_use_exit",
    };
  }
  if (unhideTimedOut) logFeatureBad("computeruse_turn_cleanup", "unhide_timeout");
  else logFeatureOk("computeruse_turn_cleanup");
}
export { cleanupComputerUseAfterTurn };
