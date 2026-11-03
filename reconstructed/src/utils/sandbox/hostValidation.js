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
import { toApprovalLabel, Nur } from "../permissions/approvalPayloadSerialization.js";
import { isMisleadingConsentHost } from "./sandbox-adapter.js";
import { jsonStringify } from "../slowOperations.js";

//@ chunk-18hwfzwa.js:1687535-1687632 placement
function pCt(h, x, D) {
  if (typeof h !== "string" || h !== x) return;
  return D.some((L) => L.name === h) ? h : void 0;
}
//@ chunk-18hwfzwa.js:1687632-1687715 placement
function fCt(h) {
  let x = h === void 0 ? null : toApprovalLabel(h);
  return x === null ? "A subagent" : String(x);
}
/**
 * 说明一个沙箱主机名为何无效：误导性主机（通配符或会被 srt 改写）、含空白或控制字符、超出主机名长度；有效时返回 null。
 */
//@ chunk-18hwfzwa.js:1687715-1688032 placement
function describeInvalidHost(h) {
  if (isMisleadingConsentHost(h))
    return h.includes("*") ? "a wildcard, which srt matches against every host" : "a host srt would re-spell";
  if (/[\s\p{C}]/u.test(h)) return "whitespace or control characters, which no runtime observes";
  let x = Nur(h);
  if (h.length > x) return `longer than a hostname can be (${h.length} > ${x})`;
  return null;
}
//@ chunk-18hwfzwa.js:1688032-1688080 placement
function gCt(h, x, D, L) {
  return jsonStringify([h, x, D, L ?? null]);
}

export { gCt, pCt, fCt, describeInvalidHost };
