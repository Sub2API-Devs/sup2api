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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:931772-931815 placement
var DANGEROUS_OSC_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_TERMINAL_SEQUENCE_CHARS;
deferInit("chunk-e6aww6q8.js:931772", () => {
  DANGEROUS_OSC_CODES = new Set([0, 1, 2, 9, 99, 777]);
  MAX_TERMINAL_SEQUENCE_CHARS = 4096;
});
//@ chunk-e6aww6q8.js:931815-931944 placement
function stripControlChars_2(text) {
  let result = "";
  for (let idx = 0; idx < text.length; idx++) {
    let code = text.charCodeAt(idx);
    if (code >= 32 && code !== 127 && !(code >= 128 && code <= 159)) result += text[idx];
  }
  return result;
}
//@ chunk-e6aww6q8.js:931944-932058 placement
function isAllowedOsc9Payload(payload) {
  if (/^4;[0-4](;(100|\d{1,2})?)?$/.test(payload)) return true;
  return !/^[\s\u180e\u200b]*[+-]?\p{Nd}/u.test(payload);
}
//@ chunk-e6aww6q8.js:932058-932690 placement
function parseTerminalSequences(text) {
  if (text.length === 0) return null;
  if (Buffer.byteLength(text, "utf8") > MAX_TERMINAL_SEQUENCE_CHARS) return null;
  let sequences = [];
  let index = 0;
  while (index < text.length) {
    let char = text[index];
    if (char === BEL) {
      sequences.push({
        kind: "bel",
      });
      index++;
      continue;
    }
    if (char !== ESC || text[index + 1] !== "]") return null;
    let scanIndex = index + 2;
    let terminatorIndex = -1;
    let terminatorLength = 0;
    while (scanIndex < text.length) {
      if (text[scanIndex] === BEL) {
        terminatorIndex = scanIndex;
        terminatorLength = 1;
        break;
      }
      if (text[scanIndex] === ESC && text[scanIndex + 1] === "\\") {
        terminatorIndex = scanIndex;
        terminatorLength = 2;
        break;
      }
      if (text[scanIndex] === ESC) return null;
      scanIndex++;
    }
    if (terminatorIndex === -1) return null;
    let sliced = text.slice(index + 2, terminatorIndex);
    let index_2 = sliced.indexOf(";");
    let codeText = index_2 === -1 ? sliced : sliced.slice(0, index_2);
    let payloadText = index_2 === -1 ? "" : sliced.slice(index_2 + 1);
    if (!/^\d+$/.test(codeText)) return null;
    let code = Number(codeText);
    if (!DANGEROUS_OSC_CODES.has(code)) return null;
    let payload = stripControlChars_2(payloadText);
    if (code === 9 && !isAllowedOsc9Payload(payload)) return null;
    sequences.push({
      kind: "osc",
      ps: code,
      payload,
    });
    index = terminatorIndex + terminatorLength;
  }
  return sequences;
}
//@ chunk-e6aww6q8.js:932690-932812 placement
function renderTerminalSequences(text) {
  let terminalSequences = parseTerminalSequences(text);
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
