/**
 * screens/repl/draftCallouts.ts
 *
 * 草稿保活：轮次开始时盯住问答与审批，必要时撤回草稿并给出提示，附通知 id 与文案（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { createSignal } from "../../utils/signal.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { takeQueuedEarlyInput, takeEarlyInputLaunchWarning } from "../../utils/earlyInput.js";
import { errorMessage } from "../../utils/errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import {
  subscribeManagedSettingsApproval,
  managedSettingsApprovalState,
} from "../../services/remoteManagedSettings/securityCheck.js";
import {
  onLoadCycleEnded,
  hasLoadCycleBegun,
  hasLoadCycleEnded,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isDialogHiddenWhile, topAutoDialog } from "../../state/dialogQueue.js";
import { NOOP_HELPERS } from "../../hooks/useCommandKeybindings.js";
import {
  replMountLogNoticeSpec,
  dialogWaitingTranscriptNoticeSpec,
  repoMemoryImportNoticeSpec,
  antOrgAuthCheckNoticeSpec,
  subscriptionSwitchCheckNoticeSpec,
  advisorToolNoticeSpec,
  workingCopyNotUsedCheck,
  wellbeingNoticeSpec,
  dialogWaitingInTranscriptNoticeSpec,
  autoModeEntryWarningSpec,
  worktreeSparseTipSpec,
  autocompactOfferNoticeSpec,
  slackFooterOfferNoticeSpec,
} from "../../hooks/notifs/specs/sessionNotices.js";
import {
  deviceToolNoticesNoticeSpec,
  chromeExtensionCheckNoticeSpec,
  signinOfferNoticeSpec,
  complianceTaintNoticeSpec,
  complianceTaintNoticeSpec_2,
  costThresholdNoticeSpec,
} from "../../hooks/notifs/specs/environmentNotices.js";
import {
  managedSettingsNoticeNoticeSpec,
  officialMarketplaceCheckNoticeSpec,
  otelHeadersHelperFailedNoticeSpec,
  planModeBypassNoticeSpec,
} from "../../hooks/notifs/specs/settingsNotices.js";
import { installIssuesNoticeSpec } from "../../hooks/notifs/specs/installNotices.js";
import {
  promoCreditCheckSpec,
  projectTelemetryEnvNoticeSpec,
  projectChromeEnvNoticeSpec,
  projectSignInEnvNoticeSpec,
  fableUsageCreditsNoticeSpec,
  proTrialExpiredAutoOpenNoticeSpec,
  promptQueueUseCountNoticeSpec,
} from "../../hooks/notifs/specs/projectEnvNotices.js";
import {
  IDE_DISCONNECTED_NOTICE_SPEC,
  IDE_INSTALL_ERROR_NOTICE_SPEC,
} from "../../hooks/notifs/useIDEStatusIndicator.js";
import { useAutoModeUnavailableNotification } from "../../hooks/notifs/useAutoModeUnavailableNotification.js";
import { usePluginAutoupdateNotification } from "../../hooks/notifs/usePluginAutoupdateNotification.js";
import { SETTINGS_ERRORS_NOTIFICATION_KEY } from "../../hooks/notifs/useSettingsErrors.js";
import {
  sandboxDeniesOnAnotherHostNoticeSpec,
  sessionModelRestrictedNoticeSpec,
} from "../../hooks/notifs/specs/sandboxNotices.js";
import {
  LIMIT_REACHED_NOTICE_SPEC,
  RATE_LIMIT_WARNING_NOTICE_SPEC,
} from "../../hooks/notifs/useRateLimitWarningNotification.js";
import {
  fastModeOrgChangedNoticeSpec,
  OVERAGE_REJECTED_KEY,
  fastModeCooldownNoticeSpec,
  fastModeFallbackRejectedNoticeSpec,
} from "../../hooks/notifs/useFastModeNotification.js";
import { useDeprecationWarningNotification } from "../../hooks/notifs/useDeprecationWarningNotification.js";
import { lspInitializationNoticeSpec } from "../../hooks/notifs/useLspInitializationNotification.js";
import {
  TEAMMATE_LIFECYCLE_NOTICE_SPEC,
  ROLLOUT_COHORT_NOTICE_SPEC,
} from "../../hooks/notifs/startupNotificationSpecs.js";
import { issueFlagNotification } from "../../hooks/useIssueFlagBanner.js";
import {
  remoteControlUpsellNoticeSpec,
  rcLongTurnNudgeNoticeSpec,
  rcPermissionNudgeNoticeSpec,
} from "../../hooks/notifs/specs/remoteControlNudges.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:151052-151486 placement
/**
 * 草稿被扣留时用的通知 id 与三条提示文案：审批未通过、先看警告、有提问在等。
 */
var CLOUD_QUEUED_PROMPT_WAITING = "cloud-queued-prompt-waiting";
var CLOUD_QUEUED_PROMPT_NOT_SENT = "cloud-queued-prompt-not-sent";
var QUEUED_PROMPT_NOTICES = {
  approval_withheld:
    "Your message was not sent because your organization's settings were not approved. Press Enter to send it anyway.",
  launch_warning: "Your message was not sent so you can read the warnings first. Press Enter to send it.",
  question_behind_draft:
    "Your message was not sent because a question is waiting. Send or clear your message to see it.",
};
//@ chunk-czq1j3j2.js:151486-153163 placement
/**
 * 草稿保活观察器：轮次运行中盯住问答、审批与开场提示，在需要时撤回草稿并给出 launch_warning / question_behind_draft 等提示。
 */
class QueuedEarlyPromptController {
  #e;
  #t = createSignal();
  #o = false;
  #n = false;
  #r = null;
  constructor(host) {
    this.#e = host;
  }
  start() {
    let queuedInput = takeQueuedEarlyInput();
    let launchWarning = takeEarlyInputLaunchWarning();
    if (queuedInput !== null && launchWarning) this.#d("launch_warning", queuedInput);
    else if (queuedInput !== null) this.#s(queuedInput);
    return () => this.#p();
  }
  #s(text) {
    let { store, dialogStore, draft, turn, callouts } = this.#e;
    callouts.openingOffersAsked.then(() => {
      this.#o = true;
      this.#t.emit();
    });
    let dependencyWatcher = createDependencyWatcher(
      [
        store,
        dialogStore,
        draft,
        turn,
        this.#t,
        {
          subscribe: subscribeManagedSettingsApproval,
        },
        {
          subscribe: onLoadCycleEnded,
        },
      ],
      () => [this.#l(text), this.#i(), this.#a(), this.#o],
      (hasQuestion, isDraftKept, isReady, isWaiting) => {
        if (this.#n) return;
        if (!hasQuestion) this.#p();
        else if (isDraftKept) {
          this.#p();
          this.#d("question_behind_draft", text);
        } else if (!isReady) {
          this.#p();
          this.#u(text);
        } else if (isWaiting) return this.#c();
        return;
      },
    );
    if (this.#n) dependencyWatcher();
    else this.#r = dependencyWatcher;
  }
  #l(expectedText) {
    let { draft } = this.#e;
    return draft.value === expectedText && draft.mode === "prompt";
  }
  #i() {
    return isDialogHiddenWhile(topAutoDialog(this.#e.dialogStore.getState()), "draft");
  }
  #a() {
    let { store, dialogStore, turn } = this.#e;
    return (
      !this.#o ||
      (hasLoadCycleBegun() && !hasLoadCycleEnded()) ||
      managedSettingsApprovalState() === "asking" ||
      topAutoDialog(dialogStore.getState()) !== null ||
      store.getState().initialMessage !== null ||
      turn.isInitialMessageInFlight
    );
  }
  #c() {
    let { addNotification, removeNotification } = this.#e;
    addNotification({
      key: CLOUD_QUEUED_PROMPT_WAITING,
      kind: "feedback",
      text: "Your message will be sent once start-up finishes. No need to press Enter.",
      priority: "medium",
      pinned: true,
      wrap: true,
    });
    return () => removeNotification(CLOUD_QUEUED_PROMPT_WAITING);
  }
  #d(noticeKey, expectedText) {
    let { draft, addNotification, removeNotification } = this.#e;
    logFeatureSad("ccr_create_prompt_queued", noticeKey);
    addNotification({
      key: CLOUD_QUEUED_PROMPT_NOT_SENT,
      kind: "feedback",
      text: QUEUED_PROMPT_NOTICES[noticeKey],
      priority: "medium",
      pinned: true,
      wrap: true,
    });
    let dependencyWatcher = createDependencyWatcher(
      [draft],
      () => [this.#l(expectedText)],
      (stillMine) => {
        if (!stillMine) this.#p();
      },
    );
    this.#r = () => {
      dependencyWatcher();
      removeNotification(CLOUD_QUEUED_PROMPT_NOT_SENT);
    };
  }
  #u(expectedText) {
    if (managedSettingsApprovalState() === "withheld") {
      this.#d("approval_withheld", expectedText);
      return;
    }
    this.#e
      .submit(expectedText, NOOP_HELPERS, {
        inputModeOverride: "prompt",
      })
      .then(
        () => logFeatureOk("ccr_create_prompt_queued"),
        (error) => {
          logError(error);
          logFeatureBad("ccr_create_prompt_queued", "submit_failed");
        },
      );
  }
  #p() {
    this.#n = true;
    this.#r?.();
    this.#r = null;
  }
}
//@ chunk-czq1j3j2.js:1837532-1837750 placement
var STARTUP_CHECKS; // deferred: uses sessionModelRestrictedNoticeSpec (../../hooks/notifs/specs/sandboxNotices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:1837532", () => {
  STARTUP_CHECKS = [
    replMountLogNoticeSpec,
    dialogWaitingTranscriptNoticeSpec,
    deviceToolNoticesNoticeSpec,
    repoMemoryImportNoticeSpec,
    managedSettingsNoticeNoticeSpec,
    installIssuesNoticeSpec,
    officialMarketplaceCheckNoticeSpec,
    chromeExtensionCheckNoticeSpec,
    antOrgAuthCheckNoticeSpec,
    signinOfferNoticeSpec,
    subscriptionSwitchCheckNoticeSpec,
    promoCreditCheckSpec,
    IDE_DISCONNECTED_NOTICE_SPEC,
    IDE_INSTALL_ERROR_NOTICE_SPEC,
    useAutoModeUnavailableNotification,
    usePluginAutoupdateNotification,
    SETTINGS_ERRORS_NOTIFICATION_KEY,
    sandboxDeniesOnAnotherHostNoticeSpec,
    otelHeadersHelperFailedNoticeSpec,
    projectTelemetryEnvNoticeSpec,
    projectChromeEnvNoticeSpec,
    projectSignInEnvNoticeSpec,
    complianceTaintNoticeSpec,
    complianceTaintNoticeSpec_2,
    fableUsageCreditsNoticeSpec,
    LIMIT_REACHED_NOTICE_SPEC,
    RATE_LIMIT_WARNING_NOTICE_SPEC,
    fastModeOrgChangedNoticeSpec,
    OVERAGE_REJECTED_KEY,
    fastModeCooldownNoticeSpec,
    fastModeFallbackRejectedNoticeSpec,
    advisorToolNoticeSpec,
    useDeprecationWarningNotification,
    sessionModelRestrictedNoticeSpec,
    lspInitializationNoticeSpec,
    TEAMMATE_LIFECYCLE_NOTICE_SPEC,
    workingCopyNotUsedCheck,
    ROLLOUT_COHORT_NOTICE_SPEC,
    wellbeingNoticeSpec,
    issueFlagNotification,
    remoteControlUpsellNoticeSpec,
    rcLongTurnNudgeNoticeSpec,
    rcPermissionNudgeNoticeSpec,
    dialogWaitingInTranscriptNoticeSpec,
    autoModeEntryWarningSpec,
    planModeBypassNoticeSpec,
    worktreeSparseTipSpec,
    costThresholdNoticeSpec,
    autocompactOfferNoticeSpec,
    proTrialExpiredAutoOpenNoticeSpec,
    promptQueueUseCountNoticeSpec,
    slackFooterOfferNoticeSpec,
  ];
});
export { QueuedEarlyPromptController, STARTUP_CHECKS };
