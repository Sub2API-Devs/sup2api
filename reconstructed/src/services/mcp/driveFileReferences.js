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
import { mot, fileReferenceValues } from "./fileReference/wrapFileReferenceTool.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { fileReferenceUnavailableReason, x$e } from "./fileReference/fileReferencePolicy.js";
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

/**
 * 判断文件引用是否是 Windows 盘符形式（sha256:<哈希>:X:...）。
 */
//@ chunk-0p9fd9na.js:6083-6239 placement
function isWindowsForm(e) {
  let buffer = Buffer.from(e.slice(0, 80), "utf8"),
    i = 72,
    r = buffer[72] ?? 0;
  return (
    e.startsWith("sha256:") &&
    buffer[71] === 58 &&
    ((r >= 65 && r <= 90) || (r >= 97 && r <= 122)) &&
    buffer[73] === 58
  );
}
//@ chunk-0p9fd9na.js:6239-6429 placement
var MAX_REFERENCE_PATH_BYTES = 1024,
  MAX_REFERENCE_PATH_DEPTH = 32,
  EXPECTED_REFUSALS = new Set([
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
function pathKindMeta(e) {
  return e === "/sessions" || e.startsWith("/sessions/") ? { fileRefPathKind: "vm_sessions" } : {};
}
/**
 * 解析文件引用 sha256:<64 位哈希>:<绝对路径>，返回哈希、路径与路径形式，或 not_a_reference / ref_malformed。
 */
//@ chunk-0p9fd9na.js:6529-6806 placement
function parseFileReference(e) {
  if (!e.startsWith("sha256:")) return "not_a_reference";
  let match = /^sha256:([0-9a-f]{64}):([^]*)$/.exec(e);
  if (match === null) return "ref_malformed";
  let [, i = "", r = ""] = match,
    matches = /^[A-Za-z]:\//.test(r);
  return isWellFormedReferencePath(r, matches ? r.slice(2) : r)
    ? { sha256: i, path: r, form: matches ? "windows" : "posix" }
    : "ref_malformed";
}
//@ chunk-0p9fd9na.js:6806-6851 placement
function x(e) {
  return e === void 0 ? {} : { entry: e };
}
/**
 * 检查工具调用中的文件引用：错误字段、格式错误、大小写重复的键，返回有效引用列表或错误。
 */
//@ chunk-0p9fd9na.js:6851-7517 placement
function checkCall(args, toolSpec) {
  let found = toolSpec.wrongArguments.find((wrongArgument) => mot(args[wrongArgument]));
  if (found !== void 0) return { error: "wrong_field", field: found };
  let references = [];
  for (let { entry: entry, value: u } of fileReferenceValues(args, toolSpec)) {
    if (typeof u !== "string") continue;
    let c = parseFileReference(u);
    if (c === "ref_malformed") return { error: "ref_malformed", ...x(entry) };
    if (c !== "not_a_reference")
      references.push({ entry: entry, reference: u, sha256: c.sha256, path: c.path });
  }
  if (references.length === 0) return "not_a_reference";
  let duplicateKey = findCaseFoldDuplicateKey(args);
  if (duplicateKey !== void 0) return { error: "fields_missing", case: "duplicate", ...duplicateKey };
  let argumentValue = args[toolSpec.argument];
  for (let { entry: entry } of references) {
    let u = entry !== void 0 && Array.isArray(argumentValue) ? argumentValue[entry] : void 0,
      c = isPlainObject(u) ? findCaseFoldDuplicateKey(u) : void 0;
    if (c !== void 0) return { error: "fields_missing", case: "duplicate", ...c, ...x(entry) };
  }
  return { references: references };
}
/**
 * 找出对象中大小写折叠后重复的键（按字节序取最先出现的一对）。
 */
//@ chunk-0p9fd9na.js:7517-7900 placement
function findCaseFoldDuplicateKey(e) {
  let mapped = Object.keys(e)
      .map((d) => ({ key: d, bytes: Buffer.from(d, "utf8") }))
      .sort((d, a) => Buffer.compare(d.bytes, a.bytes))
      .map((d) => d.key),
    i = new Map(),
    r = new Map();
  for (let [d, a] of mapped.entries()) {
    let u = foldKeyName(a),
      c = i.get(u);
    if (c === void 0) i.set(u, d);
    else if (!r.has(c)) r.set(c, d);
  }
  let h;
  for (let d of r.keys()) if (h === void 0 || d < h) h = d;
  return h === void 0 ? void 0 : { key: mapped[h] ?? "", also: mapped[r.get(h) ?? 0] ?? "" };
}
//@ chunk-0p9fd9na.js:7900-8074 placement
function foldKeyName(e) {
  return [...e]
    .map((n) => {
      if (n === "_" || n === "-") return "";
      if (/^[\uD800-\uDFFF]$/.test(n)) return "\uFFFD";
      return Y[n] ?? (/^[A-Z]$/.test(n) ? n.toLowerCase() : n);
    })
    .join("");
}
//@ chunk-0p9fd9na.js:8074-8134 placement
var Y = { "\u017F": "s", "\u212A": "k", "\u0131": "i", "\u0130": "i" };
/**
 * 解析 MCP 工具参数里的 Drive 文件引用：检查读取限制、读取文件并替换参数。
 */
//@ chunk-0p9fd9na.js:8134-12313 placement
async function resolveDriveFileReference(e, n, i, r, h, d) {
  let a = (s, k = {}) =>
      formatFileReferenceError(r, s, {
        ...k,
        readsBlocked: !r.hostFills && (n.blockReadsOutsideWorkingDirectories === !0 || n.restricted === !0),
      }),
    u = (s) => ({ ...fileReferenceRefusal("not_available", a("not_available"), s, !0), beforeRead: !0 }),
    c = (s, k, A) => ({ ...fileReferenceRefusal(s, k, A), beforeRead: !0 }),
    S = fileReferenceUnavailableReason(r);
  if (S !== void 0) return u(S);
  if (r.stillHeld?.() === !1) return u("entry_not_held");
  let F = getPlatform() === "windows",
    T = fileReferenceValues(e, r);
  if (
    !F &&
    [...T.map((s) => s.value), ...r.wrongArguments.map((wrongArgument) => e[wrongArgument])].some(
      (s) => typeof s === "string" && isWindowsForm(s),
    )
  )
    return u("windows_path");
  if (i === "send") {
    let s;
    if (d === void 0) {
      let k = T.find((A) => mot(A.value)) ?? T[0];
      s = { now: k?.value, ...x(k?.entry), detail: "not_checked" };
    } else {
      let k = new Map(d.map(({ entry: entry, reference: reference }) => [entry, reference]));
      for (let l of T) {
        let b = k.get(l.entry);
        if (b === void 0 ? mot(l.value) : l.value !== b) {
          s = {
            was: b,
            now: l.value,
            ...x(l.entry),
            detail:
              b === void 0 ? "reference_added" : mot(l.value) ? "reference_changed" : "reference_removed",
          };
          break;
        }
      }
      let A = new Set(T.map((l) => l.entry)),
        found = d.find((l) => !A.has(l.entry));
      if (s === void 0 && found !== void 0)
        s = { was: found.reference, now: void 0, ...x(found.entry), detail: "reference_gone" };
    }
    if (s !== void 0)
      return c(
        "changed_after_check",
        a("changed_after_check", {
          name: referencedFileName(s.was) ?? referencedFileName(s.now) ?? "The file",
          entry: s.entry,
        }),
        s.detail,
      );
  }
  let y = checkCall(e, r);
  if (y === "not_a_reference") return c("wrong_field", a("wrong_field", { field: r.wrongArguments[0] }));
  if ("error" in y)
    return c(y.error, a(y.error, { field: y.field, key: y.key, also: y.also, entry: y.entry }), y.case);
  let D = F ? y.references.find(({ path: path }) => !/^[A-Za-z]:\//.test(path)) : void 0;
  if (D !== void 0)
    return {
      ...c("ref_malformed", a("ref_malformed", { entry: D.entry }), "posix_on_windows"),
      ...pathKindMeta(D.path),
    };
  let P = [];
  for (let { entry: entry, reference: reference, sha256: sha256, path: path } of y.references) {
    if (r.hostFills) {
      let o;
      try {
        let w = await screenUnreadUpload(path, n);
        if (w.judged.split(sep).join("/") !== path)
          o = { reason: "outside_roots", detail: "spelling_changed" };
        else if (w.resolved === void 0 && w.linked)
          o = { reason: "outside_roots", detail: "link_unresolved" };
        else if (await isUploadAllowedPath(path, w.resolved ?? path))
          o = { reason: "refused_kind", detail: "credential_or_own_file" };
      } catch (error) {
        o = classifyReadFailure(error);
      }
      let p = fileReferenceUnavailableReason(r);
      if (o === void 0 && p !== void 0) return u(p);
      if (o === void 0) continue;
      return (
        logForDebugging(`[file reference] a path was rejected: ${o.detail}`),
        {
          ...fileReferenceRefusal(o.reason, a("cannot_upload", { entry: entry, path: path }), o.detail, !0),
          beforeRead: !0,
        }
      );
    }
    let l = basename(path),
      b,
      R;
    if (isDiskless()) {
      let o = x$e.peek(h.session)?.host;
      if (o === void 0) return u("diskless");
      let read = await o.read([path], n, r.maxFileBytes, h.signal, !0);
      if ("error" in read) {
        if (read.error === FILE_UPLOAD_UNAVAILABLE)
          return fileReferenceRefusal("not_available", a("not_available"), read.reason, !0);
        if (read.reason === "daemon_refused")
          return i === "send"
            ? fileReferenceRefusal(
                "changed_after_check",
                a("changed_after_check", { entry: entry, name: l }),
                "container_refused",
              )
            : fileReferenceRefusal(
                "outside_roots",
                a("cannot_upload", { entry: entry, path: path }),
                "container_refused",
                !0,
              );
        return fileReferenceRefusal("read_failed", a("read_failed", { entry: entry, name: l }), read.reason);
      }
      let w = read.files[0]?.data;
      if (w === void 0)
        return fileReferenceRefusal("read_failed", a("read_failed", { entry: entry, name: l }), "no_file");
      if (r.stillHeld?.() === !1)
        return fileReferenceRefusal("not_available", a("not_available"), "entry_not_held", !0);
      let buffer = Buffer.from(w, "base64");
      R = { buf: buffer, name: l, sha256: computeContentHash(buffer) };
    } else
      R = await statUploadCandidate(
        path,
        async (o) => {
          let p;
          try {
            ((p = await screenUploadPath(o, n)), assertPathNotBlocked(o, p, n));
          } catch (error) {
            ((b = classifyReadFailure(error)),
              logForDebugging(`[file reference] a path was rejected: ${b.detail}`));
            return;
          }
          return p;
        },
        r.maxFileBytes,
        { followsLinks: !0 },
      );
    if ("code" in R) {
      let o = classifyGuardedReadFailure(R.code, b);
      if (i === "send" && (o.reason === "not_found" || o.reason === "too_large"))
        return fileReferenceRefusal(
          "changed_after_check",
          a("changed_after_check", { entry: entry, name: l }),
          o.reason,
        );
      if (R.code !== "path_rejected" && (o.reason === "too_large" || o.reason === "read_failed"))
        return fileReferenceRefusal(o.reason, a(o.reason, { entry: entry, name: l }), o.detail);
      return {
        ...fileReferenceRefusal(o.reason, a("cannot_upload", { entry: entry, path: path }), o.detail, !0),
        ...(o.reason === "not_found" && pathKindMeta(path)),
      };
    }
    if (R.buf.length === 0)
      return i === "check"
        ? fileReferenceRefusal("empty_file", a("empty_file", { entry: entry, name: l }))
        : fileReferenceRefusal(
            "changed_after_check",
            a("changed_after_check", { entry: entry, name: l }),
            "empty_file",
          );
    if (R.sha256 !== sha256)
      return i === "check"
        ? fileReferenceRefusal("checksum_mismatch", a("checksum_mismatch", { entry: entry, name: l }))
        : fileReferenceRefusal("changed_after_check", a("changed_after_check", { entry: entry, name: l }));
    P.push({ entry: entry, reference: reference, buf: R.buf });
  }
  let H = r.hostFills ? void 0 : fileReferenceUnavailableReason(r);
  if (H !== void 0) return fileReferenceRefusal("not_available", a("not_available"), H, !0);
  return r.hostFills
    ? {
        hostReads: !0,
        references: y.references.map(({ entry: entry, reference: reference }) => ({
          entry: entry,
          reference: reference,
        })),
      }
    : { files: P };
}
//@ chunk-0p9fd9na.js:12313-12489 placement
function fileReferenceRefusal(e, n, i, r) {
  if (EXPECTED_REFUSALS.has(e)) logFeatureSad("mcp_drive_file_reference", e);
  else logFeatureBad("mcp_drive_file_reference", e);
  return { refusal: e, message: n, ...(i !== void 0 && { detail: i }), ...(r && { notAnError: r }) };
}
//@ chunk-0p9fd9na.js:12489-12569 placement
var q = ": tell the user the upload didn't work, and ask what they'd like to do.";
/**
 * 按平台给出计算 sha256 的命令提示。
 */
//@ chunk-0p9fd9na.js:12569-12741 placement
function hashCommand() {
  return getPlatform() === "windows"
    ? "sha256sum in Git Bash, or (Get-FileHash -Algorithm SHA256 <file>).Hash.ToLower() in PowerShell"
    : "sha256sum, or shasum -a 256 on macOS";
}
//@ chunk-0p9fd9na.js:12741-15357 placement
function formatFileReferenceError(e, n, i) {
  let argument = e.argument,
    h = displaySafeText(i.path ?? ""),
    d = displaySafeText(i.name ?? basename(i.path ?? "")),
    a = i.field ?? e.wrongArguments[0] ?? "content";
  switch (n) {
    case "not_available":
      return `File references can't be used here, so nothing was uploaded. Put the file's content in ${argument} as base64 instead.`;
    case "ref_malformed":
      return `The file reference in ${argument} is not valid, so nothing was uploaded. Write it as sha256:<64 lowercase hex digits>:<absolute path>, with / between folders, also on Windows (C:/Users/...). No folder or file name in the path may be empty, be made only of dots and spaces (such as . or ..), or contain ':'. The path may not end in '/', contain backslashes, escapes like %20, or unusual characters, be over 1,024 bytes, or have more than 32 parts. Fix it, or put the file's base64 in ${argument}.`;
    case "wrong_field":
      return `The ${a} field holds a file reference, so nothing was uploaded. Put the reference in ${argument} instead and leave ${a} out.`;
    case "fields_missing": {
      let u = (F) => (F === "" ? "an empty name" : displaySafeText(F)),
        c = i.key ?? "";
      if (i.also) {
        let F = foldKeyName(c) === foldKeyName(argument) ? argument : "one of them";
        return `This ${e.toolName} call names a file by reference but has one argument under two spellings, ${u(c)} and ${u(i.also)}, so nothing was uploaded. Keep only ${F} and make the call again.`;
      }
      let S =
        c === ""
          ? "has an argument with an empty name twice"
          : `has the argument ${displaySafeText(c)} twice`;
      return `This ${e.toolName} call names a file by reference but ${S}, so nothing was uploaded. Fix that and make the call again.`;
    }
    case "cannot_upload":
      return `Nothing was uploaded: ${h} either does not exist or can't be sent by reference from here (this message doesn't say which). Check the path. If it is right, a reference won't work for this file${i.readsBlocked ? q : `, but ${argument} still accepts a file's base64.`}`;
    case "empty_file":
      return `${d} is empty, so nothing was uploaded. If it was just written, make sure it is saved and make the call once more; if it really is empty, tell the user.`;
    case "too_large":
      return `${d} is over the ${e.maxFileText} limit for uploads from here, so nothing was uploaded. Tell the user the file is too large to upload from here.`;
    case "checksum_mismatch":
      return `${d} doesn't match the SHA-256 in the reference, so nothing was uploaded. Compute its SHA-256 again (${hashCommand()}) and make the call again. A SHA-256 that wasn't computed from the file won't match.`;
    case "changed_after_check":
      return `${d} changed after it was checked, so nothing was uploaded. Compute its SHA-256 again and make the call again. If it changes again, tell the user.`;
    default:
      return `${d} couldn't be read just now, so nothing was uploaded. Make the call once more; if it fails again, tell the user.`;
  }
}
//@ chunk-0p9fd9na.js:15357-15464 placement
function referencedFileName(e) {
  let n = typeof e === "string" ? parseFileReference(e) : "not_a_reference";
  return typeof n === "string" ? void 0 : basename(n.path);
}
//@ chunk-0p9fd9na.js:15464-15623 placement
function displaySafeText(e) {
  let mapped = [...e].map((i) => (/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\uFFFD]/u.test(i) ? "?" : i));
  return mapped.length > 200 ? `${mapped.slice(0, 200).join("")}\u2026` : mapped.join("");
}
/**
 * 判断引用路径是否格式良好：绝对路径、长度与层数受限、没有空段或冒号、不含反斜杠、百分号编码与控制/格式字符。
 */
//@ chunk-0p9fd9na.js:15623-15942 placement
function isWellFormedReferencePath(e, n) {
  if (
    !n.startsWith("/") ||
    !isWellFormedString(e) ||
    Buffer.byteLength(e, "utf8") > MAX_REFERENCE_PATH_BYTES ||
    countCharInString(e, "/") > MAX_REFERENCE_PATH_DEPTH
  )
    return !1;
  if (
    n
      .slice(1)
      .split("/")
      .some((i) => /^[.\p{Zs}]*$/u.test(i) || /(?! )\p{Zs}+$/u.test(i) || i.includes(":"))
  )
    return !1;
  return !(
    /[\\]|%[0-9a-f]{2}/i.test(e) || /[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}\uFFFD\u2000\u2001]/u.test(e)
  );
}
/**
 * 把读取引用文件的失败归类：不存在、凭据类文件被拒、读取失败，或位于允许根目录之外。
 */
//@ chunk-0p9fd9na.js:15942-16437 placement
function classifyReadFailure(e) {
  if (isPathAbsent(e)) return { reason: "not_found", detail: "not_found" };
  if (pathRejectionKind(e) === "credential_name")
    return { reason: "refused_kind", detail: "credential_name" };
  if (!(e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS))
    return { reason: "read_failed", detail: sanitizeErrnoForTelemetry(e) ?? "not_readable" };
  let sliced = e.telemetryMessage
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
function classifyGuardedReadFailure(e, n) {
  switch (e) {
    case "path_rejected":
      return n ?? { reason: "refused_kind", detail: "credential_or_own_file" };
    case "hard_links":
    case "not_regular":
    case "name_direction":
      return { reason: "refused_kind", detail: e };
    case "too_large":
      return { reason: "too_large" };
    default:
      return { reason: "read_failed", detail: e };
  }
}
