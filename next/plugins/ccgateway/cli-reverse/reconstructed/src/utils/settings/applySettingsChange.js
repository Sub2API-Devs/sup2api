/**
 * utils/settings/applySettingsChange.ts
 *
 * 设置文件变更后刷新 AppState 中依赖设置的部分（权限上下文等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/applySettingsChange.ts
 * pieces: chunk-01b7fqej.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { createSignal } from "../signal.js";
import { getInitialSettings } from "./settings.js";
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
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { holdWorkingDirectoriesAsGiven } from "../permissions/filesystem.js";
import { isAwaySummaryEnabled } from "../../services/awaySummary.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-01b7fqej.js:1069-1094 placement
/**
 * settingsChangedSignal：设置变更信号。
 */
var settingsChangedSignal; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-01b7fqej.js:1069", () => {
  settingsChangedSignal = new SessionRootSlot(() => createSignal());
});
//@ chunk-01b7fqej.js:1094-1827 fingerprint (2.1.88 match: applySettingsChange, 0.366)
/**
 * 设置变更后刷新 AppState 中依赖设置的部分（权限上下文、模型等），日志 Settings changed from <source>, updating app state。
 */
function applySettingsChange(session, source, setState, provenance, options) {
  let newSettings = getInitialSettings();
  logForDebugging(`Settings changed from ${source}, updating app state`);
  resetLocalSettingsGitTrackedCache();
  let updatedRules = loadAllPermissionRulesFromDisk();
  updateHooksConfigSnapshot({
    userLayer: "retain",
  });
  clearCommandMemoizationCaches();
  let exitedAuto = false;
  setState((prev) => {
    let newContext = syncPermissionRulesFromDisk(prev.toolPermissionContext, updatedRules);
    newContext = rebuildAdditionalDirectories(
      newContext,
      prev.settings.permissions?.additionalDirectories,
      loadTrustedAdditionalDirectoriesFromDisk(),
      source,
      options?.trustFlip === true,
      options?.prevCwd,
      provenance,
    );
    let overlyBroad = refreshPermissionContext(newContext, updatedRules);
    newContext = overlyBroad.context;
    exitedAuto = overlyBroad.exitedAutoMode;
    if (newContext.blockReadsOutsideWorkingDirectories !== true && hasBlockReadsOutsideWorkingDirectories()) {
      newContext = {
        ...newContext,
        blockReadsOutsideWorkingDirectories: true,
      };
      markReadBlockApplied();
    }
    if (newContext.blockWritesOutsideWorkingDirectories !== true && isWriteBlockOn())
      newContext = withWriteBlockOn(newContext);
    let blockExemptPathsInSettings = readBlockExemptPathsInSettings();
    if (!import_sortedIndex_2(newContext.readBlockExemptPaths ?? [], blockExemptPathsInSettings))
      newContext = {
        ...newContext,
        readBlockExemptPaths: blockExemptPathsInSettings,
      };
    holdWorkingDirectoriesAsGiven();
    let awayEnabled = isAwaySummaryEnabled();
    return {
      ...prev,
      settings: newSettings,
      toolPermissionContext: newContext,
      ...(prev.awaySummaryEnabled !== awayEnabled && {
        awaySummaryEnabled: awayEnabled,
      }),
    };
  });
  if (exitedAuto && session !== undefined) settingsChangedSignal.of(session).emit();
}
export { settingsChangedSignal, applySettingsChange };
