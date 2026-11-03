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
 * 可放置文件类型
 */
var PLACEABLE_FILE_TYPES = 3000;
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
function fileNameRefusal(e) {
  if (e.includes(posix.sep)) return "has_directory";
  if (Buffer.byteLength(e) > MAX_HOME_FILE_NAME_LENGTH) return "too_long";
  if (!isWellFormedString(e)) return "odd_spelling";
  let l = homePathProblem(e);
  if (l !== undefined) return l;
  let o = foldName(e);
  let index = o.lastIndexOf(".");
  if (index <= 0) return "no_suffix";
  if (!PLACEABLE_DATA_EXTENSIONS.has(o.slice(index + 1))) return "not_data";
  return PROJECT_FILE_NAMES.has(o) || TEST_TEXT_FILE_RE.test(o) ? "project_file" : undefined;
}
//@ chunk-x1hcas72.js:1754-2415 placement
/**
 * 按名放置单个文件
 */
async function placeOneFile(homeFilesRoot, { fileUuid, name: o }, d) {
  let r = await checkHomeTarget(homeFilesRoot, o);
  if (r !== undefined)
    return {
      outcome: r.outcome === "refused_name" ? `refused_${r.refusal}` : r.outcome,
      bytes: 0,
    };
  let t = writtenInUploadsDir(fileUuid, undefined);
  if (t === undefined)
    return {
      outcome: "source_missing",
      bytes: 0,
    };
  if (t.size > d)
    return {
      outcome: "over_byte_budget",
      bytes: 0,
    };
  let peerFileBounded = await readPeerFileBounded(t.path, t.size);
  if (peerFileBounded === null)
    return {
      outcome: "source_unreadable",
      bytes: 0,
    };
  if (computeContentHash(peerFileBounded) !== t.sha256)
    return {
      outcome: "source_changed",
      bytes: 0,
    };
  let u = await placeBytesAsHomeFile(homeFilesRoot, o, peerFileBounded, undefined);
  if (u.outcome === "placed")
    await notePlacedCopy(
      homeFilesRoot,
      {
        fileUuid,
        name: o,
      },
      t,
    );
  return u.outcome === "refused_name"
    ? {
        outcome: `refused_${u.refusal}`,
        bytes: 0,
      }
    : {
        outcome: u.outcome,
        bytes: u.outcome === "placed" ? peerFileBounded.length : 0,
      };
}
//@ chunk-x1hcas72.js:2415-2485 placement
async function placeBytesAsHomeFile(e, l, o, d) {
  return await withBytesInTemporaryFile(e, l, o, (r) => publishHomeFile(r, e, l, d));
}
//@ chunk-x1hcas72.js:2485-2748 placement
async function withBytesInTemporaryFile(e, l, o, d) {
  let joined = posix.join(e, `${stageTmpStem(l)}${Date.now()}.${Math.random().toString(36).slice(2)}`);
  let t = await open(joined, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS, 384);
  try {
    try {
      await t.writeFile(o);
    } finally {
      await t.close();
    }
    return await d(joined);
  } finally {
    await unlink(joined).catch(() => {});
  }
}
//@ chunk-x1hcas72.js:2748-3151 placement
async function notePlacedCopy(e, { fileUuid, name: o }, { size, sha256 }) {
  let t = filesPlacedByNameRegistry();
  let s = nfc(o);
  let joined = posix.join(e, o);
  let h = t.get(s);
  t.delete(s);
  let w = await lstat(joined).catch(() => {
    return;
  });
  if (w === undefined) return;
  let S = t.size >= PLACED_BY_NAME_LIMITS && t.keys().next().value;
  if (typeof S === "string") t.delete(S);
  t.set(s, {
    path: joined,
    fileUuid: fileUuid.toLowerCase(),
    dev: w.dev,
    ino: w.ino,
    mtimeMs: Math.floor(w.mtimeMs),
    size,
    sha256,
    ...(h !== undefined &&
      h.path !== joined && {
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
async function placeFilesByName(e, l, o = PLACEABLE_FILE_TYPES, d = COPIED_BYTES_LIMIT) {
  let { fileNames } = e;
  if (fileNames === undefined) return;
  let startTime = performance.now();
  let { outcome, filesWait, counts, lastErrorCode, ...S } =
    fileNames === "malformed"
      ? {
          ...EMPTY_PLACEMENT_STATS,
          outcome: "malformed",
        }
      : await placeFilesUnchecked(fileNames, e, l, o, d).catch((error) => ({
          ...EMPTY_PLACEMENT_STATS,
          outcome: "failed",
          lastErrorCode: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        }));
  let C = fileNames === "malformed" ? 0 : fileNames.length;
  let F = {
    outcome: fromEnum(outcome),
    files_wait: fromEnum(filesWait),
    files_wait_ms: S.filesWaitMs,
    duration_ms: Math.round(performance.now() - startTime),
    approx_copied_bytes: Number(S.copiedBytes.toPrecision(2)),
    files_listed: C,
    files_named_in_call: S.namedInCall,
    files_named_in_call_placed: S.namedInCallPlaced,
    files_named_in_call_already_present: S.namedInCallAlreadyPresent,
    ...identityMap(counts, (y, E) => `files_${E}`),
    ...(lastErrorCode !== undefined && {
      last_error_code: lastErrorCode,
    }),
  };
  logEvent("tengu_turn_handoff_files_by_name", F);
  logForDiagnosticsNoPII(
    lastErrorCode !== undefined || outcome === "malformed" ? "warn" : "info",
    "turn_handoff_files_by_name",
    F,
  );
  let I = (counts.placed ?? 0) + (counts.already_present ?? 0) + (counts.present_under_another_name ?? 0);
  let T = sumByAliasField(Object.entries(counts), ([y, E]) =>
    y.startsWith("refused_") || y === "repeated_name" || y === "path_occupied" ? E : 0,
  );
  if (outcome === "aborted");
  else if (outcome === "not_applicable") logFeatureSad("ccr_turn_handoff_files_by_name", outcome);
  else if (outcome !== "finished") logFeatureBad("ccr_turn_handoff_files_by_name", outcome);
  else if (T === C) logFeatureSad("ccr_turn_handoff_files_by_name", "all_skipped_by_rule");
  else if (I + T === C) logFeatureOk("ccr_turn_handoff_files_by_name");
  else if (I > 0) logFeatureSad("ccr_turn_handoff_files_by_name", "some_files_absent");
  else logFeatureBad("ccr_turn_handoff_files_by_name", "all_files_absent");
}
//@ chunk-x1hcas72.js:4680-6337 placement
/**
 * 按名放置文件的主流程
 */
async function placeFilesUnchecked(fileNames, l, o, d, r) {
  let homeFilesRoot = getHomeFilesRoot();
  let [s, u] = await Promise.all(
    [getCwd(), homeFilesRoot].map((n) =>
      realpath(n).catch(() => {
        return;
      }),
    ),
  );
  if (
    !isClaudeAiChatOrigin() ||
    !isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND) ||
    u === undefined ||
    s !== u
  )
    return {
      ...EMPTY_PLACEMENT_STATS,
      outcome: "not_applicable",
    };
  let startTime = performance.now();
  let filesWait = await waitForAttachmentFiles(o);
  let filesWaitMs = Math.round(performance.now() - startTime);
  await sweepStaleStageTmps(homeFilesRoot, STAGE_TMP_PREFIX);
  await ensurePlacedByNameRead();
  let last = l.messages.at(-1);
  let F =
    last?.type === "assistant" && Array.isArray(last.message.content)
      ? last.message.content.flatMap((n) =>
          n.type === "tool_use" &&
          l.toolUseIDs.includes(n.id) &&
          typeof n.input === "object" &&
          n.input !== null
            ? Object.values(n.input).flatMap((p) =>
                typeof p === "string" ? [p, p.replaceAll("\\", "")] : [],
              )
            : [],
        )
      : [];
  let I = new Set(fileNames.filter(({ name: n }) => n !== "" && F.some((p) => p.includes(n))));
  let T = new Map();
  for (let { name: n, fileUuid } of fileNames) T.set(n, (T.get(n) ?? new Set()).add(fileUuid.toLowerCase()));
  let y = {};
  let E = new Set();
  let O = 0;
  let M = 0;
  let L = 0;
  let x;
  let B = false;
  let D = performance.now() + d;
  for (let n of fileNames.toSorted((p, _) => Number(I.has(_)) - Number(I.has(p)))) {
    if (o.aborted) {
      B = true;
      break;
    }
    let p = fileNameRefusal(n.name);
    let _;
    if (p !== undefined) _ = `refused_${p}`;
    else if (T.get(n.name)?.size !== 1) _ = "repeated_name";
    else if (E.has(n.fileUuid.toLowerCase())) _ = "present_under_another_name";
    else if (performance.now() > D) _ = "over_time_budget";
    else
      try {
        let P = await placeOneFile(homeFilesRoot, n, r - O);
        _ = P.outcome;
        O += P.bytes;
      } catch (error) {
        x = sanitizeErrnoForTelemetry(error) ?? lit("unknown");
        _ = "copy_failed";
      }
    y[_] = (y[_] ?? 0) + 1;
    if (_ === "placed" || _ === "already_present") E.add(n.fileUuid.toLowerCase());
    if (I.has(n) && _ === "placed") M++;
    else if (I.has(n) && _ === "already_present") L++;
  }
  if ((y.placed ?? 0) > 0) await loadFilesPlacedByName();
  return {
    outcome: B ? "aborted" : "finished",
    filesWait,
    filesWaitMs,
    copiedBytes: O,
    namedInCall: I.size,
    namedInCallPlaced: M,
    namedInCallAlreadyPresent: L,
    counts: y,
    ...(x !== undefined && {
      lastErrorCode: x,
    }),
  };
}
export {
  placeBytesAsHomeFile,
  COPIED_BYTES_LIMIT,
  fileNameRefusal,
  withBytesInTemporaryFile,
  notePlacedCopy,
};
