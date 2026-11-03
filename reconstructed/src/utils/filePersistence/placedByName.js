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

//@ chunk-azz22fvc.js:1223-1272 placement
var PLACED_BY_NAME_LIMITS = 64;
var MAX_PLACED_TABLE_BYTES = 262144;
var DAMAGED_TABLE_ERRNOS = new Set(["ELOOP", "ENXIO"]);
//@ chunk-azz22fvc.js:1272-1314 placement = setCwdState (1)
function nfc(cwd) {
  return cwd.normalize("NFC");
}
//@ chunk-azz22fvc.js:1635-1664 placement
var PLACED_BY_NAME_FILE_NAME = ".placed-by-name.json";
//@ chunk-azz22fvc.js:1664-1777 placement
function placedTablePaths() {
  let e = sessionUploadsDir();
  return [
    e,
    ...(getSessionUploadsDirOverride() === null
      ? uploadsRootCandidates()
          .map((t) => join(t, getSessionId()))
          .filter((t) => t !== e)
      : []),
  ].map((t) => join(t, PLACED_BY_NAME_FILE_NAME));
}
//@ chunk-azz22fvc.js:1777-1952 placement
async function removePlacedTable(e) {
  if (dirname(e) === getUploadsDir()) {
    await unlink(join(e, PLACED_BY_NAME_FILE_NAME));
    return;
  }
  let ownedDirChain = await openOwnedDirChain(e, 0);
  if (typeof ownedDirChain !== "string")
    try {
      if ((await probeNoFollowSupport(ownedDirChain)) === true)
        await unlink(join(ownedDirChain.at, PLACED_BY_NAME_FILE_NAME));
    } finally {
      await ownedDirChain.release();
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
        .map((t) => removePlacedTable(dirname(t))),
    );
  } catch (error) {
    logForDiagnosticsNoPII("warn", "turn_handoff_files_by_name_table", {
      state: "not_stored",
      error_code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
    });
  }
}
//@ chunk-azz22fvc.js:2352-2713 placement
function isPlacedEntry(e) {
  if (!Array.isArray(e) || e.length !== 2) return false;
  let [t, r] = e;
  if (typeof t !== "string" || typeof r !== "object" || r === null) return false;
  let { path, fileUuid, dev, ino, mtimeMs, size, sha256, ambiguous } = r;
  return (
    typeof path === "string" &&
    typeof fileUuid === "string" &&
    [dev, ino, mtimeMs, size].every((u) => typeof u === "number" && Number.isFinite(u)) &&
    typeof sha256 === "string" &&
    (ambiguous === undefined || ambiguous === true)
  );
}
//@ chunk-azz22fvc.js:2713-2950 placement
function ensurePlacedByNameRead() {
  let e = filesPlacedByNameRead();
  if (e !== undefined) return e === "done" ? Promise.resolve() : e;
  let t = readFirstPlacedTable().then((firstPlacedTable) => {
    setFilesPlacedByNameRead(firstPlacedTable.state === "table_unread" ? undefined : "done");
    if (firstPlacedTable.state !== "table_absent")
      logForDiagnosticsNoPII("info", "turn_handoff_files_by_name_table", firstPlacedTable);
  });
  setFilesPlacedByNameRead(t);
  return t;
}
//@ chunk-azz22fvc.js:2950-3112 placement
async function readFirstPlacedTable() {
  let [e, ...t] = placedTablePaths();
  let placedTable = await readPlacedTable(e);
  if (placedTable.state !== "table_absent") return placedTable;
  for (let a of t) {
    let placedTable = await readPlacedTable(a);
    if (placedTable.state === "table_read") return placedTable;
  }
  return placedTable;
}
//@ chunk-azz22fvc.js:3112-3933 placement
async function readPlacedTable(e) {
  let t;
  try {
    let n = await open(e, NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    try {
      let stats = await n.stat();
      let c =
        stats.isFile() && stats.size <= MAX_PLACED_TABLE_BYTES
          ? await readHandleBounded(n, MAX_PLACED_TABLE_BYTES, stats.size)
          : undefined;
      t = c === undefined || c.overLimit ? undefined : jsonParse(c.bytes.toString("utf8"));
    } finally {
      await n.close();
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
  if (!Array.isArray(t) || t.length > PLACED_BY_NAME_LIMITS || !t.every(isPlacedEntry))
    return {
      state: "table_damaged",
      rows: 0,
    };
  let r = filesPlacedByNameRegistry();
  let a = [...r];
  r.clear();
  for (let [n, s] of t) {
    let { path, fileUuid, dev, ino, mtimeMs, size, sha256, ambiguous } = s;
    r.set(n, {
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
  for (let [n, s] of a) {
    r.delete(n);
    r.set(n, s);
  }
  for (let key of [...r.keys()].slice(0, Math.max(0, r.size - PLACED_BY_NAME_LIMITS))) r.delete(key);
  return {
    state: "table_read",
    rows: t.length,
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
