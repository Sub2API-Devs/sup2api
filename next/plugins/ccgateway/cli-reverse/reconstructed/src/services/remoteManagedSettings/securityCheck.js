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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-cjtj3nae.js:731-742 placement
var SECURITY_DIALOG_SETTLE_MS = 5000;
//@ chunk-cjtj3nae.js:742-815 placement
function canReviewSilently(coordinator, canSkip) {
  return (
    canSkip !== undefined &&
    !coordinator.hasOpenReview() &&
    pendingPreReplSecurityDialog() === null &&
    canSkip()
  );
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
  settle(outcome) {
    this.updates.done();
    this.owner(outcome);
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
  registerRequester(requester) {
    this.replRequester = requester;
    if (requester && this.requesterWaiters.length > 0) {
      let requesterWaiters = this.requesterWaiters;
      this.requesterWaiters = [];
      for (let requesterWaiter of requesterWaiters) requesterWaiter(requester);
    }
  }
  addWaiter(waiter) {
    this.requesterWaiters.push(waiter);
  }
  dropWaiter(waiter) {
    this.requesterWaiters = this.requesterWaiters.filter((requesterWaiter) => requesterWaiter !== waiter);
  }
  review(askDialog, settings, baseline, canSkip) {
    return new Promise((resolve) => {
      if (this.pendingReview) {
        this.pendingReview.supersede(settings, baseline, resolve);
        return;
      }
      if (canReviewSilently(this, canSkip)) {
        resolve("first_party_silent");
        return;
      }
      let supersession = new SecurityDialogSupersession(resolve);
      this.pendingReview = supersession;
      logEvent("tengu_managed_settings_security_dialog_shown", {});
      let dialogResult;
      try {
        dialogResult = askDialog(settings, baseline, supersession.updates);
      } catch {
        dialogResult = Promise.resolve("deferred_no_consent_surface");
      }
      dialogResult.then(
        (outcome) => this.close(supersession, outcome),
        () => this.close(supersession, "deferred_no_consent_surface"),
      );
    });
  }
  hasOpenReview() {
    return this.pendingReview !== null;
  }
  close(review, outcome) {
    this.pendingReview = null;
    if (outcome === "approved") {
      logEvent("tengu_managed_settings_security_dialog_accepted", {});
      logFeatureOk("remote_managed_settings_security_check");
    } else if (outcome === "rejected") logEvent("tengu_managed_settings_security_dialog_rejected", {});
    review.settle(outcome);
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
var securityDialogCoordinatorSlots; // deferred: uses SecurityDialogCoordinator of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-cjtj3nae.js:2520", () => {
  securityDialogCoordinatorSlots = new HostScoped(() => new SecurityDialogCoordinator());
});
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
function setSecurityDialogRequester(requester) {
  currentSecurityCoordinator().registerRequester(requester);
}
//@ chunk-cjtj3nae.js:2872-2997 placement
function armStartupConsentRelease(release) {
  let coordinator = currentSecurityCoordinator();
  coordinator.startupConsentRelease = release;
  return () => {
    if (coordinator.startupConsentRelease === release) coordinator.startupConsentRelease = null;
  };
}
//@ chunk-cjtj3nae.js:2997-3257 placement
function acquireConsentHandoffHold() {
  let coordinator = currentSecurityCoordinator();
  let hold = Symbol("consent-handoff-hold");
  coordinator.consentHandoffHolds.add(hold);
  if (coordinator.consentHandoffHolds.size === 1) coordinator.consentHandoffSignal.emit();
  return () => {
    if (coordinator.consentHandoffHolds.delete(hold) && coordinator.consentHandoffHolds.size === 0)
      coordinator.consentHandoffSignal.emit();
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
function subscribeConsentHandoffPending(listener) {
  return currentSecurityCoordinator().consentHandoffSignal.subscribe(listener);
}
//@ chunk-cjtj3nae.js:3424-3546 placement
function armConsentNeededRelease(release) {
  let coordinator = currentSecurityCoordinator();
  coordinator.consentNeededRelease = release;
  return () => {
    if (coordinator.consentNeededRelease === release) coordinator.consentNeededRelease = null;
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
  let coordinator = currentSecurityCoordinator();
  let resolveWaiter;
  let promise = new Promise((resolve) => {
    resolveWaiter = resolve;
    coordinator.addWaiter(resolve);
  });
  let requester = await withTimeout(
    promise,
    SECURITY_DIALOG_SETTLE_MS,
    "managed-settings security dialog requester wait timed out",
  ).catch(() => null);
  if (requester === null) coordinator.dropWaiter(resolveWaiter);
  return requester;
}
//@ chunk-cjtj3nae.js:3888-4115 placement
/**
 * 等待请求者并审阅托管设置
 */
async function reviewWithRequester(settings, baseline, signed) {
  let coordinator = currentSecurityCoordinator();
  let consentHandoffHold = acquireConsentHandoffHold();
  try {
    for (;;) {
      await untilKeyboardRests();
      if (coordinator.replRequester)
        return await coordinator.review(coordinator.replRequester, settings, baseline, signed);
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
async function checkManagedSettingsSecurity(
  baseline,
  settings,
  showSecurityDialog,
  remoteManagedSettingsSigned,
) {
  if (!settings || !hasDangerousManagedSettings(summarizeManagedSettingsRisk(settings)))
    return "no_check_needed";
  if (!managedSettingsNeedReconsent(baseline, settings)) return "no_check_needed";
  let coordinator = currentSecurityCoordinator();
  if (!isInteractiveSettingsHost())
    return coordinator.noConsentSurface ? "deferred_no_consent_surface" : "deferred_non_interactive";
  let consentedSettings =
    baseline.source === "consented_payload" ? baseline.settings : baseline.consentedPayload;
  if (coordinator.replRequester)
    if (coordinator.consentNeededRelease) {
      let hold = null;
      try {
        hold = acquireConsentHandoffHold();
        await coordinator.fireConsentNeededRelease();
        let replRequester = coordinator.replRequester;
        if (replRequester) {
          coordinator.consentHandoffRevealActive = true;
          return await coordinator.review(
            replRequester,
            settings,
            consentedSettings,
            remoteManagedSettingsSigned,
          );
        }
        if (getSecondRootError().has(process.stdout)) {
          let requester = await waitForDialogRequester();
          if (requester) {
            coordinator.consentHandoffRevealActive = true;
            return await coordinator.review(
              requester,
              settings,
              consentedSettings,
              remoteManagedSettingsSigned,
            );
          }
        }
        return "deferred_no_consent_surface";
      } finally {
        coordinator.consentHandoffRevealActive = false;
        hold?.();
      }
    } else if (wasEarlyInputFieldOpened())
      return reviewWithRequester(settings, consentedSettings, remoteManagedSettingsSigned);
    else
      return coordinator.review(
        coordinator.replRequester,
        settings,
        consentedSettings,
        remoteManagedSettingsSigned,
      );
  if (coordinator.noConsentSurface) return "deferred_no_consent_surface";
  let secondRootError = getSecondRootError();
  if (secondRootError.has(process.stdout)) {
    coordinator.fireStartupConsentRelease();
    let requester;
    do requester = await waitForDialogRequester();
    while (
      requester === null &&
      (hasEarlyInputField() || msSinceEarlyInputFieldClosed() < SECURITY_DIALOG_SETTLE_MS)
    );
    if (requester)
      return wasEarlyInputFieldOpened()
        ? reviewWithRequester(settings, consentedSettings, remoteManagedSettingsSigned)
        : coordinator.review(requester, settings, consentedSettings, remoteManagedSettingsSigned);
    if (wasEarlyInputFieldOpened()) return "deferred_no_consent_surface";
  }
  if (
    showSecurityDialog === undefined ||
    coordinator.noConsentSurface ||
    (coordinator.stopsWhenApprovalCannotBeAsked && stdinOverrideCache.get().kind === "unavailable")
  ) {
    if (!coordinator.noConsentSurface) coordinator.standaloneDialogUnanswered = "not_asked";
    return "deferred_no_consent_surface";
  }
  if (canReviewSilently(coordinator, remoteManagedSettingsSigned)) {
    coordinator.standaloneDialogUnanswered = null;
    return "first_party_silent";
  }
  logEvent("tengu_managed_settings_security_dialog_shown", {});
  let rootDrawn = secondRootError.has(process.stdout);
  let dialog = showSecurityDialog(settings, rootDrawn, consentedSettings);
  if (!rootDrawn) secondRootError.claimForStandaloneRender(dialog);
  else {
    let dialogDone = dialog.then(
      () => {},
      () => {},
    );
    coordinator.rootDrawnDialog = dialogDone;
    dialogDone.then(() => {
      if (coordinator.rootDrawnDialog === dialogDone) coordinator.rootDrawnDialog = null;
    });
  }
  let outcome;
  try {
    outcome = await dialog;
    coordinator.standaloneDialogUnanswered = null;
  } catch (error) {
    coordinator.standaloneDialogUnanswered = "closed_unanswered";
    logFeatureBad("remote_managed_settings_security_check", "dialog_unavailable");
    throw error;
  }
  logEvent(
    outcome === "approved"
      ? "tengu_managed_settings_security_dialog_accepted"
      : "tengu_managed_settings_security_dialog_rejected",
    {},
  );
  if (outcome === "approved") logFeatureOk("remote_managed_settings_security_check");
  return outcome;
}
//@ chunk-cjtj3nae.js:6020-6277 placement
var REJECTED_EXIT_MESSAGE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var APPROVAL_NOT_ASKED_EXIT_MESSAGE;
var managedSettingsConsentRejected;
deferInit("chunk-cjtj3nae.js:6020", () => {
  REJECTED_EXIT_MESSAGE = "Managed settings were not approved; exiting without applying them.";
  APPROVAL_NOT_ASKED_EXIT_MESSAGE =
    "Your organization's managed settings need your approval, which couldn't be asked for here. Run `claude` in a terminal and approve them, then run this command again.";
  managedSettingsConsentRejected = createSignal();
});
//@ chunk-cjtj3nae.js:6277-6652 placement
function handleSecurityCheckResult(result) {
  switch (result) {
    case "rejected":
      if (process.stderr.isTTY && !isShuttingDown()) {
        latchTerminalShutdown();
        let typedMessage = wasEarlyInputFieldOpened() ? promptInputValue(getRootSession()).trim() : "";
        emitExitMessage(
          typedMessage === ""
            ? REJECTED_EXIT_MESSAGE
            : `${REJECTED_EXIT_MESSAGE}

Your message was not sent:
${typedMessage}`,
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
