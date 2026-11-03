/**
 * utils/earlyInput.ts
 *
 * 启动早期捕获 stdin 输入（REPL 就绪前的按键），就绪后交给输入框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/earlyInput.ts
 * pieces: chunk-wphjdnre.js (21)
 * attribution: placement 20, fingerprint 1
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession, flushInteractionTime, getLastInteractionTime } from "../bootstrap/state.js";
import { eagerHasCliFlag } from "./cliArgs.js";
import { lastGrapheme } from "./intl.js";
import { sleep } from "./sleep.js";

//@ chunk-wphjdnre.js:375-386 placement
var EARLY_INPUT_REST_MS = 1500;
//@ chunk-wphjdnre.js:386-492 placement
class EarlyInputState {
  buffer = "";
  seeded = "";
  capturing = false;
  readableHandler = null;
  hasField = false;
  fieldKeyAt = 0;
  fieldClosedAt = null;
}
//@ chunk-wphjdnre.js:492-515 placement
var earlyInputSlot = new HostScoped(() => new EarlyInputState());
//@ chunk-wphjdnre.js:515-550 placement
function getEarlyInputState() {
  return earlyInputSlot.of(getRootSession().host);
}
//@ chunk-wphjdnre.js:550-987 placement = startCapturingEarlyInput (0.706)
/**
 * 在 REPL 就绪前捕获早期键盘输入。
 */
function startCapturingEarlyInput() {
  let earlyInputState = getEarlyInputState();
  if (
    !process.stdin.isTTY ||
    earlyInputState.capturing ||
    eagerHasCliFlag("-p") ||
    eagerHasCliFlag("--print")
  )
    return;
  earlyInputState.capturing = true;
  earlyInputState.buffer = "";
  earlyInputState.seeded = "";
  earlyInputState.hasField = false;
  earlyInputState.fieldKeyAt = 0;
  try {
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.ref();
    earlyInputState.readableHandler = () => {
      let chunk = process.stdin.read();
      while (chunk !== null) {
        if (typeof chunk === "string") processChunk(chunk);
        chunk = process.stdin.read();
      }
    };
    process.stdin.on("readable", earlyInputState.readableHandler);
  } catch {
    earlyInputState.capturing = false;
  }
}
//@ chunk-wphjdnre.js:987-1697 fingerprint = processChunk (0.797)
/**
 * 处理早期输入字节：Ctrl+C 退出 130、Ctrl+D 停止、退格、回车与普通字符。
 */
function processChunk(str) {
  let earlyInputState = getEarlyInputState();
  let n = 0;
  while (n < str.length) {
    let char = str[n];
    let code = char.charCodeAt(0);
    if (code === 3) {
      stopCapturingEarlyInput();
      process.exit(130);
      return;
    }
    if (code === 4) {
      stopCapturingEarlyInput();
      return;
    }
    if (code === 127 || code === 8) {
      if (earlyInputState.buffer.length > 0) {
        let last = lastGrapheme(earlyInputState.buffer);
        earlyInputState.buffer = earlyInputState.buffer.slice(0, -(last.length || 1));
      }
      n++;
      continue;
    }
    if (code === 27) {
      n++;
      let i = n < str.length ? str.charCodeAt(n) : -1;
      if (i === 91) {
        n++;
        while (n < str.length && str.charCodeAt(n) < 64) n++;
        if (n < str.length) n++;
      } else if (i === 93 || i === 80 || i === 88 || i === 94 || i === 95) {
        n++;
        while (n < str.length) {
          let code = str.charCodeAt(n);
          if (code === 7) {
            n++;
            break;
          }
          if (code === 27 && n + 1 < str.length && str.charCodeAt(n + 1) === 92) {
            n += 2;
            break;
          }
          n++;
        }
      } else if (i === 79) n += 2;
      else if (i !== -1 && i !== 27) n++;
      continue;
    }
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      n++;
      continue;
    }
    if (code === 13) {
      earlyInputState.buffer += `
`;
      n++;
      continue;
    }
    earlyInputState.buffer += char;
    n++;
  }
}
//@ chunk-wphjdnre.js:1697-1862 placement = stopCapturingEarlyInput (0.741)
/**
 * stopCapturingEarlyInput：移除 readable 监听。
 */
function stopCapturingEarlyInput() {
  let earlyInputState = getEarlyInputState();
  if (!earlyInputState.capturing) return;
  earlyInputState.capturing = false;
  if (earlyInputState.readableHandler) {
    process.stdin.removeListener("readable", earlyInputState.readableHandler);
    earlyInputState.readableHandler = null;
  }
}
//@ chunk-wphjdnre.js:1862-2013 placement
/**
 * consumeEarlyInput：取出并清空早期输入缓冲（REPL 作为初始输入）。
 */
function consumeEarlyInput() {
  stopCapturingEarlyInput();
  let earlyInputState = getEarlyInputState();
  let trimmed = earlyInputState.buffer.trim();
  earlyInputState.buffer = "";
  earlyInputState.seeded = "";
  if (earlyInputState.hasField) earlyInputState.fieldClosedAt = Date.now();
  earlyInputState.hasField = false;
  earlyInputState.fieldKeyAt = 0;
  return trimmed;
}
//@ chunk-wphjdnre.js:2013-2062 placement
/**
 * 早期输入缓冲是否非空。
 */
function hasEarlyInput() {
  return getEarlyInputState().buffer.trim().length > 0;
}
//@ chunk-wphjdnre.js:2062-2110 placement
/**
 * 预置早期输入（例如 --prefill）。
 */
function seedEarlyInput(e) {
  let earlyInputState = getEarlyInputState();
  earlyInputState.buffer = e;
  earlyInputState.seeded = e;
}
//@ chunk-wphjdnre.js:2110-2165 placement
function hasTypedEarlyInput() {
  let { buffer, seeded } = getEarlyInputState();
  return buffer !== seeded;
}
//@ chunk-wphjdnre.js:2165-2253 placement
function openEarlyInputField() {
  stopCapturingEarlyInput();
  let earlyInputState = getEarlyInputState();
  if (!earlyInputState.hasField && hasTypedEarlyInput()) noteEarlyInputFieldKey();
  earlyInputState.hasField = true;
  return earlyInputState.buffer;
}
//@ chunk-wphjdnre.js:2253-2288 placement
function editEarlyInputField(buffer) {
  getEarlyInputState().buffer = buffer;
  noteEarlyInputFieldKey();
}
//@ chunk-wphjdnre.js:2288-2329 placement
function noteEarlyInputFieldKey() {
  getEarlyInputState().fieldKeyAt = Date.now();
}
//@ chunk-wphjdnre.js:2329-2441 placement
function takeEarlyInputFieldText() {
  let earlyInputState = getEarlyInputState();
  if (!earlyInputState.hasField || !hasTypedEarlyInput()) return "";
  let trimmed = earlyInputState.buffer.trim();
  earlyInputState.buffer = "";
  earlyInputState.seeded = "";
  return trimmed;
}
//@ chunk-wphjdnre.js:2441-2476 placement
function hasEarlyInputField() {
  return getEarlyInputState().hasField;
}
//@ chunk-wphjdnre.js:2476-2546 placement
function wasEarlyInputFieldOpened() {
  let { hasField, fieldClosedAt } = getEarlyInputState();
  return hasField || fieldClosedAt !== null;
}
//@ chunk-wphjdnre.js:2546-2619 placement
function msSinceEarlyInputFieldClosed() {
  let { fieldClosedAt } = getEarlyInputState();
  return fieldClosedAt === null ? 1 / 0 : Date.now() - fieldClosedAt;
}
//@ chunk-wphjdnre.js:2619-2695 placement
function msUntilEarlyInputFieldRests() {
  let e = Date.now() - getEarlyInputState().fieldKeyAt;
  return e < 0 ? 0 : Math.max(0, EARLY_INPUT_REST_MS - e);
}
//@ chunk-wphjdnre.js:2695-2778 placement
async function untilEarlyInputFieldRests(e) {
  for (;;) {
    let t = msUntilEarlyInputFieldRests();
    if (t === 0 || e.aborted) return;
    await sleep(t, e);
  }
}
//@ chunk-wphjdnre.js:2778-2890 placement
async function untilKeyboardRests() {
  for (;;) {
    flushInteractionTime();
    let e = Date.now() - getLastInteractionTime();
    if (e >= EARLY_INPUT_REST_MS) return;
    if (e < 0) {
      await sleep(EARLY_INPUT_REST_MS);
      return;
    }
    await sleep(EARLY_INPUT_REST_MS - e);
  }
}
export {
  stopCapturingEarlyInput,
  takeEarlyInputFieldText,
  hasEarlyInput,
  consumeEarlyInput,
  hasEarlyInputField,
  hasTypedEarlyInput,
  wasEarlyInputFieldOpened,
  seedEarlyInput,
  msUntilEarlyInputFieldRests,
  untilEarlyInputFieldRests,
  untilKeyboardRests,
  msSinceEarlyInputFieldClosed,
  openEarlyInputField,
  editEarlyInputField,
  noteEarlyInputFieldKey,
};
