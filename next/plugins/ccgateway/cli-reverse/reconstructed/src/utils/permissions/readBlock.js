/**
 * utils/permissions/readBlock.ts
 *
 * 读取拦截（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (13)
 * attribution: placement 12, layout 1
 */
import { dirname as dirname_2, resolve } from "path";
import { isSettingEnabledInSources } from "../../services/orgMemory/promptIndex.js";
import { identity as identity_2 } from "../identity.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { isFullyQualifiedPath, containsPathTraversal, expandPathOrNull } from "../path.js";
import { settingsGrantsConfined, repoResidentSettingSources } from "./permissionsLoader.js";
import { getSettingsForSource } from "../settings/settings.js";
import { isUntouchableSpelling } from "../networkPaths.js";
import { arraysEqual } from "../collections.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { normalizeCaseForComparison_2 } from "./filesystem.js";
import { identity } from "../pathClassification.js";
import { getAutoMemPathSettingSource, hasNoAutoMemPath } from "../../memdir/paths.js";
import { invalidateMemorySections } from "../focusMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:121490-121554 placement
function hasBlockReadsOutsideWorkingDirectories() {
  return isSettingEnabledInSources("blockReadsOutsideWorkingDirectories");
}
//@ chunk-a2q0x549.js:121554-121594 placement
var writeBlockCachedState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:121554", () => {
  writeBlockCachedState = identity_2(
    {
      value: false,
    },
    (state) => {
      state.value = false;
    },
  );
});
//@ chunk-a2q0x549.js:121594-121696 placement
function isWriteBlockOn() {
  if (isCcsTenant()) return false;
  writeBlockCachedState.value ||= isSettingEnabledInSources("blockWritesOutsideWorkingDirectories");
  return writeBlockCachedState.value;
}
//@ chunk-a2q0x549.js:121696-121801 layout
function normalizeReadPath(inputPath) {
  if (!isFullyQualifiedPath(inputPath) || containsPathTraversal(inputPath) || inputPath.trim() !== inputPath)
    return null;
  let expanded = expandPathOrNull(inputPath);
  return expanded === null || expandPathOrNull(expanded) !== expanded ? null : expanded;
}
//@ chunk-a2q0x549.js:121801-121841 placement
var readBlockExemptCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:121801", () => {
  readBlockExemptCache = identity_2(
    {
      value: [],
    },
    (state) => {
      state.value = [];
    },
  );
});
//@ chunk-a2q0x549.js:121841-122468 placement
function readBlockExemptPathsInSettings() {
  if (isCcsTenant() || settingsGrantsConfined()) return [];
  let blockReadsExemptPaths = getSettingsForSource("flagSettings")?.permissions?.blockReadsExemptPaths ?? [];
  let flattened = blockReadsExemptPaths.flatMap((blockReadsExemptPath) => {
    let expandedPath = isUntouchableSpelling(blockReadsExemptPath)
      ? null
      : normalizeReadPath(blockReadsExemptPath);
    return expandedPath === null || dirname_2(expandedPath) === expandedPath ? [] : [expandedPath];
  });
  if (!arraysEqual(blockReadsExemptPaths, readBlockExemptCache.value)) {
    readBlockExemptCache.value = blockReadsExemptPaths;
    if (flattened.length > 0) logFeatureOk("permission_block_outside_reads_exempt_paths");
    if (flattened.length < blockReadsExemptPaths.length) {
      logFeatureSad("permission_block_outside_reads_exempt_paths", "entry_ignored");
      logForDebugging(
        `permissions.blockReadsExemptPaths: ignored ${blockReadsExemptPaths.length - flattened.length} of ${blockReadsExemptPaths.length} entries; each must be an absolute local path, not a filesystem root, with no ".." segment and no white space at either end, as written and once normalized`,
        {
          level: "warn",
        },
      );
    }
  }
  return normalizeCaseForComparison_2(flattened);
}
//@ chunk-a2q0x549.js:122468-122508 placement
var reportedWorkingDirectories; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:122468", () => {
  reportedWorkingDirectories = identity_2(
    {
      value: [],
    },
    (state) => {
      state.value = [];
    },
  );
});
//@ chunk-a2q0x549.js:122508-123017 placement
/**
 * 读 flagSettings 的 permissions.workingDirectoriesAsGiven，校验规范形态，忽略的条目告警，结果缓存进 sl。
 */
function workingDirectoriesAsGivenInSettings() {
  if (isCcsTenant()) return [];
  let given = getSettingsForSource("flagSettings")?.permissions?.workingDirectoriesAsGiven ?? [];
  let flattened = given.flatMap((given) => {
    let normalized = normalizeReadPath(given);
    return normalized !== null && resolve(normalized) === identity(given) ? [normalized] : [];
  });
  if (flattened.length < given.length && !arraysEqual(given, reportedWorkingDirectories.value))
    logForDebugging(
      `permissions.workingDirectoriesAsGiven: ignored ${given.length - flattened.length} of ${given.length} entries; each must be an absolute path spelled exactly as the working directory is passed, normalized, with no ".." segment and, unless it is a root, no separator at its end`,
      {
        level: "warn",
      },
    );
  reportedWorkingDirectories.value = given;
  return normalizeCaseForComparison_2(flattened);
}
//@ chunk-a2q0x549.js:123017-123081 placement
function isAutoMemPathFromRepoSettings() {
  let autoMemPathSettingSource = getAutoMemPathSettingSource();
  return (
    autoMemPathSettingSource !== undefined && repoResidentSettingSources().includes(autoMemPathSettingSource)
  );
}
//@ chunk-a2q0x549.js:123081-123121 placement
var readBlockAppliedState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:123081", () => {
  readBlockAppliedState = identity_2(
    {
      value: false,
    },
    (state) => {
      state.value = false;
    },
  );
});
//@ chunk-a2q0x549.js:123121-123154 placement
function markReadBlockApplied() {
  readBlockAppliedState.value = true;
  invalidateMemorySections();
}
//@ chunk-a2q0x549.js:123154-123217 placement
function isReadBlockOn() {
  if (!readBlockAppliedState.value && hasBlockReadsOutsideWorkingDirectories())
    readBlockAppliedState.value = true;
  return readBlockAppliedState.value;
}
//@ chunk-a2q0x549.js:123217-123261 placement
function isAutoMemReadFenced() {
  return isReadBlockOn() && (hasNoAutoMemPath() || isAutoMemPathFromRepoSettings());
}
export {
  hasBlockReadsOutsideWorkingDirectories,
  markReadBlockApplied,
  isWriteBlockOn,
  readBlockExemptPathsInSettings,
  isReadBlockOn,
  workingDirectoriesAsGivenInSettings,
  isAutoMemPathFromRepoSettings,
  isAutoMemReadFenced,
};
