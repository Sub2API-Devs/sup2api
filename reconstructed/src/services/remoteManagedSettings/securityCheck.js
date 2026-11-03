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
import { getSecondRootError } from "../../ink/terminal.js";
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
import { isInteractiveSettingsHost } from "../../utils/settings/settingsSourceTrust.js";
import { stdinOverrideCache } from "../../utils/renderOptions.js";
import { isShuttingDown, emitExitMessage, gracefulShutdownSync } from "../../utils/gracefulShutdown.js";
import { latchTerminalShutdown } from "../../utils/terminalShutdown.js";
import { promptInputValue } from "../../state/promptInputStore.js";

//@ chunk-cjtj3nae.js:731-742 placement
var SECURITY_DIALOG_SETTLE_MS = 5000;
//@ chunk-cjtj3nae.js:742-815 placement
function canReviewSilently(e, t) {
  return t !== undefined && !e.hasOpenReview() && pendingPreReplSecurityDialog() === null && t();
}
//@ chunk-cjtj3nae.js:815-1026 placement
/**
 * 安全对话框被新设置替代
 */
class SecurityDialogSupersession {
  updates = new Stream();
  owner;
  constructor(owner) {
    this.owner = owner;
  }
  supersede(settings, baseline, owner) {
    let owner_2 = this.owner;
    this.owner = owner;
    this.updates.enqueue({
      settings,
      baseline,
    });
    owner_2("superseded");
  }
  settle(e) {
    this.updates.done();
    this.owner(e);
  }
}
//@ chunk-cjtj3nae.js:1026-2520 placement
/**
 * 安全对话框协调状态
 */
class SecurityDialogCoordinator {
  replRequester = null;
  requesterWaiters = [];
  noConsentSurface = false;
  stopsWhenApprovalCannotBeAsked = false;
  standaloneDialogUnanswered = null;
  rootDrawnDialog = null;
  pendingReview = null;
  registerRequester(e) {
    this.replRequester = e;
    if (e && this.requesterWaiters.length > 0) {
      let requesterWaiters = this.requesterWaiters;
      this.requesterWaiters = [];
      for (let requesterWaiter of requesterWaiters) requesterWaiter(e);
    }
  }
  addWaiter(e) {
    this.requesterWaiters.push(e);
  }
  dropWaiter(e) {
    this.requesterWaiters = this.requesterWaiters.filter((requesterWaiter) => requesterWaiter !== e);
  }
  review(e, t, s, o) {
    return new Promise((resolve) => {
      if (this.pendingReview) {
        this.pendingReview.supersede(t, s, resolve);
        return;
      }
      if (canReviewSilently(this, o)) {
        resolve("first_party_silent");
        return;
      }
      let l = new SecurityDialogSupersession(resolve);
      this.pendingReview = l;
      logEvent("tengu_managed_settings_security_dialog_shown", {});
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
    this.pendingReview = null;
    if (t === "approved") {
      logEvent("tengu_managed_settings_security_dialog_accepted", {});
      logFeatureOk("remote_managed_settings_security_check");
    } else if (t === "rejected") logEvent("tengu_managed_settings_security_dialog_rejected", {});
    e.settle(t);
  }
  startupConsentRelease = null;
  fireStartupConsentRelease() {
    let startupConsentRelease = this.startupConsentRelease;
    if (startupConsentRelease) {
      this.startupConsentRelease = null;
      startupConsentRelease();
    }
  }
  consentNeededRelease = null;
  async fireConsentNeededRelease() {
    let consentNeededRelease = this.consentNeededRelease;
    if (consentNeededRelease) {
      this.consentNeededRelease = null;
      await consentNeededRelease();
    }
  }
  consentHandoffHolds = new Set();
  consentHandoffSignal = createSignal();
  consentHandoffRevealActive = false;
}
//@ chunk-cjtj3nae.js:2520-2543 placement
var securityDialogCoordinatorSlots = new HostScoped(() => new SecurityDialogCoordinator());
//@ chunk-cjtj3nae.js:2543-2578 placement
function currentSecurityCoordinator() {
  return securityDialogCoordinatorSlots.of(getRootSession().host);
}
//@ chunk-cjtj3nae.js:2578-2636 placement
function isSecuritySettingsDialogPending() {
  return getSecondRootError().pendingStandaloneRender !== null;
}
//@ chunk-cjtj3nae.js:2636-2689 placement
function unansweredSecuritySettingsDialog() {
  return currentSecurityCoordinator().standaloneDialogUnanswered;
}
//@ chunk-cjtj3nae.js:2689-2729 placement
function rootDrawnDialogPromise() {
  return currentSecurityCoordinator().rootDrawnDialog;
}
//@ chunk-cjtj3nae.js:2729-2831 placement
function pendingPreReplSecurityDialog() {
  let pendingStandaloneRender = getSecondRootError().pendingStandaloneRender;
  if (pendingStandaloneRender !== null)
    return pendingStandaloneRender.then(
      () => {},
      () => {},
    );
  return rootDrawnDialogPromise();
}
//@ chunk-cjtj3nae.js:2831-2872 placement
function setSecurityDialogRequester(e) {
  currentSecurityCoordinator().registerRequester(e);
}
//@ chunk-cjtj3nae.js:2872-2997 placement
function armStartupConsentRelease(e) {
  let t = currentSecurityCoordinator();
  t.startupConsentRelease = e;
  return () => {
    if (t.startupConsentRelease === e) t.startupConsentRelease = null;
  };
}
//@ chunk-cjtj3nae.js:2997-3257 placement
function acquireConsentHandoffHold() {
  let e = currentSecurityCoordinator();
  let t = Symbol("consent-handoff-hold");
  e.consentHandoffHolds.add(t);
  if (e.consentHandoffHolds.size === 1) e.consentHandoffSignal.emit();
  return () => {
    if (e.consentHandoffHolds.delete(t) && e.consentHandoffHolds.size === 0) e.consentHandoffSignal.emit();
  };
}
//@ chunk-cjtj3nae.js:3257-3310 placement
function isConsentHandoffPending() {
  return currentSecurityCoordinator().consentHandoffHolds.size > 0;
}
//@ chunk-cjtj3nae.js:3310-3363 placement
function isConsentHandoffReveal() {
  return currentSecurityCoordinator().consentHandoffRevealActive;
}
//@ chunk-cjtj3nae.js:3363-3424 placement
function subscribeConsentHandoffPending(e) {
  return currentSecurityCoordinator().consentHandoffSignal.subscribe(e);
}
//@ chunk-cjtj3nae.js:3424-3546 placement
function armConsentNeededRelease(e) {
  let t = currentSecurityCoordinator();
  t.consentNeededRelease = e;
  return () => {
    if (t.consentNeededRelease === e) t.consentNeededRelease = null;
  };
}
//@ chunk-cjtj3nae.js:3546-3591 placement
function declareNoConsentSurface() {
  currentSecurityCoordinator().noConsentSurface = true;
  dropRemoteManagedSettingsConsentDeferral();
}
//@ chunk-cjtj3nae.js:3591-3644 placement
function declareStopsWhenApprovalCannotBeAsked() {
  currentSecurityCoordinator().stopsWhenApprovalCannotBeAsked = true;
}
//@ chunk-cjtj3nae.js:3644-3687 placement
function hasDeclaredNoConsentSurface() {
  return currentSecurityCoordinator().noConsentSurface;
}
//@ chunk-cjtj3nae.js:3687-3888 placement
/**
 * 等待安全对话框请求者
 */
async function waitForDialogRequester() {
  let e = currentSecurityCoordinator();
  let t;
  let promise = new Promise((resolve) => {
    t = resolve;
    e.addWaiter(resolve);
  });
  let o = await withTimeout(
    promise,
    SECURITY_DIALOG_SETTLE_MS,
    "managed-settings security dialog requester wait timed out",
  ).catch(() => null);
  if (o === null) e.dropWaiter(t);
  return o;
}
//@ chunk-cjtj3nae.js:3888-4115 placement
/**
 * 等待请求者并审阅托管设置
 */
async function reviewWithRequester(e, t, s) {
  let o = currentSecurityCoordinator();
  let consentHandoffHold = acquireConsentHandoffHold();
  try {
    for (;;) {
      await untilKeyboardRests();
      if (o.replRequester) return await o.review(o.replRequester, e, t, s);
      if (!getSecondRootError().has(process.stdout) || (await waitForDialogRequester()) === null)
        return "deferred_no_consent_surface";
    }
  } finally {
    consentHandoffHold();
  }
}
//@ chunk-cjtj3nae.js:4115-6020 placement
/**
 * 托管设置安全检查：需要时弹出确认对话框，拒绝则退出；无交互界面时延后或按策略处理。
 */
async function checkManagedSettingsSecurity(e, code, showSecurityDialog, remoteManagedSettingsSigned) {
  if (!code || !hasDangerousManagedSettings(summarizeManagedSettingsRisk(code))) return "no_check_needed";
  if (!managedSettingsNeedReconsent(e, code)) return "no_check_needed";
  let n = currentSecurityCoordinator();
  if (!isInteractiveSettingsHost())
    return n.noConsentSurface ? "deferred_no_consent_surface" : "deferred_non_interactive";
  let l = e.source === "consented_payload" ? e.settings : e.consentedPayload;
  if (n.replRequester)
    if (n.consentNeededRelease) {
      let i = null;
      try {
        i = acquireConsentHandoffHold();
        await n.fireConsentNeededRelease();
        let replRequester = n.replRequester;
        if (replRequester) {
          n.consentHandoffRevealActive = true;
          return await n.review(replRequester, code, l, remoteManagedSettingsSigned);
        }
        if (getSecondRootError().has(process.stdout)) {
          let h = await waitForDialogRequester();
          if (h) {
            n.consentHandoffRevealActive = true;
            return await n.review(h, code, l, remoteManagedSettingsSigned);
          }
        }
        return "deferred_no_consent_surface";
      } finally {
        n.consentHandoffRevealActive = false;
        i?.();
      }
    } else if (wasEarlyInputFieldOpened()) return reviewWithRequester(code, l, remoteManagedSettingsSigned);
    else return n.review(n.replRequester, code, l, remoteManagedSettingsSigned);
  if (n.noConsentSurface) return "deferred_no_consent_surface";
  let secondRootError = getSecondRootError();
  if (secondRootError.has(process.stdout)) {
    n.fireStartupConsentRelease();
    let i;
    do i = await waitForDialogRequester();
    while (
      i === null &&
      (hasEarlyInputField() || msSinceEarlyInputFieldClosed() < SECURITY_DIALOG_SETTLE_MS)
    );
    if (i)
      return wasEarlyInputFieldOpened()
        ? reviewWithRequester(code, l, remoteManagedSettingsSigned)
        : n.review(i, code, l, remoteManagedSettingsSigned);
    if (wasEarlyInputFieldOpened()) return "deferred_no_consent_surface";
  }
  if (
    showSecurityDialog === undefined ||
    n.noConsentSurface ||
    (n.stopsWhenApprovalCannotBeAsked && stdinOverrideCache.get().kind === "unavailable")
  ) {
    if (!n.noConsentSurface) n.standaloneDialogUnanswered = "not_asked";
    return "deferred_no_consent_surface";
  }
  if (canReviewSilently(n, remoteManagedSettingsSigned)) {
    n.standaloneDialogUnanswered = null;
    return "first_party_silent";
  }
  logEvent("tengu_managed_settings_security_dialog_shown", {});
  let d = secondRootError.has(process.stdout);
  let f = showSecurityDialog(code, d, l);
  if (!d) secondRootError.claimForStandaloneRender(f);
  else {
    let i = f.then(
      () => {},
      () => {},
    );
    n.rootDrawnDialog = i;
    i.then(() => {
      if (n.rootDrawnDialog === i) n.rootDrawnDialog = null;
    });
  }
  let c;
  try {
    c = await f;
    n.standaloneDialogUnanswered = null;
  } catch (error) {
    n.standaloneDialogUnanswered = "closed_unanswered";
    logFeatureBad("remote_managed_settings_security_check", "dialog_unavailable");
    throw error;
  }
  logEvent(
    c === "approved"
      ? "tengu_managed_settings_security_dialog_accepted"
      : "tengu_managed_settings_security_dialog_rejected",
    {},
  );
  if (c === "approved") logFeatureOk("remote_managed_settings_security_check");
  return c;
}
//@ chunk-cjtj3nae.js:6020-6277 placement
var REJECTED_EXIT_MESSAGE = "Managed settings were not approved; exiting without applying them.";
var APPROVAL_NOT_ASKED_EXIT_MESSAGE =
  "Your organization's managed settings need your approval, which couldn't be asked for here. Run `claude` in a terminal and approve them, then run this command again.";
var managedSettingsConsentRejected = createSignal();
//@ chunk-cjtj3nae.js:6277-6652 placement
function handleSecurityCheckResult(result) {
  switch (result) {
    case "rejected":
      if (process.stderr.isTTY && !isShuttingDown()) {
        latchTerminalShutdown();
        let t = wasEarlyInputFieldOpened() ? promptInputValue(getRootSession()).trim() : "";
        emitExitMessage(
          t === ""
            ? REJECTED_EXIT_MESSAGE
            : `${REJECTED_EXIT_MESSAGE}

Your message was not sent:
${t}`,
        );
      }
      if (!isShuttingDown()) managedSettingsConsentRejected.emit();
      gracefulShutdownSync(1);
      return false;
    case "deferred_no_consent_surface":
      return false;
    case "superseded":
      return false;
    case "approved":
    case "first_party_silent":
    case "no_check_needed":
    case "deferred_non_interactive":
      return true;
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
