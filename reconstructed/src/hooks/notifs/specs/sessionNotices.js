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
import { P } from "../../../../vendor/react/cjs/react.production.js";
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
  TENGU_BINARY_MUSIC,
  autocompactOfferConfig,
  describeOfferSkip,
  MIN_OFFER_DIALOG_ROWS,
  resolveOfferOrder,
  showAutocompactOffer,
} from "../../../services/compact/autocompactOffer.js";
import {
  readAutoCompactOffer,
  markAutoCompactOfferEligibleLogged,
} from "../../../utils/permissions/permissionSetup.js";
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
  P(() => {
    return;
  }, [session, addNotification, removeNotification]);
}
//@ chunk-18hwfzwa.js:1751883-1752682 placement
var advisorToolNoticeSpec = {
  id: "advisor-tool",
  deps: (h) => [h.advisorModel, h.mainLoopModel, h.addNotification, h.growthBookVersion],
  setup() {
    let h;
    return ({ addNotification, advisorModel, mainLoopModel }) => {
      if (getIsRemoteMode() || !isAdvisorToolEnabled()) {
        h = undefined;
        return;
      }
      if (!advisorModel || !baseModelSupportsAdvisor(mainLoopModel)) {
        h = undefined;
        return;
      }
      if (!canUseAsAdvisor(advisorModel)) {
        if (isAdvisorPendingConsent(advisorModel)) {
          if (h !== "consent") {
            h = "consent";
            addNotification({
              key: "fable-advisor-consent",
              kind: "event",
              text: `${getAdvisorCreditsNotice(advisorModel)} Run ${getAdvisorModelSwitchCommand(advisorModel)} to review and enable.`,
              priority: "high",
            });
          }
          return;
        }
        h = undefined;
        return;
      }
      let ee = canAdviseModel(mainLoopModel, advisorModel) ? "on" : "pairing";
      if (h === ee) return;
      h = ee;
      addNotification({
        key: "advisor-experimental",
        kind: "event",
        text:
          ee === "on"
            ? "Advisor Tool (experimental) is on and may use more tokens \xB7 /advisor"
            : "Advisor will not activate on the main model (advisor is less capable); subagents may still use it and may use more tokens \xB7 /advisor",
        priority: "medium",
        fold: (ke, Re) => Re,
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
  deps: (h) => [
    h.transcript.getSnapshot(),
    h.turnAtRender.isLoading,
    h.turnAtRender.lastTurnEnd,
    h.initialMessage,
    h.queuedCommandCount,
    h.isRemoteSession,
    h.disabled,
    h.replBridgeActive,
    h.mainLoopModel,
    h.settings,
    h.growthBookVersion,
    h.storageV5,
    h.requestDialog,
    h.dialogStore,
  ],
  setup() {
    let h;
    let x;
    let D = new Set();
    let L;
    let ee = new Set();
    let ke = new Set();
    let Re = null;
    let Be = new Set();
    let He = new Set();
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
      po,
    ) => {
      let ao = {
        getLiveModel: () => po().mainLoopModel,
        getLiveWindow: () => store.getState().autoCompactWindow,
        getLiveContextTokens: () => getLiveContextTokens(po()),
      };
      if (Re !== null && (replBridgeActive || !makeAutocompactOfferPayload(Re, ao)))
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
      let snapshot = transcript.getSnapshot();
      let lastIndex = snapshot.findLastIndex((Mn) => Mn.type === "assistant");
      let uuid = snapshot[lastIndex]?.uuid;
      if (L === undefined || L.reply !== uuid)
        L = {
          reply: uuid,
          model: mainLoopModel,
        };
      else if (L.model !== mainLoopModel) return;
      let Ro = autocompactOfferEligibility({
        model: mainLoopModel,
        configuredWindow: store.getState().autoCompactWindow,
      });
      if (Ro === undefined) return;
      let { accountUuid, modelKey, windowTokens } = Ro;
      let autoCompactOffer = readAutoCompactOffer(getGlobalConfig(), accountUuid, modelKey);
      if (
        autoCompactOffer?.isAnswered ||
        !hasFreshGrowthBookFeatures() ||
        getGrowthBookClientIdentity().accountUuid !== accountUuid
      )
        return;
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BINARY_MUSIC, {});
      if (featureValue_CACHED_MAY_BE_STALE !== h) {
        h = featureValue_CACHED_MAY_BE_STALE;
        x = autocompactOfferConfig(featureValue_CACHED_MAY_BE_STALE);
      }
      let No = x;
      if (No === undefined || liveContextTokens < No.triggerTokens) return;
      let now = Date.now();
      let Yo = `${accountUuid}:${modelKey}`;
      let kn = describeOfferSkip(Ro, No.defaultTokens);
      if (autoCompactOffer === undefined && !D.has(Yo)) {
        D.add(Yo);
        logEvent("tengu_autocompact_offer_eligible", {
          arm: fromEnum(No.arm),
          window_model: telemetrySafeModelName(modelKey),
          surface: lit_2("cli"),
          context_tokens: liveContextTokens,
          trigger_tokens: No.triggerTokens,
          default_tokens: No.defaultTokens,
          window_tokens: windowTokens,
          current_setting: fromEnum(Ro.currentSetting),
          offerable: kn === undefined,
          not_offered_reason: fromEnumOpt(kn),
          async_on: isPrecomputedCompactEnabled(),
        });
      }
      if (autoCompactOffer === undefined)
        saveGlobalConfig(
          (Mn) => markAutoCompactOfferEligibleLogged(Mn, accountUuid, modelKey, now),
          storageV5,
        );
      let { currentSetting } = Ro;
      if (
        No.arm === "control" ||
        kn !== undefined ||
        (currentSetting !== "auto" &&
          currentSetting !== "own_per_model" &&
          currentSetting !== "own_top_level") ||
        ee.has(Yo) ||
        (autoCompactOffer?.escCount ?? 0) >= No.maxAsks ||
        Re !== null
      )
        return;
      if (Be.has(uuid)) return;
      Be.add(uuid);
      if (ke.has(Yo) && !isUserDrivenHere(snapshot.slice(0, lastIndex + 1))) return;
      let bn =
        terminalSize.rows < MIN_OFFER_DIALOG_ROWS && !isScreenReaderMode()
          ? "terminal_too_short"
          : !isTranscriptAtBottom()
            ? "scrolled_away"
            : undefined;
      if (bn !== undefined) {
        if (!He.has(bn)) {
          He.add(bn);
          logFeatureSad("autocompact_offer", bn);
        }
        return;
      }
      let modelContextInfo = getModelContextInfo(mainLoopModel);
      let hn = {
        order: resolveOfferOrder(No.order, accountUuid),
        accountUuid,
        modelKey,
        sizes: No.sizes
          .filter((siz) => siz < windowTokens)
          .map((siz) => ({
            tokens: siz,
            firesAt: getAutoCompactThresholdTokens(modelContextInfo, siz),
          })),
        defaultTokens: No.defaultTokens,
        triggerTokens: No.triggerTokens,
        contextTokens: liveContextTokens,
        windowTokens,
        currentSetting,
        askNumber: (autoCompactOffer?.escCount ?? 0) + 1,
      };
      Re = hn;
      showAutocompactOffer(requestDialog, hn, {
        ...ao,
        applyFlagSettings: (Mn) => applySessionSettingsPatch(Mn, store.setState),
        appendSystemLine: (Mn, Xo) =>
          transcript.apply({
            type: "append",
            messages: [createSystemMessage(Mn, Xo)],
          }),
        storageV5,
      })
        .then((Mn) => {
          if (Mn === "withdrawn") ke.add(Yo);
          else if (Mn !== "cancelled") ee.add(Yo);
        })
        .catch((error) => {
          ee.add(Yo);
          logError(error);
        })
        .finally(() => {
          Re = null;
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
  deps: (h) => [h.permissionMode, h.transcript, h.clock, h.storageV5, h.store],
  setup() {
    let h = false;
    return ({ permissionMode, transcript, clock, storageV5, store }) => {
      if (permissionMode !== "auto") return;
      if (h) return;
      return clock.setTimeout(() => {
        (async () => {
          let { isAutoModeFromFallback } = await import("./chunk-dbas1xsr.js");
          if (isAutoModeFromFallback()) {
            h = true;
            return;
          }
          h = true;
          if (isBgSession()) return;
          let { shouldShowAutoModeEntryWarning } = await import("./chunk-vrb83jkc.js");
          if (shouldShowAutoModeEntryWarning()) {
            let { getAutoModeDescription } = await import("./chunk-w1graenk.js");
            await saveGlobalConfig(
              (We) =>
                We.hasSeenAutoModeEntryWarning
                  ? We
                  : {
                      ...We,
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
  deps: (h) => [h.addNotification, h.transcript, h.session, h.isRemoteSession],
  setup() {
    let h = false;
    return ({ addNotification, transcript, session, isRemoteSession, credentials }) => {
      return;
    };
  },
};
//@ chunk-18hwfzwa.js:1785355-1785931 placement
var replMountLogNoticeSpec = {
  id: "repl-mount-log",
  deps: (h) => [h.disabled],
  setup() {
    return ({ disabled }) => {
      logForDebugging(`[REPL:mount] REPL mounted, disabled=${disabled}`);
      return () => logForDebugging("[REPL:unmount] REPL unmounting");
    };
  },
};
var dialogWaitingInTranscriptNoticeSpec = {
  id: "dialog-waiting-in-transcript",
  deps: (h) => [h.screen, h.hasOpenDialog],
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
      let D = setImmediate(() => {
        reportPromptIdle();
      });
      return () => {
        clearImmediate(D);
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
  deps: (h) => [h.store],
  setup() {
    let h = false;
    return ({ store }) => {
      if (getIsRemoteMode() || h) return;
      h = true;
      if (!useCanSwitchToExistingSubscription() || isPromoOffersBlocked()) return;
      getExistingClaudeSubscription()
        .then((existingClaudeSubscription) => {
          if (existingClaudeSubscription === null) return;
          store.setState((L) => {
            if (L.setupIssues.existingClaudeSubscription === existingClaudeSubscription) return L;
            return {
              ...L,
              setupIssues: {
                ...L.setupIssues,
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
  deps: (h) => [h.settings, h.addNotification, h.clock],
  setup() {
    let h = null;
    let x = false;
    let D = null;
    let L = null;
    let ee = () => {};
    let ke = null;
    let Re = null;
    function Be(We, ze) {
      return false;
    }
    function He() {}
    return {
      effect: (We) => {},
      dispose: () => {
        Re?.stop();
        Re = null;
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
