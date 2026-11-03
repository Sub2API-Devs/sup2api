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
import { PGn, homePathProblem, checkHomeTarget, publishHomeFile } from "./homeFilePublish.js";
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
import { T4e } from "../../services/artifacts/frameApi.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getHomeFilesRoot, STAGE_TMP_PREFIX } from "../stageFileRoots.js";
import { getCwd } from "../cwd.js";
import { isClaudeAiChatOrigin } from "../entrypointKinds.js";
import { S1 } from "../userDataRoots.js";
import { env } from "../env.js";
import { waitForAttachmentFiles } from "../../bridge/attachmentFilesWait.js";

/**
 * 可放置文件类型
 */
//@ chunk-x1hcas72.js:1158-1434 placement
var PLACEABLE_FILE_TYPES = 3000,
  COPIED_BYTES_LIMIT = 134217728,
  z = new Set([
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
  ]),
  k = new Set(["cmakecache.txt", "cmakelists.txt", "conanfile.txt", "constraints.txt", "requirements.txt"]),
  X = /^test.*\.txt$/;
//@ chunk-x1hcas72.js:1434-1754 placement
function fileNameRefusal(e) {
  if (e.includes(posix.sep)) return "has_directory";
  if (Buffer.byteLength(e) > PGn) return "too_long";
  if (!isWellFormedString(e)) return "odd_spelling";
  let l = homePathProblem(e);
  if (l !== void 0) return l;
  let o = foldName(e),
    index = o.lastIndexOf(".");
  if (index <= 0) return "no_suffix";
  if (!z.has(o.slice(index + 1))) return "not_data";
  return k.has(o) || X.test(o) ? "project_file" : void 0;
}
/**
 * 按名放置单个文件
 */
//@ chunk-x1hcas72.js:1754-2415 placement
async function placeOneFile(e, { fileUuid: fileUuid, name: o }, d) {
  let r = await checkHomeTarget(e, o);
  if (r !== void 0)
    return { outcome: r.outcome === "refused_name" ? `refused_${r.refusal}` : r.outcome, bytes: 0 };
  let t = writtenInUploadsDir(fileUuid, void 0);
  if (t === void 0) return { outcome: "source_missing", bytes: 0 };
  if (t.size > d) return { outcome: "over_byte_budget", bytes: 0 };
  let s = await readPeerFileBounded(t.path, t.size);
  if (s === null) return { outcome: "source_unreadable", bytes: 0 };
  if (computeContentHash(s) !== t.sha256) return { outcome: "source_changed", bytes: 0 };
  let u = await placeBytesAsHomeFile(e, o, s, void 0);
  if (u.outcome === "placed") await notePlacedCopy(e, { fileUuid: fileUuid, name: o }, t);
  return u.outcome === "refused_name"
    ? { outcome: `refused_${u.refusal}`, bytes: 0 }
    : { outcome: u.outcome, bytes: u.outcome === "placed" ? s.length : 0 };
}
//@ chunk-x1hcas72.js:2415-2485 placement
async function placeBytesAsHomeFile(e, l, o, d) {
  return await withBytesInTemporaryFile(e, l, o, (r) => publishHomeFile(r, e, l, d));
}
//@ chunk-x1hcas72.js:2485-2748 placement
async function withBytesInTemporaryFile(e, l, o, d) {
  let joined = posix.join(e, `${stageTmpStem(l)}${Date.now()}.${Math.random().toString(36).slice(2)}`),
    t = await open(joined, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS, 384);
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
async function notePlacedCopy(e, { fileUuid: fileUuid, name: o }, { size: size, sha256: sha256 }) {
  let t = filesPlacedByNameRegistry(),
    s = nfc(o),
    joined = posix.join(e, o),
    h = t.get(s);
  t.delete(s);
  let w = await lstat(joined).catch(() => {
    return;
  });
  if (w === void 0) return;
  let S = t.size >= PLACED_BY_NAME_LIMITS && t.keys().next().value;
  if (typeof S === "string") t.delete(S);
  t.set(s, {
    path: joined,
    fileUuid: fileUuid.toLowerCase(),
    dev: w.dev,
    ino: w.ino,
    mtimeMs: Math.floor(w.mtimeMs),
    size: size,
    sha256: sha256,
    ...(h !== void 0 && h.path !== joined && { ambiguous: !0 }),
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
/**
 * 按名字把文件放到用户 home 工作文件夹。
 */
//@ chunk-x1hcas72.js:3283-4680 placement
async function placeFilesByName(e, l, o = PLACEABLE_FILE_TYPES, d = COPIED_BYTES_LIMIT) {
  let { fileNames: fileNames } = e;
  if (fileNames === void 0) return;
  let startTime = performance.now(),
    {
      outcome: outcome,
      filesWait: filesWait,
      counts: counts,
      lastErrorCode: lastErrorCode,
      ...S
    } = fileNames === "malformed"
      ? { ...EMPTY_PLACEMENT_STATS, outcome: "malformed" }
      : await placeFilesUnchecked(fileNames, e, l, o, d).catch((y) => ({
          ...EMPTY_PLACEMENT_STATS,
          outcome: "failed",
          lastErrorCode: sanitizeErrnoForTelemetry(y) ?? lit("unknown"),
        })),
    C = fileNames === "malformed" ? 0 : fileNames.length,
    F = {
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
      ...(lastErrorCode !== void 0 && { last_error_code: lastErrorCode }),
    };
  (logEvent("tengu_turn_handoff_files_by_name", F),
    logForDiagnosticsNoPII(
      lastErrorCode !== void 0 || outcome === "malformed" ? "warn" : "info",
      "turn_handoff_files_by_name",
      F,
    ));
  let I = (counts.placed ?? 0) + (counts.already_present ?? 0) + (counts.present_under_another_name ?? 0),
    T = T4e(Object.entries(counts), ([y, E]) =>
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
/**
 * 按名放置文件的主流程
 */
//@ chunk-x1hcas72.js:4680-6337 placement
async function placeFilesUnchecked(e, l, o, d, r) {
  let t = getHomeFilesRoot(),
    [s, u] = await Promise.all(
      [getCwd(), t].map((n) =>
        realpath(n).catch(() => {
          return;
        }),
      ),
    );
  if (
    !isClaudeAiChatOrigin() ||
    !S1(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND) ||
    u === void 0 ||
    s !== u
  )
    return { ...EMPTY_PLACEMENT_STATS, outcome: "not_applicable" };
  let startTime = performance.now(),
    w = await waitForAttachmentFiles(o),
    rounded = Math.round(performance.now() - startTime);
  (await sweepStaleStageTmps(t, STAGE_TMP_PREFIX), await ensurePlacedByNameRead());
  let at = l.messages.at(-1),
    F =
      at?.type === "assistant" && Array.isArray(at.message.content)
        ? at.message.content.flatMap((n) =>
            n.type === "tool_use" &&
            l.toolUseIDs.includes(n.id) &&
            typeof n.input === "object" &&
            n.input !== null
              ? Object.values(n.input).flatMap((p) =>
                  typeof p === "string" ? [p, p.replaceAll("\\", "")] : [],
                )
              : [],
          )
        : [],
    I = new Set(e.filter(({ name: n }) => n !== "" && F.some((p) => p.includes(n)))),
    T = new Map();
  for (let { name: n, fileUuid: fileUuid } of e)
    T.set(n, (T.get(n) ?? new Set()).add(fileUuid.toLowerCase()));
  let y = {},
    E = new Set(),
    O = 0,
    M = 0,
    L = 0,
    x,
    B = !1,
    D = performance.now() + d;
  for (let n of e.toSorted((p, _) => Number(I.has(_)) - Number(I.has(p)))) {
    if (o.aborted) {
      B = !0;
      break;
    }
    let p = fileNameRefusal(n.name),
      _;
    if (p !== void 0) _ = `refused_${p}`;
    else if (T.get(n.name)?.size !== 1) _ = "repeated_name";
    else if (E.has(n.fileUuid.toLowerCase())) _ = "present_under_another_name";
    else if (performance.now() > D) _ = "over_time_budget";
    else
      try {
        let P = await placeOneFile(t, n, r - O);
        ((_ = P.outcome), (O += P.bytes));
      } catch (error) {
        ((x = sanitizeErrnoForTelemetry(error) ?? lit("unknown")), (_ = "copy_failed"));
      }
    if (((y[_] = (y[_] ?? 0) + 1), _ === "placed" || _ === "already_present"))
      E.add(n.fileUuid.toLowerCase());
    if (I.has(n) && _ === "placed") M++;
    else if (I.has(n) && _ === "already_present") L++;
  }
  if ((y.placed ?? 0) > 0) await loadFilesPlacedByName();
  return {
    outcome: B ? "aborted" : "finished",
    filesWait: w,
    filesWaitMs: rounded,
    copiedBytes: O,
    namedInCall: I.size,
    namedInCallPlaced: M,
    namedInCallAlreadyPresent: L,
    counts: y,
    ...(x !== void 0 && { lastErrorCode: x }),
  };
}

export {
  placeBytesAsHomeFile,
  COPIED_BYTES_LIMIT,
  fileNameRefusal,
  withBytesInTemporaryFile,
  notePlacedCopy,
};
