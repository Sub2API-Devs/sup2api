/**
 * services/policyLimits/prefetchToggle.ts
 *
 * 2.1.316 新增。策略预取开关。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pcv9zvvv.js (11)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CACHE_IO_ERRNOS } from "./complianceTaints.js";
import { getErrnoCode } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { createSignal } from "../../utils/signal.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pcv9zvvv.js:13541-13561 placement
/**
 * 已知错误码集合（遥测用）。疑似归错文件（axios 错误分类）。
 */
var KNOWN_ERROR_CODE_SET; // deferred: uses PolicyLimitsResponseSchema (./complianceTaints.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pcv9zvvv.js:13541", () => {
  KNOWN_ERROR_CODE_SET = new Set(CACHE_IO_ERRNOS);
});
//@ chunk-pcv9zvvv.js:13561-13593 placement
/**
 * 错误码属于已知集合。
 */
function isKnownErrorCode(code) {
  return KNOWN_ERROR_CODE_SET.has(code);
}
//@ chunk-pcv9zvvv.js:13593-13960 placement (2.1.88 match: SSL_ERROR_CODES, 0.739)
/**
 * TLS 证书类错误码；ci 为中止类 ECONNABORTED/ERR_CANCELED。
 */
var TLS_CERT_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ABORT_ERROR_CODES;
deferInit("chunk-pcv9zvvv.js:13593", () => {
  TLS_CERT_ERROR_CODES = new Set([
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "UNABLE_TO_GET_ISSUER_CERT",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "CERT_HAS_EXPIRED",
    "CERT_NOT_YET_VALID",
    "CERT_UNTRUSTED",
    "CERT_REJECTED",
    "CERT_SIGNATURE_FAILURE",
    "ERR_TLS_CERT_ALTNAME_INVALID",
    "HOSTNAME_MISMATCH",
  ]);
  ABORT_ERROR_CODES = new Set(["ECONNABORTED", "ERR_CANCELED"]);
});
//@ chunk-pcv9zvvv.js:13960-14082 placement
/**
 * 错误码规整：已知原样、证书类→CERT_ERROR、中止类→ABORTED。
 */
function normalizeErrorCode(code) {
  if (code === undefined) return;
  if (isKnownErrorCode(code)) return code;
  if (TLS_CERT_ERROR_CODES.has(code)) return "CERT_ERROR";
  if (ABORT_ERROR_CODES.has(code)) return "ABORTED";
  return;
}
//@ chunk-pcv9zvvv.js:14082-14197 placement
/**
 * 错误（或 cause）的规范化 errno 码，否则 OTHER。
 */
function fetchErrorCode(error) {
  let cause = error !== null && typeof error === "object" && "cause" in error ? error.cause : undefined;
  return normalizeErrorCode(getErrnoCode(error)) ?? normalizeErrorCode(getErrnoCode(cause)) ?? "OTHER";
}
//@ chunk-pcv9zvvv.js:14197-14220 placement
/**
 * 按 host 保存的预取变更信号容器。
 */
var prefetchSignalSlots; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pcv9zvvv.js:14197", () => {
  prefetchSignalSlots = new HostScoped(() => createSignal());
});
//@ chunk-pcv9zvvv.js:14220-14257 placement
/**
 * 取当前 host 的预取变更信号。
 */
function currentPrefetchSignal() {
  return prefetchSignalSlots.of(getRootSession().host);
}
//@ chunk-pcv9zvvv.js:14257-14284 placement
/**
 * 发出预取变更信号。
 */
function emitPrefetchChanged() {
  currentPrefetchSignal().emit();
}
//@ chunk-pcv9zvvv.js:14284-14324 placement
/**
 * 订阅预取变更。
 */
function onPrefetchChanged(listener) {
  return currentPrefetchSignal().subscribe(listener);
}
//@ chunk-pcv9zvvv.js:14324-14378 placement
var isManagedConfigPrefetchOn = () => env.CLAUDE_CODE_MANAGED_CONFIG_PREFETCH === true;
//@ chunk-pcv9zvvv.js:14378-14399 placement (moved: shares a binding it assigns)
function registerManagedConfigPrefetchEnabledReader(isManagedConfigPrefetchEnabled) {
  isManagedConfigPrefetchOn = isManagedConfigPrefetchEnabled;
}
export {
  emitPrefetchChanged,
  fetchErrorCode,
  isManagedConfigPrefetchOn,
  registerManagedConfigPrefetchEnabledReader,
  onPrefetchChanged,
};
