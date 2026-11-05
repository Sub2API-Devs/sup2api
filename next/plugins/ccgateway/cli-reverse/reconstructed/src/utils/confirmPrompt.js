/**
 * utils/confirmPrompt.ts
 *
 * [y/N] 确认提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zjx7fj60.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createInterface } from "readline";
import { setRawModeSafe } from "../ink/setRawModeSafe.js";
import { sleep } from "./sleep.js";

//@ chunk-zjx7fj60.js:305-409 placement
/**
 * 确认提问要求的最小回答延迟（250 毫秒）。
 */
var CONFIRM_MAX_ATTEMPTS = 5;
var MIN_CONFIRM_ANSWER_DELAY_MS = 250;
var TOO_FAST_ANSWER_TEXT =
  "That answer arrived too quickly after the question to count. Please answer again.";
//@ chunk-zjx7fj60.js:409-976 placement
async function confirmPrompt(
  question,
  input = process.stdin,
  { ignoreAnswersWithinMs = 0, reaskPreamble = "", signal } = {},
) {
  if (ignoreAnswersWithinMs > 0) {
    if (await drainEarlyInput(input, ignoreAnswersWithinMs)) return false;
  }
  if (signal?.aborted === true) return false;
  let cleanup = () => {};
  let promise = new Promise((resolve) => {
    cleanup = resolve;
  });
  let readline = createInterface({
    input,
    output: process.stdout,
  });
  let askedAt = 0;
  let cleanupOnce = () => {
    let startTime = performance.now();
    readline.question(`${question} [y/N] `, (answer) => {
      if (ignoreAnswersWithinMs > 0 && performance.now() - startTime < ignoreAnswersWithinMs) {
        if (++askedAt > CONFIRM_MAX_ATTEMPTS) {
          cleanup(false);
          readline.close();
          return;
        }
        process.stdout.write(`${reaskPreamble}${TOO_FAST_ANSWER_TEXT}
`);
        cleanupOnce();
        return;
      }
      let lower = answer.trim().toLowerCase();
      cleanup(lower === "y" || lower === "yes");
      readline.close();
    });
  };
  cleanupOnce();
  readline.once("close", () => cleanup(false));
  signal?.addEventListener("abort", () => readline.close(), {
    once: true,
  });
  return promise;
}
//@ chunk-zjx7fj60.js:976-1373 placement
/**
 * 在确认提示前短暂读取并丢弃输入（TTY 下切换原始模式），返回输入流是否已结束。
 */
async function drainEarlyInput(stream, readline) {
  let isTTY = "isTTY" in stream && stream.isTTY === true;
  let wasRaw = "isRaw" in stream && stream.isRaw === true;
  let paused = false;
  let onData = () => {
    paused = true;
  };
  let noop = () => {};
  stream.once("end", onData);
  stream.once("close", onData);
  stream.on("data", noop);
  if (isTTY) setRawModeSafe(stream, true);
  try {
    stream.resume();
    await sleep(readline);
  } finally {
    stream.removeListener("data", noop);
    stream.removeListener("end", onData);
    stream.removeListener("close", onData);
    stream.pause();
    if (isTTY) setRawModeSafe(stream, wasRaw);
  }
  return (
    paused ||
    ("readableEnded" in stream && stream.readableEnded === true) ||
    ("destroyed" in stream && stream.destroyed === true)
  );
}
export { MIN_CONFIRM_ANSWER_DELAY_MS, confirmPrompt, TOO_FAST_ANSWER_TEXT };
