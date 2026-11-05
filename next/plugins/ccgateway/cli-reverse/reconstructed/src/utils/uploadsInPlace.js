/**
 * utils/uploadsInPlace.ts
 *
 * 就地上传记录（removed_chat_files）的登记与删除统计（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6jvva4a7.js (10), chunk-e8ezf3em.js (4)
 * attribution: placement 14
 */
import { realpath, readdir, lstat, open } from "fs/promises";
import { join, posix, basename, dirname } from "path";
import { constants } from "fs";
import { raceWithAbortSignal, withDeadline } from "./sleep.js";
import { getStageFileRoot, STAGE_FILE_MOUNT_PREFIX } from "./stageFileRoots.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "./errors.js";
import { openOwnedDirChain, probeNoFollowSupport, ensureAttachmentsDir } from "./safeMkdir.js";
import { computeContentHash, SHA256_HEX_RE } from "./commitAttribution.js";
import { removeIfUnchanged } from "./filePersistence/homeFilePublish.js";
import { logError } from "./log.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { env } from "./env.js";
import { getSessionUploadsDirOverride, isDiskless, getSessionId } from "../bootstrap/state.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "./fsFlags.js";
import { READ_LIMITS } from "./fsBoundRead.js";
import { readHandleBounded } from "./fsSafety/boundOpen.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { toJsonLine } from "./slowOperations.js";
import { isPlainObject } from "./isPlainObject.js";
import {
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
  isGrowthBookEnabled,
  hasFreshGrowthBookFeatures,
} from "../services/analytics/growthbook.js";
import { uploadsRootCandidates } from "./uploadsDir.js";
import { safeParseJSON } from "./json.js";
import { sha256OfFile } from "../bridge/inboundAttachmentSpill.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  zodStrictObject,
  array,
  stringSchema,
  numberSchema,
  unknown,
  objectSchema,
  _enum,
  record,
} from "../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6jvva4a7.js:1192-1322 placement
var UPLOADS_IN_PLACE_DIR = "/.uploads-in-place";
var UPLOAD_RECORD_PATH_PATTERN = /^\/\.uploads-in-place\/([0-9a-f]{32})\/([0-9a-f-]{36})-([0-9a-f]{64})$/;
var MAX_RECORDS = 500;
var MAX_REMOVABLE_BYTES = 31457280;
var PASS_TIMEOUT_MS = 1e4;
//@ chunk-6jvva4a7.js:1322-1555 placement
async function runStagedPassWithDeadline(signal) {
  let timeoutSignal = AbortSignal.timeout(PASS_TIMEOUT_MS);
  return raceWithAbortSignal(removeStagedDuplicates(timeoutSignal, signal), timeoutSignal, () =>
    Error("the pass is out of time"),
  ).catch(() => ({
    removed_count: 0,
    kept_changed_file_count: 0,
    kept_in_store_file_count: 0,
    failed_count: 1,
    whyFailed: "pass_deadline",
  }));
}
//@ chunk-6jvva4a7.js:1555-3682 placement
/**
 * 清理就地上传目录的一趟：列出上传目录、比对 store 记录与 md5，删除或保留并统计原因。
 */
async function removeStagedDuplicates(signal, changedUuids) {
  let report = {
    removed_count: 0,
    kept_changed_file_count: 0,
    kept_in_store_file_count: 0,
    failed_count: 0,
  };
  let ownedDirs = [];
  try {
    let root = await realpath(getStageFileRoot()).catch((error) => {
      if (getErrnoCode(error) !== "ENOENT") addFailure(report, sanitizeErrnoForTelemetry(error) ?? "unknown");
      return;
    });
    if (root === undefined) return report;
    let dirNames = [
      "",
      ...(
        await readdir(root, {
          withFileTypes: true,
        })
      )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name),
    ];
    let files = [];
    for (let dirName of dirNames) {
      let ownedDirChain = await openOwnedDirChain(join(root, dirName), 0);
      if (ownedDirChain === "absent") continue;
      if (typeof ownedDirChain === "string") {
        addFailure(report, ownedDirChain);
        continue;
      }
      ownedDirs.push(ownedDirChain);
      for (let dirent of await readdir(ownedDirChain.at, {
        withFileTypes: true,
      }))
        if (dirent.isFile())
          files.push({
            in: ownedDirChain,
            name: dirent.name,
            path: posix.join(STAGE_FILE_MOUNT_PREFIX, dirName, dirent.name),
          });
    }
    if (files.length === 0) return report;
    let [{ openFilestoreReader }, { hashStandingFile, sameFileUntouched }] = await Promise.all([
      import("./stageFile.js"),
      import("./stageFileStoreCheck.js"),
    ]);
    let opened = await openFilestoreReader(signal);
    if (!opened.ok) {
      addFailure(report, "no_store_credential");
      return report;
    }
    let { reader, facts } = opened;
    let listing = await reader.listDirectory(UPLOADS_IN_PLACE_DIR, {
      limit: MAX_RECORDS,
      recursive: true,
      signal,
    });
    if (!listing.ok) {
      if (!listing.notFound) addFailure(report, "records_not_read");
      return report;
    }
    if (listing.more) addFailure(report, "records_page_cut");
    let flattened = listing.directories.flatMap((directory) => {
      let [, md5, uuid, digest] = UPLOAD_RECORD_PATH_PATTERN.exec(directory) ?? [];
      return md5 !== undefined && uuid !== undefined && changedUuids.has(uuid)
        ? [
            {
              md5,
              d: digest,
            },
          ]
        : [];
    });
    let noFollowSupport = new Map();
    for (let file of files) {
      let contentHash = computeContentHash(`${facts.filesystemId}
${file.path}`);
      let filtered = flattened.filter((record) => record.d === contentHash);
      if (filtered.length === 0) continue;
      if (signal.aborted) {
        addFailure(report, "pass_deadline");
        break;
      }
      let filePath = join(file.in.at, file.name);
      let [stats, bigStats] = await Promise.all([
        lstat(filePath),
        lstat(filePath, {
          bigint: true,
        }),
      ]).catch(() => []);
      if (stats === undefined || bigStats === undefined) {
        addFailure(report, "look_failed");
        continue;
      }
      if (!stats.isFile() || stats.size > MAX_REMOVABLE_BYTES) {
        report.kept_changed_file_count++;
        continue;
      }
      let hashed = await hashStandingFile(filePath, bigStats);
      if (typeof hashed === "string") {
        addFailure(report, `hash_${hashed}`);
        continue;
      }
      if (!filtered.some((record) => record.md5 === hashed.md5)) {
        report.kept_changed_file_count++;
        continue;
      }
      let inStore = await facts.holdsAt(file.path, {
        signal,
      });
      if (inStore === "a_file") {
        report.kept_in_store_file_count++;
        continue;
      }
      if (inStore !== "nothing") {
        addFailure(report, "store_gave_no_answer");
        continue;
      }
      if (!noFollowSupport.has(file.in)) noFollowSupport.set(file.in, await probeNoFollowSupport(file.in));
      let support = noFollowSupport.get(file.in);
      if (support !== true) addFailure(report, support ?? "unknown");
      else if (
        !(await lstat(filePath, {
          bigint: true,
        }).then(
          (bigStats) => sameFileUntouched(hashed.opened, bigStats),
          () => false,
        ))
      )
        report.kept_changed_file_count++;
      else if (signal.aborted) addFailure(report, "pass_deadline");
      else if (await removeIfUnchanged(filePath, stats)) report.removed_count++;
      else addFailure(report, "unlink_failed");
    }
  } catch (error) {
    logError(error);
    addFailure(report, "staged_pass_threw");
  } finally {
    await Promise.all(ownedDirs.map((ownedDir) => ownedDir.release()));
  }
  return report;
}
//@ chunk-6jvva4a7.js:3682-3729 placement
function addFailure(report, whyFailed) {
  report.failed_count++;
  report.whyFailed = whyFailed;
}
//@ chunk-6jvva4a7.js:3729-3862 placement
var SAVED_UPLOADS_FILE = ".saved-uploads.jsonl";
var MAX_RECORD_FILE_BYTES = 1048576;
var ISO_TIME_PATTERN = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$/;
var MAX_RECORD_AGE_MS = 86400000;
var CLOCK_SKEW_MS = 300000;
var FLAGS_WAIT_MS = 2000;
//@ chunk-6jvva4a7.js:3862-4041 placement
function isBridgeUploadsEnabled() {
  return (
    (isRemoteManagedEnvironment() ||
      (env.CLAUDE_CODE_REMOTE === true && env.CLAUDE_CODE_ENVIRONMENT_KIND === "anthropic_cloud")) &&
    env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted" &&
    getSessionUploadsDirOverride() === null &&
    !isDiskless()
  );
}
//@ chunk-6jvva4a7.js:4041-4314 placement
async function readRecordFile(dir) {
  let handle = await open(join(dir, SAVED_UPLOADS_FILE), NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS).catch(
    (error) => (getErrnoCode(error) === "ENOENT" ? "" : undefined),
  );
  if (typeof handle !== "object") return handle;
  try {
    let stats = await handle.stat();
    let data = stats.isFile()
      ? await readHandleBounded(handle, MAX_RECORD_FILE_BYTES, stats.size)
      : undefined;
    return data === undefined || data.overLimit ? undefined : data.bytes.toString("utf8");
  } finally {
    await handle.close();
  }
}
//@ chunk-6jvva4a7.js:4314-4918 placement
/**
 * 把一次删除的附件补记到 .saved-uploads.jsonl，已记过则跳过。
 */
async function recordSavedUpload(fileUuid, { path, sha256, size }, alreadyOwned = false) {
  try {
    if (!isBridgeUploadsEnabled() || basename(path) === SAVED_UPLOADS_FILE) return false;
    let dir = alreadyOwned
      ? await openOwnedDirChain(dirname(path), 0)
      : await ensureAttachmentsDir(dirname(path));
    if (typeof dir === "string") {
      logFeatureSad("bridge_attachment_deleted_copy", dir);
      return false;
    }
    try {
      let existing = await readRecordFile(dir.at);
      if (existing === undefined) {
        logFeatureSad("bridge_attachment_deleted_copy", "record_unreadable");
        return false;
      }
      let jsonLine = toJsonLine({
        name: basename(path),
        file_uuid: fileUuid,
        sha256,
        size,
      });
      if (existing.includes(jsonLine)) return true;
      let handle = await open(
        join(dir.at, SAVED_UPLOADS_FILE),
        constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS,
        384,
      );
      try {
        await handle.appendFile(jsonLine);
      } finally {
        await handle.close();
      }
      return true;
    } finally {
      await dir.release();
    }
  } catch (error) {
    logError(error);
    logFeatureSad("bridge_attachment_deleted_copy", "not_recorded");
    return false;
  }
}
//@ chunk-6jvva4a7.js:4918-7337 placement
/**
 * 按控制面给出的 removed_chat_files 与 feature flag 决定哪些上传可清理，逐目录执行并汇总计数。
 */
async function removeDeletedChatFiles(restoredWorkerState, options) {
  let report = options?.report ?? reportDeletedCopyRemoval;
  let idsToReport = new Set();
  try {
    let removedChatFiles = restoredWorkerState?.internal?.removed_chat_files;
    if (!isPlainObject(removedChatFiles) || !isBridgeUploadsEnabled()) return idsToReport;
    let keys = Object.keys(removedChatFiles);
    if (keys.length === 0) return idsToReport;
    let now = Date.now();
    let mapped = keys.map((key) => {
      let value = removedChatFiles[key];
      return {
        id: key.toLowerCase(),
        age: typeof value === "string" && ISO_TIME_PATTERN.test(value) ? now - Date.parse(value) : Number.NaN,
      };
    });
    let unknownAge = new Set(mapped.filter(({ age }) => !(age >= -CLOCK_SKEW_MS)).map(({ id }) => id));
    let tooOld = new Set(
      mapped.filter(({ id, age }) => age > MAX_RECORD_AGE_MS && !unknownAge.has(id)).map(({ id }) => id),
    );
    let removable = new Set(
      mapped.map(({ id }) => id).filter((id) => !unknownAge.has(id) && !tooOld.has(id)),
    );
    let removeEnabled = true;
    let reportEnabled = false;
    if (options === undefined) {
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        FLAGS_WAIT_MS,
      );
      removeEnabled = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_hamming", false) === true;
      reportEnabled = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_kepler", false) === true;
      if (!removeEnabled && !reportEnabled) {
        if (isGrowthBookEnabled() && !hasFreshGrowthBookFeatures()) report("sad", "flags_not_fetched");
        return idsToReport;
      }
    }
    if (removeEnabled) idsToReport = removable;
    let stats = {
      listed_count: removable.size,
      too_old_count: tooOld.size,
      recorded_count: 0,
      removed_count: 0,
      kept_changed_file_count: 0,
      staged_removed_count: 0,
      kept_in_store_file_count: 0,
      failed_count: unknownAge.size,
    };
    let whyFailed = mapped.some(({ age }) => Number.isNaN(age))
      ? "list_value_unknown"
      : "check_ahead_of_clock";
    let dirs =
      options === undefined
        ? uploadsRootCandidates().map((root) => join(root, getSessionId()))
        : [options.folder];
    for (let dir of removeEnabled && removable.size > 0 ? dirs : []) {
      let ownedDirChain = await openOwnedDirChain(dir, 0);
      if (ownedDirChain === "absent") continue;
      if (typeof ownedDirChain === "string") {
        stats.failed_count++;
        whyFailed = ownedDirChain;
        continue;
      }
      try {
        let filtered = (await readRecordFile(ownedDirChain.at))
          ?.split(
            `
`,
          )
          .filter((line) => line !== "");
        let flattened = (filtered ?? []).flatMap((line) => {
          let record = safeParseJSON(line, false);
          return isPlainObject(record) &&
            typeof record.name === "string" &&
            typeof record.file_uuid === "string"
            ? [
                {
                  name: record.name,
                  file_uuid: record.file_uuid,
                  sha256: record.sha256,
                  size: record.size,
                },
              ]
            : [];
        });
        if (flattened.length !== filtered?.length) {
          stats.failed_count++;
          whyFailed = "record_unreadable";
          continue;
        }
        let keptNames = new Set(
          flattened
            .filter((record) => !removable.has(record.file_uuid.toLowerCase()))
            .map((record) => record.name),
        );
        let presentNames = new Set(await readdir(ownedDirChain.at));
        let unused;
        for (let name of new Set(flattened.map((record) => record.name))) {
          if (keptNames.has(name)) continue;
          stats.recorded_count++;
          if (!presentNames.has(name)) continue;
          let filePath = join(ownedDirChain.at, name);
          let fileStats = await lstat(filePath).catch(() => {
            return;
          });
          if (fileStats === undefined) {
            stats.failed_count++;
            whyFailed = "look_failed";
            continue;
          }
          let filtered = flattened.filter(
            (sameNameRecord) => sameNameRecord.name === name && sameNameRecord.size === fileStats.size,
          );
          let fileSha256 =
            fileStats.isFile() && filtered.length > 0
              ? await sha256OfFile(filePath, fileStats.size, fileStats)
              : null;
          if (
            fileSha256 === null ||
            !filtered.some((sameNameRecordForSha) => sameNameRecordForSha.sha256 === fileSha256)
          ) {
            stats.kept_changed_file_count++;
            continue;
          }
          unused ??= await probeNoFollowSupport(ownedDirChain);
          if (unused !== true) {
            stats.failed_count++;
            whyFailed = unused;
          } else if (await removeIfUnchanged(filePath, fileStats)) stats.removed_count++;
          else {
            stats.failed_count++;
            whyFailed = "unlink_failed";
          }
        }
      } finally {
        await ownedDirChain.release();
      }
    }
    if (reportEnabled && removable.size > 0) {
      let stagedPass = await runStagedPassWithDeadline(removable);
      stats.staged_removed_count = stagedPass.removed_count;
      stats.kept_in_store_file_count = stagedPass.kept_in_store_file_count;
      stats.kept_changed_file_count += stagedPass.kept_changed_file_count;
      stats.failed_count += stagedPass.failed_count;
      whyFailed = stagedPass.whyFailed ?? whyFailed;
    }
    if (stats.failed_count > 0) report("sad", whyFailed, stats);
    else report("ok", undefined, stats);
  } catch (error) {
    logError(error);
    report("bad", "threw");
  }
  return idsToReport;
}
//@ chunk-6jvva4a7.js:7337-7529 placement
function reportDeletedCopyRemoval(outcome, reason, stats) {
  if (outcome === "ok") logFeatureOk("bridge_attachment_deleted_copy", stats);
  else if (outcome === "sad") logFeatureSad("bridge_attachment_deleted_copy", reason ?? "unknown", stats);
  else logFeatureBad("bridge_attachment_deleted_copy", reason ?? "unknown");
}
//@ chunk-e8ezf3em.js:5684-5896 placement
var UploadListSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e8ezf3em.js:5684", () => {
  UploadListSchema = DoctorLazy(() =>
    zodStrictObject({
      files: array(
        zodStrictObject({
          name: stringSchema().min(1),
          file_uuid: stringSchema().min(1).max(64),
          sha256: stringSchema().regex(SHA256_HEX_RE).optional(),
          size: numberSchema().int().nonnegative().optional(),
        }).refine((file) => (file.sha256 === undefined) === (file.size === undefined)),
      ).max(1000),
    }),
  );
});
//@ chunk-e8ezf3em.js:5896-6130 placement
/**
 * 登记已保存的上传（noteSavedUploadsHere）：逐个校验并计数。
 */
async function noteUploadedFiles(args, isInScope) {
  let { files } = UploadListSchema().parse(args);
  let notedCount = 0;
  for (let { name: entry, file_uuid: fileUuid, sha256, size } of files)
    if (
      isInScope(entry) &&
      (await recordSavedUpload(
        fileUuid,
        {
          path: posix.join(getStageFileRoot(), entry),
          sha256,
          size,
        },
        true,
      ))
    )
      notedCount++;
  return {
    summary: `noted ${notedCount} of ${files.length} files`,
    output: {
      noted: notedCount,
    },
  };
}
//@ chunk-e8ezf3em.js:6130-6294 placement
var RemovedChatFilesArgsSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PassResultSchema;
deferInit("chunk-e8ezf3em.js:6130", () => {
  RemovedChatFilesArgsSchema = DoctorLazy(() =>
    zodStrictObject({
      removed_chat_files: unknown().optional(),
    }),
  );
  PassResultSchema = DoctorLazy(() =>
    objectSchema({
      status: _enum(["ok", "sad", "bad", "nothing_done"]),
      reason: stringSchema().optional(),
      counts: record(stringSchema(), numberSchema()).optional(),
    }),
  );
});
//@ chunk-e8ezf3em.js:6294-6536 placement
/**
 * 按 removed_chat_files 删除已删除的上传并汇总状态。
 */
async function removeDeletedChatFilesHandler(args) {
  let { removed_chat_files: removedChatFiles } = RemovedChatFilesArgsSchema().parse(args);
  let result = {
    status: "nothing_done",
  };
  await removeDeletedChatFiles(
    {
      external: null,
      internal: {
        removed_chat_files: removedChatFiles,
      },
    },
    {
      folder: getStageFileRoot(),
      report: (status, reason, counts) => {
        result = {
          status,
          reason,
          counts,
        };
      },
    },
  );
  return {
    summary: result.status,
    output: result,
  };
}
export { removeDeletedChatFiles, recordSavedUpload, noteUploadedFiles, removeDeletedChatFilesHandler };
