/**
 * utils/peerFileReceive.ts
 *
 * 2.1.316 新增。把对端通过 SendFile 发来的文件落到本地上传目录，校验完整性。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fvs7r311.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { sessionUploadsDir } from "./uploadsDir.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema, array } from "../../vendor/zod/v4/classic/schemas.js";
import { isDiskless } from "../bootstrap/state.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { getAttachmentMimeType } from "../tools/BriefTool/attachments.js";
import { isUncOrDevicePath } from "./pathClassification.js";
import { isNetworkPath_2 } from "./fsSafety/networkPathCheck.js";
import { ensureAttachmentsDir } from "./safeMkdir.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-fvs7r311.js:1012-1055 placement
var STALE_SPOOL_TTL_MS = PEER_TRANSFER_VERSION * 24 * 60 * 60 * 1000;
var FILE_TRANSFERS = "file-transfers";
//@ chunk-fvs7r311.js:1055-1100 placement
function logPeerFileTransfer(message) {
  logForDebugging(`[peer-file-transfer] ${message}`);
}
//@ chunk-fvs7r311.js:1100-1300 placement (2.1.88 match: sanitizeFileName, 0.784)
/**
 * 清洗附件文件名：取 basename、非法字符换 _、保留 ≤16 字符扩展名、总长 ≤200。
 */
function sanitizePeerFileName(fileName) {
  let cleaned = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment";
  let index = cleaned.lastIndexOf(".");
  let extension = index > 0 && cleaned.length - index <= 16 ? cleaned.slice(index) : "";
  let stem = extension ? cleaned.slice(0, index) : cleaned;
  let maxStemLength = 200 - extension.length;
  return (stem.length > maxStemLength ? stem.slice(0, maxStemLength) : stem) + extension;
}
//@ chunk-fvs7r311.js:1300-1380 placement
function peerFileFailureNote(fileName, reason) {
  return `[SendFile: "${sanitizePeerFileName(fileName)}" was not delivered \u2014 ${reason}]`;
}
//@ chunk-fvs7r311.js:1380-1489 placement
function peerFileCountCapNote(count) {
  return `[SendFile: ${count} additional attachment(s) were dropped \u2014 max ${MAX_PEER_ATTACHMENTS} per message]`;
}
//@ chunk-fvs7r311.js:1489-1597 placement
function verifyPeerFileIntegrity(bytes, expected) {
  if (typeof expected.file_size === "number" && bytes.length !== expected.file_size) return false;
  return computeContentHash(bytes) === expected.sha256;
}
//@ chunk-fvs7r311.js:1597-1819 placement
function emitPeerFileReceiveTelemetry(transport, fileCount, verifiedCount) {
  logEvent("tengu_send_file_received", {
    transport: fromEnum(transport),
    file_count: fileCount,
    verified_count: verifiedCount,
  });
  if (verifiedCount === fileCount) logFeatureOk("peer_file_receive");
  else if (verifiedCount > 0) logFeatureSad("peer_file_receive", "partial_failed");
  else logFeatureBad("peer_file_receive", "all_failed");
}
//@ chunk-fvs7r311.js:1819-2140 placement
async function readPeerFileBounded(filePath, maxBytes) {
  try {
    let stats = await stat(filePath);
    if (!stats.isFile() || stats.size > maxBytes) return null;
  } catch {
    return null;
  }
  let handle;
  try {
    handle = await openRegularFileForRead(filePath);
  } catch {
    return null;
  }
  try {
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > maxBytes) return null;
    let handleBounded = await readHandleBounded(handle, maxBytes, stats.size);
    return handleBounded.overLimit ? null : handleBounded.bytes;
  } catch {
    return null;
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-fvs7r311.js:2140-2265 placement
function injectPeerFilePrefix(text, prefix) {
  if (!prefix) return text;
  let match = /^<cross-session-message\b[^>]*>\n?/.exec(text);
  return match ? match[0] + prefix + text.slice(match[0].length) : prefix + text;
}
//@ chunk-fvs7r311.js:2265-2297 placement
function peerTransferSpoolDir() {
  return join(getClaudeConfigDir(), FILE_TRANSFERS);
}
//@ chunk-fvs7r311.js:2297-2322 placement
function getFileAttachmentsSchema() {
  return sessionUploadsDir();
}
//@ chunk-fvs7r311.js:2322-2478 placement
/**
 * 对端文件附件 schema
 */
var SHA256_RE; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var fileAttachmentEntrySchema;
var fileAttachmentsSchema;
deferInit("chunk-fvs7r311.js:2322", () => {
  SHA256_RE = /^[0-9a-f]{64}$/;
  fileAttachmentEntrySchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      file_name: stringSchema(),
      file_size: numberSchema().int().nonnegative(),
      sha256: stringSchema().regex(SHA256_RE),
      media_type: stringSchema().optional(),
    }),
  );
  fileAttachmentsSchema = DoctorLazy(() => array(fileAttachmentEntrySchema()));
});
//@ chunk-fvs7r311.js:2478-2901 placement
async function stageLocalPeerFile(sourcePath) {
  if (isDiskless())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      PEER_SEND_UNAVAILABLE_TEXT,
      "peer file transfer: no disk in this session",
    );
  let peerFileBounded = await readPeerFileBounded(sourcePath, MAX_PEER_FILE_BYTES);
  if (peerFileBounded === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      PEER_FILE_UNREADABLE_TEXT,
      "peer file transfer: source unreadable or over the size limit",
    );
  let contentHash = computeContentHash(peerFileBounded);
  let spoolDir = peerTransferSpoolDir();
  await mkdir(spoolDir, {
    recursive: true,
    mode: 448,
  });
  let fileName = basename(sourcePath);
  let stagedPath = join(
    spoolDir,
    `${contentHash.slice(0, 8)}-${randomUUID().slice(0, 8)}-${sanitizePeerFileName(fileName)}`,
  );
  await writeFile(stagedPath, peerFileBounded, {
    mode: 384,
  });
  return {
    path: stagedPath,
    file_name: fileName,
    file_size: peerFileBounded.length,
    sha256: contentHash,
    media_type: getAttachmentMimeType(fileName),
  };
}
//@ chunk-fvs7r311.js:2901-3102 placement
async function sweepStaleSpoolEntries() {
  if (isDiskless()) return;
  let spoolDir = peerTransferSpoolDir();
  try {
    let entries = await readdir(spoolDir);
    let cutoff = Date.now() - STALE_SPOOL_TTL_MS;
    for (let entry of entries.slice(0, 200)) {
      let entryPath = join(spoolDir, entry);
      try {
        let stats = await stat(entryPath);
        if (stats.isFile() && stats.mtimeMs < cutoff) await unlink(entryPath);
      } catch {}
    }
  } catch {}
}
//@ chunk-fvs7r311.js:3102-3142 placement
var emptyPeerFileReceiveStats = {
  prefix: "",
  received: 0,
  verified: 0,
};
//@ chunk-fvs7r311.js:3142-4474 placement
/**
 * 把对端通过 SendFile 发来的文件落到本地上传目录，校验完整性。
 */
async function materializeLocalPeerFiles(rawAttachments) {
  if (isDiskless()) return emptyPeerFileReceiveStats;
  let parsed = fileAttachmentsSchema().safeParse(rawAttachments);
  if (!parsed.success || parsed.data.length === 0) {
    if (!parsed.success) logPeerFileTransfer(`ignoring malformed file_attachments: ${parsed.error.message}`);
    return emptyPeerFileReceiveStats;
  }
  let notes = [];
  let attachments = parsed.data;
  if (attachments.length > MAX_PEER_ATTACHMENTS) {
    notes.push(peerFileCountCapNote(attachments.length - MAX_PEER_ATTACHMENTS));
    attachments = attachments.slice(0, MAX_PEER_ATTACHMENTS);
  }
  let fileAttachmentsSchema_2 = getFileAttachmentsSchema();
  let spoolDir = peerTransferSpoolDir();
  let prefixes = [];
  let verifiedCount = 0;
  for (let attachment of attachments) {
    let fail = (reason) => {
      logPeerFileTransfer(`${attachment.file_name}: ${reason}`);
      notes.push(peerFileFailureNote(attachment.file_name, reason));
    };
    if (
      isUncOrDevicePath(attachment.path) ||
      isNetworkPath_2(attachment.path) ||
      !isAbsolute(attachment.path)
    ) {
      fail("invalid transfer path");
      continue;
    }
    let resolvedPath = resolve(attachment.path);
    let parentDir = dirname(resolvedPath);
    if (
      isUncOrDevicePath(resolvedPath) ||
      isNetworkPath_2(resolvedPath) ||
      basename(parentDir) !== FILE_TRANSFERS
    ) {
      fail("transfer path is outside the file-transfer spool");
      continue;
    }
    try {
      if (!(await lstat(parentDir)).isDirectory() || !(await lstat(resolvedPath)).isFile()) {
        fail("the transfer copy is not a regular file");
        continue;
      }
    } catch {
      fail("the transfer copy could not be read (it may have expired)");
      continue;
    }
    let bytes = await readPeerFileBounded(resolvedPath, MAX_PEER_FILE_BYTES);
    if (bytes === null) {
      fail("the transfer copy could not be read (it may have expired)");
      continue;
    }
    if (!verifyPeerFileIntegrity(bytes, attachment)) {
      fail("it failed integrity verification");
      continue;
    }
    let targetPath = join(
      fileAttachmentsSchema_2,
      `${attachment.sha256.slice(0, 8)}-${randomUUID().slice(0, 8)}-${sanitizePeerFileName(attachment.file_name)}`,
    );
    try {
      let attachmentsDir = await ensureAttachmentsDir(fileAttachmentsSchema_2);
      try {
        await writeFile(join(attachmentsDir.at, basename(targetPath)), bytes, {
          mode: 384,
          flag: "wx",
        });
      } finally {
        await attachmentsDir.release();
      }
    } catch (error) {
      fail("it could not be written to the uploads directory");
      logPeerFileTransfer(`write ${targetPath} failed: ${error}`);
      continue;
    }
    verifiedCount++;
    prefixes.push(`@"${targetPath}"`);
    if (parentDir === spoolDir) unlink(resolvedPath).catch(() => {});
  }
  let parts = [...prefixes, ...notes];
  return {
    prefix: parts.length > 0 ? parts.join(" ") + " " : "",
    received: attachments.length,
    verified: verifiedCount,
  };
}
export {
  sanitizePeerFileName,
  readPeerFileBounded,
  verifyPeerFileIntegrity,
  emitPeerFileReceiveTelemetry,
  peerFileCountCapNote,
  peerFileFailureNote,
  injectPeerFilePrefix,
  peerTransferSpoolDir,
  stageLocalPeerFile,
  sweepStaleSpoolEntries,
  materializeLocalPeerFiles,
};
