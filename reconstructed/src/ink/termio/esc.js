/**
 * ink/termio/esc.ts
 *
 * ESC 序列解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/esc.ts
 * pieces: chunk-x6v6jz2y.js (1)
 * attribution: fingerprint 1
 */

/**
 * 解析 ESC 单字符序列（RIS、DECSC/DECRC、IND、RI、NEL）为语义动作；其余返回 unknown。
 */
//@ chunk-x6v6jz2y.js:7918-8409 fingerprint = parseEsc (0.683)
function parseEsc(chars) {
  if (chars.length === 0) return null;
  let first = chars[0];
  if (first === "c") return { type: "reset" };
  if (first === "7") return { type: "cursor", action: { type: "save" } };
  if (first === "8") return { type: "cursor", action: { type: "restore" } };
  if (first === "D") return { type: "scroll", action: { type: "index" } };
  if (first === "M") return { type: "scroll", action: { type: "reverseIndex" } };
  if (first === "E") return { type: "cursor", action: { type: "nextLine", count: 1 } };
  if (first === "H") return null;
  if ("()".includes(first) && chars.length >= 2) return null;
  return { type: "unknown", sequence: `\x1B${chars}` };
}

export { parseEsc };
