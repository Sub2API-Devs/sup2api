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
import { identity } from "../identity.js";
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
var promptEntryWaiters = identity(createMapStore(), (e) => {
  e.clear();
});
//@ chunk-xx1vmpsq.js:31029-31171 placement
function resolvePromptEntryWaiters(newMessages) {
  for (let s of newMessages) {
    if (s.type !== "user") continue;
    let n = promptEntryWaiters.get(s.uuid);
    if (!n) continue;
    promptEntryWaiters.delete(s.uuid);
    for (let y of n) y.resolve();
  }
}
//@ chunk-xx1vmpsq.js:31171-31318 placement
function awaitPromptEntry(entries, messages) {
  let filtered = messages.filter((r) => r.type === "user");
  let y = filtered.find((r) => r.promptSource !== undefined) ?? filtered[0];
  return y ? entries.awaitEntry(y.uuid) : Promise.resolve();
}
//@ chunk-xx1vmpsq.js:31318-31413 placement
var PROMPT_NOT_ENTERED_MESSAGE =
  "prompt.submit: the prompt did not enter the session (its batch ended before its turn)";
//@ chunk-xx1vmpsq.js:31413-31743 placement
function createPromptEntryTracker() {
  let e = new Map();
  let s = false;
  return {
    awaitEntry(n) {
      let deferred = Promise.withResolvers();
      let r = promptEntryWaiters.get(n) ?? new Set();
      r.add(deferred);
      promptEntryWaiters.set(n, r);
      e.set(deferred, n);
      return deferred.promise;
    },
    handedOff() {
      s = true;
    },
    [Symbol.dispose]() {
      for (let [n, y] of e) {
        let r = promptEntryWaiters.get(y);
        if (!r || !r.delete(n)) continue;
        if (r.size === 0) promptEntryWaiters.delete(y);
        if (s) n.resolve();
        else n.reject(new HooksError(PROMPT_NOT_ENTERED_MESSAGE));
      }
      e.clear();
    },
  };
}
//@ chunk-xx1vmpsq.js:31743-31926 placement
function rewrittenEntryText(text, s, n) {
  let { screened } = n;
  let rewritten = screened?.dropped === true ? undefined : screened?.rewritten;
  if (!(n.interrupted !== true && screened?.dropped !== true)) return;
  if (rewritten === undefined) return text;
  return text.trim() === s.trim() ? rewritten : undefined;
}
//@ chunk-xx1vmpsq.js:31926-32409 placement
async function runPromptSubmitHooks(e, s, { prompt, reading }) {
  let r = hasPromptHooks() ? undefined : reading;
  if (!isPromptHookObserved()) {
    try {
      getCurrentSpan(prompt, e, e);
    } catch (error) {
      logError(toError(error));
    }
    return s(undefined);
  }
  let w = new Set();
  let T;
  let C = false;
  let I = (M) => {
    if (T !== undefined) return;
    T = M;
    try {
      w.forEach((R) => logUserPromptEvent(R, rewrittenEntryText(R.text, e, M)));
      w.clear();
      getCurrentSpan(prompt, e, rewrittenEntryText(e, e, M));
    } catch (error) {
      logError(toError(error));
    }
  };
  try {
    return await s({
      hold: (M) => {
        if (T === undefined) w.add(M);
        else logUserPromptEvent(M, rewrittenEntryText(M.text, e, T));
      },
      settled: (screened) =>
        I({
          screened,
        }),
      handedOn: () => {
        C = true;
      },
    });
  } finally {
    let M = !C && r !== undefined && !hasPromptHooks() && !hasHookRegistrationChanged(r);
    I(
      M
        ? {
            screened: {},
          }
        : {
            interrupted: true,
          },
    );
  }
}
export { resolvePromptEntryWaiters, createPromptEntryTracker, runPromptSubmitHooks, awaitPromptEntry };
