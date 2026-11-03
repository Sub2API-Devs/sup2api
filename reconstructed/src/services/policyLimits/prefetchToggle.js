/**
 * services/policyLimits/prefetchToggle.ts
 *
 * 2.1.316 新增。策略预取开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7t4fmt2f.js (10)
 * attribution: placement 10
 */
import { ebi } from "./complianceTaints.js";
import { getErrnoCode } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { createSignal } from "../../utils/signal.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";

/**
 * 已知错误码集合（遥测用）。疑似归错文件（axios 错误分类）。
 */
//@ chunk-7t4fmt2f.js:13539-13559 placement
var KNOWN_ERROR_CODE_SET = new Set(ebi);
/**
 * 错误码属于已知集合。
 */
//@ chunk-7t4fmt2f.js:13559-13591 placement
function isKnownErrorCode(e) {
  return KNOWN_ERROR_CODE_SET.has(e);
}
/**
 * TLS 证书类错误码；ci 为中止类 ECONNABORTED/ERR_CANCELED。
 */
//@ chunk-7t4fmt2f.js:13591-13958 placement = SSL_ERROR_CODES (0.74)
var TLS_CERT_ERROR_CODES = new Set([
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
  ]),
  ABORT_ERROR_CODES = new Set(["ECONNABORTED", "ERR_CANCELED"]);
/**
 * 错误码规整：已知原样、证书类→CERT_ERROR、中止类→ABORTED。
 */
//@ chunk-7t4fmt2f.js:13958-14080 placement
function normalizeErrorCode(e) {
  if (e === void 0) return;
  if (isKnownErrorCode(e)) return e;
  if (TLS_CERT_ERROR_CODES.has(e)) return "CERT_ERROR";
  if (ABORT_ERROR_CODES.has(e)) return "ABORTED";
  return;
}
/**
 * 错误（或 cause）的规范化 errno 码，否则 OTHER。
 */
//@ chunk-7t4fmt2f.js:14080-14195 placement
function fetchErrorCode(e) {
  let r = e !== null && typeof e === "object" && "cause" in e ? e.cause : void 0;
  return normalizeErrorCode(getErrnoCode(e)) ?? normalizeErrorCode(getErrnoCode(r)) ?? "OTHER";
}
//@ chunk-7t4fmt2f.js:14195-14218 placement
var ui = new HostScoped(() => createSignal());
//@ chunk-7t4fmt2f.js:14218-14255 placement
function Tt() {
  return ui.of(getRootSession().host);
}
//@ chunk-7t4fmt2f.js:14255-14282 placement
function H7r() {
  Tt().emit();
}
//@ chunk-7t4fmt2f.js:14282-14322 placement
function Ot(e) {
  return Tt().subscribe(e);
}
//@ chunk-7t4fmt2f.js:14322-14376 placement
var et = () => env.CLAUDE_CODE_MANAGED_CONFIG_PREFETCH === !0;

export { et, fetchErrorCode, Ot, H7r };
