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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xx1vmpsq.js:30826-30996 placement
function createMapStore() {
  let store = new Map();
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    delete: (key) => {
      store.delete(key);
    },
    has: (key) => store.has(key),
    get size() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
  };
}
//@ chunk-xx1vmpsq.js:30996-31029 placement
var promptEntryWaiters; // deferred: uses createMapStore of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xx1vmpsq.js:30996", () => {
  promptEntryWaiters = identity(createMapStore(), (waiterStore) => {
    waiterStore.clear();
  });
});
//@ chunk-xx1vmpsq.js:31029-31171 placement
function resolvePromptEntryWaiters(newMessages) {
  for (let message of newMessages) {
    if (message.type !== "user") continue;
    let waiters = promptEntryWaiters.get(message.uuid);
    if (!waiters) continue;
    promptEntryWaiters.delete(message.uuid);
    for (let waiter of waiters) waiter.resolve();
  }
}
//@ chunk-xx1vmpsq.js:31171-31318 placement
function awaitPromptEntry(entries, messages) {
  let filtered = messages.filter((message) => message.type === "user");
  let targetMessage = filtered.find((message) => message.promptSource !== undefined) ?? filtered[0];
  return targetMessage ? entries.awaitEntry(targetMessage.uuid) : Promise.resolve();
}
//@ chunk-xx1vmpsq.js:31318-31413 placement
var PROMPT_NOT_ENTERED_MESSAGE =
  "prompt.submit: the prompt did not enter the session (its batch ended before its turn)";
//@ chunk-xx1vmpsq.js:31413-31743 placement
function createPromptEntryTracker() {
  let pendings = new Map();
  let handedOff = false;
  return {
    awaitEntry(uuid) {
      let deferred = Promise.withResolvers();
      let waiters = promptEntryWaiters.get(uuid) ?? new Set();
      waiters.add(deferred);
      promptEntryWaiters.set(uuid, waiters);
      pendings.set(deferred, uuid);
      return deferred.promise;
    },
    handedOff() {
      handedOff = true;
    },
    [Symbol.dispose]() {
      for (let [deferred, uuid] of pendings) {
        let waiters = promptEntryWaiters.get(uuid);
        if (!waiters || !waiters.delete(deferred)) continue;
        if (waiters.size === 0) promptEntryWaiters.delete(uuid);
        if (handedOff) deferred.resolve();
        else deferred.reject(new HooksError(PROMPT_NOT_ENTERED_MESSAGE));
      }
      pendings.clear();
    },
  };
}
//@ chunk-xx1vmpsq.js:31743-31926 placement
function rewrittenEntryText(text, typedText, result) {
  let { screened } = result;
  let rewritten = screened?.dropped === true ? undefined : screened?.rewritten;
  if (!(result.interrupted !== true && screened?.dropped !== true)) return;
  if (rewritten === undefined) return text;
  return text.trim() === typedText.trim() ? rewritten : undefined;
}
//@ chunk-xx1vmpsq.js:31926-32409 placement
async function runPromptSubmitHooks(text, runBody, { prompt, reading }) {
  let initialReading = hasPromptHooks() ? undefined : reading;
  if (!isPromptHookObserved()) {
    try {
      getCurrentSpan(prompt, text, text);
    } catch (error) {
      logError(toError(error));
    }
    return runBody(undefined);
  }
  let heldRecords = new Set();
  let screened;
  let handedOn = false;
  let settle = (screenedValue) => {
    if (screened !== undefined) return;
    screened = screenedValue;
    try {
      heldRecords.forEach((record) =>
        logUserPromptEvent(record, rewrittenEntryText(record.text, text, screenedValue)),
      );
      heldRecords.clear();
      getCurrentSpan(prompt, text, rewrittenEntryText(text, text, screenedValue));
    } catch (error) {
      logError(toError(error));
    }
  };
  try {
    return await runBody({
      hold: (record) => {
        if (screened === undefined) heldRecords.add(record);
        else logUserPromptEvent(record, rewrittenEntryText(record.text, text, screened));
      },
      settled: (screened) =>
        settle({
          screened,
        }),
      handedOn: () => {
        handedOn = true;
      },
    });
  } finally {
    let settledEmpty =
      !handedOn &&
      initialReading !== undefined &&
      !hasPromptHooks() &&
      !hasHookRegistrationChanged(initialReading);
    settle(
      settledEmpty
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
