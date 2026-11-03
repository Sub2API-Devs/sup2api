/**
 * services/taskFiles/taskFileDownload.ts
 *
 * 2.1.316 新增：任务附带文件下载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ar2zwb92.js (11)
 * attribution: placement 11
 */
import { join, parse } from "path";
import { mkdir, open, unlink, statfs } from "fs/promises";
import { randomBytes } from "crypto";
import { constants } from "fs";
import { pipeline } from "stream/promises";
import { qAo, YAo, linkIntoHome, homeFileNameProblem } from "../../utils/filePersistence/homeFilePublish.js";
import { trimEndChars, WINDOWS_RESERVED_NAME_RE, firstLineOf } from "../../utils/stringUtils.js";
import { m_e } from "../mcp/agentTaskFiles.js";
import { FILES_API_MAX_FILE_BYTES } from "../api/filesApi.js";
import { isPolicyLimitsCacheMissing } from "../policyLimits/policyVerdicts.js";
import { filesApiUnavailableReason } from "../fileInputs/attachmentText.js";
import { getAccessTokenWithCcrFallback } from "../../utils/teleport/api.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { apiClient } from "../routines/routinesApi.js";
import { ANTHROPIC_VERSION_2, COMBINED_BETA_HEADER } from "../../remote/tools/servedOwnerSettings.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { isDiskless } from "../../bootstrap/state.js";
import { settleStoredLoginRefusal } from "../../utils/auth/storedLoginRefused.js";
import { ensureToolResultsDir, checkToolResultsWritable } from "../../utils/toolResultStorage.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { pathToSessionSideKey } from "../../utils/storage/storageKeys.js";
import { getFileReader } from "../../utils/fileStore.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { ws } from "../../utils/fsFlags.js";
import { foldName } from "../../utils/permissions/protectedDirNames.js";

//@ chunk-ar2zwb92.js:1133-2850 placement
var TASK_FILE_CONSTANTS = "task-files",
  C = 60000,
  B = 67108864,
  RGn = 20,
  w = 200,
  P = /\.[A-Za-z0-9]{1,16}$/,
  z = 1024,
  parts = [
    "scf url lnk pif website shs shb xnk library-ms searchconnector-ms search-ms osdx settingcontent-ms appcontent-ms",
    "appref-ms application appinstaller vsto xbap jnlp",
    "theme themepack deskthemepack msstyles wmz wms wmd",
    "hta chm its scr cpl msc wsf wsh ws wsc sct vbe jse psc1 wsb gadget",
    "diagcab diagpkg diagcfg printerexport webpnp ins isp prf ops reg",
    "rdp ica wcx msrcincident mcl remmina vnc",
    "iqy dqy oqy rqy slk odc udl pbids xlw xlb xll xlam xla ppam ppa wll accda accde mda mde ade adp",
    "mad maf mag mam maq mar mas mau mav maw",
    "webloc inetloc fileloc afploc ftploc mailloc newsloc vncloc atloc savedsearch terminal mobileconfig desktop kdelnk",
  ]
    .join(" ")
    .split(" "),
  regExp = new RegExp(`(?:\\.(?:${parts.join("|")})|^desktop\\.ini|^autorun\\.inf)$`, "i"),
  H =
    "\xA5\u20A9\u2216\u2044\u2215\u02BA\u030E\u02B9\u02BC\u02C8\u2032\u02CB\u0300\u2035\u0589\u2236\u066A\u2217\u3008\u3009\u01C0\u2223\u2758\u01C3\u02C4\u0302\u2303\u0303\u223C",
  h = "\\-\u2010\u2013\u2014\u2015\u2212\u2500\u252C\u2534\u2550\u2564-\u2569",
  regExp_2 = new RegExp(
    `${qAo.source}|${YAo.source}|\\p{Default_Ignorable_Code_Point}|[%\\p{Cs}\\u2018-\\u201f\\u1680\\u2800${H}]`,
    "u",
  ),
  R = /^[\u200c\u200d\ufe0e\ufe0f]$/,
  regExp_3 = new RegExp(
    `^(?![${h}])(?:[^\\P{L}\\p{ASCII}]|[^\\P{M}\\p{ASCII}]|[^\\P{N}\\p{ASCII}]|[^\\P{S}\\p{ASCII}])`,
    "u",
  ),
  regExp_4 = new RegExp(`^[.${h}+@ ]+`, "u"),
  regExp_5 = new RegExp(`(\\s)[${h}+@](?=\\S)`, "gu"),
  K = {
    no_disk: !0,
    bad_id: !0,
    bad_size: !0,
    too_large: !0,
    egress_blocked: !0,
    essential_traffic: !0,
    policy_pending: !0,
    not_https: !0,
    no_token: !0,
    sign_in_expired: !0,
    no_room: !0,
    refused: !0,
    size_mismatch: !0,
    stalled: !0,
    canceled: !0,
    name_taken: !0,
    write_failed: !0,
    network: !0,
  },
  keys = Object.keys(K);
//@ chunk-ar2zwb92.js:2850-3129 placement
function safeDownloadName(e, s) {
  let o = e.length > z ? "" : (e.normalize("NFKC").split(/[/\\]/).at(-1) ?? ""),
    r = trimEndChars(sanitizeDownloadName(o).replace(regExp_4, ""), ". "),
    n =
      r === "" ||
      Buffer.byteLength(r, "utf8") > w ||
      Buffer.byteLength(F(r), "utf8") > w ||
      WINDOWS_RESERVED_NAME_RE.test(firstLineOf(r, ".").trim().toLowerCase()) ||
      G(r)
        ? `${s}${P.exec(r)?.[0] ?? ""}`
        : r;
  return F(n);
}
//@ chunk-ar2zwb92.js:3129-3585 placement
function validateTaskFileEntry(e, s) {
  if (!m_e.test(e.fileId)) return { ok: !1, code: "bad_id" };
  if (!Number.isSafeInteger(e.sizeBytes) || e.sizeBytes < 0) return { ok: !1, code: "bad_size" };
  if (e.sizeBytes > FILES_API_MAX_FILE_BYTES) return { ok: !1, code: "too_large" };
  let o = isPolicyLimitsCacheMissing(),
    r = filesApiUnavailableReason({ oauthToken: getAccessTokenWithCcrFallback(), isStoredLogin: !0 });
  if (r !== void 0) return { ok: !1, code: r };
  if (o) return { ok: !1, code: "policy_pending" };
  if (!getOauthConfig().BASE_API_URL.startsWith("https://")) return { ok: !1, code: "not_https" };
  if (s.aborted) return { ok: !1, code: "canceled" };
  return;
}
//@ chunk-ar2zwb92.js:3585-4943 placement
async function streamDownload(e, s, o) {
  let abortController = new AbortController(),
    n = { bytes: 0 },
    c = setTimeout((a) => a.abort(), C, abortController),
    u,
    f = () => {
      (clearTimeout(c), u?.destroy());
    },
    m = !1;
  try {
    let a;
    try {
      a = await apiClient.get(`/v1/files/${encodeURIComponent(e.fileId)}/content`, {
        auth: "claude-ai-oauth",
        refreshOAuth: !0,
        recoverOAuth401: !0,
        storageV5: s,
        host: "api",
        headers: {
          "anthropic-version": ANTHROPIC_VERSION_2,
          "anthropic-beta": COMBINED_BETA_HEADER,
          "Accept-Encoding": "identity",
        },
        responseType: "stream",
        timeout: 0,
        signal: AbortSignal.any([o, abortController.signal]),
        maxRedirects: 0,
        validateStatus: () => !0,
      });
    } catch (error) {
      return (
        logForDebugging(`[task files] ${e.fileId} request failed: ${errorMessage(error)}`, {
          level: "error",
        }),
        { ok: !1, code: o.aborted ? "canceled" : abortController.signal.aborted ? "stalled" : "network" }
      );
    }
    if (!a.ok)
      return {
        ok: !1,
        code:
          a.reason === "essential-traffic-only"
            ? "essential_traffic"
            : a.reason === "no-auth"
              ? "no_token"
              : "egress_blocked",
      };
    if (((u = a.data), u.on("error", () => {}), a.status === 401)) return { ok: !1, code: "sign_in_expired" };
    if (a.status !== 200) return { ok: !1, code: "refused", status: a.status };
    let _ = a.response.headers["content-length"];
    if (_ !== void 0 && Number(_) !== e.sizeBytes) return { ok: !1, code: "size_mismatch" };
    return (
      (m = !0),
      {
        ok: !0,
        bytes: limitedChunks(u, e.sizeBytes, c, n),
        bytesRead: () => n.bytes,
        codeOfFailure(p) {
          if (o.aborted) return "canceled";
          if (abortController.signal.aborted) return "stalled";
          if (n.fault !== void 0)
            return (
              logForDebugging(`[task files] ${e.fileId} not saved: ${errorMessage(p)}`, { level: "error" }),
              n.fault
            );
          return (logError(p), "write_failed");
        },
        close: f,
      }
    );
  } finally {
    if (!m) f();
  }
}
/**
 * 下载任务附带的文件到本地任务目录：校验 id 与大小、避免重名、超时与磁盘检查。
 */
//@ chunk-ar2zwb92.js:4943-6470 placement
async function downloadTaskFile(e, s, o, r) {
  let n, c, u;
  try {
    if (isDiskless()) return { ok: !1, code: "no_disk" };
    if ((await settleStoredLoginRefusal({ isFilesDial: !0, signal: r }), r.aborted))
      return { ok: !1, code: "canceled" };
    let f = validateTaskFileEntry(e, r);
    if (f !== void 0) return f;
    let m = join(s, TASK_FILE_CONSTANTS),
      a = safeDownloadName(e.name, e.fileId);
    if ((await ensureToolResultsDir(s, o), !(await hasFreeSpace(s, e.sizeBytes))))
      return { ok: !1, code: "no_room" };
    let _ = await streamDownload(e, o, r);
    if (!_.ok) return _;
    n = _;
    let { bytes: bytes } = n;
    if (isStorageV5Enabled() && o !== void 0)
      for (let i = 1; i <= RGn; i++) {
        let b = join(m, numberedName(a, i)),
          A = pathToSessionSideKey(b);
        if (A === void 0) break;
        let writeFromStream = await o.writeFromStream(A, bytes, {
          maxBytes: e.sizeBytes,
          precondition: { type: "ifAbsent" },
          mode: 384,
        });
        if (writeFromStream.ok) return { ok: !0, filepath: b, bytes: writeFromStream.value.bytes };
        if (writeFromStream.error.code === "AlreadyExists" && n.bytesRead() > 0)
          return { ok: !1, code: "name_taken" };
        if (writeFromStream.error.code !== "AlreadyExists")
          throw (
            logForDebugging(`[task files] storage write failed (${writeFromStream.error.code})`, {
              level: "error",
            }),
            Error("a task file was not stored")
          );
        if (i === RGn) return { ok: !1, code: "name_taken" };
      }
    await checkToolResultsWritable(m, getFileReader());
    try {
      await mkdir(m, { mode: 448 });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    ((c = join(m, `.${randomBytes(8).toString("hex")}.partial`)),
      (u = await open(c, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS, 384)),
      await pipeline(bytes, u.createWriteStream()));
    let S = await open(c, ws | READ_LIMITS);
    try {
      for (let i = 1; i <= RGn; i++) {
        let b = join(m, numberedName(a, i));
        if ((await linkIntoHome(c, S, b, 384)) !== void 0)
          return { ok: !0, filepath: b, bytes: n.bytesRead() };
      }
    } finally {
      await S.close();
    }
    return { ok: !1, code: "name_taken" };
  } catch (error) {
    if (n !== void 0) return { ok: !1, code: n.codeOfFailure(error) };
    if (r.aborted) return { ok: !1, code: "canceled" };
    return (logError(error), { ok: !1, code: "write_failed" });
  } finally {
    if ((n?.close(), await u?.close().catch(() => {}), c !== void 0)) await unlink(c).catch(() => {});
  }
}
//@ chunk-ar2zwb92.js:6470-6619 placement
async function hasFreeSpace(e, s) {
  let o = await statfs(e, { bigint: !0 }).catch(() => {
    return;
  });
  return o === void 0 || o.blocks <= 0n || o.bsize <= 0n || o.bavail * o.bsize >= BigInt(s + B);
}
//@ chunk-ar2zwb92.js:6619-6702 placement
function numberedName(e, s) {
  if (s === 1) return e;
  let { name: o, ext: ext } = parse(e);
  return `${o} (${s})${ext}`;
}
//@ chunk-ar2zwb92.js:6702-6755 placement
function F(e) {
  return regExp.test(foldName(e)) ? `${e}.download` : e;
}
//@ chunk-ar2zwb92.js:6755-6850 placement
function G(e) {
  let s = homeFileNameProblem(e, !0);
  return foldName(e) === "architecture.md" || (s !== void 0 && s !== "odd_spelling");
}
/**
 * 文件名清理：不安全字符替换为下划线（保留合法的变体选择符与零宽连接），压缩空格。
 */
//@ chunk-ar2zwb92.js:6850-7037 placement
function sanitizeDownloadName(e) {
  let s = "",
    o = "";
  for (let r of e)
    ((o = (
      R.test(r)
        ? R.test(o)
          ? r === "\u200D" && /[\ufe0e\ufe0f]/u.test(o)
          : regExp_3.test(o)
        : !regExp_2.test(r)
    )
      ? r
      : "_"),
      (s += o));
  return s.replace(regExp_5, "$1_").replace(/ {2,}/g, " ");
}
//@ chunk-ar2zwb92.js:7037-7304 placement
async function* limitedChunks(e, s, o, r) {
  try {
    for await (let n of e) {
      if ((o.refresh(), (r.bytes += n.length), r.bytes > s)) break;
      yield n;
    }
  } catch (error) {
    throw ((r.fault = "network"), error);
  }
  if ((clearTimeout(o), r.bytes !== s))
    throw ((r.fault = "size_mismatch"), Error("a task file did not have the size the server listed"));
}

export {
  keys,
  validateTaskFileEntry,
  safeDownloadName,
  TASK_FILE_CONSTANTS,
  hasFreeSpace,
  streamDownload,
  RGn,
  numberedName,
  downloadTaskFile,
};
