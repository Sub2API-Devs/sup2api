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
var CONFIRM_MAX_ATTEMPTS = 5,
  Agt = 250,
  vSo = "That answer arrived too quickly after the question to count. Please answer again.";
//@ chunk-e8rfj3kv.js:409-976 placement
async function confirmPrompt(
  e,
  a = process.stdin,
  { ignoreAnswersWithinMs: r = 0, reaskPreamble: c = "", signal: s } = {},
) {
  if (r > 0) {
    if (await drainEarlyInput(a, r)) return !1;
  }
  if (s?.aborted === !0) return !1;
  let o = () => {},
    promise = new Promise((d) => {
      o = d;
    }),
    t = createInterface({ input: a, output: process.stdout }),
    f = 0,
    l = () => {
      let startTime = performance.now();
      t.question(`${e} [y/N] `, (m) => {
        if (r > 0 && performance.now() - startTime < r) {
          if (++f > CONFIRM_MAX_ATTEMPTS) {
            (o(!1), t.close());
            return;
          }
          (process.stdout.write(`${c}${vSo}
`),
            l());
          return;
        }
        let lower = m.trim().toLowerCase();
        (o(lower === "y" || lower === "yes"), t.close());
      });
    };
  return (
    l(),
    t.once("close", () => o(!1)),
    s?.addEventListener("abort", () => t.close(), { once: !0 }),
    promise
  );
}
/**
 * 在确认提示前短暂读取并丢弃输入（TTY 下切换原始模式），返回输入流是否已结束。
 */
//@ chunk-e8rfj3kv.js:976-1373 placement
async function drainEarlyInput(e, a) {
  let r = "isTTY" in e && e.isTTY === !0,
    c = "isRaw" in e && e.isRaw === !0,
    s = !1,
    o = () => {
      s = !0;
    },
    n = () => {};
  if ((e.once("end", o), e.once("close", o), e.on("data", n), r)) setRawModeSafe(e, !0);
  try {
    (e.resume(), await sleep(a));
  } finally {
    if ((e.removeListener("data", n), e.removeListener("end", o), e.removeListener("close", o), e.pause(), r))
      setRawModeSafe(e, c);
  }
  return s || ("readableEnded" in e && e.readableEnded === !0) || ("destroyed" in e && e.destroyed === !0);
}

export { confirmPrompt, Agt, vSo };
