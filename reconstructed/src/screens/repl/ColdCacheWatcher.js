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
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { NOTIF_ACTIVE_THRESHOLD_MS } from "../../bootstrap/state.js";
import { init_react_production, R } from "../../../vendor/react/cjs/react.production.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { needsArrowHint } from "../../components/ResumeStaleConversationDialog.js";
import { isNonSpacePrintable } from "../../components/PromptInput/utils.js";
import { topAutoDialog } from "../../state/dialogQueue.js";
import { COLD_RESUME_QUOTA } from "../../components/nudges/nudgeIds.js";

//@ chunk-18hwfzwa.js:48551-48653 placement
function isColdCacheWatchEnabled(h) {
  return (
    !h.disabled &&
    !h.disableQuery &&
    !h.embedded &&
    !h.isThinClient &&
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
  constructor(h) {
    this.#e = h;
    this.#t = h.turn.getSnapshot();
    this.#s = h.turn.subscribe(this.#c);
  }
  dispose() {
    if (this.#r) return;
    this.#r = true;
    this.#s();
    this.#i();
  }
  #c = () => {
    let snapshot = this.#e.turn.getSnapshot();
    let x = this.#t;
    this.#t = snapshot;
    if (snapshot.isLoading !== x.isLoading || snapshot.lastQueryCompletionTime !== x.lastQueryCompletionTime)
      this.#a();
  };
  #i() {
    this.#o?.();
    this.#o = null;
  }
  #a() {
    this.#i();
    if (this.#r || this.#t.isLoading || !this.#e.isEnabled()) return;
    let h = this.#e.expectedMissAt();
    if (h !== null && h !== this.#n) this.#l(h);
  }
  #l(h) {
    this.#i();
    this.#o = this.#e.clock.setTimeout(
      () => {
        this.#o = null;
        this.#d();
      },
      Math.min(MAX_INT32, Math.max(0, h - this.#e.now())),
    );
  }
  #d() {
    let h = this.#e;
    if (this.#r || this.#t.isLoading || !h.isEnabled()) return;
    let x = h.expectedMissAt();
    let D = h.now();
    if (x === null || x === this.#n) return;
    if (D < x) {
      this.#l(x);
      return;
    }
    let L = h.getLastInteractionTime() + NOTIF_ACTIVE_THRESHOLD_MS;
    if (D < L) {
      this.#l(L);
      return;
    }
    if (
      h.isTurnActive() ||
      h.isDialogOnScreen() ||
      h.hasPendingLoopWakeup() ||
      h.hasArmedQuotaAutoResume() ||
      h.hasBackgroundAgents()
    ) {
      this.#l(D + NOTIF_ACTIVE_THRESHOLD_MS);
      return;
    }
    let ee = h.pastUsageLimitUntil();
    if (ee !== null) {
      this.#l(Number.isFinite(ee) ? ee : D + NOTIF_ACTIVE_THRESHOLD_MS);
      return;
    }
    this.#n = x;
    let ke = h.evaluate();
    if (ke === null) return;
    h.setIdleHintSuppressed(true);
    h.ask(ke)
      .catch(logError)
      .finally(() => h.setIdleHintSuppressed(false));
  }
}
//@ chunk-18hwfzwa.js:49890-49894 placement
init_react_production();
//@ chunk-18hwfzwa.js:49894-50624 placement
function useIdleReturnTypeThrough({ onScreen, dialogStore, draft }) {
  let L = R(null);
  usePreDispatchKeyHandler(
    (input, key, Re) => {
      let idleQuotaResumePayload = selectIdleQuotaResumePayload(dialogStore);
      if (idleQuotaResumePayload === undefined) return;
      let He = askBuffer(L, idleQuotaResumePayload);
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
        let last = He.chars.at(-1);
        if (last !== undefined && draft.value.endsWith(last)) {
          He.chars.pop();
          draft.setValueRaw(draft.value.slice(0, -last.length));
        } else if (He.chars.length === 0 && He.setBash) {
          He.setBash = false;
          draft.setMode("prompt");
        } else return;
        return true;
      }
      let We = input !== "" ? input : Re;
      if (!isNonSpacePrintable(We, key)) return;
      let ze = We;
      if (draft.value === "" && draft.mode === "prompt" && We.startsWith("!")) {
        draft.setMode("bash");
        He.setBash = true;
        ze = We.slice(1);
      }
      draft.setValueRaw(draft.value + ze);
      He.chars.push(...ze);
      return true;
    },
    {
      isActive: onScreen,
    },
  );
  return null;
}
//@ chunk-18hwfzwa.js:50624-50719 placement
function askBuffer(h, idleQuotaResumePayload) {
  if (h.current?.ask !== idleQuotaResumePayload)
    h.current = {
      ask: idleQuotaResumePayload,
      chars: [],
      setBash: false,
    };
  return h.current;
}
//@ chunk-18hwfzwa.js:50719-50809 placement
function selectIdleQuotaResumePayload(dialogStore) {
  let x = topAutoDialog(dialogStore.getState());
  let payload = x?.payload;
  return x?.kind === COLD_RESUME_QUOTA && isIdleTriggeredPayload(payload) ? payload : undefined;
}
//@ chunk-18hwfzwa.js:50809-50897 placement
function isIdleTriggeredPayload(payload) {
  return (
    typeof payload === "object" && payload !== null && "trigger" in payload && payload.trigger === "idle"
  );
}
export { ColdCacheWatcher, isColdCacheWatchEnabled, useIdleReturnTypeThrough };
