/**
 * utils/sandbox/hostValidation.ts
 *
 * 2.1.316 新增。沙箱主机校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { toApprovalLabel, hostnameLengthAllowance } from "../permissions/approvalPayloadSerialization.js";
import { isMisleadingConsentHost } from "./sandbox-adapter.js";
import { jsonStringify } from "../slowOperations.js";

//@ chunk-18hwfzwa.js:1687535-1687632 placement
/**
 * knownHostNameOrUndefined：在已知主机列表里时返回该名。
 */
function knownHostNameOrUndefined(host, from, knownHosts) {
  if (typeof host !== "string" || host !== from) return;
  return knownHosts.some((knownHost) => knownHost.name === host) ? host : undefined;
}
//@ chunk-18hwfzwa.js:1687632-1687715 placement
/**
 * describeApprovalSubject：沙箱主机名的审批显示文本。
 */
function describeApprovalSubject(subagent) {
  let label = subagent === undefined ? null : toApprovalLabel(subagent);
  return label === null ? "A subagent" : String(label);
}
//@ chunk-18hwfzwa.js:1687715-1688032 placement
/**
 * 说明一个沙箱主机名为何无效：误导性主机（通配符或会被 srt 改写）、含空白或控制字符、超出主机名长度；有效时返回 null。
 */
function describeInvalidHost(hostname) {
  if (isMisleadingConsentHost(hostname))
    return hostname.includes("*")
      ? "a wildcard, which srt matches against every host"
      : "a host srt would re-spell";
  if (/[\s\p{C}]/u.test(hostname)) return "whitespace or control characters, which no runtime observes";
  let maxLength = hostnameLengthAllowance(hostname);
  if (hostname.length > maxLength) return `longer than a hostname can be (${hostname.length} > ${maxLength})`;
  return null;
}
//@ chunk-18hwfzwa.js:1688032-1688080 placement
/**
 * hostValidationCacheKey：沙箱主机校验缓存键。
 */
function hostValidationCacheKey(host, from, requestId, extraKeyPart) {
  return jsonStringify([host, from, requestId, extraKeyPart ?? null]);
}
export { hostValidationCacheKey, knownHostNameOrUndefined, describeApprovalSubject, describeInvalidHost };
