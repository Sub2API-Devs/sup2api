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
import {
  NON_ASCII_NAME_CHARS_RE,
  CONTROL_OR_FORMAT_CHARS_RE,
  linkIntoHome,
  homeFileNameProblem,
} from "../../utils/filePersistence/homeFilePublish.js";
import { trimEndChars, WINDOWS_RESERVED_NAME_RE, firstLineOf } from "../../utils/stringUtils.js";
import { FILE_ID_RE } from "../mcp/agentTaskFiles.js";
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
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { foldName } from "../../utils/permissions/protectedDirNames.js";

//@ chunk-ar2zwb92.js:1133-2850 placement
/**
 * 任务文件下载的常量：超时、磁盘余量、重试次数、文件名长度与危险字符/扩展名。
 */
var TASK_FILE_CONSTANTS = "task-files";
var DOWNLOAD_TIMEOUT_MS = 60000;
var MIN_FREE_DISK_SLACK_BYTES = 67108864;
var MAX_DOWNLOAD_RETRIES = 20;
var MAX_DOWNLOAD_NAME_BYTES = 200;
var FILE_EXTENSION_REGEX = /\.[A-Za-z0-9]{1,16}$/;
var MAX_ORIGINAL_NAME_CHARS = 1024;
var parts = [
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
  .split(" ");
var regExp = new RegExp(`(?:\\.(?:${parts.join("|")})|^desktop\\.ini|^autorun\\.inf)$`, "i");
var DANGEROUS_SPELLING_CHARS =
  "\xA5\u20A9\u2216\u2044\u2215\u02BA\u030E\u02B9\u02BC\u02C8\u2032\u02CB\u0300\u2035\u0589\u2236\u066A\u2217\u3008\u3009\u01C0\u2223\u2758\u01C3\u02C4\u0302\u2303\u0303\u223C";
var DASH_LIKE_CHARS = "\\-\u2010\u2013\u2014\u2015\u2212\u2500\u252C\u2534\u2550\u2564-\u2569";
var regExp_2 = new RegExp(
  `${NON_ASCII_NAME_CHARS_RE.source}|${CONTROL_OR_FORMAT_CHARS_RE.source}|\\p{Default_Ignorable_Code_Point}|[%\\p{Cs}\\u2018-\\u201f\\u1680\\u2800${DANGEROUS_SPELLING_CHARS}]`,
  "u",
);
var VARIATION_SELECTOR_CHARS = /^[\u200c\u200d\ufe0e\ufe0f]$/;
var regExp_3 = new RegExp(
  `^(?![${DASH_LIKE_CHARS}])(?:[^\\P{L}\\p{ASCII}]|[^\\P{M}\\p{ASCII}]|[^\\P{N}\\p{ASCII}]|[^\\P{S}\\p{ASCII}])`,
  "u",
);
var regExp_4 = new RegExp(`^[.${DASH_LIKE_CHARS}+@ ]+`, "u");
var regExp_5 = new RegExp(`(\\s)[${DASH_LIKE_CHARS}+@](?=\\S)`, "gu");
var DOWNLOAD_FAILURE_CODES = {
  no_disk: true,
  bad_id: true,
  bad_size: true,
  too_large: true,
  egress_blocked: true,
  essential_traffic: true,
  policy_pending: true,
  not_https: true,
  no_token: true,
  sign_in_expired: true,
  no_room: true,
  refused: true,
  size_mismatch: true,
  stalled: true,
  canceled: true,
  name_taken: true,
  write_failed: true,
  network: true,
};
var keys = Object.keys(DOWNLOAD_FAILURE_CODES);
//@ chunk-ar2zwb92.js:2850-3129 placement
function safeDownloadName(name, fileId) {
  let o = name.length > MAX_ORIGINAL_NAME_CHARS ? "" : (name.normalize("NFKC").split(/[/\\]/).at(-1) ?? "");
  let r = trimEndChars(sanitizeDownloadName(o).replace(regExp_4, ""), ". ");
  let n =
    r === "" ||
    Buffer.byteLength(r, "utf8") > MAX_DOWNLOAD_NAME_BYTES ||
    Buffer.byteLength(appendDownloadSuffixIfDangerous(r), "utf8") > MAX_DOWNLOAD_NAME_BYTES ||
    WINDOWS_RESERVED_NAME_RE.test(firstLineOf(r, ".").trim().toLowerCase()) ||
    hasProblematicFileName(r)
      ? `${fileId}${FILE_EXTENSION_REGEX.exec(r)?.[0] ?? ""}`
      : r;
  return appendDownloadSuffixIfDangerous(n);
}
//@ chunk-ar2zwb92.js:3129-3585 placement
function validateTaskFileEntry(e, s) {
  if (!FILE_ID_RE.test(e.fileId))
    return {
      ok: false,
      code: "bad_id",
    };
  if (!Number.isSafeInteger(e.sizeBytes) || e.sizeBytes < 0)
    return {
      ok: false,
      code: "bad_size",
    };
  if (e.sizeBytes > FILES_API_MAX_FILE_BYTES)
    return {
      ok: false,
      code: "too_large",
    };
  let o = isPolicyLimitsCacheMissing();
  let r = filesApiUnavailableReason({
    oauthToken: getAccessTokenWithCcrFallback(),
    isStoredLogin: true,
  });
  if (r !== undefined)
    return {
      ok: false,
      code: r,
    };
  if (o)
    return {
      ok: false,
      code: "policy_pending",
    };
  if (!getOauthConfig().BASE_API_URL.startsWith("https://"))
    return {
      ok: false,
      code: "not_https",
    };
  if (s.aborted)
    return {
      ok: false,
      code: "canceled",
    };
  return;
}
//@ chunk-ar2zwb92.js:3585-4943 placement
async function streamDownload(e, storageV5, o) {
  let abortController = new AbortController();
  let n = {
    bytes: 0,
  };
  let timer = setTimeout((a) => a.abort(), DOWNLOAD_TIMEOUT_MS, abortController);
  let u;
  let f = () => {
    clearTimeout(timer);
    u?.destroy();
  };
  let m = false;
  try {
    let a;
    try {
      a = await apiClient.get(`/v1/files/${encodeURIComponent(e.fileId)}/content`, {
        auth: "claude-ai-oauth",
        refreshOAuth: true,
        recoverOAuth401: true,
        storageV5,
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
        validateStatus: () => true,
      });
    } catch (error) {
      logForDebugging(`[task files] ${e.fileId} request failed: ${errorMessage(error)}`, {
        level: "error",
      });
      return {
        ok: false,
        code: o.aborted ? "canceled" : abortController.signal.aborted ? "stalled" : "network",
      };
    }
    if (!a.ok)
      return {
        ok: false,
        code:
          a.reason === "essential-traffic-only"
            ? "essential_traffic"
            : a.reason === "no-auth"
              ? "no_token"
              : "egress_blocked",
      };
    u = a.data;
    u.on("error", () => {});
    if (a.status === 401)
      return {
        ok: false,
        code: "sign_in_expired",
      };
    if (a.status !== 200)
      return {
        ok: false,
        code: "refused",
        status: a.status,
      };
    let _ = a.response.headers["content-length"];
    if (_ !== undefined && Number(_) !== e.sizeBytes)
      return {
        ok: false,
        code: "size_mismatch",
      };
    m = true;
    return {
      ok: true,
      bytes: limitedChunks(u, e.sizeBytes, timer, n),
      bytesRead: () => n.bytes,
      codeOfFailure(p) {
        if (o.aborted) return "canceled";
        if (abortController.signal.aborted) return "stalled";
        if (n.fault !== undefined) {
          logForDebugging(`[task files] ${e.fileId} not saved: ${errorMessage(p)}`, {
            level: "error",
          });
          return n.fault;
        }
        logError(p);
        return "write_failed";
      },
      close: f,
    };
  } finally {
    if (!m) f();
  }
}
//@ chunk-ar2zwb92.js:4943-6470 placement
/**
 * 下载任务附带的文件到本地任务目录：校验 id 与大小、避免重名、超时与磁盘检查。
 */
async function downloadTaskFile(file, toolResultsDir, storageV5, signal) {
  let n;
  let c;
  let u;
  try {
    if (isDiskless())
      return {
        ok: false,
        code: "no_disk",
      };
    await settleStoredLoginRefusal({
      isFilesDial: true,
      signal,
    });
    if (signal.aborted)
      return {
        ok: false,
        code: "canceled",
      };
    let f = validateTaskFileEntry(file, signal);
    if (f !== undefined) return f;
    let m = join(toolResultsDir, TASK_FILE_CONSTANTS);
    let a = safeDownloadName(file.name, file.fileId);
    await ensureToolResultsDir(toolResultsDir, storageV5);
    if (!(await hasFreeSpace(toolResultsDir, file.sizeBytes)))
      return {
        ok: false,
        code: "no_room",
      };
    let _ = await streamDownload(file, storageV5, signal);
    if (!_.ok) return _;
    n = _;
    let { bytes } = n;
    if (isStorageV5Enabled() && storageV5 !== undefined)
      for (let i = 1; i <= MAX_DOWNLOAD_RETRIES; i++) {
        let b = join(m, numberedName(a, i));
        let A = pathToSessionSideKey(b);
        if (A === undefined) break;
        let g = await storageV5.writeFromStream(A, bytes, {
          maxBytes: file.sizeBytes,
          precondition: {
            type: "ifAbsent",
          },
          mode: 384,
        });
        if (g.ok)
          return {
            ok: true,
            filepath: b,
            bytes: g.value.bytes,
          };
        if (g.error.code === "AlreadyExists" && n.bytesRead() > 0)
          return {
            ok: false,
            code: "name_taken",
          };
        if (g.error.code !== "AlreadyExists") {
          logForDebugging(`[task files] storage write failed (${g.error.code})`, {
            level: "error",
          });
          throw Error("a task file was not stored");
        }
        if (i === MAX_DOWNLOAD_RETRIES)
          return {
            ok: false,
            code: "name_taken",
          };
      }
    await checkToolResultsWritable(m, getFileReader());
    try {
      await mkdir(m, {
        mode: 448,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    c = join(m, `.${randomBytes(8).toString("hex")}.partial`);
    u = await open(c, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS, 384);
    await pipeline(bytes, u.createWriteStream());
    let S = await open(c, NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    try {
      for (let i = 1; i <= MAX_DOWNLOAD_RETRIES; i++) {
        let b = join(m, numberedName(a, i));
        if ((await linkIntoHome(c, S, b, 384)) !== undefined)
          return {
            ok: true,
            filepath: b,
            bytes: n.bytesRead(),
          };
      }
    } finally {
      await S.close();
    }
    return {
      ok: false,
      code: "name_taken",
    };
  } catch (error) {
    if (n !== undefined)
      return {
        ok: false,
        code: n.codeOfFailure(error),
      };
    if (signal.aborted)
      return {
        ok: false,
        code: "canceled",
      };
    logError(error);
    return {
      ok: false,
      code: "write_failed",
    };
  } finally {
    n?.close();
    await u?.close().catch(() => {});
    if (c !== undefined) await unlink(c).catch(() => {});
  }
}
//@ chunk-ar2zwb92.js:6470-6619 placement
async function hasFreeSpace(e, s) {
  let o = await statfs(e, {
    bigint: true,
  }).catch(() => {
    return;
  });
  return (
    o === undefined ||
    o.blocks <= 0n ||
    o.bsize <= 0n ||
    o.bavail * o.bsize >= BigInt(s + MIN_FREE_DISK_SLACK_BYTES)
  );
}
//@ chunk-ar2zwb92.js:6619-6702 placement
function numberedName(e, s) {
  if (s === 1) return e;
  let { name: o, ext } = parse(e);
  return `${o} (${s})${ext}`;
}
//@ chunk-ar2zwb92.js:6702-6755 placement
/**
 * 危险扩展名时给文件名追加 .download。
 */
function appendDownloadSuffixIfDangerous(e) {
  return regExp.test(foldName(e)) ? `${e}.download` : e;
}
//@ chunk-ar2zwb92.js:6755-6850 placement
/**
 * 判断文件名是否不合规（含 architecture.md 特判与拼写异常除外）。
 */
function hasProblematicFileName(e) {
  let s = homeFileNameProblem(e, true);
  return foldName(e) === "architecture.md" || (s !== undefined && s !== "odd_spelling");
}
//@ chunk-ar2zwb92.js:6850-7037 placement
/**
 * 文件名清理：不安全字符替换为下划线（保留合法的变体选择符与零宽连接），压缩空格。
 */
function sanitizeDownloadName(e) {
  let s = "";
  let o = "";
  for (let r of e) {
    o = (
      VARIATION_SELECTOR_CHARS.test(r)
        ? VARIATION_SELECTOR_CHARS.test(o)
          ? r === "\u200D" && /[\ufe0e\ufe0f]/u.test(o)
          : regExp_3.test(o)
        : !regExp_2.test(r)
    )
      ? r
      : "_";
    s += o;
  }
  return s.replace(regExp_5, "$1_").replace(/ {2,}/g, " ");
}
//@ chunk-ar2zwb92.js:7037-7304 placement
async function* limitedChunks(e, sizeBytes, o, r) {
  try {
    for await (let n of e) {
      o.refresh();
      r.bytes += n.length;
      if (r.bytes > sizeBytes) break;
      yield n;
    }
  } catch (error) {
    r.fault = "network";
    throw error;
  }
  clearTimeout(o);
  if (r.bytes !== sizeBytes) {
    r.fault = "size_mismatch";
    throw Error("a task file did not have the size the server listed");
  }
}
export {
  keys,
  validateTaskFileEntry,
  safeDownloadName,
  TASK_FILE_CONSTANTS,
  hasFreeSpace,
  streamDownload,
  MAX_DOWNLOAD_RETRIES,
  numberedName,
  downloadTaskFile,
};
