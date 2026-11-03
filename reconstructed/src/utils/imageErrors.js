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

//@ chunk-mvvq2nx1.js:828-869 placement
var v8r = "[Image: ",
  c4t = "[Image source: ";
//@ chunk-mvvq2nx1.js:869-1079 placement
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
  ],
  gJ = 8000;
//@ chunk-mvvq2nx1.js:1079-1121 placement
function xe(e) {
  return IMAGE_ERROR_CODES.some((n) => n === e);
}
//@ chunk-mvvq2nx1.js:1121-1159 placement
function cst(e) {
  return xe(e) ? e : void 0;
}
//@ chunk-mvvq2nx1.js:1159-2881 placement
function describeImageTooLarge(e) {
  switch (e) {
    case "image_dimensions_too_large":
      return {
        cause: `the image is more than ${gJ} pixels wide or tall`,
        remedy: `send a copy scaled to at most ${gJ} pixels on its longer side, or send it in a non-image format such as a .zip`,
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
        stop: !0,
      };
    case "upload_busy":
      return {
        cause: "the server is busy with other large uploads",
        remedy: "try again shortly",
        passes: !0,
      };
    case "upload_timeout":
      return { cause: "the server timed out receiving the file", remedy: "try again", passes: !0 };
  }
}
/**
 * “upload failed: server returned N” 正则与登录过期的原因/处理说明。
 */
//@ chunk-mvvq2nx1.js:2881-3494 placement
var UPLOAD_STATUS_RE = /^upload failed: server returned (\d+)$/,
  SIGN_IN_EXPIRED_HINT = {
    cause:
      "this session's cloud environment is not signed in to send files, most likely because its sign-in has expired",
    remedy: `an expired sign-in is renewed once this turn has ended and the environment has then run no tool call or ${MONITOR} watch for about five minutes, so do not send again or run sleep now; tell the user to wait at least five minutes without sending anything else in this chat, and then to ask for the file again. If a send after such a wait fails like this too, tell the user instead that sending files may not work in this chat for now`,
    stop: !0,
  };
//@ chunk-mvvq2nx1.js:3494-3564 placement
function re(e, n) {
  return cst(n) === void 0 && UPLOAD_STATUS_RE.exec(e)?.[1] === "401" && isCcsTenant();
}
/**
 * 可能暂时性的上传错误正则、排除正则与可重试状态码。
 */
//@ chunk-mvvq2nx1.js:3564-3812 placement
var TRANSIENT_UPLOAD_ERROR_RE =
    /^upload failed: (?:network error \(|the connection closed before the server answered$|the server did not answer within \d|the transfer stalled \()/,
  NON_TRANSIENT_UPLOAD_RE = /\bInvalid URL\b|certificate/i,
  RETRYABLE_UPLOAD_STATUSES = new Set([429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 529]);
/**
 * 给上传错误附加原因与处理建议（图片过大或登录过期）。
 */
//@ chunk-mvvq2nx1.js:3812-4031 placement
function explainUploadError(e, n, r = !1) {
  let o = cst(n),
    u = o !== void 0 ? describeImageTooLarge(o) : re(e, n) ? SIGN_IN_EXPIRED_HINT : void 0;
  if (u === void 0) return e;
  let { cause: cause, remedy: remedy, stop: stop } = u,
    h = [...(UPLOAD_STATUS_RE.test(e) ? [cause] : []), ...(r && !stop ? [] : [remedy])];
  return h.length === 0 ? e : `${e} \u2014 ${h.join("; ")}`;
}
//@ chunk-mvvq2nx1.js:4031-4048 placement
var nir = 31457280;
//@ chunk-mvvq2nx1.js:4048-4130 placement
function V9o(e) {
  let n = e / 1048576;
  return `${Number.isInteger(n) ? n : n.toFixed(1)} MiB`;
}
//@ chunk-mvvq2nx1.js:4130-4168 placement
var Re = new Set([502, 503, 504, 520, 524]);
/**
 * 上传失败是否可能是暂时性的（状态码或网络错误）。
 */
//@ chunk-mvvq2nx1.js:4168-4277 placement
function isTransientUploadFailure(e, n) {
  if (cst(n) !== void 0) return !1;
  return (
    Re.has(Number(UPLOAD_STATUS_RE.exec(e)?.[1])) ||
    (TRANSIENT_UPLOAD_ERROR_RE.test(e) && !NON_TRANSIENT_UPLOAD_RE.test(e))
  );
}
//@ chunk-mvvq2nx1.js:4277-4350 placement
function q9o(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e > 0;
}
/**
 * 较大文件的暂时性失败是否可能是超过未声明的上传上限。
 */
//@ chunk-mvvq2nx1.js:4350-4461 placement
function mayBeOverSizeLimit(e) {
  return (
    q9o(e.upload_suspected_limit_bytes) &&
    e.size > nir &&
    isTransientUploadFailure(e.upload_error, e.upload_error_code)
  );
}
/**
 * 上传失败的说明文本。
 */
//@ chunk-mvvq2nx1.js:4461-4745 placement
function describeUploadFailure(e) {
  return mayBeOverSizeLimit(e)
    ? `${e.upload_error} \u2014 the cause is unknown and may pass. If the same file fails like this again, it may be over the upload limit that applies to this session, which was not named and is never under ${V9o(nir)}`
    : explainUploadError(e.upload_error, e.upload_error_code);
}
/**
 * 上传失败是否值得稍后重发。
 */
//@ chunk-mvvq2nx1.js:4745-4877 placement
function isRetryableUploadFailure(e, n) {
  let r = cst(n);
  if (r !== void 0) return describeImageTooLarge(r).passes === !0;
  return (
    RETRYABLE_UPLOAD_STATUSES.has(Number(UPLOAD_STATUS_RE.exec(e)?.[1])) ||
    (TRANSIENT_UPLOAD_ERROR_RE.test(e) && !NON_TRANSIENT_UPLOAD_RE.test(e))
  );
}
/**
 * 有可能暂时性的失败时，提示用户稍后让你重发。
 */
//@ chunk-mvvq2nx1.js:4877-5350 placement
function retryLaterHint(e) {
  let filtered = e.filter((s) => isRetryableUploadFailure(s.upload_error, s.upload_error_code));
  if (filtered.length === 0 || e.some((s) => re(s.upload_error, s.upload_error_code))) return "";
  let r = plural(filtered.length, "failure"),
    o = `also tell the user they can ask you to send ${plural(filtered.length, "it", "them")} again in a few minutes.`;
  if (filtered.length === e.length) return ` The ${r} may be temporary, so ${o}`;
  return ` For ${new Intl.ListFormat("en", { type: "conjunction" }).format(filtered.map((s) => s.path))}, whose ${r} may be temporary, ${o}`;
}

export {
  c4t,
  gJ,
  V9o,
  isTransientUploadFailure,
  nir,
  cst,
  v8r,
  q9o,
  describeUploadFailure,
  retryLaterHint,
  explainUploadError,
};
