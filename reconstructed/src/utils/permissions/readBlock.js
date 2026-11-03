/**
 * utils/permissions/readBlock.ts
 *
 * 读取拦截（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (10)
 * attribution: placement 10
 */
import { dirname } from "path";
import { isSettingEnabledInSources } from "../../services/orgMemory/promptIndex.js";
import { identity as identity_2 } from "../identity.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { settingsGrantsConfined, repoResidentSettingSources } from "./permissionsLoader.js";
import { getSettingsForSource } from "../settings/settings.js";
import { isFullyQualifiedPath, containsPathTraversal, expandPathOrNull } from "../path.js";
import { isUntouchableSpelling } from "../networkPaths.js";
import { arraysEqual, uniq } from "../collections.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { getAutoMemPathSettingSource, hasNoAutoMemPath } from "../../memdir/paths.js";
import { invalidateMemorySections } from "../focusMode.js";

//@ chunk-82kqcve8.js:124030-124094 placement
function hasBlockReadsOutsideWorkingDirectories() {
  return isSettingEnabledInSources("blockReadsOutsideWorkingDirectories");
}
//@ chunk-82kqcve8.js:124094-124134 placement
var writeBlockCachedState = identity_2(
  {
    value: false,
  },
  (e) => {
    e.value = false;
  },
);
//@ chunk-82kqcve8.js:124134-124236 placement
function isWriteBlockOn() {
  if (isCcsTenant()) return false;
  writeBlockCachedState.value ||= isSettingEnabledInSources("blockWritesOutsideWorkingDirectories");
  return writeBlockCachedState.value;
}
//@ chunk-82kqcve8.js:124236-124276 placement
var readBlockExemptCache = identity_2(
  {
    value: [],
  },
  (e) => {
    e.value = [];
  },
);
//@ chunk-82kqcve8.js:124276-124951 placement
function readBlockExemptPathsInSettings() {
  if (isCcsTenant() || settingsGrantsConfined()) return [];
  let blockReadsExemptPaths = getSettingsForSource("flagSettings")?.permissions?.blockReadsExemptPaths ?? [];
  let flattened = blockReadsExemptPaths.flatMap((blockReadsExemptPath) => {
    if (
      !isFullyQualifiedPath(blockReadsExemptPath) ||
      isUntouchableSpelling(blockReadsExemptPath) ||
      containsPathTraversal(blockReadsExemptPath) ||
      blockReadsExemptPath.trim() !== blockReadsExemptPath
    )
      return [];
    let s = expandPathOrNull(blockReadsExemptPath);
    return s === null || expandPathOrNull(s) !== s || dirname(s) === s ? [] : [s];
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
  return uniq(flattened);
}
//@ chunk-82kqcve8.js:124951-125015 placement
function isAutoMemPathFromRepoSettings() {
  let autoMemPathSettingSource = getAutoMemPathSettingSource();
  return (
    autoMemPathSettingSource !== undefined && repoResidentSettingSources().includes(autoMemPathSettingSource)
  );
}
//@ chunk-82kqcve8.js:125015-125055 placement
var readBlockAppliedState = identity_2(
  {
    value: false,
  },
  (e) => {
    e.value = false;
  },
);
//@ chunk-82kqcve8.js:125055-125088 placement
function markReadBlockApplied() {
  readBlockAppliedState.value = true;
  invalidateMemorySections();
}
//@ chunk-82kqcve8.js:125088-125151 placement
function isReadBlockOn() {
  if (!readBlockAppliedState.value && hasBlockReadsOutsideWorkingDirectories())
    readBlockAppliedState.value = true;
  return readBlockAppliedState.value;
}
//@ chunk-82kqcve8.js:125151-125195 placement
function isAutoMemReadFenced() {
  return isReadBlockOn() && (hasNoAutoMemPath() || isAutoMemPathFromRepoSettings());
}
export {
  markReadBlockApplied,
  isReadBlockOn,
  isAutoMemPathFromRepoSettings,
  isAutoMemReadFenced,
  readBlockExemptPathsInSettings,
  isWriteBlockOn,
  hasBlockReadsOutsideWorkingDirectories,
};
