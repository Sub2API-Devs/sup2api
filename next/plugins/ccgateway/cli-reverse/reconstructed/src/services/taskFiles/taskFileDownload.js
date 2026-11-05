/**
 * services/taskFiles/taskFileDownload.ts
 *
 * 2.1.316 新增：任务附带文件下载
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7ktcr4q9.js (11)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7ktcr4q9.js:1133-2850 placement
/**
 * 任务文件下载的常量：超时、磁盘余量、重试次数、文件名长度与危险字符/扩展名。
 */
var TASK_FILE_CONSTANTS; // deferred: uses basename (../../utils/filePersistence/homeFilePublish.js) of its import cycle while loading; runs once the cycle is complete
var DOWNLOAD_TIMEOUT_MS;
var MIN_FREE_DISK_SLACK_BYTES;
var MAX_DOWNLOAD_RETRIES;
var MAX_DOWNLOAD_NAME_BYTES;
var FILE_EXTENSION_REGEX;
var MAX_ORIGINAL_NAME_CHARS;
var parts;
var regExp;
var DANGEROUS_SPELLING_CHARS;
var DASH_LIKE_CHARS;
var regExp_2;
var VARIATION_SELECTOR_RE;
var regExp_3;
var regExp_4;
var regExp_5;
var DOWNLOAD_FAILURE_CODES;
var keys;
deferInit("chunk-7ktcr4q9.js:1133", () => {
  TASK_FILE_CONSTANTS = "task-files";
  DOWNLOAD_TIMEOUT_MS = 60000;
  MIN_FREE_DISK_SLACK_BYTES = 67108864;
  MAX_DOWNLOAD_RETRIES = 20;
  MAX_DOWNLOAD_NAME_BYTES = 200;
  FILE_EXTENSION_REGEX = /\.[A-Za-z0-9]{1,16}$/;
  MAX_ORIGINAL_NAME_CHARS = 1024;
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
    .split(" ");
  regExp = new RegExp(`(?:\\.(?:${parts.join("|")})|^desktop\\.ini|^autorun\\.inf)$`, "i");
  DANGEROUS_SPELLING_CHARS =
    "\xA5\u20A9\u2216\u2044\u2215\u02BA\u030E\u02B9\u02BC\u02C8\u2032\u02CB\u0300\u2035\u0589\u2236\u066A\u2217\u3008\u3009\u01C0\u2223\u2758\u01C3\u02C4\u0302\u2303\u0303\u223C";
  DASH_LIKE_CHARS = "\\-\u2010\u2013\u2014\u2015\u2212\u2500\u252C\u2534\u2550\u2564-\u2569";
  regExp_2 = new RegExp(
    `${NON_ASCII_NAME_CHARS_RE.source}|${CONTROL_OR_FORMAT_CHARS_RE.source}|\\p{Default_Ignorable_Code_Point}|[%\\p{Cs}\\u2018-\\u201f\\u1680\\u2800${DANGEROUS_SPELLING_CHARS}]`,
    "u",
  );
  VARIATION_SELECTOR_RE = /^[\u200c\u200d\ufe0e\ufe0f]$/;
  regExp_3 = new RegExp(
    `^(?![${DASH_LIKE_CHARS}])(?:[^\\P{L}\\p{ASCII}]|[^\\P{M}\\p{ASCII}]|[^\\P{N}\\p{ASCII}]|[^\\P{S}\\p{ASCII}])`,
    "u",
  );
  regExp_4 = new RegExp(`^[.${DASH_LIKE_CHARS}+@ ]+`, "u");
  regExp_5 = new RegExp(`(\\s)[${DASH_LIKE_CHARS}+@](?=\\S)`, "gu");
  DOWNLOAD_FAILURE_CODES = {
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
  keys = Object.keys(DOWNLOAD_FAILURE_CODES);
});
//@ chunk-7ktcr4q9.js:2850-3128 placement
function safeDownloadName(name, fileId) {
  let baseName =
    name.length > MAX_ORIGINAL_NAME_CHARS ? "" : (name.normalize("NFKC").split(/[/\\]/).at(-1) ?? "");
  let cleanedName = trimEndChars(sanitizeDownloadName(baseName).replace(regExp_4, ""), ". ");
  let finalName =
    cleanedName === "" ||
    Buffer.byteLength(cleanedName, "utf8") > MAX_DOWNLOAD_NAME_BYTES ||
    Buffer.byteLength(appendDownloadSuffixIfDangerous(cleanedName), "utf8") > MAX_DOWNLOAD_NAME_BYTES ||
    WINDOWS_RESERVED_NAME_RE.test(firstLineOf(cleanedName, ".").trim().toLowerCase()) ||
    hasProblematicFileName(cleanedName)
      ? `${fileId}${FILE_EXTENSION_REGEX.exec(cleanedName)?.[0] ?? ""}`
      : cleanedName;
  return appendDownloadSuffixIfDangerous(finalName);
}
//@ chunk-7ktcr4q9.js:3128-3585 placement
function validateTaskFileEntry(file, signal) {
  if (!FILE_ID_RE.test(file.fileId))
    return {
      ok: false,
      code: "bad_id",
    };
  if (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0)
    return {
      ok: false,
      code: "bad_size",
    };
  if (file.sizeBytes > FILES_API_MAX_FILE_BYTES)
    return {
      ok: false,
      code: "too_large",
    };
  let isPolicyMissing = isPolicyLimitsCacheMissing();
  let unavailableReason = filesApiUnavailableReason({
    oauthToken: getAccessTokenWithCcrFallback(),
    isStoredLogin: true,
  });
  if (unavailableReason !== undefined)
    return {
      ok: false,
      code: unavailableReason,
    };
  if (isPolicyMissing)
    return {
      ok: false,
      code: "policy_pending",
    };
  if (!getOauthConfig().BASE_API_URL.startsWith("https://"))
    return {
      ok: false,
      code: "not_https",
    };
  if (signal.aborted)
    return {
      ok: false,
      code: "canceled",
    };
  return;
}
//@ chunk-7ktcr4q9.js:3585-4943 placement
async function streamDownload(file, storageV5, signal) {
  let abortController = new AbortController();
  let progress = {
    bytes: 0,
  };
  let timer = setTimeout((controller) => controller.abort(), DOWNLOAD_TIMEOUT_MS, abortController);
  let stream;
  let cleanup = () => {
    clearTimeout(timer);
    stream?.destroy();
  };
  let isHandedOff = false;
  try {
    let response;
    try {
      response = await apiClient.get(`/v1/files/${encodeURIComponent(file.fileId)}/content`, {
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
        signal: AbortSignal.any([signal, abortController.signal]),
        maxRedirects: 0,
        validateStatus: () => true,
      });
    } catch (error) {
      logForDebugging(`[task files] ${file.fileId} request failed: ${errorMessage(error)}`, {
        level: "error",
      });
      return {
        ok: false,
        code: signal.aborted ? "canceled" : abortController.signal.aborted ? "stalled" : "network",
      };
    }
    if (!response.ok)
      return {
        ok: false,
        code:
          response.reason === "essential-traffic-only"
            ? "essential_traffic"
            : response.reason === "no-auth"
              ? "no_token"
              : "egress_blocked",
      };
    stream = response.data;
    stream.on("error", () => {});
    if (response.status === 401)
      return {
        ok: false,
        code: "sign_in_expired",
      };
    if (response.status !== 200)
      return {
        ok: false,
        code: "refused",
        status: response.status,
      };
    let contentLength = response.response.headers["content-length"];
    if (contentLength !== undefined && Number(contentLength) !== file.sizeBytes)
      return {
        ok: false,
        code: "size_mismatch",
      };
    isHandedOff = true;
    return {
      ok: true,
      bytes: limitedChunks(stream, file.sizeBytes, timer, progress),
      bytesRead: () => progress.bytes,
      codeOfFailure(error) {
        if (signal.aborted) return "canceled";
        if (abortController.signal.aborted) return "stalled";
        if (progress.fault !== undefined) {
          logForDebugging(`[task files] ${file.fileId} not saved: ${errorMessage(error)}`, {
            level: "error",
          });
          return progress.fault;
        }
        logError(error);
        return "write_failed";
      },
      close: cleanup,
    };
  } finally {
    if (!isHandedOff) cleanup();
  }
}
//@ chunk-7ktcr4q9.js:4943-6470 placement
/**
 * 下载任务附带的文件到本地任务目录：校验 id 与大小、避免重名、超时与磁盘检查。
 */
async function downloadTaskFile(file, dir, storageV5, signal) {
  let download;
  let partialPath;
  let partialHandle;
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
    let validationRefusal = validateTaskFileEntry(file, signal);
    if (validationRefusal !== undefined) return validationRefusal;
    let targetDir = join(dir, TASK_FILE_CONSTANTS);
    let targetName = safeDownloadName(file.name, file.fileId);
    await ensureToolResultsDir(dir, storageV5);
    if (!(await hasFreeSpace(dir, file.sizeBytes)))
      return {
        ok: false,
        code: "no_room",
      };
    let streamResult = await streamDownload(file, storageV5, signal);
    if (!streamResult.ok) return streamResult;
    download = streamResult;
    let { bytes } = download;
    if (isStorageV5Enabled() && storageV5 !== undefined)
      for (let attempt = 1; attempt <= MAX_DOWNLOAD_RETRIES; attempt++) {
        let candidatePath = join(targetDir, numberedName(targetName, attempt));
        let sideKey = pathToSessionSideKey(candidatePath);
        if (sideKey === undefined) break;
        let writeResult = await storageV5.writeFromStream(sideKey, bytes, {
          maxBytes: file.sizeBytes,
          precondition: {
            type: "ifAbsent",
          },
          mode: 384,
        });
        if (writeResult.ok)
          return {
            ok: true,
            filepath: candidatePath,
            bytes: writeResult.value.bytes,
          };
        if (writeResult.error.code === "AlreadyExists" && download.bytesRead() > 0)
          return {
            ok: false,
            code: "name_taken",
          };
        if (writeResult.error.code !== "AlreadyExists") {
          logForDebugging(`[task files] storage write failed (${writeResult.error.code})`, {
            level: "error",
          });
          throw Error("a task file was not stored");
        }
        if (attempt === MAX_DOWNLOAD_RETRIES)
          return {
            ok: false,
            code: "name_taken",
          };
      }
    await checkToolResultsWritable(targetDir, getFileReader());
    try {
      await mkdir(targetDir, {
        mode: 448,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    partialPath = join(targetDir, `.${randomBytes(8).toString("hex")}.partial`);
    partialHandle = await open(
      partialPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
      384,
    );
    await pipeline(bytes, partialHandle.createWriteStream());
    let verifyHandle = await open(partialPath, NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    try {
      for (let attempt = 1; attempt <= MAX_DOWNLOAD_RETRIES; attempt++) {
        let candidatePath = join(targetDir, numberedName(targetName, attempt));
        if ((await linkIntoHome(partialPath, verifyHandle, candidatePath, 384)) !== undefined)
          return {
            ok: true,
            filepath: candidatePath,
            bytes: download.bytesRead(),
          };
      }
    } finally {
      await verifyHandle.close();
    }
    return {
      ok: false,
      code: "name_taken",
    };
  } catch (error) {
    if (download !== undefined)
      return {
        ok: false,
        code: download.codeOfFailure(error),
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
    download?.close();
    await partialHandle?.close().catch(() => {});
    if (partialPath !== undefined) await unlink(partialPath).catch(() => {});
  }
}
//@ chunk-7ktcr4q9.js:6470-6619 placement
async function hasFreeSpace(dir, neededBytes) {
  let stats = await statfs(dir, {
    bigint: true,
  }).catch(() => {
    return;
  });
  return (
    stats === undefined ||
    stats.blocks <= 0n ||
    stats.bsize <= 0n ||
    stats.bavail * stats.bsize >= BigInt(neededBytes + MIN_FREE_DISK_SLACK_BYTES)
  );
}
//@ chunk-7ktcr4q9.js:6619-6702 placement
function numberedName(fileName, index) {
  if (index === 1) return fileName;
  let { name: stem, ext } = parse(fileName);
  return `${stem} (${index})${ext}`;
}
//@ chunk-7ktcr4q9.js:6702-6755 placement
/**
 * 危险扩展名时给文件名追加 .download。
 */
function appendDownloadSuffixIfDangerous(fileName) {
  return regExp.test(foldName(fileName)) ? `${fileName}.download` : fileName;
}
//@ chunk-7ktcr4q9.js:6755-6850 placement
/**
 * 判断文件名是否不合规（含 architecture.md 特判与拼写异常除外）。
 */
function hasProblematicFileName(fileName) {
  let problem = homeFileNameProblem(fileName, true);
  return foldName(fileName) === "architecture.md" || (problem !== undefined && problem !== "odd_spelling");
}
//@ chunk-7ktcr4q9.js:6850-7037 placement
/**
 * 文件名清理：不安全字符替换为下划线（保留合法的变体选择符与零宽连接），压缩空格。
 */
function sanitizeDownloadName(name) {
  let result = "";
  let char = "";
  for (let inputChar of name) {
    char = (
      VARIATION_SELECTOR_RE.test(inputChar)
        ? VARIATION_SELECTOR_RE.test(char)
          ? inputChar === "\u200D" && /[\ufe0e\ufe0f]/u.test(char)
          : regExp_3.test(char)
        : !regExp_2.test(inputChar)
    )
      ? inputChar
      : "_";
    result += char;
  }
  return result.replace(regExp_5, "$1_").replace(/ {2,}/g, " ");
}
//@ chunk-7ktcr4q9.js:7037-7304 placement
async function* limitedChunks(source, sizeBytes, timer, progress) {
  try {
    for await (let chunk of source) {
      timer.refresh();
      progress.bytes += chunk.length;
      if (progress.bytes > sizeBytes) break;
      yield chunk;
    }
  } catch (error) {
    progress.fault = "network";
    throw error;
  }
  clearTimeout(timer);
  if (progress.bytes !== sizeBytes) {
    progress.fault = "size_mismatch";
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
