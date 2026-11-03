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
import { NA, y4e, getUploadsDir } from "../uploadsDir.js";
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
import { ws } from "../fsFlags.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { readHandleBounded } from "../fsSafety/boundOpen.js";
import { pVn } from "../../tools/PowerShellTool/prompt.js";

//@ chunk-azz22fvc.js:1223-1272 placement
var PLACED_BY_NAME_LIMITS = 64,
  E = 262144,
  v = new Set(["ELOOP", "ENXIO"]);
//@ chunk-azz22fvc.js:1272-1314 placement = setCwdState (1)
function nfc(cwd) {
  return cwd.normalize("NFC");
}
//@ chunk-azz22fvc.js:1635-1664 placement
var g = ".placed-by-name.json";
//@ chunk-azz22fvc.js:1664-1777 placement
function placedTablePaths() {
  let e = NA();
  return [
    e,
    ...(getSessionUploadsDirOverride() === null
      ? y4e()
          .map((t) => join(t, getSessionId()))
          .filter((t) => t !== e)
      : []),
  ].map((t) => join(t, g));
}
//@ chunk-azz22fvc.js:1777-1952 placement
async function removePlacedTable(e) {
  if (dirname(e) === getUploadsDir()) {
    await unlink(join(e, g));
    return;
  }
  let t = await openOwnedDirChain(e, 0);
  if (typeof t !== "string")
    try {
      if ((await probeNoFollowSupport(t)) === !0) await unlink(join(t.at, g));
    } finally {
      await t.release();
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
    let e = await ensureAttachmentsDir(NA());
    try {
      await writeFileAtomic(join(e.at, g), jsonStringify([...filesPlacedByNameRegistry()]), 384);
    } finally {
      await e.release();
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
  if (!Array.isArray(e) || e.length !== 2) return !1;
  let [t, r] = e;
  if (typeof t !== "string" || typeof r !== "object" || r === null) return !1;
  let {
    path: path,
    fileUuid: fileUuid,
    dev: dev,
    ino: ino,
    mtimeMs: mtimeMs,
    size: size,
    sha256: sha256,
    ambiguous: ambiguous,
  } = r;
  return (
    typeof path === "string" &&
    typeof fileUuid === "string" &&
    [dev, ino, mtimeMs, size].every((u) => typeof u === "number" && Number.isFinite(u)) &&
    typeof sha256 === "string" &&
    (ambiguous === void 0 || ambiguous === !0)
  );
}
//@ chunk-azz22fvc.js:2713-2950 placement
function ensurePlacedByNameRead() {
  let e = filesPlacedByNameRead();
  if (e !== void 0) return e === "done" ? Promise.resolve() : e;
  let t = readFirstPlacedTable().then((r) => {
    if ((setFilesPlacedByNameRead(r.state === "table_unread" ? void 0 : "done"), r.state !== "table_absent"))
      logForDiagnosticsNoPII("info", "turn_handoff_files_by_name_table", r);
  });
  return (setFilesPlacedByNameRead(t), t);
}
//@ chunk-azz22fvc.js:2950-3112 placement
async function readFirstPlacedTable() {
  let [e, ...t] = placedTablePaths(),
    r = await readPlacedTable(e);
  if (r.state !== "table_absent") return r;
  for (let a of t) {
    let n = await readPlacedTable(a);
    if (n.state === "table_read") return n;
  }
  return r;
}
//@ chunk-azz22fvc.js:3112-3933 placement
async function readPlacedTable(e) {
  let t;
  try {
    let n = await open(e, ws | READ_LIMITS);
    try {
      let stats = await n.stat(),
        c = stats.isFile() && stats.size <= E ? await readHandleBounded(n, E, stats.size) : void 0;
      t = c === void 0 || c.overLimit ? void 0 : jsonParse(c.bytes.toString("utf8"));
    } finally {
      await n.close();
    }
  } catch (error) {
    let s = getErrnoCode(error);
    return {
      state: s === "ENOENT" ? "table_absent" : s === void 0 || v.has(s) ? "table_damaged" : "table_unread",
      rows: 0,
    };
  }
  if (!Array.isArray(t) || t.length > PLACED_BY_NAME_LIMITS || !t.every(isPlacedEntry))
    return { state: "table_damaged", rows: 0 };
  let r = filesPlacedByNameRegistry(),
    a = [...r];
  r.clear();
  for (let [n, s] of t) {
    let {
      path: path,
      fileUuid: fileUuid,
      dev: dev,
      ino: ino,
      mtimeMs: mtimeMs,
      size: size,
      sha256: sha256,
      ambiguous: ambiguous,
    } = s;
    r.set(n, {
      path: path,
      fileUuid: fileUuid.toLowerCase(),
      dev: dev,
      ino: ino,
      mtimeMs: mtimeMs,
      size: size,
      sha256: sha256,
      ...(ambiguous && { ambiguous: ambiguous }),
      fromEarlierProcess: !0,
    });
  }
  for (let [n, s] of a) (r.delete(n), r.set(n, s));
  for (let n of [...r.keys()].slice(0, Math.max(0, r.size - PLACED_BY_NAME_LIMITS))) r.delete(n);
  return { state: "table_read", rows: t.length };
}
//@ chunk-azz22fvc.js:3933-4057 placement
var PLACED_BY_NAME_TOOL_SPEC = {
  supported: !0,
  refusedInputFields: pVn,
  decidingInputFields: ["command", "run_in_background", "dangerouslyDisableSandbox"],
};

export {
  nfc,
  PLACED_BY_NAME_LIMITS,
  loadFilesPlacedByName,
  PLACED_BY_NAME_TOOL_SPEC,
  ensurePlacedByNameRead,
};
