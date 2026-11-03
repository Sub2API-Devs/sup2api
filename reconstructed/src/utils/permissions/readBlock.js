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
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
} from "path";
import { Qa } from "../../services/orgMemory/promptIndex.js";
import { ge } from "../identity.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { settingsGrantsConfined, repoResidentSettingSources } from "./permissionsLoader.js";
import { getSettingsForSource } from "../settings/settings.js";
import { isFullyQualifiedPath, containsPathTraversal, expandPathOrNull } from "../path.js";
import { hl } from "../networkPaths.js";
import { arraysEqual, uniq } from "../collections.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { getAutoMemPathSettingSource, hasNoAutoMemPath } from "../../memdir/paths.js";
import { F4t } from "../focusMode.js";

//@ chunk-82kqcve8.js:124030-124094 placement
function hasBlockReadsOutsideWorkingDirectories() {
  return Qa("blockReadsOutsideWorkingDirectories");
}
//@ chunk-82kqcve8.js:124094-124134 placement
var Za = ge({ value: !1 }, (e) => {
  e.value = !1;
});
//@ chunk-82kqcve8.js:124134-124236 placement
function isWriteBlockOn() {
  if (isCcsTenant()) return !1;
  return ((Za.value ||= Qa("blockWritesOutsideWorkingDirectories")), Za.value);
}
//@ chunk-82kqcve8.js:124236-124276 placement
var Ja = ge({ value: [] }, (e) => {
  e.value = [];
});
//@ chunk-82kqcve8.js:124276-124951 placement
function readBlockExemptPathsInSettings() {
  if (isCcsTenant() || settingsGrantsConfined()) return [];
  let e = getSettingsForSource("flagSettings")?.permissions?.blockReadsExemptPaths ?? [],
    flattened = e.flatMap((r) => {
      if (!isFullyQualifiedPath(r) || hl(r) || containsPathTraversal(r) || r.trim() !== r) return [];
      let s = expandPathOrNull(r);
      return s === null || expandPathOrNull(s) !== s || dirname_3(s) === s ? [] : [s];
    });
  if (!arraysEqual(e, Ja.value)) {
    if (((Ja.value = e), flattened.length > 0)) logFeatureOk("permission_block_outside_reads_exempt_paths");
    if (flattened.length < e.length)
      (logFeatureSad("permission_block_outside_reads_exempt_paths", "entry_ignored"),
        logForDebugging(
          `permissions.blockReadsExemptPaths: ignored ${e.length - flattened.length} of ${e.length} entries; each must be an absolute local path, not a filesystem root, with no ".." segment and no white space at either end, as written and once normalized`,
          { level: "warn" },
        ));
  }
  return uniq(flattened);
}
//@ chunk-82kqcve8.js:124951-125015 placement
function isAutoMemPathFromRepoSettings() {
  let e = getAutoMemPathSettingSource();
  return e !== void 0 && repoResidentSettingSources().includes(e);
}
//@ chunk-82kqcve8.js:125015-125055 placement
var Dr = ge({ value: !1 }, (e) => {
  e.value = !1;
});
//@ chunk-82kqcve8.js:125055-125088 placement
function markReadBlockApplied() {
  ((Dr.value = !0), F4t());
}
//@ chunk-82kqcve8.js:125088-125151 placement
function isReadBlockOn() {
  if (!Dr.value && hasBlockReadsOutsideWorkingDirectories()) Dr.value = !0;
  return Dr.value;
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
