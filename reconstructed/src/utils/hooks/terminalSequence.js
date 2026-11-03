/**
 * utils/hooks/terminalSequence.ts
 *
 * 2.1.316 新增：钩子输出中的终端序列处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { BEL, ESC } from "../../ink/termio/ansi.js";
import { wrapForMultiplexer, osc } from "../../ink/termio/osc.js";

//@ chunk-e6aww6q8.js:931772-931815 placement
var DANGEROUS_OSC_CODES = new Set([0, 1, 2, 9, 99, 777]);
var MAX_TERMINAL_SEQUENCE_CHARS = 4096;
//@ chunk-e6aww6q8.js:931815-931944 placement
function stripControlChars_2(e) {
  let n = "";
  for (let idx = 0; idx < e.length; idx++) {
    let code = e.charCodeAt(idx);
    if (code >= 32 && code !== 127 && !(code >= 128 && code <= 159)) n += e[idx];
  }
  return n;
}
//@ chunk-e6aww6q8.js:931944-932058 placement
function isAllowedOsc9Payload(e) {
  if (/^4;[0-4](;(100|\d{1,2})?)?$/.test(e)) return true;
  return !/^[\s\u180e\u200b]*[+-]?\p{Nd}/u.test(e);
}
//@ chunk-e6aww6q8.js:932058-932690 placement
function parseTerminalSequences(e) {
  if (e.length === 0) return null;
  if (Buffer.byteLength(e, "utf8") > MAX_TERMINAL_SEQUENCE_CHARS) return null;
  let n = [];
  let r = 0;
  while (r < e.length) {
    let s = e[r];
    if (s === BEL) {
      n.push({
        kind: "bel",
      });
      r++;
      continue;
    }
    if (s !== ESC || e[r + 1] !== "]") return null;
    let h = r + 2;
    let y = -1;
    let S = 0;
    while (h < e.length) {
      if (e[h] === BEL) {
        y = h;
        S = 1;
        break;
      }
      if (e[h] === ESC && e[h + 1] === "\\") {
        y = h;
        S = 2;
        break;
      }
      if (e[h] === ESC) return null;
      h++;
    }
    if (y === -1) return null;
    let sliced = e.slice(r + 2, y);
    let index = sliced.indexOf(";");
    let G = index === -1 ? sliced : sliced.slice(0, index);
    let q = index === -1 ? "" : sliced.slice(index + 1);
    if (!/^\d+$/.test(G)) return null;
    let Z = Number(G);
    if (!DANGEROUS_OSC_CODES.has(Z)) return null;
    let Se = stripControlChars_2(q);
    if (Z === 9 && !isAllowedOsc9Payload(Se)) return null;
    n.push({
      kind: "osc",
      ps: Z,
      payload: Se,
    });
    r = y + S;
  }
  return n;
}
//@ chunk-e6aww6q8.js:932690-932812 placement
function renderTerminalSequences(terminalSequence) {
  let terminalSequences = parseTerminalSequences(terminalSequence);
  if (terminalSequences === null) return null;
  return terminalSequences
    .map((terminalSequence) =>
      terminalSequence.kind === "bel"
        ? BEL
        : wrapForMultiplexer(osc(terminalSequence.ps, terminalSequence.payload)),
    )
    .join("");
}
export { renderTerminalSequences };
