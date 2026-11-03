/**
 * utils/peerFileReceive.ts
 *
 * 2.1.316 新增。把对端通过 SendFile 发来的文件落到本地上传目录，校验完整性。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qcc88jq1.js (16)
 * attribution: placement 16
 */
import { basename, join, isAbsolute, resolve, dirname } from "path";
import { stat, mkdir, writeFile, readdir, unlink, lstat } from "fs/promises";
import { randomUUID } from "crypto";
import {
  PEER_TRANSFER_VERSION,
  MAX_PEER_ATTACHMENTS,
  PEER_SEND_UNAVAILABLE_TEXT,
  MAX_PEER_FILE_BYTES,
  PEER_FILE_UNREADABLE_TEXT,
} from "./peerFileTransfer.js";
import { logForDebugging } from "./debug.js";
import { computeContentHash } from "./commitAttribution.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { openRegularFileForRead, readHandleBounded } from "./fsSafety/boundOpen.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { sessionUploadsDir } from "./uploadsDir.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, E, array } from "../../vendor/zod/v4/classic/schemas.js";
import { isDiskless } from "../bootstrap/state.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { getAttachmentMimeType } from "../tools/BriefTool/attachments.js";
import { isUncOrDevicePath } from "./pathClassification.js";
import { isNetworkPath_2 } from "./fsSafety/networkPathCheck.js";
import { ensureAttachmentsDir } from "./safeMkdir.js";

//@ chunk-qcc88jq1.js:1013-1056 placement
var STALE_SPOOL_TTL_MS = PEER_TRANSFER_VERSION * 24 * 60 * 60 * 1000;
var FILE_TRANSFERS = "file-transfers";
//@ chunk-qcc88jq1.js:1056-1101 placement
function logPeerFileTransfer(r) {
  logForDebugging(`[peer-file-transfer] ${r}`);
}
//@ chunk-qcc88jq1.js:1101-1301 placement = sanitizeFileName (0.785)
/**
 * 清洗附件文件名：取 basename、非法字符换 _、保留 ≤16 字符扩展名、总长 ≤200。
 */
function sanitizePeerFileName(fileName) {
  let e = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment";
  let index = e.lastIndexOf(".");
  let n = index > 0 && e.length - index <= 16 ? e.slice(index) : "";
  let s = n ? e.slice(0, index) : e;
  let l = 200 - n.length;
  return (s.length > l ? s.slice(0, l) : s) + n;
}
//@ chunk-qcc88jq1.js:1301-1381 placement
function peerFileFailureNote(fileName, reason) {
  return `[SendFile: "${sanitizePeerFileName(fileName)}" was not delivered \u2014 ${reason}]`;
}
//@ chunk-qcc88jq1.js:1381-1490 placement
function peerFileCountCapNote(count) {
  return `[SendFile: ${count} additional attachment(s) were dropped \u2014 max ${MAX_PEER_ATTACHMENTS} per message]`;
}
//@ chunk-qcc88jq1.js:1490-1598 placement
function verifyPeerFileIntegrity(r, e) {
  if (typeof e.file_size === "number" && r.length !== e.file_size) return false;
  return computeContentHash(r) === e.sha256;
}
//@ chunk-qcc88jq1.js:1598-1820 placement
function emitPeerFileReceiveTelemetry(r, e, i) {
  logEvent("tengu_send_file_received", {
    transport: fromEnum(r),
    file_count: e,
    verified_count: i,
  });
  if (i === e) logFeatureOk("peer_file_receive");
  else if (i > 0) logFeatureSad("peer_file_receive", "partial_failed");
  else logFeatureBad("peer_file_receive", "all_failed");
}
//@ chunk-qcc88jq1.js:1820-2141 placement
async function readPeerFileBounded(path, e) {
  try {
    let n = await stat(path);
    if (!n.isFile() || n.size > e) return null;
  } catch {
    return null;
  }
  let i;
  try {
    i = await openRegularFileForRead(path);
  } catch {
    return null;
  }
  try {
    let stats = await i.stat();
    if (!stats.isFile() || stats.size > e) return null;
    let handleBounded = await readHandleBounded(i, e, stats.size);
    return handleBounded.overLimit ? null : handleBounded.bytes;
  } catch {
    return null;
  } finally {
    await i.close().catch(() => {});
  }
}
//@ chunk-qcc88jq1.js:2141-2266 placement
function injectPeerFilePrefix(r, prefix) {
  if (!prefix) return r;
  let match = /^<cross-session-message\b[^>]*>\n?/.exec(r);
  return match ? match[0] + prefix + r.slice(match[0].length) : prefix + r;
}
//@ chunk-qcc88jq1.js:2266-2298 placement
function peerTransferSpoolDir() {
  return join(getClaudeConfigDir(), FILE_TRANSFERS);
}
//@ chunk-qcc88jq1.js:2298-2323 placement
function getFileAttachmentsSchema() {
  return sessionUploadsDir();
}
//@ chunk-qcc88jq1.js:2323-2479 placement
/**
 * 对端文件附件 schema
 */
var fileAttachmentSchema = /^[0-9a-f]{64}$/;
var fileAttachmentEntrySchema = DoctorLazy(() =>
  u({
    path: string(),
    file_name: string(),
    file_size: E().int().nonnegative(),
    sha256: string().regex(fileAttachmentSchema),
    media_type: string().optional(),
  }),
);
var fileAttachmentsSchema = DoctorLazy(() => array(fileAttachmentEntrySchema()));
//@ chunk-qcc88jq1.js:2479-2903 placement
async function stageLocalPeerFile(r) {
  if (isDiskless())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      PEER_SEND_UNAVAILABLE_TEXT,
      "peer file transfer: no disk in this session",
    );
  let peerFileBounded = await readPeerFileBounded(r, MAX_PEER_FILE_BYTES);
  if (peerFileBounded === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      PEER_FILE_UNREADABLE_TEXT,
      "peer file transfer: source unreadable or over the size limit",
    );
  let contentHash = computeContentHash(peerFileBounded);
  let n = peerTransferSpoolDir();
  await mkdir(n, {
    recursive: true,
    mode: 448,
  });
  let s = basename(r);
  let l = join(n, `${contentHash.slice(0, 8)}-${randomUUID().slice(0, 8)}-${sanitizePeerFileName(s)}`);
  await writeFile(l, peerFileBounded, {
    mode: 384,
  });
  return {
    path: l,
    file_name: s,
    file_size: peerFileBounded.length,
    sha256: contentHash,
    media_type: getAttachmentMimeType(s),
  };
}
//@ chunk-qcc88jq1.js:2903-3104 placement
async function sweepStaleSpoolEntries() {
  if (isDiskless()) return;
  let r = peerTransferSpoolDir();
  try {
    let e = await readdir(r);
    let i = Date.now() - STALE_SPOOL_TTL_MS;
    for (let n of e.slice(0, 200)) {
      let s = join(r, n);
      try {
        let l = await stat(s);
        if (l.isFile() && l.mtimeMs < i) await unlink(s);
      } catch {}
    }
  } catch {}
}
//@ chunk-qcc88jq1.js:3104-3144 placement
var emptyPeerFileReceiveStats = {
  prefix: "",
  received: 0,
  verified: 0,
};
//@ chunk-qcc88jq1.js:3144-4477 placement
/**
 * 把对端通过 SendFile 发来的文件落到本地上传目录，校验完整性。
 */
async function materializeLocalPeerFiles(r) {
  if (isDiskless()) return emptyPeerFileReceiveStats;
  let e = fileAttachmentsSchema().safeParse(r);
  if (!e.success || e.data.length === 0) {
    if (!e.success) logPeerFileTransfer(`ignoring malformed file_attachments: ${e.error.message}`);
    return emptyPeerFileReceiveStats;
  }
  let i = [];
  let n = e.data;
  if (n.length > MAX_PEER_ATTACHMENTS) {
    i.push(peerFileCountCapNote(n.length - MAX_PEER_ATTACHMENTS));
    n = n.slice(0, MAX_PEER_ATTACHMENTS);
  }
  let fileAttachmentsSchema_2 = getFileAttachmentsSchema();
  let l = peerTransferSpoolDir();
  let z = [];
  let x = 0;
  for (let d of n) {
    let h = (reason) => {
      logPeerFileTransfer(`${d.file_name}: ${reason}`);
      i.push(peerFileFailureNote(d.file_name, reason));
    };
    if (isUncOrDevicePath(d.path) || isNetworkPath_2(d.path) || !isAbsolute(d.path)) {
      h("invalid transfer path");
      continue;
    }
    let F = resolve(d.path);
    let P = dirname(F);
    if (isUncOrDevicePath(F) || isNetworkPath_2(F) || basename(P) !== FILE_TRANSFERS) {
      h("transfer path is outside the file-transfer spool");
      continue;
    }
    try {
      if (!(await lstat(P)).isDirectory() || !(await lstat(F)).isFile()) {
        h("the transfer copy is not a regular file");
        continue;
      }
    } catch {
      h("the transfer copy could not be read (it may have expired)");
      continue;
    }
    let peerFileBounded = await readPeerFileBounded(F, MAX_PEER_FILE_BYTES);
    if (peerFileBounded === null) {
      h("the transfer copy could not be read (it may have expired)");
      continue;
    }
    if (!verifyPeerFileIntegrity(peerFileBounded, d)) {
      h("it failed integrity verification");
      continue;
    }
    let v = join(
      fileAttachmentsSchema_2,
      `${d.sha256.slice(0, 8)}-${randomUUID().slice(0, 8)}-${sanitizePeerFileName(d.file_name)}`,
    );
    try {
      let attachmentsDir = await ensureAttachmentsDir(fileAttachmentsSchema_2);
      try {
        await writeFile(join(attachmentsDir.at, basename(v)), peerFileBounded, {
          mode: 384,
          flag: "wx",
        });
      } finally {
        await attachmentsDir.release();
      }
    } catch (error) {
      h("it could not be written to the uploads directory");
      logPeerFileTransfer(`write ${v} failed: ${error}`);
      continue;
    }
    x++;
    z.push(`@"${v}"`);
    if (P === l) unlink(F).catch(() => {});
  }
  let D = [...z, ...i];
  return {
    prefix: D.length > 0 ? D.join(" ") + " " : "",
    received: n.length,
    verified: x,
  };
}
export {
  peerTransferSpoolDir,
  sanitizePeerFileName,
  readPeerFileBounded,
  verifyPeerFileIntegrity,
  emitPeerFileReceiveTelemetry,
  peerFileCountCapNote,
  peerFileFailureNote,
  injectPeerFilePrefix,
  stageLocalPeerFile,
  sweepStaleSpoolEntries,
};
