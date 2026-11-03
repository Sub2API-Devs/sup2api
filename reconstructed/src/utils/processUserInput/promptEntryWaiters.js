/**
 * utils/processUserInput/promptEntryWaiters.ts
 *
 * 2.1.316 新增：提示词提交钩子与条目等待。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xx1vmpsq.js (8)
 * attribution: placement 8
 */
import { ge } from "../identity.js";
import { HooksError } from "../../plugins/functionHooks/hooksErrors.js";
import { hasPromptHooks, isPromptHookObserved, getCurrentSpan } from "../telemetry/sessionTracing.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { logUserPromptEvent } from "../telemetry/userPromptEvent.js";
import { hasHookRegistrationChanged } from "../plugins/functionHooks/hookRegistration.js";

//@ chunk-xx1vmpsq.js:30826-30996 placement
function createMapStore() {
  let e = new Map();
  return {
    get: (s) => e.get(s),
    set: (s, n) => {
      e.set(s, n);
    },
    delete: (s) => {
      e.delete(s);
    },
    has: (s) => e.has(s),
    get size() {
      return e.size;
    },
    clear: () => {
      e.clear();
    },
  };
}
//@ chunk-xx1vmpsq.js:30996-31029 placement
var promptEntryWaiters = ge(createMapStore(), (e) => {
  e.clear();
});
//@ chunk-xx1vmpsq.js:31029-31171 placement
function resolvePromptEntryWaiters(e) {
  for (let s of e) {
    if (s.type !== "user") continue;
    let n = promptEntryWaiters.get(s.uuid);
    if (!n) continue;
    promptEntryWaiters.delete(s.uuid);
    for (let y of n) y.resolve();
  }
}
//@ chunk-xx1vmpsq.js:31171-31318 placement
function awaitPromptEntry(e, s) {
  let filtered = s.filter((r) => r.type === "user"),
    y = filtered.find((r) => r.promptSource !== void 0) ?? filtered[0];
  return y ? e.awaitEntry(y.uuid) : Promise.resolve();
}
//@ chunk-xx1vmpsq.js:31318-31413 placement
var PROMPT_NOT_ENTERED_MESSAGE =
  "prompt.submit: the prompt did not enter the session (its batch ended before its turn)";
//@ chunk-xx1vmpsq.js:31413-31743 placement
function createPromptEntryTracker() {
  let e = new Map(),
    s = !1;
  return {
    awaitEntry(n) {
      let withResolvers = Promise.withResolvers(),
        r = promptEntryWaiters.get(n) ?? new Set();
      return (
        r.add(withResolvers),
        promptEntryWaiters.set(n, r),
        e.set(withResolvers, n),
        withResolvers.promise
      );
    },
    handedOff() {
      s = !0;
    },
    [Symbol.dispose]() {
      for (let [n, y] of e) {
        let r = promptEntryWaiters.get(y);
        if (!r || !r.delete(n)) continue;
        if (r.size === 0) promptEntryWaiters.delete(y);
        s ? n.resolve() : n.reject(new HooksError(PROMPT_NOT_ENTERED_MESSAGE));
      }
      e.clear();
    },
  };
}
//@ chunk-xx1vmpsq.js:31743-31926 placement
function rewrittenEntryText(e, s, n) {
  let { screened: screened } = n,
    r = screened?.dropped === !0 ? void 0 : screened?.rewritten;
  if (!(n.interrupted !== !0 && screened?.dropped !== !0)) return;
  if (r === void 0) return e;
  return e.trim() === s.trim() ? r : void 0;
}
//@ chunk-xx1vmpsq.js:31926-32409 placement
async function runPromptSubmitHooks(e, s, { prompt: prompt, reading: reading }) {
  let r = hasPromptHooks() ? void 0 : reading;
  if (!isPromptHookObserved()) {
    try {
      getCurrentSpan(prompt, e, e);
    } catch (error) {
      logError(toError(error));
    }
    return s(void 0);
  }
  let w = new Set(),
    T,
    C = !1,
    I = (M) => {
      if (T !== void 0) return;
      T = M;
      try {
        (w.forEach((R) => logUserPromptEvent(R, rewrittenEntryText(R.text, e, M))),
          w.clear(),
          getCurrentSpan(prompt, e, rewrittenEntryText(e, e, M)));
      } catch (error) {
        logError(toError(error));
      }
    };
  try {
    return await s({
      hold: (M) => {
        if (T === void 0) w.add(M);
        else logUserPromptEvent(M, rewrittenEntryText(M.text, e, T));
      },
      settled: (M) => I({ screened: M }),
      handedOn: () => {
        C = !0;
      },
    });
  } finally {
    let M = !C && r !== void 0 && !hasPromptHooks() && !hasHookRegistrationChanged(r);
    I(M ? { screened: {} } : { interrupted: !0 });
  }
}

export { resolvePromptEntryWaiters, createPromptEntryTracker, runPromptSubmitHooks, awaitPromptEntry };
