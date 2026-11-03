/**
 * utils/confirmPrompt.ts
 *
 * [y/N] 确认提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e8rfj3kv.js (3)
 * attribution: placement 3
 */
import { createInterface } from "readline";
import { setRawModeSafe } from "../ink/setRawModeSafe.js";
import { sleep } from "./sleep.js";

//@ chunk-e8rfj3kv.js:305-409 placement
/**
 * 确认提问要求的最小回答延迟（250 毫秒）。
 */
var CONFIRM_MAX_ATTEMPTS = 5;
var MIN_CONFIRM_ANSWER_DELAY_MS = 250;
var TOO_FAST_ANSWER_TEXT =
  "That answer arrived too quickly after the question to count. Please answer again.";
//@ chunk-e8rfj3kv.js:409-976 placement
async function confirmPrompt(
  e,
  a = process.stdin,
  { ignoreAnswersWithinMs: r = 0, reaskPreamble: c = "", signal: s } = {},
) {
  if (r > 0) {
    if (await drainEarlyInput(a, r)) return false;
  }
  if (s?.aborted === true) return false;
  let o = () => {};
  let promise = new Promise((resolve) => {
    o = resolve;
  });
  let t = createInterface({
    input: a,
    output: process.stdout,
  });
  let f = 0;
  let l = () => {
    let startTime = performance.now();
    t.question(`${e} [y/N] `, (m) => {
      if (r > 0 && performance.now() - startTime < r) {
        if (++f > CONFIRM_MAX_ATTEMPTS) {
          o(false);
          t.close();
          return;
        }
        process.stdout.write(`${c}${TOO_FAST_ANSWER_TEXT}
`);
        l();
        return;
      }
      let lower = m.trim().toLowerCase();
      o(lower === "y" || lower === "yes");
      t.close();
    });
  };
  l();
  t.once("close", () => o(false));
  s?.addEventListener("abort", () => t.close(), {
    once: true,
  });
  return promise;
}
//@ chunk-e8rfj3kv.js:976-1373 placement
/**
 * 在确认提示前短暂读取并丢弃输入（TTY 下切换原始模式），返回输入流是否已结束。
 */
async function drainEarlyInput(e, a) {
  let r = "isTTY" in e && e.isTTY === true;
  let c = "isRaw" in e && e.isRaw === true;
  let s = false;
  let o = () => {
    s = true;
  };
  let n = () => {};
  e.once("end", o);
  e.once("close", o);
  e.on("data", n);
  if (r) setRawModeSafe(e, true);
  try {
    e.resume();
    await sleep(a);
  } finally {
    e.removeListener("data", n);
    e.removeListener("end", o);
    e.removeListener("close", o);
    e.pause();
    if (r) setRawModeSafe(e, c);
  }
  return (
    s || ("readableEnded" in e && e.readableEnded === true) || ("destroyed" in e && e.destroyed === true)
  );
}
export { confirmPrompt, MIN_CONFIRM_ANSWER_DELAY_MS, TOO_FAST_ANSWER_TEXT };
