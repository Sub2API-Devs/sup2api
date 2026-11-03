/**
 * utils/storage/storageErrors.ts
 *
 * 2.1.316 新增：会话存储层（storageV5）的错误码与判定（InvalidArgument、Unavailable、Failed 及其遥测码）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2tgyb8s4.js (19)
 * attribution: placement 19
 */

//@ chunk-2tgyb8s4.js:191-276 placement
function Vl(e, t) {
  return { code: "InvalidArgument", argument: e, ...(t !== void 0 && { reason: t }) };
}
//@ chunk-2tgyb8s4.js:276-499 placement
function unavailableStorageError(e = "unknown", t) {
  return {
    code: "Unavailable",
    failureClass: e,
    ...(t?.key !== void 0 && { key: t.key }),
    ...(t?.retryAfterMs !== void 0 && { retryAfterMs: t.retryAfterMs }),
    ...(t?.telemetryCode !== void 0 && { telemetryCode: t.telemetryCode }),
  };
}
//@ chunk-2tgyb8s4.js:499-520 placement
var OTHERNAMES = "OtherNames";
//@ chunk-2tgyb8s4.js:520-604 placement
var LEAFMOVED = "LeafMoved",
  HARDENINGUNAVAILABLE = "HardeningUnavailable",
  REMOTELINK = "RemoteLink",
  ASIDESTRANDED = "AsideStranded";
//@ chunk-2tgyb8s4.js:604-626 placement
var UNSUPPORTED = "Unsupported";
//@ chunk-2tgyb8s4.js:626-698 placement
function kDt(e) {
  return isStoreError(e) && e.code === "Failed" && e.telemetryCode === UNSUPPORTED;
}
//@ chunk-2tgyb8s4.js:698-726 placement
var BYTEVIEWUNSUPPORTED = "ByteViewUnsupported";
//@ chunk-2tgyb8s4.js:726-809 placement
function d7t(e) {
  return e.code === "Failed" && "telemetryCode" in e && e.telemetryCode === BYTEVIEWUNSUPPORTED;
}
//@ chunk-2tgyb8s4.js:809-829 placement
var STOREFENCED = "StoreFenced";
//@ chunk-2tgyb8s4.js:829-912 placement
function wbs(e) {
  return e.code === "Failed" && "telemetryCode" in e && e.telemetryCode === STOREFENCED;
}
//@ chunk-2tgyb8s4.js:912-999 placement
var SOURCENOTREGULAR = "SourceNotRegular",
  SOURCETOOLARGE = "SourceTooLarge",
  SOURCESHARED = "SourceShared",
  SOURCEOUTSIDE = "SourceOutside";
/**
 * 存储 v5 错误码集合（InvalidArgument、NotFound、LeaseHeld、Unavailable…）。与 bridge 无关。
 */
//@ chunk-2tgyb8s4.js:999-1133 placement
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
/**
 * 错误是否带已知的存储错误码。
 */
//@ chunk-2tgyb8s4.js:1133-1239 placement = isConnectionError (1)
function isStoreError(err) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof err.code === "string" &&
    STORE_ERROR_CODES.has(err.code)
  );
}
//@ chunk-2tgyb8s4.js:1239-1262 placement
var ABSENTPARENT = "AbsentParent";
//@ chunk-2tgyb8s4.js:1262-1347 placement
function wft(e) {
  return e.code === "Failed" && "telemetryCode" in e && e.telemetryCode === ABSENTPARENT;
}
//@ chunk-2tgyb8s4.js:1347-1436 placement
function storageErrorCode(e) {
  if (wft(e)) return "ENOENT";
  return "telemetryCode" in e ? e.telemetryCode : void 0;
}
//@ chunk-2tgyb8s4.js:1436-1455 placement
var TOOLARGE = "TooLarge";
//@ chunk-2tgyb8s4.js:1455-1637 placement
function formatStorageError(e) {
  return (
    e.code +
    ("failureClass" in e ? ` ${e.failureClass}` : "") +
    ("telemetryCode" in e && e.telemetryCode ? ` ${e.telemetryCode}` : "") +
    ("cause" in e && e.cause ? `: ${i(e.cause)}` : "")
  );
}
//@ chunk-2tgyb8s4.js:1637-1697 placement
function i(e) {
  return e instanceof Error ? e.message : String(e);
}

export {
  formatStorageError,
  isStoreError,
  wft,
  kDt,
  d7t,
  wbs,
  storageErrorCode,
  ABSENTPARENT,
  REMOTELINK,
  SOURCENOTREGULAR,
  SOURCESHARED,
  SOURCEOUTSIDE,
  TOOLARGE,
  SOURCETOOLARGE,
  ASIDESTRANDED,
  UNSUPPORTED,
  LEAFMOVED,
  OTHERNAMES,
  HARDENINGUNAVAILABLE,
  unavailableStorageError,
  Vl,
};
