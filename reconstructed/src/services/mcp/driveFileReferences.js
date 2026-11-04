/**
 * services/mcp/driveFileReferences.ts
 *
 * 2.1.316 新增：Google Drive 文件引用处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0p9fd9na.js (19)
 * attribution: placement 19
 */
import { sep, basename } from "path";
import { isSha256Value, fileReferenceValues } from "./fileReference/wrapFileReferenceTool.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { fileReferenceUnavailableReason, disklessHostState } from "./fileReference/fileReferencePolicy.js";
import { getPlatform } from "../../utils/platform.js";
import { screenUnreadUpload } from "../../utils/claudeInChrome/fileUpload.js";
import { isUploadAllowedPath, statUploadCandidate } from "../fileInputs/uploadPut.js";
import { logForDebugging } from "../../utils/debug.js";
import { isDiskless } from "../../bootstrap/state.js";
import { FILE_UPLOAD_UNAVAILABLE } from "../../utils/claudeInChrome/common.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { screenUploadPath, assertPathNotBlocked, pathRejectionKind } from "../fileInputs/screenPath.js";
import { logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { isWellFormedString, countCharInString } from "../../utils/stringUtils.js";
import {
  isPathAbsent,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrnoForTelemetry,
} from "../../utils/errors.js";

//@ chunk-0p9fd9na.js:6083-6239 placement
/**
 * 判断文件引用是否是 Windows 盘符形式（sha256:<哈希>:X:...）。
 */
function isWindowsForm(value) {
  let buffer = Buffer.from(value.slice(0, 80), "utf8");
  let colonIndex = 72;
  let driveLetterCode = buffer[72] ?? 0;
  return (
    value.startsWith("sha256:") &&
    buffer[71] === 58 &&
    ((driveLetterCode >= 65 && driveLetterCode <= 90) || (driveLetterCode >= 97 && driveLetterCode <= 122)) &&
    buffer[73] === 58
  );
}
//@ chunk-0p9fd9na.js:6239-6429 placement
var MAX_REFERENCE_PATH_BYTES = 1024;
var MAX_REFERENCE_PATH_DEPTH = 32;
var EXPECTED_REFUSALS = new Set([
  "not_available",
  "ref_malformed",
  "checksum_mismatch",
  "changed_after_check",
  "empty_file",
  "wrong_field",
  "fields_missing",
  "not_found",
  "outside_roots",
  "refused_kind",
]);
//@ chunk-0p9fd9na.js:6429-6529 placement
function pathKindMeta(path) {
  return path === "/sessions" || path.startsWith("/sessions/")
    ? {
        fileRefPathKind: "vm_sessions",
      }
    : {};
}
//@ chunk-0p9fd9na.js:6529-6806 placement
/**
 * 解析文件引用 sha256:<64 位哈希>:<绝对路径>，返回哈希、路径与路径形式，或 not_a_reference / ref_malformed。
 */
function parseFileReference(value) {
  if (!value.startsWith("sha256:")) return "not_a_reference";
  let match = /^sha256:([0-9a-f]{64}):([^]*)$/.exec(value);
  if (match === null) return "ref_malformed";
  let [, hash = "", path = ""] = match;
  let matches = /^[A-Za-z]:\//.test(path);
  return isWellFormedReferencePath(path, matches ? path.slice(2) : path)
    ? {
        sha256: hash,
        path,
        form: matches ? "windows" : "posix",
      }
    : "ref_malformed";
}
//@ chunk-0p9fd9na.js:6806-6851 placement
/**
 * 把可选值包装成 { entry }（未提供时为空对象）。
 */
function wrapEntry(entry) {
  return entry === undefined
    ? {}
    : {
        entry,
      };
}
//@ chunk-0p9fd9na.js:6851-7517 placement
/**
 * 检查工具调用中的文件引用：错误字段、格式错误、大小写重复的键，返回有效引用列表或错误。
 */
function checkCall(args, toolSpec) {
  let found = toolSpec.wrongArguments.find((wrongArgument) => isSha256Value(args[wrongArgument]));
  if (found !== undefined)
    return {
      error: "wrong_field",
      field: found,
    };
  let references = [];
  for (let { entry, value } of fileReferenceValues(args, toolSpec)) {
    if (typeof value !== "string") continue;
    let fileReference = parseFileReference(value);
    if (fileReference === "ref_malformed")
      return {
        error: "ref_malformed",
        ...wrapEntry(entry),
      };
    if (fileReference !== "not_a_reference")
      references.push({
        entry,
        reference: value,
        sha256: fileReference.sha256,
        path: fileReference.path,
      });
  }
  if (references.length === 0) return "not_a_reference";
  let duplicateKey = findCaseFoldDuplicateKey(args);
  if (duplicateKey !== undefined)
    return {
      error: "fields_missing",
      case: "duplicate",
      ...duplicateKey,
    };
  let argumentValue = args[toolSpec.argument];
  for (let { entry } of references) {
    let entryValue = entry !== undefined && Array.isArray(argumentValue) ? argumentValue[entry] : undefined;
    let duplicateKey = isPlainObject(entryValue) ? findCaseFoldDuplicateKey(entryValue) : undefined;
    if (duplicateKey !== undefined)
      return {
        error: "fields_missing",
        case: "duplicate",
        ...duplicateKey,
        ...wrapEntry(entry),
      };
  }
  return {
    references,
  };
}
//@ chunk-0p9fd9na.js:7517-7900 placement
/**
 * 找出对象中大小写折叠后重复的键（按字节序取最先出现的一对）。
 */
function findCaseFoldDuplicateKey(input) {
  let mapped = Object.keys(input)
    .map((key) => ({
      key,
      bytes: Buffer.from(key, "utf8"),
    }))
    .sort((entryA, entryB) => Buffer.compare(entryA.bytes, entryB.bytes))
    .map((entry) => entry.key);
  let firstIndexByName = new Map();
  let duplicateIndexByName = new Map();
  for (let [index, key] of mapped.entries()) {
    let foldedName = foldKeyName(key);
    let firstIndex = firstIndexByName.get(foldedName);
    if (firstIndex === undefined) firstIndexByName.set(foldedName, index);
    else if (!duplicateIndexByName.has(firstIndex)) duplicateIndexByName.set(firstIndex, index);
  }
  let lowestIndex;
  for (let key of duplicateIndexByName.keys())
    if (lowestIndex === undefined || key < lowestIndex) lowestIndex = key;
  return lowestIndex === undefined
    ? undefined
    : {
        key: mapped[lowestIndex] ?? "",
        also: mapped[duplicateIndexByName.get(lowestIndex) ?? 0] ?? "",
      };
}
//@ chunk-0p9fd9na.js:7900-8074 placement
function foldKeyName(key) {
  return [...key]
    .map((char) => {
      if (char === "_" || char === "-") return "";
      if (/^[\uD800-\uDFFF]$/.test(char)) return "\uFFFD";
      return LEXICAL_CASE_FOLD[char] ?? (/^[A-Z]$/.test(char) ? char.toLowerCase() : char);
    })
    .join("");
}
//@ chunk-0p9fd9na.js:8074-8134 placement
/**
 * 少数 Unicode 字符的大小写折叠表。
 */
var LEXICAL_CASE_FOLD = {
  "\u017F": "s",
  "\u212A": "k",
  "\u0131": "i",
  "\u0130": "i",
};
//@ chunk-0p9fd9na.js:8134-12313 placement
/**
 * 解析 MCP 工具参数里的 Drive 文件引用：检查读取限制、读取文件并替换参数。
 */
async function resolveDriveFileReference(args, context, phase, toolSpec, toolContext, checkedReferences) {
  let formatError = (reason, extra = {}) =>
    formatFileReferenceError(toolSpec, reason, {
      ...extra,
      readsBlocked:
        !toolSpec.hostFills &&
        (context.blockReadsOutsideWorkingDirectories === true || context.restricted === true),
    });
  let notAvailable = (detail) => ({
    ...fileReferenceRefusal("not_available", formatError("not_available"), detail, true),
    beforeRead: true,
  });
  let refuse = (reason, message, detail) => ({
    ...fileReferenceRefusal(reason, message, detail),
    beforeRead: true,
  });
  let unavailableReason = fileReferenceUnavailableReason(toolSpec);
  if (unavailableReason !== undefined) return notAvailable(unavailableReason);
  if (toolSpec.stillHeld?.() === false) return notAvailable("entry_not_held");
  let isWindows = getPlatform() === "windows";
  let values = fileReferenceValues(args, toolSpec);
  if (
    !isWindows &&
    [
      ...values.map((entry) => entry.value),
      ...toolSpec.wrongArguments.map((wrongArgument) => args[wrongArgument]),
    ].some((value) => typeof value === "string" && isWindowsForm(value))
  )
    return notAvailable("windows_path");
  if (phase === "send") {
    let change;
    if (checkedReferences === undefined) {
      let entry = values.find((candidate) => isSha256Value(candidate.value)) ?? values[0];
      change = {
        now: entry?.value,
        ...wrapEntry(entry?.entry),
        detail: "not_checked",
      };
    } else {
      let checkedByEntry = new Map(checkedReferences.map(({ entry, reference }) => [entry, reference]));
      for (let value of values) {
        let checkedReference = checkedByEntry.get(value.entry);
        if (checkedReference === undefined ? isSha256Value(value.value) : value.value !== checkedReference) {
          change = {
            was: checkedReference,
            now: value.value,
            ...wrapEntry(value.entry),
            detail:
              checkedReference === undefined
                ? "reference_added"
                : isSha256Value(value.value)
                  ? "reference_changed"
                  : "reference_removed",
          };
          break;
        }
      }
      let presentEntries = new Set(values.map((value) => value.entry));
      let found = checkedReferences.find((checkedReference) => !presentEntries.has(checkedReference.entry));
      if (change === undefined && found !== undefined)
        change = {
          was: found.reference,
          now: undefined,
          ...wrapEntry(found.entry),
          detail: "reference_gone",
        };
    }
    if (change !== undefined)
      return refuse(
        "changed_after_check",
        formatError("changed_after_check", {
          name: referencedFileName(change.was) ?? referencedFileName(change.now) ?? "The file",
          entry: change.entry,
        }),
        change.detail,
      );
  }
  let check = checkCall(args, toolSpec);
  if (check === "not_a_reference")
    return refuse(
      "wrong_field",
      formatError("wrong_field", {
        field: toolSpec.wrongArguments[0],
      }),
    );
  if ("error" in check)
    return refuse(
      check.error,
      formatError(check.error, {
        field: check.field,
        key: check.key,
        also: check.also,
        entry: check.entry,
      }),
      check.case,
    );
  let posixOnWindows = isWindows
    ? check.references.find(({ path }) => !/^[A-Za-z]:\//.test(path))
    : undefined;
  if (posixOnWindows !== undefined)
    return {
      ...refuse(
        "ref_malformed",
        formatError("ref_malformed", {
          entry: posixOnWindows.entry,
        }),
        "posix_on_windows",
      ),
      ...pathKindMeta(posixOnWindows.path),
    };
  let files = [];
  for (let { entry, reference, sha256, path } of check.references) {
    if (toolSpec.hostFills) {
      let pathRejection;
      try {
        let screened = await screenUnreadUpload(path, context);
        if (screened.judged.split(sep).join("/") !== path)
          pathRejection = {
            reason: "outside_roots",
            detail: "spelling_changed",
          };
        else if (screened.resolved === undefined && screened.linked)
          pathRejection = {
            reason: "outside_roots",
            detail: "link_unresolved",
          };
        else if (await isUploadAllowedPath(path, screened.resolved ?? path))
          pathRejection = {
            reason: "refused_kind",
            detail: "credential_or_own_file",
          };
      } catch (error) {
        pathRejection = classifyReadFailure(error);
      }
      let unavailableReason = fileReferenceUnavailableReason(toolSpec);
      if (pathRejection === undefined && unavailableReason !== undefined)
        return notAvailable(unavailableReason);
      if (pathRejection === undefined) continue;
      logForDebugging(`[file reference] a path was rejected: ${pathRejection.detail}`);
      return {
        ...fileReferenceRefusal(
          pathRejection.reason,
          formatError("cannot_upload", {
            entry,
            path,
          }),
          pathRejection.detail,
          true,
        ),
        beforeRead: true,
      };
    }
    let name = basename(path);
    let readFailure;
    let uploadCandidate;
    if (isDiskless()) {
      let host = disklessHostState.peek(toolContext.session)?.host;
      if (host === undefined) return notAvailable("diskless");
      let readResult = await host.read([path], context, toolSpec.maxFileBytes, toolContext.signal, true);
      if ("error" in readResult) {
        if (readResult.error === FILE_UPLOAD_UNAVAILABLE)
          return fileReferenceRefusal("not_available", formatError("not_available"), readResult.reason, true);
        if (readResult.reason === "daemon_refused")
          return phase === "send"
            ? fileReferenceRefusal(
                "changed_after_check",
                formatError("changed_after_check", {
                  entry,
                  name,
                }),
                "container_refused",
              )
            : fileReferenceRefusal(
                "outside_roots",
                formatError("cannot_upload", {
                  entry,
                  path,
                }),
                "container_refused",
                true,
              );
        return fileReferenceRefusal(
          "read_failed",
          formatError("read_failed", {
            entry,
            name,
          }),
          readResult.reason,
        );
      }
      let fileData = readResult.files[0]?.data;
      if (fileData === undefined)
        return fileReferenceRefusal(
          "read_failed",
          formatError("read_failed", {
            entry,
            name,
          }),
          "no_file",
        );
      if (toolSpec.stillHeld?.() === false)
        return fileReferenceRefusal("not_available", formatError("not_available"), "entry_not_held", true);
      let buffer = Buffer.from(fileData, "base64");
      uploadCandidate = {
        buf: buffer,
        name,
        sha256: computeContentHash(buffer),
      };
    } else
      uploadCandidate = await statUploadCandidate(
        path,
        async (resolvedPath) => {
          let screened;
          try {
            screened = await screenUploadPath(resolvedPath, context);
            assertPathNotBlocked(resolvedPath, screened, context);
          } catch (error) {
            readFailure = classifyReadFailure(error);
            logForDebugging(`[file reference] a path was rejected: ${readFailure.detail}`);
            return;
          }
          return screened;
        },
        toolSpec.maxFileBytes,
        {
          followsLinks: true,
        },
      );
    if ("code" in uploadCandidate) {
      let readError = classifyGuardedReadFailure(uploadCandidate.code, readFailure);
      if (phase === "send" && (readError.reason === "not_found" || readError.reason === "too_large"))
        return fileReferenceRefusal(
          "changed_after_check",
          formatError("changed_after_check", {
            entry,
            name,
          }),
          readError.reason,
        );
      if (
        uploadCandidate.code !== "path_rejected" &&
        (readError.reason === "too_large" || readError.reason === "read_failed")
      )
        return fileReferenceRefusal(
          readError.reason,
          formatError(readError.reason, {
            entry,
            name,
          }),
          readError.detail,
        );
      return {
        ...fileReferenceRefusal(
          readError.reason,
          formatError("cannot_upload", {
            entry,
            path,
          }),
          readError.detail,
          true,
        ),
        ...(readError.reason === "not_found" && pathKindMeta(path)),
      };
    }
    if (uploadCandidate.buf.length === 0)
      return phase === "check"
        ? fileReferenceRefusal(
            "empty_file",
            formatError("empty_file", {
              entry,
              name,
            }),
          )
        : fileReferenceRefusal(
            "changed_after_check",
            formatError("changed_after_check", {
              entry,
              name,
            }),
            "empty_file",
          );
    if (uploadCandidate.sha256 !== sha256)
      return phase === "check"
        ? fileReferenceRefusal(
            "checksum_mismatch",
            formatError("checksum_mismatch", {
              entry,
              name,
            }),
          )
        : fileReferenceRefusal(
            "changed_after_check",
            formatError("changed_after_check", {
              entry,
              name,
            }),
          );
    files.push({
      entry,
      reference,
      buf: uploadCandidate.buf,
    });
  }
  let laterUnavailableReason = toolSpec.hostFills ? undefined : fileReferenceUnavailableReason(toolSpec);
  if (laterUnavailableReason !== undefined)
    return fileReferenceRefusal("not_available", formatError("not_available"), laterUnavailableReason, true);
  return toolSpec.hostFills
    ? {
        hostReads: true,
        references: check.references.map(({ entry, reference }) => ({
          entry,
          reference,
        })),
      }
    : {
        files,
      };
}
//@ chunk-0p9fd9na.js:12313-12489 placement
function fileReferenceRefusal(reason, message, detail, notAnError) {
  if (EXPECTED_REFUSALS.has(reason)) logFeatureSad("mcp_drive_file_reference", reason);
  else logFeatureBad("mcp_drive_file_reference", reason);
  return {
    refusal: reason,
    message,
    ...(detail !== undefined && {
      detail,
    }),
    ...(notAnError && {
      notAnError,
    }),
  };
}
//@ chunk-0p9fd9na.js:12489-12569 placement
/**
 * 上传失败时给用户的提示句。
 */
var UPLOAD_FAILURE_HINT = ": tell the user the upload didn't work, and ask what they'd like to do.";
//@ chunk-0p9fd9na.js:12569-12741 placement
/**
 * 按平台给出计算 sha256 的命令提示。
 */
function hashCommand() {
  return getPlatform() === "windows"
    ? "sha256sum in Git Bash, or (Get-FileHash -Algorithm SHA256 <file>).Hash.ToLower() in PowerShell"
    : "sha256sum, or shasum -a 256 on macOS";
}
//@ chunk-0p9fd9na.js:12741-15357 placement
function formatFileReferenceError(toolSpec, reason, details) {
  let argument = toolSpec.argument;
  let pathText = displaySafeText(details.path ?? "");
  let nameText = displaySafeText(details.name ?? basename(details.path ?? ""));
  let fieldName = details.field ?? toolSpec.wrongArguments[0] ?? "content";
  switch (reason) {
    case "not_available":
      return `File references can't be used here, so nothing was uploaded. Put the file's content in ${argument} as base64 instead.`;
    case "ref_malformed":
      return `The file reference in ${argument} is not valid, so nothing was uploaded. Write it as sha256:<64 lowercase hex digits>:<absolute path>, with / between folders, also on Windows (C:/Users/...). No folder or file name in the path may be empty, be made only of dots and spaces (such as . or ..), or contain ':'. The path may not end in '/', contain backslashes, escapes like %20, or unusual characters, be over 1,024 bytes, or have more than 32 parts. Fix it, or put the file's base64 in ${argument}.`;
    case "wrong_field":
      return `The ${fieldName} field holds a file reference, so nothing was uploaded. Put the reference in ${argument} instead and leave ${fieldName} out.`;
    case "fields_missing": {
      let quoteName = (name) => (name === "" ? "an empty name" : displaySafeText(name));
      let key = details.key ?? "";
      if (details.also) {
        let keepLabel = foldKeyName(key) === foldKeyName(argument) ? argument : "one of them";
        return `This ${toolSpec.toolName} call names a file by reference but has one argument under two spellings, ${quoteName(key)} and ${quoteName(details.also)}, so nothing was uploaded. Keep only ${keepLabel} and make the call again.`;
      }
      let duplicateText =
        key === ""
          ? "has an argument with an empty name twice"
          : `has the argument ${displaySafeText(key)} twice`;
      return `This ${toolSpec.toolName} call names a file by reference but ${duplicateText}, so nothing was uploaded. Fix that and make the call again.`;
    }
    case "cannot_upload":
      return `Nothing was uploaded: ${pathText} either does not exist or can't be sent by reference from here (this message doesn't say which). Check the path. If it is right, a reference won't work for this file${details.readsBlocked ? UPLOAD_FAILURE_HINT : `, but ${argument} still accepts a file's base64.`}`;
    case "empty_file":
      return `${nameText} is empty, so nothing was uploaded. If it was just written, make sure it is saved and make the call once more; if it really is empty, tell the user.`;
    case "too_large":
      return `${nameText} is over the ${toolSpec.maxFileText} limit for uploads from here, so nothing was uploaded. Tell the user the file is too large to upload from here.`;
    case "checksum_mismatch":
      return `${nameText} doesn't match the SHA-256 in the reference, so nothing was uploaded. Compute its SHA-256 again (${hashCommand()}) and make the call again. A SHA-256 that wasn't computed from the file won't match.`;
    case "changed_after_check":
      return `${nameText} changed after it was checked, so nothing was uploaded. Compute its SHA-256 again and make the call again. If it changes again, tell the user.`;
    default:
      return `${nameText} couldn't be read just now, so nothing was uploaded. Make the call once more; if it fails again, tell the user.`;
  }
}
//@ chunk-0p9fd9na.js:15357-15464 placement
function referencedFileName(reference) {
  let parsed = typeof reference === "string" ? parseFileReference(reference) : "not_a_reference";
  return typeof parsed === "string" ? undefined : basename(parsed.path);
}
//@ chunk-0p9fd9na.js:15464-15623 placement
function displaySafeText(text) {
  let mapped = [...text].map((char) => (/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\uFFFD]/u.test(char) ? "?" : char));
  return mapped.length > 200 ? `${mapped.slice(0, 200).join("")}\u2026` : mapped.join("");
}
//@ chunk-0p9fd9na.js:15623-15942 placement
/**
 * 判断引用路径是否格式良好：绝对路径、长度与层数受限、没有空段或冒号、不含反斜杠、百分号编码与控制/格式字符。
 */
function isWellFormedReferencePath(reference, path) {
  if (
    !path.startsWith("/") ||
    !isWellFormedString(reference) ||
    Buffer.byteLength(reference, "utf8") > MAX_REFERENCE_PATH_BYTES ||
    countCharInString(reference, "/") > MAX_REFERENCE_PATH_DEPTH
  )
    return false;
  if (
    path
      .slice(1)
      .split("/")
      .some(
        (segment) => /^[.\p{Zs}]*$/u.test(segment) || /(?! )\p{Zs}+$/u.test(segment) || segment.includes(":"),
      )
  )
    return false;
  return !(
    /[\\]|%[0-9a-f]{2}/i.test(reference) ||
    /[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}\uFFFD\u2000\u2001]/u.test(reference)
  );
}
//@ chunk-0p9fd9na.js:15942-16437 placement
/**
 * 把读取引用文件的失败归类：不存在、凭据类文件被拒、读取失败，或位于允许根目录之外。
 */
function classifyReadFailure(error) {
  if (isPathAbsent(error))
    return {
      reason: "not_found",
      detail: "not_found",
    };
  if (pathRejectionKind(error) === "credential_name")
    return {
      reason: "refused_kind",
      detail: "credential_name",
    };
  if (!(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS))
    return {
      reason: "read_failed",
      detail: sanitizeErrnoForTelemetry(error) ?? "not_readable",
    };
  let sliced = error.telemetryMessage
    .replace(/^[^:]*:\s*/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 63);
  return {
    reason: /kernel|device|credential|name_or_place/.test(sliced) ? "refused_kind" : "outside_roots",
    detail: /^[a-z]/.test(sliced) ? sliced : "not_readable",
  };
}
//@ chunk-0p9fd9na.js:16437-16735 placement
function classifyGuardedReadFailure(code, fallback) {
  switch (code) {
    case "path_rejected":
      return (
        fallback ?? {
          reason: "refused_kind",
          detail: "credential_or_own_file",
        }
      );
    case "hard_links":
    case "not_regular":
    case "name_direction":
      return {
        reason: "refused_kind",
        detail: code,
      };
    case "too_large":
      return {
        reason: "too_large",
      };
    default:
      return {
        reason: "read_failed",
        detail: code,
      };
  }
}
export {
  checkCall,
  hashCommand,
  isWindowsForm,
  parseFileReference,
  resolveDriveFileReference,
  formatFileReferenceError,
};
