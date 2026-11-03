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
import { rLe, QAt } from "./idleReturn.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { NOTIF_ACTIVE_THRESHOLD_MS } from "../../bootstrap/state.js";
import { j, R } from "../../../vendor/react/cjs/react.production.js";
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
    rLe()
  );
}
/**
 * 缓存失效计时器：每轮结束后按 expectedMissAt() 设定定时器，到点时（仍闲置）通知上层预先提醒或预热，dispose 时清理。
 */
//@ chunk-18hwfzwa.js:48653-49890 placement
class ColdCacheWatcher {
  #e;
  #t;
  #o = null;
  #n = null;
  #s;
  #r = !1;
  constructor(h) {
    ((this.#e = h), (this.#t = h.turn.getSnapshot()), (this.#s = h.turn.subscribe(this.#c)));
  }
  dispose() {
    if (this.#r) return;
    ((this.#r = !0), this.#s(), this.#i());
  }
  #c = () => {
    let snapshot = this.#e.turn.getSnapshot(),
      x = this.#t;
    if (
      ((this.#t = snapshot),
      snapshot.isLoading !== x.isLoading || snapshot.lastQueryCompletionTime !== x.lastQueryCompletionTime)
    )
      this.#a();
  };
  #i() {
    (this.#o?.(), (this.#o = null));
  }
  #a() {
    if ((this.#i(), this.#r || this.#t.isLoading || !this.#e.isEnabled())) return;
    let expectedMissAt = this.#e.expectedMissAt();
    if (expectedMissAt !== null && expectedMissAt !== this.#n) this.#l(expectedMissAt);
  }
  #l(h) {
    (this.#i(),
      (this.#o = this.#e.clock.setTimeout(
        () => {
          ((this.#o = null), this.#d());
        },
        Math.min(QAt, Math.max(0, h - this.#e.now())),
      )));
  }
  #d() {
    let h = this.#e;
    if (this.#r || this.#t.isLoading || !h.isEnabled()) return;
    let expectedMissAt = h.expectedMissAt(),
      now = h.now();
    if (expectedMissAt === null || expectedMissAt === this.#n) return;
    if (now < expectedMissAt) {
      this.#l(expectedMissAt);
      return;
    }
    let L = h.getLastInteractionTime() + NOTIF_ACTIVE_THRESHOLD_MS;
    if (now < L) {
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
      this.#l(now + NOTIF_ACTIVE_THRESHOLD_MS);
      return;
    }
    let pastUsageLimitUntil = h.pastUsageLimitUntil();
    if (pastUsageLimitUntil !== null) {
      this.#l(Number.isFinite(pastUsageLimitUntil) ? pastUsageLimitUntil : now + NOTIF_ACTIVE_THRESHOLD_MS);
      return;
    }
    this.#n = expectedMissAt;
    let evaluate = h.evaluate();
    if (evaluate === null) return;
    (h.setIdleHintSuppressed(!0),
      h
        .ask(evaluate)
        .catch(logError)
        .finally(() => h.setIdleHintSuppressed(!1)));
  }
}
//@ chunk-18hwfzwa.js:49890-49894 placement
j();
//@ chunk-18hwfzwa.js:49894-50624 placement
function useIdleReturnTypeThrough({ onScreen: onScreen, dialogStore: dialogStore, draft: draft }) {
  let L = R(null);
  return (
    usePreDispatchKeyHandler(
      (ee, ke, Re) => {
        let Be = YAt(dialogStore);
        if (Be === void 0) return;
        let He = zAt(L, Be);
        if (
          ke.return ||
          ee ===
            `
`
        )
          return needsArrowHint(Be, draft.value);
        if (ke.home || ke.end || ke.pageUp || ke.pageDown || (ke.ctrl && (ee === "n" || ee === "p")))
          return !0;
        if (ke.backspace) {
          let at = He.chars.at(-1);
          if (at !== void 0 && draft.value.endsWith(at))
            (He.chars.pop(), draft.setValueRaw(draft.value.slice(0, -at.length)));
          else if (He.chars.length === 0 && He.setBash) ((He.setBash = !1), draft.setMode("prompt"));
          else return;
          return !0;
        }
        let We = ee !== "" ? ee : Re;
        if (!isNonSpacePrintable(We, ke)) return;
        let ze = We;
        if (draft.value === "" && draft.mode === "prompt" && We.startsWith("!"))
          (draft.setMode("bash"), (He.setBash = !0), (ze = We.slice(1)));
        return (draft.setValueRaw(draft.value + ze), He.chars.push(...ze), !0);
      },
      { isActive: onScreen },
    ),
    null
  );
}
//@ chunk-18hwfzwa.js:50624-50719 placement
function zAt(h, x) {
  if (h.current?.ask !== x) h.current = { ask: x, chars: [], setBash: !1 };
  return h.current;
}
//@ chunk-18hwfzwa.js:50719-50809 placement
function YAt(h) {
  let x = topAutoDialog(h.getState()),
    D = x?.payload;
  return x?.kind === COLD_RESUME_QUOTA && JAt(D) ? D : void 0;
}
//@ chunk-18hwfzwa.js:50809-50897 placement
function JAt(h) {
  return typeof h === "object" && h !== null && "trigger" in h && h.trigger === "idle";
}

export { ColdCacheWatcher, isColdCacheWatchEnabled, useIdleReturnTypeThrough };
