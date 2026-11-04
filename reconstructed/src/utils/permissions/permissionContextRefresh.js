/**
 * utils/permissions/permissionContextRefresh.ts
 *
 * 2.1.316 新增：权限上下文刷新与附加目录重建
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pc1rmcr2.js (6)
 * attribution: placement 6
 */
import { resolve } from "path";
import { hasPolicySettingsNotified } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import {
  isBypassPermissionsModeDisabled,
  createDisabledBypassPermissionsContext,
  isAutoModeInUse,
  isAutoModeDisabledByPolicySettings,
  createDisabledAutoModeContext,
  transitionPlanAutoMode,
  addDirsAreLauncherNamed,
} from "./permissionSetup.js";
import { SETTING_SOURCES } from "../settings/constants.js";
import {
  shouldAllowManagedPermissionRulesOnly,
  additionalDirectoryProvenance,
  loadTrustedAdditionalDirectoriesFromDisk,
} from "./permissionsLoader.js";
import { isSessionScopedRuleSource } from "./permissions.js";
import { getOriginalCwdOrNull } from "../../bootstrap/state.js";
import { getSettingsForSource } from "../settings/settings.js";
import { hasUntouchableRecordSpellingStrict } from "../fsOperations.js";
import { mappedDriveSpellings } from "../remoteEnvironment.js";
import { applyValidatedPermissionUpdate } from "./PermissionUpdate.js";
import { expandPath } from "../path.js";

//@ chunk-pc1rmcr2.js:1784-1813 placement
function whenPolicyNotified(callback) {
  if (hasPolicySettingsNotified()) callback();
}
//@ chunk-pc1rmcr2.js:1813-2173 placement
function refreshPermissionContext(toolPermissionContext, settings) {
  let nextContext = toolPermissionContext;
  if (nextContext.isBypassPermissionsModeAvailable && isBypassPermissionsModeDisabled())
    nextContext = createDisabledBypassPermissionsContext(nextContext);
  if (nextContext.strippedDangerousRules !== undefined) {
    let configSources = new Set(SETTING_SOURCES);
    let allowManagedOnly = !shouldAllowManagedPermissionRulesOnly();
    let stripped = {};
    for (let [key, value] of Object.entries(nextContext.strippedDangerousRules))
      if (value && (allowManagedOnly || key === "command") && !configSources.has(key))
        stripped[key] = [...value];
    nextContext = {
      ...nextContext,
      strippedDangerousRules: stripped,
    };
  }
  let autoModeDisabled = isAutoModeInUse(nextContext) && isAutoModeDisabledByPolicySettings();
  if (autoModeDisabled) nextContext = createDisabledAutoModeContext(nextContext);
  return {
    context: transitionPlanAutoMode(nextContext),
    exitedAutoMode: autoModeDisabled,
  };
}
//@ chunk-pc1rmcr2.js:2173-3602 placement
/**
 * 根据当前设置重建附加工作目录：新增、移除、保留来自磁盘信任的目录。
 */
function rebuildAdditionalDirectories(
  toolPermissionContext,
  directories,
  trustedAdditionalDirectoriesFromDisk,
  source,
  replaceAll = false,
  baseDir,
  provenance,
) {
  let declaredDirs = new Set(
    (directories ?? []).flatMap((directory) => safeNormalizedDirectories(directory, baseDir)),
  );
  let diskDirs = new Set(
    (trustedAdditionalDirectoriesFromDisk ?? []).flatMap((directory) => safeNormalizedDirectories(directory)),
  );
  let additionalWorkingDirectories = toolPermissionContext.additionalWorkingDirectories;
  let filtered = [...declaredDirs].filter(
    (directory) =>
      !diskDirs.has(directory) &&
      !isSessionScopedRuleSource(additionalWorkingDirectories.get(directory)?.source),
  );
  let filtered_2 = [...diskDirs].filter(
    (directory) =>
      (!declaredDirs.has(directory) || (replaceAll && !additionalWorkingDirectories.has(directory))) &&
      !isSessionScopedRuleSource(additionalWorkingDirectories.get(directory)?.source),
  );
  let originalCwdOrNull = getOriginalCwdOrNull();
  let { declared, repoOnly } = additionalDirectoryProvenance(
    (directory) => [
      ...(originalCwdOrNull === null ? [] : safeNormalizedDirectories(directory, originalCwdOrNull)),
      ...safeNormalizedDirectories(directory),
    ],
    provenance,
  );
  let sourceFor = (directory) => (repoOnly.has(directory) ? "projectSettings" : "localSettings");
  let filtered_3 = [...additionalWorkingDirectories.entries()].filter(
    ([directory, entry]) =>
      !isSessionScopedRuleSource(entry.source) &&
      !filtered.includes(directory) &&
      declared.has(directory) &&
      entry.source !== sourceFor(directory),
  );
  if (
    filtered.length === 0 &&
    filtered_2.length === 0 &&
    filtered_3.length === 0 &&
    source !== "flagSettings"
  )
    return toolPermissionContext;
  let nextContext = toolPermissionContext;
  if (filtered_3.length > 0) {
    let nextDirs = new Map(additionalWorkingDirectories);
    for (let [directory, entry] of filtered_3)
      nextDirs.set(directory, {
        ...entry,
        source: sourceFor(directory),
      });
    nextContext = {
      ...nextContext,
      additionalWorkingDirectories: nextDirs,
    };
  }
  if (source === "flagSettings") {
    let flagDirs = new Set(
      (getSettingsForSource("flagSettings")?.permissions?.additionalDirectories ?? []).flatMap((directory) =>
        safeNormalizedDirectories(directory),
      ),
    );
    let nextTrusted = new Map(nextContext.trustedNetworkDirectories ?? []);
    let changed = false;
    for (let key of [...nextTrusted.keys()])
      if (!flagDirs.has(key) && additionalWorkingDirectories.get(key)?.source !== "cliArg") {
        for (let spelling of nextTrusted.get(key) ?? []) if (spelling !== key) filtered.push(spelling);
        nextTrusted.delete(key);
        changed = true;
      }
    if (addDirsAreLauncherNamed()) {
      for (let directory of flagDirs)
        if (!nextTrusted.has(directory)) {
          if (hasUntouchableRecordSpellingStrict(directory)) continue;
          let mappedSpellings = mappedDriveSpellings(directory);
          if (mappedSpellings.length > 0) {
            nextTrusted.set(directory, mappedSpellings);
            for (let spelling of mappedSpellings) if (spelling !== directory) filtered_2.push(spelling);
            changed = true;
          }
        }
    }
    if (changed)
      nextContext = {
        ...nextContext,
        trustedNetworkDirectories: nextTrusted,
      };
  }
  if (filtered.length > 0)
    nextContext = applyValidatedPermissionUpdate(nextContext, {
      type: "removeDirectories",
      directories: filtered,
      destination: "localSettings",
    });
  if (filtered_2.length > 0)
    for (let destination of ["projectSettings", "localSettings"]) {
      let filtered = filtered_2.filter((directory) => sourceFor(directory) === destination);
      if (filtered.length > 0)
        nextContext = applyValidatedPermissionUpdate(nextContext, {
          type: "addDirectories",
          directories: filtered,
          destination,
        });
    }
  return nextContext;
}
//@ chunk-pc1rmcr2.js:3602-3877 placement
function mergeTrustedDirectories(toolPermissionContext, directories) {
  let diskDirs = new Set(
    loadTrustedAdditionalDirectoriesFromDisk().flatMap((directory) => safeNormalizedDirectories(directory)),
  );
  let additionalWorkingDirectories = toolPermissionContext.additionalWorkingDirectories;
  let filtered = directories.filter((directory) => {
    let entry = additionalWorkingDirectories.get(directory);
    return entry !== undefined && !diskDirs.has(directory) && !isSessionScopedRuleSource(entry.source);
  });
  if (filtered.length === 0) return toolPermissionContext;
  return applyValidatedPermissionUpdate(toolPermissionContext, {
    type: "removeDirectories",
    directories: filtered,
    destination: "localSettings",
  });
}
//@ chunk-pc1rmcr2.js:3941-3975 placement
function normalizeDirectoryPath(directory, baseDir) {
  return resolve(expandPath(directory, baseDir));
}
//@ chunk-pc1rmcr2.js:3975-4026 placement
function safeNormalizedDirectories(directory, baseDir) {
  try {
    return [normalizeDirectoryPath(directory, baseDir)];
  } catch {
    return [];
  }
}
export {
  refreshPermissionContext,
  rebuildAdditionalDirectories,
  whenPolicyNotified,
  mergeTrustedDirectories,
};
