/**
 * utils/imageErrors.ts
 *
 * 图片错误码与提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mvvq2nx1.js (18)
 * attribution: placement 18
 */
import { MONITOR } from "../tools/MonitorTool/constants.js";
import { isCcsTenant } from "../bootstrap/state.js";
import { plural } from "./stringUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-mvvq2nx1.js:828-869 placement
/**
 * 图片在提示文本中的标记前缀 "[Image: " 与 "[Image source: "。
 */
var IMAGE_MARKER_PREFIX = "[Image: ";
var IMAGE_SOURCE_MARKER_PREFIX = "[Image source: ";
//@ chunk-mvvq2nx1.js:869-1079 placement
/**
 * 图片错误码列表与最大图像边长。
 */
var IMAGE_ERROR_CODES = [
  "image_dimensions_too_large",
  "image_processing_failed",
  "unsupported_file_format",
  "image_format_mismatch",
  "image_too_large",
  "file_too_large",
  "file_limit_exceeded",
  "upload_busy",
  "upload_timeout",
];
var MAX_IMAGE_DIMENSION = 8000;
//@ chunk-mvvq2nx1.js:1079-1121 placement
function isImageErrorCode(code) {
  return IMAGE_ERROR_CODES.some((knownCode) => knownCode === code);
}
//@ chunk-mvvq2nx1.js:1121-1159 placement
/**
 * 合法时返回图片错误码，否则 undefined。
 */
function imageErrorCodeOrUndefined(code) {
  return isImageErrorCode(code) ? code : undefined;
}
//@ chunk-mvvq2nx1.js:1159-2881 placement
function describeImageTooLarge(code) {
  switch (code) {
    case "image_dimensions_too_large":
      return {
        cause: `the image is more than ${MAX_IMAGE_DIMENSION} pixels wide or tall`,
        remedy: `send a copy scaled to at most ${MAX_IMAGE_DIMENSION} pixels on its longer side, or send it in a non-image format such as a .zip`,
      };
    case "image_processing_failed":
      return {
        cause:
          "the server could not process this image (it may be damaged, truncated, not an image format it can decode, or took too long to convert)",
        remedy: "re-export it as PNG or JPEG, or send it inside a .zip",
      };
    case "unsupported_file_format":
      return {
        cause:
          "the file's contents are an image format the server does not accept, whatever its extension says (it accepts PNG, JPEG, GIF and WebP)",
        remedy: "convert it to one of those or send it inside a .zip",
      };
    case "image_format_mismatch":
      return {
        cause: "the image's contents do not match its file extension (for example JPEG data in a .png file)",
        remedy: "rename or re-export it so the two agree",
      };
    case "image_too_large":
      return {
        cause: "images have a lower size limit than other files",
        remedy: "reduce this image's file size, or send it in a non-image format such as a .zip",
      };
    case "file_too_large":
      return {
        cause: "the file is larger than the server's upload size limit",
        remedy: "send a smaller or compressed copy",
      };
    case "file_limit_exceeded":
      return {
        cause:
          "this account has uploaded as many files as it is allowed for now (a count of files, not a size)",
        remedy:
          "sending again, even a smaller file, will fail the same way until the allowance resets, so tell the user instead of retrying",
        stop: true,
      };
    case "upload_busy":
      return {
        cause: "the server is busy with other large uploads",
        remedy: "try again shortly",
        passes: true,
      };
    case "upload_timeout":
      return {
        cause: "the server timed out receiving the file",
        remedy: "try again",
        passes: true,
      };
  }
}
//@ chunk-mvvq2nx1.js:2881-3494 placement
/**
 * “upload failed: server returned N” 正则与登录过期的原因/处理说明。
 */
var UPLOAD_STATUS_RE = /^upload failed: server returned (\d+)$/;
var SIGN_IN_EXPIRED_HINT = {
  cause:
    "this session's cloud environment is not signed in to send files, most likely because its sign-in has expired",
  remedy: `an expired sign-in is renewed once this turn has ended and the environment has then run no tool call or ${MONITOR} watch for about five minutes, so do not send again or run sleep now; tell the user to wait at least five minutes without sending anything else in this chat, and then to ask for the file again. If a send after such a wait fails like this too, tell the user instead that sending files may not work in this chat for now`,
  stop: true,
};
//@ chunk-mvvq2nx1.js:3494-3564 placement
function isExpiredSignInUploadError(errorText, errorCode) {
  return (
    imageErrorCodeOrUndefined(errorCode) === undefined &&
    UPLOAD_STATUS_RE.exec(errorText)?.[1] === "401" &&
    isCcsTenant()
  );
}
//@ chunk-mvvq2nx1.js:3564-3812 placement
/**
 * 可能暂时性的上传错误正则、排除正则与可重试状态码。
 */
var TRANSIENT_UPLOAD_ERROR_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_TRANSIENT_UPLOAD_RE;
var RETRYABLE_UPLOAD_STATUSES_2;
deferInit("chunk-mvvq2nx1.js:3564", () => {
  TRANSIENT_UPLOAD_ERROR_RE =
    /^upload failed: (?:network error \(|the connection closed before the server answered$|the server did not answer within \d|the transfer stalled \()/;
  NON_TRANSIENT_UPLOAD_RE = /\bInvalid URL\b|certificate/i;
  RETRYABLE_UPLOAD_STATUSES_2 = new Set([429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 529]);
});
//@ chunk-mvvq2nx1.js:3812-4031 placement
/**
 * 给上传错误附加原因与处理建议（图片过大或登录过期）。
 */
function explainUploadError(errorText, errorCode, remedyGiven = false) {
  let code = imageErrorCodeOrUndefined(errorCode);
  let hint =
    code !== undefined
      ? describeImageTooLarge(code)
      : isExpiredSignInUploadError(errorText, errorCode)
        ? SIGN_IN_EXPIRED_HINT
        : undefined;
  if (hint === undefined) return errorText;
  let { cause, remedy, stop } = hint;
  let parts = [
    ...(UPLOAD_STATUS_RE.test(errorText) ? [cause] : []),
    ...(remedyGiven && !stop ? [] : [remedy]),
  ];
  return parts.length === 0 ? errorText : `${errorText} \u2014 ${parts.join("; ")}`;
}
//@ chunk-mvvq2nx1.js:4031-4048 placement
/**
 * 疑似上传上限的字节数（30 MiB）。
 */
var SUSPECTED_UPLOAD_LIMIT_BYTES = 31457280;
//@ chunk-mvvq2nx1.js:4048-4130 placement
/**
 * 把字节数格式化为 MiB 文本。
 */
function formatMiB(bytes) {
  let mib = bytes / 1048576;
  return `${Number.isInteger(mib) ? mib : mib.toFixed(1)} MiB`;
}
//@ chunk-mvvq2nx1.js:4130-4168 placement
var RETRYABLE_UPLOAD_STATUSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mvvq2nx1.js:4130", () => {
  RETRYABLE_UPLOAD_STATUSES = new Set([502, 503, 504, 520, 524]);
});
//@ chunk-mvvq2nx1.js:4168-4277 placement
/**
 * 上传失败是否可能是暂时性的（状态码或网络错误）。
 */
function isTransientUploadFailure(errorText, errorCode) {
  if (imageErrorCodeOrUndefined(errorCode) !== undefined) return false;
  return (
    RETRYABLE_UPLOAD_STATUSES.has(Number(UPLOAD_STATUS_RE.exec(errorText)?.[1])) ||
    (TRANSIENT_UPLOAD_ERROR_RE.test(errorText) && !NON_TRANSIENT_UPLOAD_RE.test(errorText))
  );
}
//@ chunk-mvvq2nx1.js:4277-4350 placement
/**
 * 判断是否为正的安全整数。
 */
function isPositiveSafeInteger(uploadSuspectedLimitBytes) {
  return (
    typeof uploadSuspectedLimitBytes === "number" &&
    Number.isSafeInteger(uploadSuspectedLimitBytes) &&
    uploadSuspectedLimitBytes > 0
  );
}
//@ chunk-mvvq2nx1.js:4350-4461 placement
/**
 * 较大文件的暂时性失败是否可能是超过未声明的上传上限。
 */
function mayBeOverSizeLimit(result) {
  return (
    isPositiveSafeInteger(result.upload_suspected_limit_bytes) &&
    result.size > SUSPECTED_UPLOAD_LIMIT_BYTES &&
    isTransientUploadFailure(result.upload_error, result.upload_error_code)
  );
}
//@ chunk-mvvq2nx1.js:4461-4745 placement
/**
 * 上传失败的说明文本。
 */
function describeUploadFailure(result) {
  return mayBeOverSizeLimit(result)
    ? `${result.upload_error} \u2014 the cause is unknown and may pass. If the same file fails like this again, it may be over the upload limit that applies to this session, which was not named and is never under ${formatMiB(SUSPECTED_UPLOAD_LIMIT_BYTES)}`
    : explainUploadError(result.upload_error, result.upload_error_code);
}
//@ chunk-mvvq2nx1.js:4745-4877 placement
/**
 * 上传失败是否值得稍后重发。
 */
function isRetryableUploadFailure(uploadError, uploadErrorCode) {
  let code = imageErrorCodeOrUndefined(uploadErrorCode);
  if (code !== undefined) return describeImageTooLarge(code).passes === true;
  return (
    RETRYABLE_UPLOAD_STATUSES_2.has(Number(UPLOAD_STATUS_RE.exec(uploadError)?.[1])) ||
    (TRANSIENT_UPLOAD_ERROR_RE.test(uploadError) && !NON_TRANSIENT_UPLOAD_RE.test(uploadError))
  );
}
//@ chunk-mvvq2nx1.js:4877-5350 placement
/**
 * 有可能暂时性的失败时，提示用户稍后让你重发。
 */
function retryLaterHint(failures) {
  let filtered = failures.filter((failure) =>
    isRetryableUploadFailure(failure.upload_error, failure.upload_error_code),
  );
  if (
    filtered.length === 0 ||
    failures.some((failure) => isExpiredSignInUploadError(failure.upload_error, failure.upload_error_code))
  )
    return "";
  let failureWord = plural(filtered.length, "failure");
  let retryHint = `also tell the user they can ask you to send ${plural(filtered.length, "it", "them")} again in a few minutes.`;
  if (filtered.length === failures.length) return ` The ${failureWord} may be temporary, so ${retryHint}`;
  return ` For ${new Intl.ListFormat("en", {
    type: "conjunction",
  }).format(filtered.map((failure) => failure.path))}, whose ${failureWord} may be temporary, ${retryHint}`;
}
export {
  IMAGE_SOURCE_MARKER_PREFIX,
  MAX_IMAGE_DIMENSION,
  formatMiB,
  isTransientUploadFailure,
  SUSPECTED_UPLOAD_LIMIT_BYTES,
  imageErrorCodeOrUndefined,
  IMAGE_MARKER_PREFIX,
  isPositiveSafeInteger,
  describeUploadFailure,
  retryLaterHint,
  explainUploadError,
};
