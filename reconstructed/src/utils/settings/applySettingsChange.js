/**
 * utils/settings/applySettingsChange.ts
 *
 * 设置文件变更后刷新 AppState 中依赖设置的部分（权限上下文等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/applySettingsChange.ts
 * pieces: chunk-pc1rmcr2.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { createSignal } from "../signal.js";
import { getInitialSettings_2 } from "./settings.js";
import { logForDebugging } from "../debug.js";
import { resetLocalSettingsGitTrackedCache } from "../config.js";
import {
  loadAllPermissionRulesFromDisk,
  loadTrustedAdditionalDirectoriesFromDisk,
} from "../permissions/permissionsLoader.js";
import { updateHooksConfigSnapshot } from "../hooks/hooksConfigSnapshot.js";
import { clearCommandMemoizationCaches } from "../../commands.js";
import { syncPermissionRulesFromDisk } from "../permissions/permissions.js";
import {
  rebuildAdditionalDirectories,
  refreshPermissionContext,
} from "../permissions/permissionContextRefresh.js";
import {
  hasBlockReadsOutsideWorkingDirectories,
  markReadBlockApplied,
  isWriteBlockOn,
  readBlockExemptPathsInSettings,
} from "../permissions/readBlock.js";
import { withWriteBlockOn } from "../permissions/permissionSetup.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isAwaySummaryEnabled } from "../../services/awaySummary.js";

//@ chunk-pc1rmcr2.js:1032-1057 placement
var e_o = new SessionRootSlot(() => createSignal());
/**
 * 设置变更后刷新 AppState 中依赖设置的部分（权限上下文、模型等），日志 Settings changed from <source>, updating app state。
 */
//@ chunk-pc1rmcr2.js:1057-1784 fingerprint = applySettingsChange (0.366)
function applySettingsChange(e, r, o, d, u) {
  let newSettings = getInitialSettings_2();
  (logForDebugging(`Settings changed from ${r}, updating app state`), resetLocalSettingsGitTrackedCache());
  let updatedRules = loadAllPermissionRulesFromDisk();
  (updateHooksConfigSnapshot({ userLayer: "retain" }), clearCommandMemoizationCaches());
  let a = !1;
  if (
    (o((prev) => {
      let newContext = syncPermissionRulesFromDisk(prev.toolPermissionContext, updatedRules);
      newContext = rebuildAdditionalDirectories(
        newContext,
        prev.settings.permissions?.additionalDirectories,
        loadTrustedAdditionalDirectoriesFromDisk(),
        r,
        u?.trustFlip === !0,
        u?.prevCwd,
        d,
      );
      let overlyBroad = refreshPermissionContext(newContext, updatedRules);
      if (
        ((newContext = overlyBroad.context),
        (a = overlyBroad.exitedAutoMode),
        newContext.blockReadsOutsideWorkingDirectories !== !0 && hasBlockReadsOutsideWorkingDirectories())
      )
        ((newContext = { ...newContext, blockReadsOutsideWorkingDirectories: !0 }), markReadBlockApplied());
      if (newContext.blockWritesOutsideWorkingDirectories !== !0 && isWriteBlockOn())
        newContext = withWriteBlockOn(newContext);
      let g = readBlockExemptPathsInSettings();
      if (!En(newContext.readBlockExemptPaths ?? [], g))
        newContext = { ...newContext, readBlockExemptPaths: g };
      let h = isAwaySummaryEnabled();
      return {
        ...prev,
        settings: newSettings,
        toolPermissionContext: newContext,
        ...(prev.awaySummaryEnabled !== h && { awaySummaryEnabled: h }),
      };
    }),
    a && e !== void 0)
  )
    e_o.of(e).emit();
}

export { e_o, applySettingsChange };
