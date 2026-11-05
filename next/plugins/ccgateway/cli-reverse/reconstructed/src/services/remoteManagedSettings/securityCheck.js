/**
 * services/remoteManagedSettings/securityCheck.tsx
 *
 * 远程托管设置含危险设置（会执行命令的 helper、hooks 等）时弹出的同意对话框流程。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/remoteManagedSettings/securityCheck.tsx
 * pieces: chunk-q4vys2qg.js (29)
 * attribution: placement 27, file-local 1, layout 1
 */
import { Stream } from "../../utils/stream.js";
import { createSignal } from "../../utils/signal.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
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

//@ chunk-q4vys2qg.js:731-742 placement
var SECURITY_DIALOG_SETTLE_MS = 5000;
//@ chunk-q4vys2qg.js:742-815 placement
function canReviewSilently(coordinator, canSkip) {
  return (
    canSkip !== undefined &&
    !coordinator.hasOpenReview() &&
    pendingPreReplSecurityDialog() === null &&
    canSkip()
  );
}
//@ chunk-q4vys2qg.js:815-1026 placement
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
//@ chunk-q4vys2qg.js:1026-2579 placement
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
  approvalAsks = 0;
  isApprovalWithheld = false;
  approvalFinished = createSignal();
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
//@ chunk-q4vys2qg.js:2579-2602 placement
var securityDialogCoordinatorSlots; // deferred: uses SecurityDialogCoordinator of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q4vys2qg.js:2579", () => {
  securityDialogCoordinatorSlots = new HostScoped(() => new SecurityDialogCoordinator());
});
//@ chunk-q4vys2qg.js:2602-2637 placement
function currentSecurityCoordinator() {
  return securityDialogCoordinatorSlots.of(getRootSession().host);
}
//@ chunk-q4vys2qg.js:2637-2695 placement
function isSecuritySettingsDialogPending() {
  return getSecondRootError().pendingStandaloneRender !== null;
}
//@ chunk-q4vys2qg.js:2695-2748 placement
function unansweredSecuritySettingsDialog() {
  return currentSecurityCoordinator().standaloneDialogUnanswered;
}
//@ chunk-q4vys2qg.js:2748-2857 placement
/**
 * 托管设置的同意进度状态：asking/withheld/settled。
 */
function managedSettingsApprovalState() {
  let coordinator = currentSecurityCoordinator();
  if (coordinator.approvalAsks > 0) return "asking";
  return coordinator.isApprovalWithheld ? "withheld" : "settled";
}
//@ chunk-q4vys2qg.js:2857-2914 placement
/**
 * 订阅托管设置同意完成的回调。
 */
function subscribeManagedSettingsApproval(listener) {
  return currentSecurityCoordinator().approvalFinished.subscribe(listener);
}
//@ chunk-q4vys2qg.js:2914-2954 placement
function rootDrawnDialogPromise() {
  return currentSecurityCoordinator().rootDrawnDialog;
}
//@ chunk-q4vys2qg.js:2954-3056 placement
function pendingPreReplSecurityDialog() {
  let pendingStandaloneRender = getSecondRootError().pendingStandaloneRender;
  if (pendingStandaloneRender !== null)
    return pendingStandaloneRender.then(
      () => {},
      () => {},
    );
  return rootDrawnDialogPromise();
}
//@ chunk-q4vys2qg.js:3056-3097 placement
function setSecurityDialogRequester(requester) {
  currentSecurityCoordinator().registerRequester(requester);
}
//@ chunk-q4vys2qg.js:3097-3222 placement
function armStartupConsentRelease(release) {
  let coordinator = currentSecurityCoordinator();
  coordinator.startupConsentRelease = release;
  return () => {
    if (coordinator.startupConsentRelease === release) coordinator.startupConsentRelease = null;
  };
}
//@ chunk-q4vys2qg.js:3222-3482 placement
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
//@ chunk-q4vys2qg.js:3482-3535 placement
function isConsentHandoffPending() {
  return currentSecurityCoordinator().consentHandoffHolds.size > 0;
}
//@ chunk-q4vys2qg.js:3535-3588 placement
function isConsentHandoffReveal() {
  return currentSecurityCoordinator().consentHandoffRevealActive;
}
//@ chunk-q4vys2qg.js:3588-3649 placement
function subscribeConsentHandoffPending(listener) {
  return currentSecurityCoordinator().consentHandoffSignal.subscribe(listener);
}
//@ chunk-q4vys2qg.js:3649-3771 placement
function armConsentNeededRelease(release) {
  let coordinator = currentSecurityCoordinator();
  coordinator.consentNeededRelease = release;
  return () => {
    if (coordinator.consentNeededRelease === release) coordinator.consentNeededRelease = null;
  };
}
//@ chunk-q4vys2qg.js:3771-3816 placement
function declareNoConsentSurface() {
  currentSecurityCoordinator().noConsentSurface = true;
  dropRemoteManagedSettingsConsentDeferral();
}
//@ chunk-q4vys2qg.js:3816-3869 placement
function declareStopsWhenApprovalCannotBeAsked() {
  currentSecurityCoordinator().stopsWhenApprovalCannotBeAsked = true;
}
//@ chunk-q4vys2qg.js:3869-3912 placement
function hasDeclaredNoConsentSurface() {
  return currentSecurityCoordinator().noConsentSurface;
}
//@ chunk-q4vys2qg.js:3912-4113 placement
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
//@ chunk-q4vys2qg.js:4113-4340 placement
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
//@ chunk-q4vys2qg.js:4340-4745 placement
/**
 * 托管设置安全检查：需要时弹出确认对话框，拒绝则退出；无交互界面时延后或按策略处理。
 */
async function checkManagedSettingsSecurity(
  consentBaseline,
  settings,
  requiresFirstPartySilent,
  renderDialog,
) {
  let coordinator = currentSecurityCoordinator();
  if (coordinator.approvalAsks === 0) coordinator.isApprovalWithheld = false;
  if (!settings || !hasDangerousManagedSettings(summarizeManagedSettingsRisk(settings)))
    return "no_check_needed";
  if (!managedSettingsNeedReconsent(consentBaseline, settings)) return "no_check_needed";
  if (!isInteractiveSettingsHost())
    return coordinator.noConsentSurface ? "deferred_no_consent_surface" : "deferred_non_interactive";
  coordinator.approvalAsks += 1;
  let isApprovalWithheld = true;
  try {
    let result = await runConsentFlow(
      coordinator,
      consentBaseline,
      settings,
      requiresFirstPartySilent,
      renderDialog,
    );
    isApprovalWithheld = handleSecurityCheckResult_2(result);
    return result;
  } finally {
    coordinator.isApprovalWithheld = isApprovalWithheld;
    coordinator.approvalAsks -= 1;
    coordinator.approvalFinished.emit();
  }
}
//@ chunk-q4vys2qg.js:4745-4947 file-local
function handleSecurityCheckResult_2(result) {
  switch (result) {
    case "approved":
    case "first_party_silent":
    case "superseded":
    case "no_check_needed":
      return false;
    case "rejected":
    case "deferred_no_consent_surface":
    case "deferred_non_interactive":
      return true;
  }
}
//@ chunk-q4vys2qg.js:4947-6669 layout
async function runConsentFlow(
  coordinator,
  isFirstPartySilent,
  settings,
  requiresFirstPartySilent,
  renderDialog,
) {
  let baseline =
    isFirstPartySilent.source === "consented_payload"
      ? isFirstPartySilent.settings
      : isFirstPartySilent.consentedPayload;
  if (coordinator.replRequester)
    if (coordinator.consentNeededRelease) {
      let consentNeededRelease = null;
      try {
        consentNeededRelease = acquireConsentHandoffHold();
        await coordinator.fireConsentNeededRelease();
        let replRequester = coordinator.replRequester;
        if (replRequester) {
          coordinator.consentHandoffRevealActive = true;
          return await coordinator.review(replRequester, settings, baseline, renderDialog);
        }
        if (getSecondRootError().has(process.stdout)) {
          let revealedRequester = await waitForDialogRequester();
          if (revealedRequester) {
            coordinator.consentHandoffRevealActive = true;
            return await coordinator.review(revealedRequester, settings, baseline, renderDialog);
          }
        }
        return "deferred_no_consent_surface";
      } finally {
        coordinator.consentHandoffRevealActive = false;
        consentNeededRelease?.();
      }
    } else if (wasEarlyInputFieldOpened()) return reviewWithRequester(settings, baseline, renderDialog);
    else return coordinator.review(coordinator.replRequester, settings, baseline, renderDialog);
  if (coordinator.noConsentSurface) return "deferred_no_consent_surface";
  let secondRootError = getSecondRootError();
  if (secondRootError.has(process.stdout)) {
    coordinator.fireStartupConsentRelease();
    let startupRequester;
    do startupRequester = await waitForDialogRequester();
    while (
      startupRequester === null &&
      (hasEarlyInputField() || msSinceEarlyInputFieldClosed() < SECURITY_DIALOG_SETTLE_MS)
    );
    if (startupRequester)
      return wasEarlyInputFieldOpened()
        ? reviewWithRequester(settings, baseline, renderDialog)
        : coordinator.review(startupRequester, settings, baseline, renderDialog);
    if (wasEarlyInputFieldOpened()) return "deferred_no_consent_surface";
  }
  if (
    requiresFirstPartySilent === undefined ||
    coordinator.noConsentSurface ||
    (coordinator.stopsWhenApprovalCannotBeAsked && stdinOverrideCache.get().kind === "unavailable")
  ) {
    if (!coordinator.noConsentSurface) coordinator.standaloneDialogUnanswered = "not_asked";
    return "deferred_no_consent_surface";
  }
  if (canReviewSilently(coordinator, renderDialog)) {
    coordinator.standaloneDialogUnanswered = null;
    return "first_party_silent";
  }
  logEvent("tengu_managed_settings_security_dialog_shown", {});
  let hasStdout = secondRootError.has(process.stdout);
  let dialogPromise = requiresFirstPartySilent(settings, hasStdout, baseline);
  if (!hasStdout) secondRootError.claimForStandaloneRender(dialogPromise);
  else {
    let settledDialog = dialogPromise.then(
      () => {},
      () => {},
    );
    coordinator.rootDrawnDialog = settledDialog;
    settledDialog.then(() => {
      if (coordinator.rootDrawnDialog === settledDialog) coordinator.rootDrawnDialog = null;
    });
  }
  let dialogSettled;
  try {
    dialogSettled = await dialogPromise;
    coordinator.standaloneDialogUnanswered = null;
  } catch (error) {
    coordinator.standaloneDialogUnanswered = "closed_unanswered";
    logFeatureBad("remote_managed_settings_security_check", "dialog_unavailable");
    throw error;
  }
  logEvent(
    dialogSettled === "approved"
      ? "tengu_managed_settings_security_dialog_accepted"
      : "tengu_managed_settings_security_dialog_rejected",
    {},
  );
  if (dialogSettled === "approved") logFeatureOk("remote_managed_settings_security_check");
  return dialogSettled;
}
//@ chunk-q4vys2qg.js:6669-6926 placement
var REJECTED_EXIT_MESSAGE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var APPROVAL_NOT_ASKED_EXIT_MESSAGE;
var managedSettingsConsentRejected;
deferInit("chunk-q4vys2qg.js:6669", () => {
  REJECTED_EXIT_MESSAGE = "Managed settings were not approved; exiting without applying them.";
  APPROVAL_NOT_ASKED_EXIT_MESSAGE =
    "Your organization's managed settings need your approval, which couldn't be asked for here. Run `claude` in a terminal and approve them, then run this command again.";
  managedSettingsConsentRejected = createSignal();
});
//@ chunk-q4vys2qg.js:6926-7301 placement
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
  unansweredSecuritySettingsDialog,
  checkManagedSettingsSecurity,
  handleSecurityCheckResult,
  hasDeclaredNoConsentSurface,
  isSecuritySettingsDialogPending,
  armStartupConsentRelease,
  pendingPreReplSecurityDialog,
  setSecurityDialogRequester,
  subscribeManagedSettingsApproval,
  managedSettingsApprovalState,
  isConsentHandoffReveal,
  subscribeConsentHandoffPending,
  isConsentHandoffPending,
  APPROVAL_NOT_ASKED_EXIT_MESSAGE,
  REJECTED_EXIT_MESSAGE,
  armConsentNeededRelease,
  acquireConsentHandoffHold,
};
