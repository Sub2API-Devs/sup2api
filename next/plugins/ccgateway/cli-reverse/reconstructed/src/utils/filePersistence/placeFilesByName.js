/**
 * utils/filePersistence/placeFilesByName.ts
 *
 * 2.1.316 新增。按名字把文件放到用户 home 工作文件夹。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x1hcas72.js (9)
 * attribution: placement 9
 */
import { posix } from "path";
import { open, unlink, lstat, realpath } from "fs/promises";
import { constants } from "fs";
import {
  MAX_HOME_FILE_NAME_LENGTH,
  homePathProblem,
  checkHomeTarget,
  publishHomeFile,
} from "./homeFilePublish.js";
import { isWellFormedString } from "../stringUtils.js";
import { foldName } from "../permissions/protectedDirNames.js";
import { writtenInUploadsDir } from "../../bridge/inboundAttachments.js";
import { readPeerFileBounded } from "../peerFileReceive.js";
import { computeContentHash } from "../commitAttribution.js";
import { stageTmpStem, sweepStaleStageTmps } from "../stageFile.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { filesPlacedByNameRegistry } from "../../bootstrap/state.js";
import { nfc, PLACED_BY_NAME_LIMITS, ensurePlacedByNameRead, loadFilesPlacedByName } from "./placedByName.js";
import { sanitizeErrnoForTelemetry } from "../errors.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { sumByAliasField } from "../../services/artifacts/frameApi.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getHomeFilesRoot, STAGE_TMP_PREFIX } from "../stageFileRoots.js";
import { getCwd } from "../cwd.js";
import { isClaudeAiChatOrigin } from "../entrypointKinds.js";
import { isFirstPartyRemoteSession } from "../userDataRoots.js";
import { env } from "../env.js";
import { waitForAttachmentFiles } from "../../bridge/attachmentFilesWait.js";

//@ chunk-x1hcas72.js:1158-1434 placement
/**
 * placeFilesByName 的预算常量：PLACEMENT_TIME_BUDGET_MS=3000 是单次放置的默认时间预算（不是文件数），MAX_COPIED_BYTES=134217728 是字节预算；名字曾按“文件类型/复制上限”误起。
 */
var PLACEMENT_TIME_BUDGET_MS = 3000;
var COPIED_BYTES_LIMIT = 134217728;
var PLACEABLE_DATA_EXTENSIONS = new Set([
  "csv",
  "docx",
  "jsonl",
  "log",
  "md",
  "ndjson",
  "ods",
  "odt",
  "parquet",
  "pdf",
  "pptx",
  "rtf",
  "tsv",
  "txt",
  "xls",
  "xlsm",
  "xlsx",
  "zip",
]);
var PROJECT_FILE_NAMES = new Set([
  "cmakecache.txt",
  "cmakelists.txt",
  "conanfile.txt",
  "constraints.txt",
  "requirements.txt",
]);
var TEST_TEXT_FILE_RE = /^test.*\.txt$/;
//@ chunk-x1hcas72.js:1434-1754 placement
function fileNameRefusal(name) {
  if (name.includes(posix.sep)) return "has_directory";
  if (Buffer.byteLength(name) > MAX_HOME_FILE_NAME_LENGTH) return "too_long";
  if (!isWellFormedString(name)) return "odd_spelling";
  let problem = homePathProblem(name);
  if (problem !== undefined) return problem;
  let folded = foldName(name);
  let index = folded.lastIndexOf(".");
  if (index <= 0) return "no_suffix";
  if (!PLACEABLE_DATA_EXTENSIONS.has(folded.slice(index + 1))) return "not_data";
  return PROJECT_FILE_NAMES.has(folded) || TEST_TEXT_FILE_RE.test(folded) ? "project_file" : undefined;
}
//@ chunk-x1hcas72.js:1754-2415 placement
/**
 * 按名放置单个文件
 */
async function placeOneFile(homeDir, { fileUuid, name }, maxBytes) {
  let targetCheck = await checkHomeTarget(homeDir, name);
  if (targetCheck !== undefined)
    return {
      outcome:
        targetCheck.outcome === "refused_name" ? `refused_${targetCheck.refusal}` : targetCheck.outcome,
      bytes: 0,
    };
  let uploadSource = writtenInUploadsDir(fileUuid, undefined);
  if (uploadSource === undefined)
    return {
      outcome: "source_missing",
      bytes: 0,
    };
  if (uploadSource.size > maxBytes)
    return {
      outcome: "over_byte_budget",
      bytes: 0,
    };
  let bytes = await readPeerFileBounded(uploadSource.path, uploadSource.size);
  if (bytes === null)
    return {
      outcome: "source_unreadable",
      bytes: 0,
    };
  if (computeContentHash(bytes) !== uploadSource.sha256)
    return {
      outcome: "source_changed",
      bytes: 0,
    };
  let placeResult = await placeBytesAsHomeFile(homeDir, name, bytes, undefined);
  if (placeResult.outcome === "placed")
    await notePlacedCopy(
      homeDir,
      {
        fileUuid,
        name,
      },
      uploadSource,
    );
  return placeResult.outcome === "refused_name"
    ? {
        outcome: `refused_${placeResult.refusal}`,
        bytes: 0,
      }
    : {
        outcome: placeResult.outcome,
        bytes: placeResult.outcome === "placed" ? bytes.length : 0,
      };
}
//@ chunk-x1hcas72.js:2415-2485 placement
async function placeBytesAsHomeFile(homeDir, relativePath, bytes, judgedPaths) {
  return await withBytesInTemporaryFile(homeDir, relativePath, bytes, (stagePath) =>
    publishHomeFile(stagePath, homeDir, relativePath, judgedPaths),
  );
}
//@ chunk-x1hcas72.js:2485-2748 placement
async function withBytesInTemporaryFile(homeDir, relativePath, bytes, fn) {
  let joined = posix.join(
    homeDir,
    `${stageTmpStem(relativePath)}${Date.now()}.${Math.random().toString(36).slice(2)}`,
  );
  let handle = await open(
    joined,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
    384,
  );
  try {
    try {
      await handle.writeFile(bytes);
    } finally {
      await handle.close();
    }
    return await fn(joined);
  } finally {
    await unlink(joined).catch(() => {});
  }
}
//@ chunk-x1hcas72.js:2748-3151 placement
async function notePlacedCopy(homeDir, { fileUuid, name }, { size, sha256 }) {
  let registry = filesPlacedByNameRegistry();
  let registryKey = nfc(name);
  let joined = posix.join(homeDir, name);
  let previous = registry.get(registryKey);
  registry.delete(registryKey);
  let placedStat = await lstat(joined).catch(() => {
    return;
  });
  if (placedStat === undefined) return;
  let oldestKey = registry.size >= PLACED_BY_NAME_LIMITS && registry.keys().next().value;
  if (typeof oldestKey === "string") registry.delete(oldestKey);
  registry.set(registryKey, {
    path: joined,
    fileUuid: fileUuid.toLowerCase(),
    dev: placedStat.dev,
    ino: placedStat.ino,
    mtimeMs: Math.floor(placedStat.mtimeMs),
    size,
    sha256,
    ...(previous !== undefined &&
      previous.path !== joined && {
        ambiguous: true,
      }),
  });
}
//@ chunk-x1hcas72.js:3151-3283 placement
var EMPTY_PLACEMENT_STATS = {
  filesWait: "not_reached",
  filesWaitMs: 0,
  copiedBytes: 0,
  namedInCall: 0,
  namedInCallPlaced: 0,
  namedInCallAlreadyPresent: 0,
  counts: {},
};
//@ chunk-x1hcas72.js:3283-4680 placement
/**
 * 按名字把文件放到用户 home 工作文件夹。
 */
async function placeFilesByName(
  args,
  runContext,
  timeBudgetMs = PLACEMENT_TIME_BUDGET_MS,
  byteLimit = COPIED_BYTES_LIMIT,
) {
  let { fileNames } = args;
  if (fileNames === undefined) return;
  let startTime = performance.now();
  let { outcome, filesWait, counts, lastErrorCode, ...statsRest } =
    fileNames === "malformed"
      ? {
          ...EMPTY_PLACEMENT_STATS,
          outcome: "malformed",
        }
      : await placeFilesUnchecked(fileNames, args, runContext, timeBudgetMs, byteLimit).catch((error) => ({
          ...EMPTY_PLACEMENT_STATS,
          outcome: "failed",
          lastErrorCode: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        }));
  let filesListed = fileNames === "malformed" ? 0 : fileNames.length;
  let eventFields = {
    outcome: fromEnum(outcome),
    files_wait: fromEnum(filesWait),
    files_wait_ms: statsRest.filesWaitMs,
    duration_ms: Math.round(performance.now() - startTime),
    approx_copied_bytes: Number(statsRest.copiedBytes.toPrecision(2)),
    files_listed: filesListed,
    files_named_in_call: statsRest.namedInCall,
    files_named_in_call_placed: statsRest.namedInCallPlaced,
    files_named_in_call_already_present: statsRest.namedInCallAlreadyPresent,
    ...identityMap(counts, (outcomeName, outcomeCount) => `files_${outcomeCount}`),
    ...(lastErrorCode !== undefined && {
      last_error_code: lastErrorCode,
    }),
  };
  logEvent("tengu_turn_handoff_files_by_name", eventFields);
  logForDiagnosticsNoPII(
    lastErrorCode !== undefined || outcome === "malformed" ? "warn" : "info",
    "turn_handoff_files_by_name",
    eventFields,
  );
  let placedOrPresent =
    (counts.placed ?? 0) + (counts.already_present ?? 0) + (counts.present_under_another_name ?? 0);
  let refusedCount = sumByAliasField(Object.entries(counts), ([outcomeName, outcomeCount]) =>
    outcomeName.startsWith("refused_") || outcomeName === "repeated_name" || outcomeName === "path_occupied"
      ? outcomeCount
      : 0,
  );
  if (outcome === "aborted");
  else if (outcome === "not_applicable") logFeatureSad("ccr_turn_handoff_files_by_name", outcome);
  else if (outcome !== "finished") logFeatureBad("ccr_turn_handoff_files_by_name", outcome);
  else if (refusedCount === filesListed)
    logFeatureSad("ccr_turn_handoff_files_by_name", "all_skipped_by_rule");
  else if (placedOrPresent + refusedCount === filesListed) logFeatureOk("ccr_turn_handoff_files_by_name");
  else if (placedOrPresent > 0) logFeatureSad("ccr_turn_handoff_files_by_name", "some_files_absent");
  else logFeatureBad("ccr_turn_handoff_files_by_name", "all_files_absent");
}
//@ chunk-x1hcas72.js:4680-6337 placement
/**
 * 按名放置文件的主流程
 */
async function placeFilesUnchecked(fileNames, args, runContext, timeBudgetMs, byteBudget) {
  let homeFilesRoot = getHomeFilesRoot();
  let [cwdReal, homeRootReal] = await Promise.all(
    [getCwd(), homeFilesRoot].map((dir) =>
      realpath(dir).catch(() => {
        return;
      }),
    ),
  );
  if (
    !isClaudeAiChatOrigin() ||
    !isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND) ||
    homeRootReal === undefined ||
    cwdReal !== homeRootReal
  )
    return {
      ...EMPTY_PLACEMENT_STATS,
      outcome: "not_applicable",
    };
  let startTime = performance.now();
  let filesWait = await waitForAttachmentFiles(runContext);
  let filesWaitMs = Math.round(performance.now() - startTime);
  await sweepStaleStageTmps(homeFilesRoot, STAGE_TMP_PREFIX);
  await ensurePlacedByNameRead();
  let last = args.messages.at(-1);
  let toolInputStrings =
    last?.type === "assistant" && Array.isArray(last.message.content)
      ? last.message.content.flatMap((block) =>
          block.type === "tool_use" &&
          args.toolUseIDs.includes(block.id) &&
          typeof block.input === "object" &&
          block.input !== null
            ? Object.values(block.input).flatMap((inputValue) =>
                typeof inputValue === "string" ? [inputValue, inputValue.replaceAll("\\", "")] : [],
              )
            : [],
        )
      : [];
  let namedInCall = new Set(
    fileNames.filter(
      ({ name: fileName }) =>
        fileName !== "" && toolInputStrings.some((inputString) => inputString.includes(fileName)),
    ),
  );
  let nameToUuids = new Map();
  for (let { name: namedEntry, fileUuid } of fileNames)
    nameToUuids.set(namedEntry, (nameToUuids.get(namedEntry) ?? new Set()).add(fileUuid.toLowerCase()));
  let counts = {};
  let placedUuids = new Set();
  let copiedBytes = 0;
  let namedInCallPlaced = 0;
  let namedInCallAlreadyPresent = 0;
  let lastErrorCode;
  let aborted = false;
  let deadline = performance.now() + timeBudgetMs;
  for (let fileEntry of fileNames.toSorted(
    (leftEntry, rightEntry) => Number(namedInCall.has(rightEntry)) - Number(namedInCall.has(leftEntry)),
  )) {
    if (runContext.aborted) {
      aborted = true;
      break;
    }
    let refusal = fileNameRefusal(fileEntry.name);
    let fileOutcome;
    if (refusal !== undefined) fileOutcome = `refused_${refusal}`;
    else if (nameToUuids.get(fileEntry.name)?.size !== 1) fileOutcome = "repeated_name";
    else if (placedUuids.has(fileEntry.fileUuid.toLowerCase())) fileOutcome = "present_under_another_name";
    else if (performance.now() > deadline) fileOutcome = "over_time_budget";
    else
      try {
        let placeResult = await placeOneFile(homeFilesRoot, fileEntry, byteBudget - copiedBytes);
        fileOutcome = placeResult.outcome;
        copiedBytes += placeResult.bytes;
      } catch (error) {
        lastErrorCode = sanitizeErrnoForTelemetry(error) ?? lit("unknown");
        fileOutcome = "copy_failed";
      }
    counts[fileOutcome] = (counts[fileOutcome] ?? 0) + 1;
    if (fileOutcome === "placed" || fileOutcome === "already_present")
      placedUuids.add(fileEntry.fileUuid.toLowerCase());
    if (namedInCall.has(fileEntry) && fileOutcome === "placed") namedInCallPlaced++;
    else if (namedInCall.has(fileEntry) && fileOutcome === "already_present") namedInCallAlreadyPresent++;
  }
  if ((counts.placed ?? 0) > 0) await loadFilesPlacedByName();
  return {
    outcome: aborted ? "aborted" : "finished",
    filesWait,
    filesWaitMs,
    copiedBytes,
    namedInCall: namedInCall.size,
    namedInCallPlaced,
    namedInCallAlreadyPresent,
    counts,
    ...(lastErrorCode !== undefined && {
      lastErrorCode,
    }),
  };
}
export {
  placeBytesAsHomeFile,
  COPIED_BYTES_LIMIT,
  fileNameRefusal,
  withBytesInTemporaryFile,
  notePlacedCopy,
  placeFilesByName,
};
