/**
 * commands/radio/radio.ts
 *
 * /radio：打开 Claude FM（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-03rvwpge.js (1)
 * attribution: placement 1
 */
import { openValidatedUrlSucceeded } from "../../utils/browser.js";

//@ chunk-03rvwpge.js:1039-1251 placement
/**
 * /radio：在浏览器打开 Claude FM（https://clau.de/radio）
 */
async function openClaudeRadio() {
  if (await openValidatedUrlSucceeded("https://clau.de/radio"))
    return {
      type: "text",
      value: "Opening Claude FM in your browser\u2026",
    };
  return {
    type: "text",
    value: "Couldn't open the browser. Listen at: https://clau.de/radio",
  };
}
export { openClaudeRadio };
