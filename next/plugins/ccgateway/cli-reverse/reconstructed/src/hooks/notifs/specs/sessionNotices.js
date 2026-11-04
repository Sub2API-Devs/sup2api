/**
 * hooks/notifs/specs/sessionNotices.ts
 *
 * 2.1.316 新增。启动通知：会话类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (14)
 * attribution: placement 14
 */
import { useEffect } from "../../../../vendor/react/cjs/react.production.js";
import { getIsRemoteMode } from "../../../bootstrap/state.js";
import {
  isAdvisorToolEnabled,
  baseModelSupportsAdvisor,
  canUseAsAdvisor,
  isAdvisorPendingConsent,
  getAdvisorCreditsNotice,
  getAdvisorModelSwitchCommand,
  canAdviseModel,
} from "../../../utils/advisor.js";
import {
  makeAutocompactOfferPayload,
  AUTOCOMPACT_OFFER_DIALOG,
  MIN_OFFER_WINDOW_TOKENS,
  autocompactOfferEligibility,
  readAutoCompactOffer,
  TENGU_BINARY_MUSIC,
  autocompactOfferConfig,
  describeOfferSkip,
  markAutoCompactOfferEligibleLogged,
  MIN_OFFER_DIALOG_ROWS,
  resolveOfferOrder,
  showAutocompactOffer,
} from "../../../services/compact/autocompactOffer.js";
import { getGlobalConfig, saveGlobalConfig } from "../../../utils/config.js";
import {
  hasFreshGrowthBookFeatures,
  getGrowthBookClientIdentity,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../../services/analytics/growthbook.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../../../utils/model/telemetryModelName.js";
import { isPrecomputedCompactEnabled } from "../../../services/compact/precomputedCompact.js";
import { isUserDrivenHere } from "../../../utils/turnOrigin.js";
import { isScreenReaderMode } from "../../../utils/accessibility/screenReader.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { getModelContextInfo } from "../../../utils/model/modelContextInfo.js";
import {
  getAutoCompactThresholdTokens,
  estimateTokensWithAnchor,
} from "../../../services/compact/autoCompact.js";
import { applySessionSettingsPatch } from "../../../state/applySessionSettingsPatch.js";
import { createSystemMessage } from "../../../utils/messages.js";
import { logError } from "../../../utils/log.js";
import { messagesSinceCompactBoundary } from "../../../services/projects/threadRows.js";
import { bytesPerTokenForModel } from "../../../utils/model/modelDisplay.js";
import { isBgSession } from "../../../utils/concurrentSessions.js";
import { logForDebugging } from "../../../utils/debug.js";
import { uiSignals } from "../../../state/uiSignals.js";
import { isSessionRestored } from "../../../utils/sessionRestore.js";
import { reportContentPaint, reportPromptIdle } from "../../../utils/conversationRecovery.js";
import {
  useCanSwitchToExistingSubscription,
  getExistingClaudeSubscription,
} from "../useCanSwitchToExistingSubscription.js";
import { isPromoOffersBlocked } from "../../../utils/planTiers.js";
import { getCurrentWorktreeSession } from "../../../utils/worktree.js";

//@ chunk-18hwfzwa.js:1751839-1751883 placement
function noopEffect_2(session, addNotification, removeNotification) {
  useEffect(() => {
    return;
  }, [session, addNotification, removeNotification]);
}
//@ chunk-18hwfzwa.js:1751883-1752682 placement
var advisorToolNoticeSpec = {
  id: "advisor-tool",
  deps: (ctx) => [ctx.advisorModel, ctx.mainLoopModel, ctx.addNotification, ctx.growthBookVersion],
  setup() {
    let cancelled;
    return ({ addNotification, advisorModel, mainLoopModel }) => {
      if (getIsRemoteMode() || !isAdvisorToolEnabled()) {
        cancelled = undefined;
        return;
      }
      if (!advisorModel || !baseModelSupportsAdvisor(mainLoopModel)) {
        cancelled = undefined;
        return;
      }
      if (!canUseAsAdvisor(advisorModel)) {
        if (isAdvisorPendingConsent(advisorModel)) {
          if (cancelled !== "consent") {
            cancelled = "consent";
            addNotification({
              key: "fable-advisor-consent",
              kind: "event",
              text: `${getAdvisorCreditsNotice(advisorModel)} Run ${getAdvisorModelSwitchCommand(advisorModel)} to review and enable.`,
              priority: "high",
            });
          }
          return;
        }
        cancelled = undefined;
        return;
      }
      let pairing = canAdviseModel(mainLoopModel, advisorModel) ? "on" : "pairing";
      if (cancelled === pairing) return;
      cancelled = pairing;
      addNotification({
        key: "advisor-experimental",
        kind: "event",
        text:
          pairing === "on"
            ? "Advisor Tool (experimental) is on and may use more tokens \xB7 /advisor"
            : "Advisor will not activate on the main model (advisor is less capable); subagents may still use it and may use more tokens \xB7 /advisor",
        priority: "medium",
        fold: (acc, value) => value,
      });
    };
  },
};
//@ chunk-18hwfzwa.js:1752682-1752730 placement
var antOrgAuthCheckNoticeSpec = {
  id: "ant-org-auth-check",
  setup: () => noopSessionNotice,
};
//@ chunk-18hwfzwa.js:1752730-1752746 placement
function noopSessionNotice() {}
//@ chunk-18hwfzwa.js:1752746-1755611 placement
/**
 * 会话通知规格：提议开启自动压缩。
 */
var autocompactOfferNoticeSpec = {
  id: "autocompact-offer",
  deps: (ctx) => [
    ctx.transcript.getSnapshot(),
    ctx.turnAtRender.isLoading,
    ctx.turnAtRender.lastTurnEnd,
    ctx.initialMessage,
    ctx.queuedCommandCount,
    ctx.isRemoteSession,
    ctx.disabled,
    ctx.replBridgeActive,
    ctx.mainLoopModel,
    ctx.settings,
    ctx.growthBookVersion,
    ctx.storageV5,
    ctx.requestDialog,
    ctx.dialogStore,
  ],
  setup() {
    let seenOfferKey;
    let lastOffer;
    let loggedKeys = new Set();
    let lastTokens;
    let shownKeys = new Set();
    let pendingKeys = new Set();
    let pendingTimer = null;
    let acceptedKeys = new Set();
    let declinedKeys = new Set();
    return (
      {
        turnAtRender: { isLoading, lastTurnEnd },
        transcript,
        initialMessage,
        queuedCommandCount,
        isRemoteSession,
        disabled,
        replBridgeActive,
        mainLoopModel,
        store,
        storageV5,
        requestDialog,
        dialogStore,
        terminalSize,
        isTranscriptAtBottom,
      },
      snapshot,
    ) => {
      let offerState = {
        getLiveModel: () => snapshot().mainLoopModel,
        getLiveWindow: () => store.getState().autoCompactWindow,
        getLiveContextTokens: () => getLiveContextTokens(snapshot()),
      };
      if (
        pendingTimer !== null &&
        (replBridgeActive || !makeAutocompactOfferPayload(pendingTimer, offerState))
      )
        dialogStore.dismissKind(AUTOCOMPACT_OFFER_DIALOG.kind);
      if (
        isRemoteSession ||
        disabled ||
        isLoading ||
        queuedCommandCount > 0 ||
        replBridgeActive ||
        initialMessage !== null ||
        lastTurnEnd !== "completed"
      )
        return;
      let liveContextTokens = getLiveContextTokens({
        transcript,
        mainLoopModel,
      });
      if (liveContextTokens < MIN_OFFER_WINDOW_TOKENS) return;
      let snapshot_2 = transcript.getSnapshot();
      let lastIndex = snapshot_2.findLastIndex((message) => message.type === "assistant");
      let uuid = snapshot_2[lastIndex]?.uuid;
      if (lastTokens === undefined || lastTokens.reply !== uuid)
        lastTokens = {
          reply: uuid,
          model: mainLoopModel,
        };
      else if (lastTokens.model !== mainLoopModel) return;
      let eligibility = autocompactOfferEligibility({
        model: mainLoopModel,
        configuredWindow: store.getState().autoCompactWindow,
      });
      if (eligibility === undefined) return;
      let { accountUuid, modelKey, windowTokens } = eligibility;
      let autoCompactOffer = readAutoCompactOffer(getGlobalConfig(), accountUuid, modelKey);
      if (
        autoCompactOffer?.isAnswered ||
        !hasFreshGrowthBookFeatures() ||
        getGrowthBookClientIdentity().accountUuid !== accountUuid
      )
        return;
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BINARY_MUSIC, {});
      if (featureValue_CACHED_MAY_BE_STALE !== seenOfferKey) {
        seenOfferKey = featureValue_CACHED_MAY_BE_STALE;
        lastOffer = autocompactOfferConfig(featureValue_CACHED_MAY_BE_STALE);
      }
      let lastTokens_ = lastOffer;
      if (lastTokens_ === undefined || liveContextTokens < lastTokens_.triggerTokens) return;
      let now = Date.now();
      let offerKey = `${accountUuid}:${modelKey}`;
      let skipReason = describeOfferSkip(eligibility, lastTokens_.defaultTokens);
      if (autoCompactOffer === undefined && !loggedKeys.has(offerKey)) {
        loggedKeys.add(offerKey);
        logEvent("tengu_autocompact_offer_eligible", {
          arm: fromEnum(lastTokens_.arm),
          window_model: telemetrySafeModelName(modelKey),
          surface: lit_2("cli"),
          context_tokens: liveContextTokens,
          trigger_tokens: lastTokens_.triggerTokens,
          default_tokens: lastTokens_.defaultTokens,
          window_tokens: windowTokens,
          current_setting: fromEnum(eligibility.currentSetting),
          offerable: skipReason === undefined,
          not_offered_reason: fromEnumOpt(skipReason),
          async_on: isPrecomputedCompactEnabled(),
        });
      }
      if (autoCompactOffer === undefined)
        saveGlobalConfig(
          (key) => markAutoCompactOfferEligibleLogged(key, accountUuid, modelKey, now),
          storageV5,
        );
      let { currentSetting } = eligibility;
      if (
        lastTokens_.arm === "control" ||
        skipReason !== undefined ||
        (currentSetting !== "auto" &&
          currentSetting !== "own_per_model" &&
          currentSetting !== "own_top_level") ||
        shownKeys.has(offerKey) ||
        (autoCompactOffer?.escCount ?? 0) >= lastTokens_.maxAsks ||
        pendingTimer !== null
      )
        return;
      if (acceptedKeys.has(uuid)) return;
      acceptedKeys.add(uuid);
      if (pendingKeys.has(offerKey) && !isUserDrivenHere(snapshot_2.slice(0, lastIndex + 1))) return;
      let notification =
        terminalSize.rows < MIN_OFFER_DIALOG_ROWS && !isScreenReaderMode()
          ? "terminal_too_short"
          : !isTranscriptAtBottom()
            ? "scrolled_away"
            : undefined;
      if (notification !== undefined) {
        if (!declinedKeys.has(notification)) {
          declinedKeys.add(notification);
          logFeatureSad("autocompact_offer", notification);
        }
        return;
      }
      let modelContextInfo = getModelContextInfo(mainLoopModel);
      let spec = {
        order: resolveOfferOrder(lastTokens_.order, accountUuid),
        accountUuid,
        modelKey,
        sizes: lastTokens_.sizes
          .filter((siz) => siz < windowTokens)
          .map((siz) => ({
            tokens: siz,
            firesAt: getAutoCompactThresholdTokens(modelContextInfo, siz),
          })),
        defaultTokens: lastTokens_.defaultTokens,
        triggerTokens: lastTokens_.triggerTokens,
        contextTokens: liveContextTokens,
        windowTokens,
        currentSetting,
        askNumber: (autoCompactOffer?.escCount ?? 0) + 1,
      };
      pendingTimer = spec;
      showAutocompactOffer(requestDialog, spec, {
        ...offerState,
        applyFlagSettings: (patch) => applySessionSettingsPatch(patch, store.setState),
        appendSystemLine: (line, kind) =>
          transcript.apply({
            type: "append",
            messages: [createSystemMessage(line, kind)],
          }),
        storageV5,
      })
        .then((result) => {
          if (result === "withdrawn") pendingKeys.add(offerKey);
          else if (result !== "cancelled") shownKeys.add(offerKey);
        })
        .catch((error) => {
          shownKeys.add(offerKey);
          logError(error);
        })
        .finally(() => {
          pendingTimer = null;
        });
    };
  },
};
//@ chunk-18hwfzwa.js:1755611-1755693 placement
function getLiveContextTokens({ transcript, mainLoopModel }) {
  return estimateTokensWithAnchor(
    messagesSinceCompactBoundary(transcript.getSnapshot()),
    bytesPerTokenForModel(mainLoopModel),
  );
}
//@ chunk-18hwfzwa.js:1755693-1756430 placement
/**
 * 启动通知"auto-mode-entry-warning"：进入 auto 模式（非回退、非后台会话）且需要时，延迟追加一条自动模式说明系统消息并记录已看过。
 */
var AUTO_MODE_WARNING_DELAY_MS = 800;
var autoModeEntryWarningSpec = {
  id: "auto-mode-entry-warning",
  deps: (ctx) => [ctx.permissionMode, ctx.transcript, ctx.clock, ctx.storageV5, ctx.store],
  setup() {
    let cancelled = false;
    return ({ permissionMode, transcript, clock, storageV5, store }) => {
      if (permissionMode !== "auto") return;
      if (cancelled) return;
      return clock.setTimeout(() => {
        (async () => {
          let { isAutoModeFromFallback } = await import("../../../utils/permissions/autoModeState.js");
          if (isAutoModeFromFallback()) {
            cancelled = true;
            return;
          }
          cancelled = true;
          if (isBgSession()) return;
          let { shouldShowAutoModeEntryWarning } =
            await import("../../../components/LogoV2/AutoModeDefaultNotice.js");
          if (shouldShowAutoModeEntryWarning()) {
            let { getAutoModeDescription } =
              await import("../../../utils/permissions/getAutoModeDescription.lazy.js");
            await saveGlobalConfig(
              (mode) =>
                mode.hasSeenAutoModeEntryWarning
                  ? mode
                  : {
                      ...mode,
                      hasSeenAutoModeEntryWarning: true,
                    },
              storageV5,
            );
            logEvent("tengu_auto_mode_entry_warning_shown", {});
            transcript.apply({
              type: "append",
              messages: [createSystemMessage(getAutoModeDescription(), "notice")],
            });
          }
        })();
      }, AUTO_MODE_WARNING_DELAY_MS);
    };
  },
};
//@ chunk-18hwfzwa.js:1785137-1785355 placement
var repoMemoryImportNoticeSpec = {
  id: "repo-memory-import",
  deps: (ctx) => [ctx.addNotification, ctx.transcript, ctx.session, ctx.isRemoteSession],
  setup() {
    let cancelled = false;
    return ({ addNotification, transcript, session, isRemoteSession, credentials }) => {
      return;
    };
  },
};
//@ chunk-18hwfzwa.js:1785355-1785931 placement
var replMountLogNoticeSpec = {
  id: "repl-mount-log",
  deps: (ctx) => [ctx.disabled],
  setup() {
    return ({ disabled }) => {
      logForDebugging(`[REPL:mount] REPL mounted, disabled=${disabled}`);
      return () => logForDebugging("[REPL:unmount] REPL unmounting");
    };
  },
};
var dialogWaitingInTranscriptNoticeSpec = {
  id: "dialog-waiting-in-transcript",
  deps: (ctx) => [ctx.screen, ctx.hasOpenDialog],
  setup() {
    return ({ screen, hasOpenDialog }) => {
      if (screen === "transcript" && hasOpenDialog) {
        logEvent("tengu_dialog_waiting_in_transcript", {});
        uiSignals.autoDenyPresence.emit();
      }
    };
  },
};
var dialogWaitingTranscriptNoticeSpec = {
  id: "attach-paint-marks",
  setup() {
    return ({ session, transcript }) => {
      if (!isSessionRestored(session.host)) return;
      reportContentPaint(transcript.getSnapshot().length);
      let handle = setImmediate(() => {
        reportPromptIdle();
      });
      return () => {
        clearImmediate(handle);
      };
    };
  },
};
//@ chunk-18hwfzwa.js:1787546-1787594 placement
var slackFooterOfferNoticeSpec = {
  id: "slack-footer-offer",
  setup: () => noopSlackFooterOffer,
};
//@ chunk-18hwfzwa.js:1787594-1787616 placement
function noopSlackFooterOffer() {
  return;
}
//@ chunk-18hwfzwa.js:1787616-1787959 placement
var subscriptionSwitchCheckNoticeSpec = {
  id: "subscription-switch-check",
  deps: (ctx) => [ctx.store],
  setup() {
    let cancelled = false;
    return ({ store }) => {
      if (getIsRemoteMode() || cancelled) return;
      cancelled = true;
      if (!useCanSwitchToExistingSubscription() || isPromoOffersBlocked()) return;
      getExistingClaudeSubscription()
        .then((existingClaudeSubscription) => {
          if (existingClaudeSubscription === null) return;
          store.setState((prev) => {
            if (prev.setupIssues.existingClaudeSubscription === existingClaudeSubscription) return prev;
            return {
              ...prev,
              setupIssues: {
                ...prev.setupIssues,
                existingClaudeSubscription,
              },
            };
          });
        })
        .catch(logError);
    };
  },
};
//@ chunk-18hwfzwa.js:1788831-1789070 placement
var wellbeingNoticeSpec = {
  id: "wellbeing",
  deps: (ctx) => [ctx.settings, ctx.addNotification, ctx.clock],
  setup() {
    let lastShownAt = null;
    let shown = false;
    let startedAt = null;
    let lastActiveAt = null;
    let cleanup = () => {};
    let pendingTimer = null;
    let reminder = null;
    function shouldShow(settings, now) {
      return false;
    }
    function reset() {}
    return {
      effect: (ctx) => {},
      dispose: () => {
        reminder?.stop();
        reminder = null;
      },
    };
  },
};
//@ chunk-18hwfzwa.js:1789070-1789557 placement
/**
 * 启动通知规格：创建工作树耗时超过阈值且未使用稀疏检出时，提示设置 worktree.sparsePaths。
 */
var SLOW_WORKTREE_THRESHOLD_MS = 15000;
var worktreeSparseTipSpec = {
  id: "worktree-sparse-tip",
  setup() {
    return ({ transcript }) => {
      let currentWorktreeSession = getCurrentWorktreeSession();
      if (!currentWorktreeSession?.creationDurationMs || currentWorktreeSession.usedSparsePaths) return;
      if (currentWorktreeSession.creationDurationMs < SLOW_WORKTREE_THRESHOLD_MS) return;
      let rounded = Math.round(currentWorktreeSession.creationDurationMs / 1000);
      transcript.apply({
        type: "append",
        messages: [
          createSystemMessage(
            `Worktree creation took ${rounded}s. For large repos, set \`worktree.sparsePaths\` in .claude/settings.json to check out only the directories you need \u2014 e.g. \`{"worktree": {"sparsePaths": ["src", "packages/foo"]}}\`.`,
            "info",
          ),
        ],
      });
    };
  },
};
export {
  noopEffect_2,
  replMountLogNoticeSpec,
  dialogWaitingTranscriptNoticeSpec,
  repoMemoryImportNoticeSpec,
  antOrgAuthCheckNoticeSpec,
  subscriptionSwitchCheckNoticeSpec,
  advisorToolNoticeSpec,
  wellbeingNoticeSpec,
  dialogWaitingInTranscriptNoticeSpec,
  autoModeEntryWarningSpec,
  worktreeSparseTipSpec,
  autocompactOfferNoticeSpec,
  slackFooterOfferNoticeSpec,
};
