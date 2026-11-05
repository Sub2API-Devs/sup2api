/**
 * commands/passes/passes.tsx
 *
 * /passes 实现：记录首次访问并打开分享面板
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/passes/passes.tsx
 * pieces: chunk-b38vrjgc.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getCachedRemainingPasses } from "../../services/api/referral.js";
import { logEvent } from "../../services/analytics/index.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { GuestPassesDialog } from "./GuestPassesContent.js";

//@ chunk-b38vrjgc.js:11484-11738 fingerprint (2.1.88 match: call, 1)
/**
 * /passes 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context) {
  let isFirstVisit = !getGlobalConfig().hasVisitedPasses;
  if (isFirstVisit) {
    let remaining = getCachedRemainingPasses();
    await saveGlobalConfig(
      (current) => ({
        ...current,
        hasVisitedPasses: true,
        passesLastSeenRemaining: remaining ?? current.passesLastSeenRemaining,
      }),
      context.storageV5,
    );
  }
  logEvent("tengu_guest_passes_visited", {
    is_first_visit: isFirstVisit,
  });
  return jsxProd_default(GuestPassesDialog, {
    onDone,
  });
}
export { call };
