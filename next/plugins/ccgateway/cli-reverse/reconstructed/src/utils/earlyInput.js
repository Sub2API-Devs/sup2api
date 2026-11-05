/**
 * utils/earlyInput.ts
 *
 * 启动早期捕获 stdin 输入（REPL 就绪前的按键），就绪后交给输入框
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/earlyInput.ts
 * pieces: chunk-c391cw88.js (30)
 * attribution: placement 20, fingerprint 1, facade-majority 9
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession, flushInteractionTime, getLastInteractionTime } from "../bootstrap/state.js";
import { eagerHasCliFlag } from "./cliArgs.js";
import { lastGrapheme } from "./intl.js";
import { sleep } from "./sleep.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-c391cw88.js:376-387 placement
var EARLY_INPUT_REST_MS = 1500;
//@ chunk-c391cw88.js:387-569 placement
class EarlyInputState {
  buffer = "";
  seeded = "";
  capturing = false;
  readableHandler = null;
  hasField = false;
  fieldKeyAt = 0;
  fieldClosedAt = null;
  isFieldQueued = false;
  queuedPrompt = null;
  isPromptFromField = false;
  hasLaunchWarning = false;
}
//@ chunk-c391cw88.js:569-592 placement
var earlyInputSlot; // deferred: uses EarlyInputState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c391cw88.js:569", () => {
  earlyInputSlot = new HostScoped(() => new EarlyInputState());
});
//@ chunk-c391cw88.js:592-627 placement
function getEarlyInputState() {
  return earlyInputSlot.of(getRootSession().host);
}
//@ chunk-c391cw88.js:627-1125 placement (2.1.88 match: startCapturingEarlyInput, 0.621)
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
  earlyInputState.isFieldQueued = false;
  earlyInputState.queuedPrompt = null;
  earlyInputState.hasLaunchWarning = false;
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
//@ chunk-c391cw88.js:1125-1836 fingerprint (2.1.88 match: processChunk, 0.796)
/**
 * 处理早期输入字节：Ctrl+C 退出 130、Ctrl+D 停止、退格、回车与普通字符。
 */
function processChunk(str) {
  let earlyInputState = getEarlyInputState();
  let offset = 0;
  while (offset < str.length) {
    let char = str[offset];
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
      offset++;
      continue;
    }
    if (code === 27) {
      offset++;
      let nextCode = offset < str.length ? str.charCodeAt(offset) : -1;
      if (nextCode === 91) {
        offset++;
        while (offset < str.length && str.charCodeAt(offset) < 64) offset++;
        if (offset < str.length) offset++;
      } else if (
        nextCode === 93 ||
        nextCode === 80 ||
        nextCode === 88 ||
        nextCode === 94 ||
        nextCode === 95
      ) {
        offset++;
        while (offset < str.length) {
          let code = str.charCodeAt(offset);
          if (code === 7) {
            offset++;
            break;
          }
          if (code === 27 && offset + 1 < str.length && str.charCodeAt(offset + 1) === 92) {
            offset += 2;
            break;
          }
          offset++;
        }
      } else if (nextCode === 79) offset += 2;
      else if (nextCode !== -1 && nextCode !== 27) offset++;
      continue;
    }
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      offset++;
      continue;
    }
    if (code === 13) {
      earlyInputState.buffer += `
`;
      offset++;
      continue;
    }
    earlyInputState.buffer += char;
    offset++;
  }
}
//@ chunk-c391cw88.js:1836-2001 placement (2.1.88 match: stopCapturingEarlyInput, 0.741)
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
//@ chunk-c391cw88.js:2001-2238 placement
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
  if (earlyInputState.isFieldQueued) earlyInputState.queuedPrompt = trimmed;
  earlyInputState.isPromptFromField = earlyInputState.hasField;
  earlyInputState.hasField = false;
  earlyInputState.fieldKeyAt = 0;
  earlyInputState.isFieldQueued = false;
  return trimmed;
}
//@ chunk-c391cw88.js:2238-2287 placement
/**
 * 早期输入缓冲是否非空。
 */
function hasEarlyInput() {
  return getEarlyInputState().buffer.trim().length > 0;
}
//@ chunk-c391cw88.js:2287-2335 placement
/**
 * 预置早期输入（例如 --prefill）。
 */
function seedEarlyInput(buffer) {
  let earlyInputState = getEarlyInputState();
  earlyInputState.buffer = buffer;
  earlyInputState.seeded = buffer;
}
//@ chunk-c391cw88.js:2335-2373 facade-majority
function isEarlyInputSeeded() {
  return getEarlyInputState().seeded !== "";
}
//@ chunk-c391cw88.js:2373-2428 placement
function hasTypedEarlyInput() {
  let { buffer, seeded } = getEarlyInputState();
  return buffer !== seeded;
}
//@ chunk-c391cw88.js:2428-2516 placement
function openEarlyInputField() {
  stopCapturingEarlyInput();
  let earlyInputState = getEarlyInputState();
  if (!earlyInputState.hasField && hasTypedEarlyInput()) noteEarlyInputFieldKey();
  earlyInputState.hasField = true;
  return earlyInputState.buffer;
}
//@ chunk-c391cw88.js:2516-2578 placement
function editEarlyInputField(buffer) {
  let earlyInputState = getEarlyInputState();
  earlyInputState.buffer = buffer;
  earlyInputState.isFieldQueued = false;
  noteEarlyInputFieldKey();
}
//@ chunk-c391cw88.js:2578-2611 facade-majority
function earlyInputFieldText() {
  return getEarlyInputState().buffer;
}
//@ chunk-c391cw88.js:2611-2647 facade-majority
function markEarlyInputFieldQueued() {
  getEarlyInputState().isFieldQueued = true;
}
//@ chunk-c391cw88.js:2647-2686 facade-majority
function markEarlyInputLaunchWarning() {
  getEarlyInputState().hasLaunchWarning = true;
}
//@ chunk-c391cw88.js:2686-2763 facade-majority
function takeEarlyInputLaunchWarning() {
  let earlyInputState = getEarlyInputState();
  let hasLaunchWarning = earlyInputState.hasLaunchWarning;
  earlyInputState.hasLaunchWarning = false;
  return hasLaunchWarning;
}
//@ chunk-c391cw88.js:2763-2803 facade-majority
function isEarlyInputFieldQueued() {
  return getEarlyInputState().isFieldQueued;
}
//@ chunk-c391cw88.js:2803-2847 facade-majority
function isPromptFromEarlyInputField() {
  return getEarlyInputState().isPromptFromField;
}
//@ chunk-c391cw88.js:2847-2893 facade-majority
function hasQueuedEarlyInput() {
  return getEarlyInputState().queuedPrompt !== null;
}
//@ chunk-c391cw88.js:2893-2964 facade-majority
function takeQueuedEarlyInput() {
  let earlyInputState = getEarlyInputState();
  let queuedPrompt = earlyInputState.queuedPrompt;
  earlyInputState.queuedPrompt = null;
  return queuedPrompt;
}
//@ chunk-c391cw88.js:2964-3005 placement
function noteEarlyInputFieldKey() {
  getEarlyInputState().fieldKeyAt = Date.now();
}
//@ chunk-c391cw88.js:3005-3136 placement
function takeEarlyInputFieldText() {
  let earlyInputState = getEarlyInputState();
  if (!earlyInputState.hasField || !hasTypedEarlyInput()) return "";
  let trimmed = earlyInputState.buffer.trim();
  earlyInputState.buffer = "";
  earlyInputState.seeded = "";
  earlyInputState.isFieldQueued = false;
  return trimmed;
}
//@ chunk-c391cw88.js:3136-3171 placement
function hasEarlyInputField() {
  return getEarlyInputState().hasField;
}
//@ chunk-c391cw88.js:3171-3241 placement
function wasEarlyInputFieldOpened() {
  let { hasField, fieldClosedAt } = getEarlyInputState();
  return hasField || fieldClosedAt !== null;
}
//@ chunk-c391cw88.js:3241-3314 placement
function msSinceEarlyInputFieldClosed() {
  let { fieldClosedAt } = getEarlyInputState();
  return fieldClosedAt === null ? 1 / 0 : Date.now() - fieldClosedAt;
}
//@ chunk-c391cw88.js:3314-3390 placement
function msUntilEarlyInputFieldRests() {
  let idleMs = Date.now() - getEarlyInputState().fieldKeyAt;
  return idleMs < 0 ? 0 : Math.max(0, EARLY_INPUT_REST_MS - idleMs);
}
//@ chunk-c391cw88.js:3390-3473 placement
async function untilEarlyInputFieldRests(signal) {
  for (;;) {
    let waitMs = msUntilEarlyInputFieldRests();
    if (waitMs === 0 || signal.aborted) return;
    await sleep(waitMs, signal);
  }
}
//@ chunk-c391cw88.js:3473-3585 placement
async function untilKeyboardRests() {
  for (;;) {
    flushInteractionTime();
    let idleMs = Date.now() - getLastInteractionTime();
    if (idleMs >= EARLY_INPUT_REST_MS) return;
    if (idleMs < 0) {
      await sleep(EARLY_INPUT_REST_MS);
      return;
    }
    await sleep(EARLY_INPUT_REST_MS - idleMs);
  }
}
export {
  stopCapturingEarlyInput,
  takeEarlyInputFieldText,
  markEarlyInputLaunchWarning,
  hasEarlyInput,
  consumeEarlyInput,
  hasEarlyInputField,
  hasTypedEarlyInput,
  msUntilEarlyInputFieldRests,
  untilEarlyInputFieldRests,
  seedEarlyInput,
  takeQueuedEarlyInput,
  takeEarlyInputLaunchWarning,
  wasEarlyInputFieldOpened,
  hasQueuedEarlyInput,
  isPromptFromEarlyInputField,
  untilKeyboardRests,
  msSinceEarlyInputFieldClosed,
  earlyInputFieldText,
  isEarlyInputSeeded,
  markEarlyInputFieldQueued,
  openEarlyInputField,
  isEarlyInputFieldQueued,
  editEarlyInputField,
  noteEarlyInputFieldKey,
  startCapturingEarlyInput,
};
