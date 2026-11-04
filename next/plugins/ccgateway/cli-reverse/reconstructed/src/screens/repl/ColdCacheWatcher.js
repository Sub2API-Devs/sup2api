/**
 * screens/repl/ColdCacheWatcher.ts
 *
 * 2.1.316 新增。提示缓存变冷的监视。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { isScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import { isDriftingNovaEnabled, MAX_INT32 } from "./idleReturn.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { NOTIF_ACTIVE_THRESHOLD_MS } from "../../bootstrap/state.js";
import { init_react_production, useRef } from "../../../vendor/react/cjs/react.production.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { needsArrowHint } from "../../components/ResumeStaleConversationDialog.js";
import { isNonSpacePrintable } from "../../components/PromptInput/utils.js";
import { topAutoDialog } from "../../state/dialogQueue.js";
import { COLD_RESUME_QUOTA } from "../../components/nudges/nudgeIds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:48551-48653 placement
function isColdCacheWatchEnabled(config) {
  return (
    !config.disabled &&
    !config.disableQuery &&
    !config.embedded &&
    !config.isThinClient &&
    !isUnattendedInteractiveSession() &&
    !isScreenReaderMode() &&
    isDriftingNovaEnabled()
  );
}
//@ chunk-18hwfzwa.js:48653-49890 placement
/**
 * 缓存失效计时器：每轮结束后按 expectedMissAt() 设定定时器，到点时（仍闲置）通知上层预先提醒或预热，dispose 时清理。
 */
class ColdCacheWatcher {
  #e;
  #t;
  #o = null;
  #n = null;
  #s;
  #r = false;
  constructor(host) {
    this.#e = host;
    this.#t = host.turn.getSnapshot();
    this.#s = host.turn.subscribe(this.#c);
  }
  dispose() {
    if (this.#r) return;
    this.#r = true;
    this.#s();
    this.#i();
  }
  #c = () => {
    let snapshot = this.#e.turn.getSnapshot();
    let previousSnapshot = this.#t;
    this.#t = snapshot;
    if (
      snapshot.isLoading !== previousSnapshot.isLoading ||
      snapshot.lastQueryCompletionTime !== previousSnapshot.lastQueryCompletionTime
    )
      this.#a();
  };
  #i() {
    this.#o?.();
    this.#o = null;
  }
  #a() {
    this.#i();
    if (this.#r || this.#t.isLoading || !this.#e.isEnabled()) return;
    let expectedMissAt = this.#e.expectedMissAt();
    if (expectedMissAt !== null && expectedMissAt !== this.#n) this.#l(expectedMissAt);
  }
  #l(targetAt) {
    this.#i();
    this.#o = this.#e.clock.setTimeout(
      () => {
        this.#o = null;
        this.#d();
      },
      Math.min(MAX_INT32, Math.max(0, targetAt - this.#e.now())),
    );
  }
  #d() {
    let host = this.#e;
    if (this.#r || this.#t.isLoading || !host.isEnabled()) return;
    let expectedMissAt = host.expectedMissAt();
    let nowMs = host.now();
    if (expectedMissAt === null || expectedMissAt === this.#n) return;
    if (nowMs < expectedMissAt) {
      this.#l(expectedMissAt);
      return;
    }
    let activeUntil = host.getLastInteractionTime() + NOTIF_ACTIVE_THRESHOLD_MS;
    if (nowMs < activeUntil) {
      this.#l(activeUntil);
      return;
    }
    if (
      host.isTurnActive() ||
      host.isDialogOnScreen() ||
      host.hasPendingLoopWakeup() ||
      host.hasArmedQuotaAutoResume() ||
      host.hasBackgroundAgents()
    ) {
      this.#l(nowMs + NOTIF_ACTIVE_THRESHOLD_MS);
      return;
    }
    let partBusyUntil = host.pastUsageLimitUntil();
    if (partBusyUntil !== null) {
      this.#l(Number.isFinite(partBusyUntil) ? partBusyUntil : nowMs + NOTIF_ACTIVE_THRESHOLD_MS);
      return;
    }
    this.#n = expectedMissAt;
    let hint = host.evaluate();
    if (hint === null) return;
    host.setIdleHintSuppressed(true);
    host
      .ask(hint)
      .catch(logError)
      .finally(() => host.setIdleHintSuppressed(false));
  }
}
//@ chunk-18hwfzwa.js:49890-49894 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:49890", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:49894-50624 placement
function useIdleReturnTypeThrough({ onScreen, dialogStore, draft }) {
  let bufferRef = useRef(null);
  usePreDispatchKeyHandler(
    (input, key, fallbackInput) => {
      let idleQuotaResumePayload = selectIdleQuotaResumePayload(dialogStore);
      if (idleQuotaResumePayload === undefined) return;
      let buffer = askBuffer(bufferRef, idleQuotaResumePayload);
      if (
        key.return ||
        input ===
          `
`
      )
        return needsArrowHint(idleQuotaResumePayload, draft.value);
      if (key.home || key.end || key.pageUp || key.pageDown || (key.ctrl && (input === "n" || input === "p")))
        return true;
      if (key.backspace) {
        let last = buffer.chars.at(-1);
        if (last !== undefined && draft.value.endsWith(last)) {
          buffer.chars.pop();
          draft.setValueRaw(draft.value.slice(0, -last.length));
        } else if (buffer.chars.length === 0 && buffer.setBash) {
          buffer.setBash = false;
          draft.setMode("prompt");
        } else return;
        return true;
      }
      let typedInput = input !== "" ? input : fallbackInput;
      if (!isNonSpacePrintable(typedInput, key)) return;
      let textToInsert = typedInput;
      if (draft.value === "" && draft.mode === "prompt" && typedInput.startsWith("!")) {
        draft.setMode("bash");
        buffer.setBash = true;
        textToInsert = typedInput.slice(1);
      }
      draft.setValueRaw(draft.value + textToInsert);
      buffer.chars.push(...textToInsert);
      return true;
    },
    {
      isActive: onScreen,
    },
  );
  return null;
}
//@ chunk-18hwfzwa.js:50624-50719 placement
function askBuffer(bufferRef, askId) {
  if (bufferRef.current?.ask !== askId)
    bufferRef.current = {
      ask: askId,
      chars: [],
      setBash: false,
    };
  return bufferRef.current;
}
//@ chunk-18hwfzwa.js:50719-50809 placement
function selectIdleQuotaResumePayload(dialogStore) {
  let dialog = topAutoDialog(dialogStore.getState());
  let payload = dialog?.payload;
  return dialog?.kind === COLD_RESUME_QUOTA && isIdleTriggeredPayload(payload) ? payload : undefined;
}
//@ chunk-18hwfzwa.js:50809-50897 placement
function isIdleTriggeredPayload(payload) {
  return (
    typeof payload === "object" && payload !== null && "trigger" in payload && payload.trigger === "idle"
  );
}
export { ColdCacheWatcher, isColdCacheWatchEnabled, useIdleReturnTypeThrough };
