/**
 * commands/passes/passes.tsx
 *
 * /passes 实现：记录首次访问并打开分享面板
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/passes/passes.tsx
 * pieces: chunk-aa3cndeh.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getCachedRemainingPasses } from "../../services/api/referral.js";
import { logEvent } from "../../services/analytics/index.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { GuestPassesDialog } from "./_new/GuestPassesContent.js";

/**
 * /passes 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-aa3cndeh.js:11146-11400 fingerprint = call (1)
async function call(onDone, context) {
  let isFirstVisit = !getGlobalConfig().hasVisitedPasses;
  if (isFirstVisit) {
    let remaining = getCachedRemainingPasses();
    await saveGlobalConfig(
      (current) => ({
        ...current,
        hasVisitedPasses: !0,
        passesLastSeenRemaining: remaining ?? current.passesLastSeenRemaining,
      }),
      context.storageV5,
    );
  }
  return (
    logEvent("tengu_guest_passes_visited", { is_first_visit: isFirstVisit }),
    e(GuestPassesDialog, { onDone: onDone })
  );
}
