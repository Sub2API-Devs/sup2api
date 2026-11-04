/**
 * utils/filePersistence/placedByName.ts
 *
 * 2.1.316 新增：按名称放置文件的表读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-azz22fvc.js (11)
 * attribution: placement 11
 */
import { join, dirname } from "path";
import { unlink, open } from "fs/promises";
import { sessionUploadsDir, uploadsRootCandidates, getUploadsDir } from "../uploadsDir.js";
import {
  getSessionUploadsDirOverride,
  getSessionId,
  filesPlacedByNameRead,
  filesPlacedByNameRegistry,
  setFilesPlacedByNameRead,
} from "../../bootstrap/state.js";
import { openOwnedDirChain, probeNoFollowSupport, ensureAttachmentsDir } from "../safeMkdir.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { sanitizeErrnoForTelemetry, getErrnoCode } from "../errors.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { readHandleBounded } from "../fsSafety/boundOpen.js";
import { PS_REFUSED_INPUT_FIELDS } from "../../tools/PowerShellTool/prompt.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-azz22fvc.js:1223-1272 placement
var PLACED_BY_NAME_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_PLACED_TABLE_BYTES;
var DAMAGED_TABLE_ERRNOS;
deferInit("chunk-azz22fvc.js:1223", () => {
  PLACED_BY_NAME_LIMITS = 64;
  MAX_PLACED_TABLE_BYTES = 262144;
  DAMAGED_TABLE_ERRNOS = new Set(["ELOOP", "ENXIO"]);
});
//@ chunk-azz22fvc.js:1272-1314 placement = setCwdState (1)
function nfc(cwd) {
  return cwd.normalize("NFC");
}
//@ chunk-azz22fvc.js:1635-1664 placement
var PLACED_BY_NAME_FILE_NAME = ".placed-by-name.json";
//@ chunk-azz22fvc.js:1664-1777 placement
function placedTablePaths() {
  let uploadsDir = sessionUploadsDir();
  return [
    uploadsDir,
    ...(getSessionUploadsDirOverride() === null
      ? uploadsRootCandidates()
          .map((baseDir) => join(baseDir, getSessionId()))
          .filter((candidate) => candidate !== uploadsDir)
      : []),
  ].map((baseDir) => join(baseDir, PLACED_BY_NAME_FILE_NAME));
}
//@ chunk-azz22fvc.js:1777-1952 placement
async function removePlacedTable(tablePath) {
  if (dirname(tablePath) === getUploadsDir()) {
    await unlink(join(tablePath, PLACED_BY_NAME_FILE_NAME));
    return;
  }
  let dirRef = await openOwnedDirChain(tablePath, 0);
  if (typeof dirRef !== "string")
    try {
      if ((await probeNoFollowSupport(dirRef)) === true)
        await unlink(join(dirRef.at, PLACED_BY_NAME_FILE_NAME));
    } finally {
      await dirRef.release();
    }
}
//@ chunk-azz22fvc.js:1952-2352 placement
async function loadFilesPlacedByName() {
  if (filesPlacedByNameRead() !== "done") {
    logForDiagnosticsNoPII("warn", "turn_handoff_files_by_name_table", {
      state: "not_stored",
      error_code: lit("table_unread"),
    });
    return;
  }
  try {
    let attachmentsDir = await ensureAttachmentsDir(sessionUploadsDir());
    try {
      await writeFileAtomic(
        join(attachmentsDir.at, PLACED_BY_NAME_FILE_NAME),
        jsonStringify([...filesPlacedByNameRegistry()]),
        384,
      );
    } finally {
      await attachmentsDir.release();
    }
    await Promise.allSettled(
      placedTablePaths()
        .slice(1)
        .map((tablePath) => removePlacedTable(dirname(tablePath))),
    );
  } catch (error) {
    logForDiagnosticsNoPII("warn", "turn_handoff_files_by_name_table", {
      state: "not_stored",
      error_code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
    });
  }
}
//@ chunk-azz22fvc.js:2352-2713 placement
function isPlacedEntry(entry) {
  if (!Array.isArray(entry) || entry.length !== 2) return false;
  let [key, value] = entry;
  if (typeof key !== "string" || typeof value !== "object" || value === null) return false;
  let { path, fileUuid, dev, ino, mtimeMs, size, sha256, ambiguous } = value;
  return (
    typeof path === "string" &&
    typeof fileUuid === "string" &&
    [dev, ino, mtimeMs, size].every((field) => typeof field === "number" && Number.isFinite(field)) &&
    typeof sha256 === "string" &&
    (ambiguous === undefined || ambiguous === true)
  );
}
//@ chunk-azz22fvc.js:2713-2950 placement
function ensurePlacedByNameRead() {
  let cached = filesPlacedByNameRead();
  if (cached !== undefined) return cached === "done" ? Promise.resolve() : cached;
  let firstRead = readFirstPlacedTable().then((firstPlacedTable) => {
    setFilesPlacedByNameRead(firstPlacedTable.state === "table_unread" ? undefined : "done");
    if (firstPlacedTable.state !== "table_absent")
      logForDiagnosticsNoPII("info", "turn_handoff_files_by_name_table", firstPlacedTable);
  });
  setFilesPlacedByNameRead(firstRead);
  return firstRead;
}
//@ chunk-azz22fvc.js:2950-3112 placement
async function readFirstPlacedTable() {
  let [firstPath, ...otherPaths] = placedTablePaths();
  let placedTable = await readPlacedTable(firstPath);
  if (placedTable.state !== "table_absent") return placedTable;
  for (let otherPath of otherPaths) {
    let placedTable = await readPlacedTable(otherPath);
    if (placedTable.state === "table_read") return placedTable;
  }
  return placedTable;
}
//@ chunk-azz22fvc.js:3112-3933 placement
async function readPlacedTable(tablePath) {
  let entries;
  try {
    let handle = await open(tablePath, NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    try {
      let stats = await handle.stat();
      let parseResult =
        stats.isFile() && stats.size <= MAX_PLACED_TABLE_BYTES
          ? await readHandleBounded(handle, MAX_PLACED_TABLE_BYTES, stats.size)
          : undefined;
      entries =
        parseResult === undefined || parseResult.overLimit
          ? undefined
          : jsonParse(parseResult.bytes.toString("utf8"));
    } finally {
      await handle.close();
    }
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return {
      state:
        errnoCode === "ENOENT"
          ? "table_absent"
          : errnoCode === undefined || DAMAGED_TABLE_ERRNOS.has(errnoCode)
            ? "table_damaged"
            : "table_unread",
      rows: 0,
    };
  }
  if (!Array.isArray(entries) || entries.length > PLACED_BY_NAME_LIMITS || !entries.every(isPlacedEntry))
    return {
      state: "table_damaged",
      rows: 0,
    };
  let registry = filesPlacedByNameRegistry();
  let previousEntries = [...registry];
  registry.clear();
  for (let [key, value] of entries) {
    let { path, fileUuid, dev, ino, mtimeMs, size, sha256, ambiguous } = value;
    registry.set(key, {
      path,
      fileUuid: fileUuid.toLowerCase(),
      dev,
      ino,
      mtimeMs,
      size,
      sha256,
      ...(ambiguous && {
        ambiguous,
      }),
      fromEarlierProcess: true,
    });
  }
  for (let [key, value] of previousEntries) {
    registry.delete(key);
    registry.set(key, value);
  }
  for (let key of [...registry.keys()].slice(0, Math.max(0, registry.size - PLACED_BY_NAME_LIMITS)))
    registry.delete(key);
  return {
    state: "table_read",
    rows: entries.length,
  };
}
//@ chunk-azz22fvc.js:3933-4057 placement
var PLACED_BY_NAME_TOOL_SPEC = {
  supported: true,
  refusedInputFields: PS_REFUSED_INPUT_FIELDS,
  decidingInputFields: ["command", "run_in_background", "dangerouslyDisableSandbox"],
};
export {
  nfc,
  PLACED_BY_NAME_LIMITS,
  loadFilesPlacedByName,
  PLACED_BY_NAME_TOOL_SPEC,
  ensurePlacedByNameRead,
};
