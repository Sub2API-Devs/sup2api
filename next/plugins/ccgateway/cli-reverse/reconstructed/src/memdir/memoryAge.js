/**
 * memdir/memoryAge.ts
 *
 * 记忆文件年龄计算与"记忆可能过时，需核实"的提示文字。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/memoryAge.ts
 * pieces: chunk-e6aww6q8.js (3), chunk-vrb44rx7.js (1)
 * attribution: file-local 1, fingerprint 3
 */

//@ chunk-e6aww6q8.js:116860-116931 file-local
function memoryAgeDays(mtimeMs) {
  return Math.max(0, Math.floor((Date.now() - mtimeMs) / 86400000));
}
//@ chunk-e6aww6q8.js:116931-117205 fingerprint = memoryFreshnessText (0.667)
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
//@ chunk-e6aww6q8.js:117205-117298 fingerprint = memoryFreshnessNote (1)
/**
 * 把 memoryFreshnessText 包进 <system-reminder>。
 */
function memoryFreshnessNote(mtimeMs) {
  let text = memoryFreshnessText(mtimeMs);
  if (!text) return "";
  return `<system-reminder>${text}</system-reminder>
`;
}
//@ chunk-vrb44rx7.js:139153-139290 fingerprint = memoryAge (0.657)
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
