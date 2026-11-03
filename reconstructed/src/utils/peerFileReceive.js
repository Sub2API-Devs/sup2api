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
  qoe,
  PEER_SEND_UNAVAILABLE_TEXT,
  Lue,
  PEER_FILE_UNREADABLE_TEXT,
} from "./peerFileTransfer.js";
import { logForDebugging } from "./debug.js";
import { computeContentHash } from "./commitAttribution.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { openRegularFileForRead, readHandleBounded } from "./fsSafety/boundOpen.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { NA } from "./uploadsDir.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, E, A } from "../../vendor/zod/v4/classic/schemas.js";
import { isDiskless } from "../bootstrap/state.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { getAttachmentMimeType } from "../tools/BriefTool/attachments.js";
import { Qn } from "./pathClassification.js";
import { isNetworkPath_2 } from "./fsSafety/networkPathCheck.js";
import { ensureAttachmentsDir } from "./safeMkdir.js";

//@ chunk-qcc88jq1.js:1013-1056 placement
var G = PEER_TRANSFER_VERSION * 24 * 60 * 60 * 1000,
  FILE_TRANSFERS = "file-transfers";
//@ chunk-qcc88jq1.js:1056-1101 placement
function b(r) {
  logForDebugging(`[peer-file-transfer] ${r}`);
}
/**
 * 清洗附件文件名：取 basename、非法字符换 _、保留 ≤16 字符扩展名、总长 ≤200。
 */
//@ chunk-qcc88jq1.js:1101-1301 placement = sanitizeFileName (0.785)
function sanitizePeerFileName(fileName) {
  let e = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment",
    index = e.lastIndexOf("."),
    n = index > 0 && e.length - index <= 16 ? e.slice(index) : "",
    s = n ? e.slice(0, index) : e,
    l = 200 - n.length;
  return (s.length > l ? s.slice(0, l) : s) + n;
}
//@ chunk-qcc88jq1.js:1301-1381 placement
function peerFileFailureNote(fileName, reason) {
  return `[SendFile: "${sanitizePeerFileName(fileName)}" was not delivered \u2014 ${reason}]`;
}
//@ chunk-qcc88jq1.js:1381-1490 placement
function peerFileCountCapNote(count) {
  return `[SendFile: ${count} additional attachment(s) were dropped \u2014 max ${qoe} per message]`;
}
//@ chunk-qcc88jq1.js:1490-1598 placement
function verifyPeerFileIntegrity(r, e) {
  if (typeof e.file_size === "number" && r.length !== e.file_size) return !1;
  return computeContentHash(r) === e.sha256;
}
//@ chunk-qcc88jq1.js:1598-1820 placement
function emitPeerFileReceiveTelemetry(r, e, i) {
  if (
    (logEvent("tengu_send_file_received", { transport: fromEnum(r), file_count: e, verified_count: i }),
    i === e)
  )
    logFeatureOk("peer_file_receive");
  else if (i > 0) logFeatureSad("peer_file_receive", "partial_failed");
  else logFeatureBad("peer_file_receive", "all_failed");
}
//@ chunk-qcc88jq1.js:1820-2141 placement
async function readPeerFileBounded(r, e) {
  try {
    let n = await stat(r);
    if (!n.isFile() || n.size > e) return null;
  } catch {
    return null;
  }
  let i;
  try {
    i = await openRegularFileForRead(r);
  } catch {
    return null;
  }
  try {
    let stats = await i.stat();
    if (!stats.isFile() || stats.size > e) return null;
    let s = await readHandleBounded(i, e, stats.size);
    return s.overLimit ? null : s.bytes;
  } catch {
    return null;
  } finally {
    await i.close().catch(() => {});
  }
}
//@ chunk-qcc88jq1.js:2141-2266 placement
function injectPeerFilePrefix(r, e) {
  if (!e) return r;
  let match = /^<cross-session-message\b[^>]*>\n?/.exec(r);
  return match ? match[0] + e + r.slice(match[0].length) : e + r;
}
//@ chunk-qcc88jq1.js:2266-2298 placement
function peerTransferSpoolDir() {
  return join(getClaudeConfigDir(), FILE_TRANSFERS);
}
//@ chunk-qcc88jq1.js:2298-2323 placement
function Y() {
  return NA();
}
/**
 * 对端文件附件 schema
 */
//@ chunk-qcc88jq1.js:2323-2479 placement
var fileAttachmentSchema = /^[0-9a-f]{64}$/,
  V = DoctorLazy(() =>
    u({
      path: o(),
      file_name: o(),
      file_size: E().int().nonnegative(),
      sha256: o().regex(fileAttachmentSchema),
      media_type: o().optional(),
    }),
  ),
  Z = DoctorLazy(() => A(V()));
//@ chunk-qcc88jq1.js:2479-2903 placement
async function stageLocalPeerFile(r) {
  if (isDiskless())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      PEER_SEND_UNAVAILABLE_TEXT,
      "peer file transfer: no disk in this session",
    );
  let e = await readPeerFileBounded(r, Lue);
  if (e === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      PEER_FILE_UNREADABLE_TEXT,
      "peer file transfer: source unreadable or over the size limit",
    );
  let i = computeContentHash(e),
    n = peerTransferSpoolDir();
  await mkdir(n, { recursive: !0, mode: 448 });
  let s = basename(r),
    l = join(n, `${i.slice(0, 8)}-${randomUUID().slice(0, 8)}-${sanitizePeerFileName(s)}`);
  return (
    await writeFile(l, e, { mode: 384 }),
    { path: l, file_name: s, file_size: e.length, sha256: i, media_type: getAttachmentMimeType(s) }
  );
}
//@ chunk-qcc88jq1.js:2903-3104 placement
async function sweepStaleSpoolEntries() {
  if (isDiskless()) return;
  let r = peerTransferSpoolDir();
  try {
    let e = await readdir(r),
      i = Date.now() - G;
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
var L = { prefix: "", received: 0, verified: 0 };
/**
 * 把对端通过 SendFile 发来的文件落到本地上传目录，校验完整性。
 */
//@ chunk-qcc88jq1.js:3144-4477 placement
async function materializeLocalPeerFiles(r) {
  if (isDiskless()) return L;
  let safeParse = Z().safeParse(r);
  if (!safeParse.success || safeParse.data.length === 0) {
    if (!safeParse.success) b(`ignoring malformed file_attachments: ${safeParse.error.message}`);
    return L;
  }
  let i = [],
    n = safeParse.data;
  if (n.length > qoe) (i.push(peerFileCountCapNote(n.length - qoe)), (n = n.slice(0, qoe)));
  let s = Y(),
    l = peerTransferSpoolDir(),
    z = [],
    x = 0;
  for (let d of n) {
    let h = (_) => {
      (b(`${d.file_name}: ${_}`), i.push(peerFileFailureNote(d.file_name, _)));
    };
    if (Qn(d.path) || isNetworkPath_2(d.path) || !isAbsolute(d.path)) {
      h("invalid transfer path");
      continue;
    }
    let F = resolve(d.path),
      P = dirname(F);
    if (Qn(F) || isNetworkPath_2(F) || basename(P) !== FILE_TRANSFERS) {
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
    let S = await readPeerFileBounded(F, Lue);
    if (S === null) {
      h("the transfer copy could not be read (it may have expired)");
      continue;
    }
    if (!verifyPeerFileIntegrity(S, d)) {
      h("it failed integrity verification");
      continue;
    }
    let v = join(
      s,
      `${d.sha256.slice(0, 8)}-${randomUUID().slice(0, 8)}-${sanitizePeerFileName(d.file_name)}`,
    );
    try {
      let _ = await ensureAttachmentsDir(s);
      try {
        await writeFile(join(_.at, basename(v)), S, { mode: 384, flag: "wx" });
      } finally {
        await _.release();
      }
    } catch (error) {
      (h("it could not be written to the uploads directory"), b(`write ${v} failed: ${error}`));
      continue;
    }
    if ((x++, z.push(`@"${v}"`), P === l)) unlink(F).catch(() => {});
  }
  let D = [...z, ...i];
  return { prefix: D.length > 0 ? D.join(" ") + " " : "", received: n.length, verified: x };
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
