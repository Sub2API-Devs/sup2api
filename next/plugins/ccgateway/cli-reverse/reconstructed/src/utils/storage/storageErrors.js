/**
 * utils/storage/storageErrors.ts
 *
 * 2.1.316 新增：会话存储层（storageV5）的错误码与判定（InvalidArgument、Unavailable、Failed 及其遥测码）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tvxatsbk.js (19)
 * attribution: placement 19
 */

//@ chunk-tvxatsbk.js:191-276 placement
/**
 * 构造 InvalidArgument 形态的存储错误。
 */
function invalidStorageArgument(argument, reason) {
  return {
    code: "InvalidArgument",
    argument,
    ...(reason !== undefined && {
      reason,
    }),
  };
}
//@ chunk-tvxatsbk.js:276-499 placement
function unavailableStorageError(failureClass = "unknown", details) {
  return {
    code: "Unavailable",
    failureClass,
    ...(details?.key !== undefined && {
      key: details.key,
    }),
    ...(details?.retryAfterMs !== undefined && {
      retryAfterMs: details.retryAfterMs,
    }),
    ...(details?.telemetryCode !== undefined && {
      telemetryCode: details.telemetryCode,
    }),
  };
}
//@ chunk-tvxatsbk.js:499-520 placement
var OTHERNAMES = "OtherNames";
//@ chunk-tvxatsbk.js:520-604 placement
var LEAFMOVED = "LeafMoved";
var HARDENINGUNAVAILABLE = "HardeningUnavailable";
var REMOTELINK = "RemoteLink";
var ASIDESTRANDED = "AsideStranded";
//@ chunk-tvxatsbk.js:604-626 placement
var UNSUPPORTED = "Unsupported";
//@ chunk-tvxatsbk.js:626-698 placement
/**
 * 是否为「不支持」的存储失败（telemetryCode Unsupported）。
 */
function isUnsupportedStorageError(error) {
  return isStoreError(error) && error.code === "Failed" && error.telemetryCode === UNSUPPORTED;
}
//@ chunk-tvxatsbk.js:698-726 placement
var BYTEVIEWUNSUPPORTED = "ByteViewUnsupported";
//@ chunk-tvxatsbk.js:726-809 placement
/**
 * 是否为 ByteView 不支持的存储失败。
 */
function isByteViewUnsupportedError(error) {
  return error.code === "Failed" && "telemetryCode" in error && error.telemetryCode === BYTEVIEWUNSUPPORTED;
}
//@ chunk-tvxatsbk.js:809-829 placement
var STOREFENCED = "StoreFenced";
//@ chunk-tvxatsbk.js:829-912 placement
/**
 * 是否为存储被 fence 的失败。
 */
function isStoreFencedError(error) {
  return error.code === "Failed" && "telemetryCode" in error && error.telemetryCode === STOREFENCED;
}
//@ chunk-tvxatsbk.js:912-999 placement
var SOURCENOTREGULAR = "SourceNotRegular";
var SOURCETOOLARGE = "SourceTooLarge";
var SOURCESHARED = "SourceShared";
var SOURCEOUTSIDE = "SourceOutside";
//@ chunk-tvxatsbk.js:999-1133 placement
/**
 * 存储 v5 错误码集合（InvalidArgument、NotFound、LeaseHeld、Unavailable…）。与 bridge 无关。
 */
var STORE_ERROR_CODES = new Set([
  "InvalidArgument",
  "NotFound",
  "AlreadyExists",
  "PreconditionFailed",
  "LeaseHeld",
  "Unavailable",
  "Failed",
  "ScopeNotFound",
]);
//@ chunk-tvxatsbk.js:1133-1239 placement (2.1.88 match: isConnectionError, 1)
/**
 * 错误是否带已知的存储错误码。
 */
function isStoreError(err) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof err.code === "string" &&
    STORE_ERROR_CODES.has(err.code)
  );
}
//@ chunk-tvxatsbk.js:1239-1262 placement
var ABSENTPARENT = "AbsentParent";
//@ chunk-tvxatsbk.js:1262-1347 placement
/**
 * 是否为父目录缺失的存储失败。
 */
function isAbsentParentError(error) {
  return error.code === "Failed" && "telemetryCode" in error && error.telemetryCode === ABSENTPARENT;
}
//@ chunk-tvxatsbk.js:1347-1436 placement
function storageErrorCode(error) {
  if (isAbsentParentError(error)) return "ENOENT";
  return "telemetryCode" in error ? error.telemetryCode : undefined;
}
//@ chunk-tvxatsbk.js:1436-1455 placement
var TOOLARGE = "TooLarge";
//@ chunk-tvxatsbk.js:1455-1637 placement
function formatStorageError(error) {
  return (
    error.code +
    ("failureClass" in error ? ` ${error.failureClass}` : "") +
    ("telemetryCode" in error && error.telemetryCode ? ` ${error.telemetryCode}` : "") +
    ("cause" in error && error.cause ? `: ${errorMessageOf(error.cause)}` : "")
  );
}
//@ chunk-tvxatsbk.js:1637-1697 placement
function errorMessageOf(cause) {
  return cause instanceof Error ? cause.message : String(cause);
}
export {
  storageErrorCode,
  isStoreError,
  isAbsentParentError,
  formatStorageError,
  isUnsupportedStorageError,
  isByteViewUnsupportedError,
  isStoreFencedError,
  UNSUPPORTED,
  TOOLARGE,
  SOURCETOOLARGE,
  REMOTELINK,
  SOURCENOTREGULAR,
  SOURCESHARED,
  SOURCEOUTSIDE,
  ASIDESTRANDED,
  LEAFMOVED,
  OTHERNAMES,
  HARDENINGUNAVAILABLE,
  unavailableStorageError,
  invalidStorageArgument,
  ABSENTPARENT,
};
