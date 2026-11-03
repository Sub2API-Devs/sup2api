/**
 * services/remoteManagedSettings/securityCheck.tsx
 *
 * 远程托管设置含危险设置（会执行命令的 helper、hooks 等）时弹出的同意对话框流程。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/remoteManagedSettings/securityCheck.tsx
 * pieces: chunk-cjtj3nae.js (25)
 * attribution: placement 25
 */
import { Stream } from "../../utils/stream.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { di } from "../../ink/terminal.js";
import { dropRemoteManagedSettingsConsentDeferral } from "./remoteSettingsState.js";
import { withTimeout } from "../../utils/sleep.js";
import {
  untilKeyboardRests,
  wasEarlyInputFieldOpened,
  hasEarlyInputField,
  msSinceEarlyInputFieldClosed,
} from "../../utils/earlyInput.js";
import {
  hasDangerousManagedSettings,
  summarizeManagedSettingsRisk,
  managedSettingsNeedReconsent,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { vio } from "../../utils/settings/settingsSourceTrust.js";
import { stdinOverrideCache } from "../../utils/renderOptions.js";
import { isShuttingDown, emitExitMessage, gracefulShutdownSync } from "../../utils/gracefulShutdown.js";
import { latchTerminalShutdown } from "../../utils/terminalShutdown.js";
import { f7e } from "../../state/promptInputStore.js";

//@ chunk-cjtj3nae.js:731-742 placement
var y = 5000;
//@ chunk-cjtj3nae.js:742-815 placement
function v(e, t) {
  return t !== void 0 && !e.hasOpenReview() && pendingPreReplSecurityDialog() === null && t();
}
/**
 * 安全对话框被新设置替代
 */
//@ chunk-cjtj3nae.js:815-1026 placement
class SecurityDialogSupersession {
  updates = new Stream();
  owner;
  constructor(e) {
    this.owner = e;
  }
  supersede(e, t, s) {
    let owner = this.owner;
    ((this.owner = s), this.updates.enqueue({ settings: e, baseline: t }), owner("superseded"));
  }
  settle(e) {
    (this.updates.done(), this.owner(e));
  }
}
/**
 * 安全对话框协调状态
 */
//@ chunk-cjtj3nae.js:1026-2520 placement
class SecurityDialogCoordinator {
  replRequester = null;
  requesterWaiters = [];
  noConsentSurface = !1;
  stopsWhenApprovalCannotBeAsked = !1;
  standaloneDialogUnanswered = null;
  rootDrawnDialog = null;
  pendingReview = null;
  registerRequester(e) {
    if (((this.replRequester = e), e && this.requesterWaiters.length > 0)) {
      let requesterWaiters = this.requesterWaiters;
      this.requesterWaiters = [];
      for (let s of requesterWaiters) s(e);
    }
  }
  addWaiter(e) {
    this.requesterWaiters.push(e);
  }
  dropWaiter(e) {
    this.requesterWaiters = this.requesterWaiters.filter((requesterWaiter) => requesterWaiter !== e);
  }
  review(e, t, s, o) {
    return new Promise((n) => {
      if (this.pendingReview) {
        this.pendingReview.supersede(t, s, n);
        return;
      }
      if (v(this, o)) {
        n("first_party_silent");
        return;
      }
      let l = new SecurityDialogSupersession(n);
      ((this.pendingReview = l), logEvent("tengu_managed_settings_security_dialog_shown", {}));
      let u;
      try {
        u = e(t, s, l.updates);
      } catch {
        u = Promise.resolve("deferred_no_consent_surface");
      }
      u.then(
        (d) => this.close(l, d),
        () => this.close(l, "deferred_no_consent_surface"),
      );
    });
  }
  hasOpenReview() {
    return this.pendingReview !== null;
  }
  close(e, t) {
    if (((this.pendingReview = null), t === "approved"))
      (logEvent("tengu_managed_settings_security_dialog_accepted", {}),
        logFeatureOk("remote_managed_settings_security_check"));
    else if (t === "rejected") logEvent("tengu_managed_settings_security_dialog_rejected", {});
    e.settle(t);
  }
  startupConsentRelease = null;
  fireStartupConsentRelease() {
    let startupConsentRelease = this.startupConsentRelease;
    if (startupConsentRelease) ((this.startupConsentRelease = null), startupConsentRelease());
  }
  consentNeededRelease = null;
  async fireConsentNeededRelease() {
    let consentNeededRelease = this.consentNeededRelease;
    if (consentNeededRelease) ((this.consentNeededRelease = null), await consentNeededRelease());
  }
  consentHandoffHolds = new Set();
  consentHandoffSignal = createSignal();
  consentHandoffRevealActive = !1;
}
//@ chunk-cjtj3nae.js:2520-2543 placement
var C = new HostScoped(() => new SecurityDialogCoordinator());
//@ chunk-cjtj3nae.js:2543-2578 placement
function r() {
  return C.of(getRootSession().host);
}
//@ chunk-cjtj3nae.js:2578-2636 placement
function isSecuritySettingsDialogPending() {
  return di().pendingStandaloneRender !== null;
}
//@ chunk-cjtj3nae.js:2636-2689 placement
function unansweredSecuritySettingsDialog() {
  return r().standaloneDialogUnanswered;
}
//@ chunk-cjtj3nae.js:2689-2729 placement
function D() {
  return r().rootDrawnDialog;
}
//@ chunk-cjtj3nae.js:2729-2831 placement
function pendingPreReplSecurityDialog() {
  let pendingStandaloneRender = di().pendingStandaloneRender;
  if (pendingStandaloneRender !== null)
    return pendingStandaloneRender.then(
      () => {},
      () => {},
    );
  return D();
}
//@ chunk-cjtj3nae.js:2831-2872 placement
function setSecurityDialogRequester(e) {
  r().registerRequester(e);
}
//@ chunk-cjtj3nae.js:2872-2997 placement
function armStartupConsentRelease(e) {
  let t = r();
  return (
    (t.startupConsentRelease = e),
    () => {
      if (t.startupConsentRelease === e) t.startupConsentRelease = null;
    }
  );
}
//@ chunk-cjtj3nae.js:2997-3257 placement
function acquireConsentHandoffHold() {
  let e = r(),
    t = Symbol("consent-handoff-hold");
  if ((e.consentHandoffHolds.add(t), e.consentHandoffHolds.size === 1)) e.consentHandoffSignal.emit();
  return () => {
    if (e.consentHandoffHolds.delete(t) && e.consentHandoffHolds.size === 0) e.consentHandoffSignal.emit();
  };
}
//@ chunk-cjtj3nae.js:3257-3310 placement
function isConsentHandoffPending() {
  return r().consentHandoffHolds.size > 0;
}
//@ chunk-cjtj3nae.js:3310-3363 placement
function isConsentHandoffReveal() {
  return r().consentHandoffRevealActive;
}
//@ chunk-cjtj3nae.js:3363-3424 placement
function subscribeConsentHandoffPending(e) {
  return r().consentHandoffSignal.subscribe(e);
}
//@ chunk-cjtj3nae.js:3424-3546 placement
function armConsentNeededRelease(e) {
  let t = r();
  return (
    (t.consentNeededRelease = e),
    () => {
      if (t.consentNeededRelease === e) t.consentNeededRelease = null;
    }
  );
}
//@ chunk-cjtj3nae.js:3546-3591 placement
function declareNoConsentSurface() {
  ((r().noConsentSurface = !0), dropRemoteManagedSettingsConsentDeferral());
}
//@ chunk-cjtj3nae.js:3591-3644 placement
function declareStopsWhenApprovalCannotBeAsked() {
  r().stopsWhenApprovalCannotBeAsked = !0;
}
//@ chunk-cjtj3nae.js:3644-3687 placement
function hasDeclaredNoConsentSurface() {
  return r().noConsentSurface;
}
/**
 * 等待安全对话框请求者
 */
//@ chunk-cjtj3nae.js:3687-3888 placement
async function waitForDialogRequester() {
  let e = r(),
    t,
    promise = new Promise((n) => {
      ((t = n), e.addWaiter(n));
    }),
    o = await withTimeout(promise, y, "managed-settings security dialog requester wait timed out").catch(
      () => null,
    );
  if (o === null) e.dropWaiter(t);
  return o;
}
/**
 * 等待请求者并审阅托管设置
 */
//@ chunk-cjtj3nae.js:3888-4115 placement
async function reviewWithRequester(e, t, s) {
  let o = r(),
    n = acquireConsentHandoffHold();
  try {
    for (;;) {
      if ((await untilKeyboardRests(), o.replRequester)) return await o.review(o.replRequester, e, t, s);
      if (!di().has(process.stdout) || (await waitForDialogRequester()) === null)
        return "deferred_no_consent_surface";
    }
  } finally {
    n();
  }
}
/**
 * 托管设置安全检查：需要时弹出确认对话框，拒绝则退出；无交互界面时延后或按策略处理。
 */
//@ chunk-cjtj3nae.js:4115-6020 placement
async function checkManagedSettingsSecurity(e, t, s, o) {
  if (!t || !hasDangerousManagedSettings(summarizeManagedSettingsRisk(t))) return "no_check_needed";
  if (!managedSettingsNeedReconsent(e, t)) return "no_check_needed";
  let n = r();
  if (!vio()) return n.noConsentSurface ? "deferred_no_consent_surface" : "deferred_non_interactive";
  let l = e.source === "consented_payload" ? e.settings : e.consentedPayload;
  if (n.replRequester)
    if (n.consentNeededRelease) {
      let i = null;
      try {
        ((i = acquireConsentHandoffHold()), await n.fireConsentNeededRelease());
        let replRequester = n.replRequester;
        if (replRequester)
          return ((n.consentHandoffRevealActive = !0), await n.review(replRequester, t, l, o));
        if (di().has(process.stdout)) {
          let h = await waitForDialogRequester();
          if (h) return ((n.consentHandoffRevealActive = !0), await n.review(h, t, l, o));
        }
        return "deferred_no_consent_surface";
      } finally {
        ((n.consentHandoffRevealActive = !1), i?.());
      }
    } else if (wasEarlyInputFieldOpened()) return reviewWithRequester(t, l, o);
    else return n.review(n.replRequester, t, l, o);
  if (n.noConsentSurface) return "deferred_no_consent_surface";
  let u = di();
  if (u.has(process.stdout)) {
    n.fireStartupConsentRelease();
    let i;
    do i = await waitForDialogRequester();
    while (i === null && (hasEarlyInputField() || msSinceEarlyInputFieldClosed() < y));
    if (i) return wasEarlyInputFieldOpened() ? reviewWithRequester(t, l, o) : n.review(i, t, l, o);
    if (wasEarlyInputFieldOpened()) return "deferred_no_consent_surface";
  }
  if (
    s === void 0 ||
    n.noConsentSurface ||
    (n.stopsWhenApprovalCannotBeAsked && stdinOverrideCache.get().kind === "unavailable")
  ) {
    if (!n.noConsentSurface) n.standaloneDialogUnanswered = "not_asked";
    return "deferred_no_consent_surface";
  }
  if (v(n, o)) return ((n.standaloneDialogUnanswered = null), "first_party_silent");
  logEvent("tengu_managed_settings_security_dialog_shown", {});
  let d = u.has(process.stdout),
    f = s(t, d, l);
  if (!d) u.claimForStandaloneRender(f);
  else {
    let i = f.then(
      () => {},
      () => {},
    );
    ((n.rootDrawnDialog = i),
      i.then(() => {
        if (n.rootDrawnDialog === i) n.rootDrawnDialog = null;
      }));
  }
  let c;
  try {
    ((c = await f), (n.standaloneDialogUnanswered = null));
  } catch (error) {
    throw (
      (n.standaloneDialogUnanswered = "closed_unanswered"),
      logFeatureBad("remote_managed_settings_security_check", "dialog_unavailable"),
      error
    );
  }
  if (
    (logEvent(
      c === "approved"
        ? "tengu_managed_settings_security_dialog_accepted"
        : "tengu_managed_settings_security_dialog_rejected",
      {},
    ),
    c === "approved")
  )
    logFeatureOk("remote_managed_settings_security_check");
  return c;
}
//@ chunk-cjtj3nae.js:6020-6277 placement
var REJECTED_EXIT_MESSAGE = "Managed settings were not approved; exiting without applying them.",
  APPROVAL_NOT_ASKED_EXIT_MESSAGE =
    "Your organization's managed settings need your approval, which couldn't be asked for here. Run `claude` in a terminal and approve them, then run this command again.",
  managedSettingsConsentRejected = createSignal();
//@ chunk-cjtj3nae.js:6277-6652 placement
function handleSecurityCheckResult(result) {
  switch (result) {
    case "rejected":
      if (process.stderr.isTTY && !isShuttingDown()) {
        latchTerminalShutdown();
        let t = wasEarlyInputFieldOpened() ? f7e(getRootSession()).trim() : "";
        emitExitMessage(
          t === ""
            ? REJECTED_EXIT_MESSAGE
            : `${REJECTED_EXIT_MESSAGE}

Your message was not sent:
${t}`,
        );
      }
      if (!isShuttingDown()) managedSettingsConsentRejected.emit();
      return (gracefulShutdownSync(1), !1);
    case "deferred_no_consent_surface":
      return !1;
    case "superseded":
      return !1;
    case "approved":
    case "first_party_silent":
    case "no_check_needed":
    case "deferred_non_interactive":
      return !0;
  }
}

export {
  managedSettingsConsentRejected,
  declareNoConsentSurface,
  declareStopsWhenApprovalCannotBeAsked,
  setSecurityDialogRequester,
  isConsentHandoffReveal,
  subscribeConsentHandoffPending,
  isConsentHandoffPending,
  checkManagedSettingsSecurity,
  handleSecurityCheckResult,
  hasDeclaredNoConsentSurface,
  isSecuritySettingsDialogPending,
  armStartupConsentRelease,
  pendingPreReplSecurityDialog,
  unansweredSecuritySettingsDialog,
  APPROVAL_NOT_ASKED_EXIT_MESSAGE,
  REJECTED_EXIT_MESSAGE,
  armConsentNeededRelease,
  acquireConsentHandoffHold,
};
