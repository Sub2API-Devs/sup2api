/**
 * memdir/memoryAge.ts
 *
 * 记忆文件年龄计算与"记忆可能过时，需核实"的提示文字。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/memoryAge.ts
 * pieces: chunk-5xgkngpb.js (3), chunk-wb51jffc.js (1)
 * attribution: file-local 1, fingerprint 2, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:119634-119705 file-local
function memoryAgeDays(mtimeMs) {
  return Math.max(0, Math.floor((Date.now() - mtimeMs) / 86400000));
}
//@ chunk-5xgkngpb.js:119705-119979 fingerprint (2.1.88 match: memoryFreshnessText, 0.667)
/**
 * 记忆超过 1 天时生成"这条记忆已 N 天，需核实"的提示文字。
 */
function memoryFreshnessText(mtimeMs) {
  let ageDays = memoryAgeDays(mtimeMs);
  if (ageDays <= 1) return "";
  return (
    `This memory is ${ageDays} days old. ` +
    "Memories are point-in-time observations, not live state \u2014 " +
    "claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact."
  );
}
//@ chunk-5xgkngpb.js:119979-120072 placement (2.1.88 match: memoryFreshnessNote, 1)
/**
 * 把 memoryFreshnessText 包进 <system-reminder>。
 */
function memoryFreshnessNote(mtimeMs) {
  let text = memoryFreshnessText(mtimeMs);
  if (!text) return "";
  return `<system-reminder>${text}</system-reminder>
`;
}
//@ chunk-wb51jffc.js:139352-139489 fingerprint (2.1.88 match: memoryAge, 0.657)
/**
 * 记忆年龄的短文本：today / yesterday / Nd ago。
 */
function memoryAge(mtimeMs) {
  let max = Math.max(0, Math.floor((Date.now() - mtimeMs) / 86400000));
  if (max === 0) return "today";
  if (max === 1) return "yesterday";
  return `${max}d ago`;
}
export { memoryFreshnessNote, memoryFreshnessText, memoryAge };
