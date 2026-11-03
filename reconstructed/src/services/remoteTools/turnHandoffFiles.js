/**
 * services/remoteTools/turnHandoffFiles.ts
 *
 * 2.1.316 新增：轮次交接文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-648dqenp.js (4)
 * attribution: placement 4
 */
import { posix } from "path";
import { open } from "fs/promises";
import {
  COPIED_BYTES_LIMIT,
  fileNameRefusal,
  withBytesInTemporaryFile,
  notePlacedCopy,
} from "../../utils/filePersistence/placeFilesByName.js";
import { filesPlacedByNameRegistry } from "../../bootstrap/state.js";
import { hasConflictingPlacedFile } from "../../utils/filePersistence/taskFileLookup.js";
import { isFilePersistenceEnabled } from "../../utils/filePersistence/filePersistence.js";
import {
  nfc,
  PLACED_BY_NAME_LIMITS,
  loadFilesPlacedByName,
} from "../../utils/filePersistence/placedByName.js";
import { sanitizeErrnoForTelemetry, getErrnoCode } from "../../utils/errors.js";
import { lit } from "../analytics/safeMetadata.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { logEvent } from "../analytics/index.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { getHomeFilesRoot } from "../../utils/stageFileRoots.js";
import {
  checkHomeTarget,
  publishHomeFile,
  removeIfUnchanged,
} from "../../utils/filePersistence/homeFilePublish.js";
import { writtenInUploadsDir } from "../../bridge/inboundAttachments.js";
import { readPeerFileBounded } from "../../utils/peerFileReceive.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { ws } from "../../utils/fsFlags.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { readHandleBounded } from "../../utils/fsSafety/boundOpen.js";

/**
 * 回合交接时，按文件名刷新先前放到 home 目录的文件：对名字被新文件占用的条目，读取上传目录里对应的新内容（校验哈希）原子替换，或在内容未变时移除，并记事件。
 */
//@ chunk-648dqenp.js:6159-6951 placement
async function refreshFilesPlacedByName(files, byteLimit = COPIED_BYTES_LIMIT) {
  let e = filesPlacedByNameRegistry();
  if (!hasConflictingPlacedFile(files) || !isFilePersistenceEnabled()) return;
  let startTime = performance.now(),
    r = new Map();
  for (let { fileUuid: fileUuid, name: i } of files) {
    let d = nfc(i);
    r.set(d, (r.get(d) ?? new Map()).set(fileUuid.toLowerCase(), fileUuid));
  }
  let s = {},
    f = 0,
    c;
  for (let [n, i] of r) {
    let d = e.get(n);
    if (d === void 0 || (i.size === 1 && i.has(d.fileUuid))) continue;
    e.delete(n);
    let [h] = i.size === 1 && !d.ambiguous ? i.values() : [],
      u;
    try {
      let p = await refreshPlacedFile(n, d, h, byteLimit - f);
      ((u = p.outcome), (f += p.bytes));
    } catch (error) {
      if (
        ((c = sanitizeErrnoForTelemetry(error) ?? lit("unknown")),
        (u = "failed"),
        !e.has(n) && e.size < PLACED_BY_NAME_LIMITS)
      )
        e.set(n, d);
    }
    s[u] = (s[u] ?? 0) + 1;
  }
  await loadFilesPlacedByName();
  let l = {
    duration_ms: Math.round(performance.now() - startTime),
    approx_copied_bytes: Number(f.toPrecision(2)),
    ...identityMap(s, (n, i) => `files_${i}`),
    ...(c !== void 0 && { last_error_code: c }),
  };
  (logEvent("tengu_turn_handoff_files_by_name_refresh", l),
    logForDiagnosticsNoPII(c !== void 0 ? "warn" : "info", "turn_handoff_files_by_name_refresh", l));
}
/**
 * 刷新一个按名放到 home 目录的文件：校验行信息后读取上传目录中的新内容（哈希一致），经临时文件原子替换并记录；无新内容时移除旧文件。
 */
//@ chunk-648dqenp.js:6951-7697 placement
async function refreshPlacedFile(name, row, fileUuid, byteLimit) {
  let homeRoot = getHomeFilesRoot(),
    base = posix.basename(row.path);
  if (
    row.path !== posix.join(homeRoot, base) ||
    nfc(base) !== name ||
    row.size > COPIED_BYTES_LIMIT ||
    fileNameRefusal(base) !== void 0 ||
    (await checkHomeTarget(homeRoot, base))?.outcome === "refused_name"
  )
    return { outcome: "row_refused", bytes: 0 };
  let upload = fileUuid === void 0 ? void 0 : writtenInUploadsDir(fileUuid, void 0),
    bytes =
      upload === void 0 || upload.size > byteLimit
        ? null
        : await readPeerFileBounded(upload.path, upload.size),
    verifiedBytes = bytes !== null && computeContentHash(bytes) === upload?.sha256 ? bytes : void 0;
  if (fileUuid === void 0 || upload === void 0 || verifiedBytes === void 0)
    return { outcome: (await removeIfStillPlaced(row)) ?? "removed", bytes: 0 };
  let started = !1;
  try {
    return await withBytesInTemporaryFile(homeRoot, base, verifiedBytes, async (tempPath) => {
      started = !0;
      let leftOutcome = await removeIfStillPlaced(row);
      if (leftOutcome !== void 0) return { outcome: leftOutcome, bytes: 0 };
      if ((await publishHomeFile(tempPath, homeRoot, base, void 0)).outcome !== "placed")
        return { outcome: "left_occupied", bytes: 0 };
      return (
        await notePlacedCopy(homeRoot, { fileUuid: fileUuid, name: base }, upload),
        { outcome: "refreshed", bytes: verifiedBytes.length }
      );
    });
  } catch (error) {
    if (!started) await removeIfStillPlaced(row).catch(() => {});
    throw error;
  }
}
//@ chunk-648dqenp.js:7697-7815 placement
async function removeIfStillPlaced(o) {
  let t = await checkPlacedFileUnchanged(o);
  if (typeof t === "string") return t;
  return (await removeIfUnchanged(o.path, t)) ? void 0 : "left_changed";
}
/**
 * 检查之前放置的文件是否未被改动（同一 inode、mtime、大小与哈希一致），返回最新 stat 或 left_gone/left_changed。
 */
//@ chunk-648dqenp.js:7815-8336 placement
async function checkPlacedFileUnchanged(row) {
  let handle;
  try {
    handle = await open(row.path, ws | READ_LIMITS);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return "left_gone";
    if (errnoCode === "ELOOP") return "left_changed";
    throw error;
  }
  try {
    let stats = await handle.stat();
    if (
      !stats.isFile() ||
      (!row.fromEarlierProcess && (stats.dev !== row.dev || stats.ino !== row.ino)) ||
      Math.floor(stats.mtimeMs) !== row.mtimeMs ||
      stats.size !== row.size
    )
      return "left_changed";
    let readResult = await readHandleBounded(handle, row.size, stats.size);
    if (readResult.overLimit || computeContentHash(readResult.bytes) !== row.sha256) return "left_changed";
    let stats_2 = await handle.stat();
    return stats_2.size === stats.size && stats_2.mtimeMs === stats.mtimeMs ? stats_2 : "left_changed";
  } finally {
    await handle.close();
  }
}
