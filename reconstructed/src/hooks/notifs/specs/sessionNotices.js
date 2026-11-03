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
  T8,
  autocompactOfferEligibility,
  TENGU_BINARY_MUSIC,
  autocompactOfferConfig,
  fit,
  hit,
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
import { getAutoCompactThresholdTokens, Tp } from "../../../services/compact/autoCompact.js";
import { applySessionSettingsPatch } from "../../../state/applySessionSettingsPatch.js";
import { createSystemMessage } from "../../../utils/messages.js";
import { logError } from "../../../utils/log.js";
import { Us } from "../../../services/projects/threadRows.js";
import { bytesPerTokenForModel } from "../../../utils/model/modelDisplay.js";
import { isBgSession } from "../../../utils/concurrentSessions.js";
import { logForDebugging } from "../../../utils/debug.js";
import { uiSignals } from "../../../state/uiSignals.js";
import { Xj } from "../../../utils/sessionRestore.js";
import { reportContentPaint, reportPromptIdle } from "../../../utils/conversationRecovery.js";
import {
  useCanSwitchToExistingSubscription,
  getExistingClaudeSubscription,
} from "../useCanSwitchToExistingSubscription.js";
import { isPromoOffersBlocked } from "../../../utils/planTiers.js";
import { getCurrentWorktreeSession } from "../../../utils/worktree.js";

//@ chunk-18hwfzwa.js:1751839-1751883 placement
function FEe(h, x, D) {
  P(() => {
    return;
  }, [h, x, D]);
}
//@ chunk-18hwfzwa.js:1751883-1752682 placement
var advisorToolNoticeSpec = {
  id: "advisor-tool",
  deps: (h) => [h.advisorModel, h.mainLoopModel, h.addNotification, h.growthBookVersion],
  setup() {
    let h;
    return ({
      addNotification: addNotification,
      advisorModel: advisorModel,
      mainLoopModel: mainLoopModel,
    }) => {
      if (getIsRemoteMode() || !isAdvisorToolEnabled()) {
        h = void 0;
        return;
      }
      if (!advisorModel || !baseModelSupportsAdvisor(mainLoopModel)) {
        h = void 0;
        return;
      }
      if (!canUseAsAdvisor(advisorModel)) {
        if (isAdvisorPendingConsent(advisorModel)) {
          if (h !== "consent")
            ((h = "consent"),
              addNotification({
                key: "fable-advisor-consent",
                kind: "event",
                text: `${getAdvisorCreditsNotice(advisorModel)} Run ${getAdvisorModelSwitchCommand(advisorModel)} to review and enable.`,
                priority: "high",
              }));
          return;
        }
        h = void 0;
        return;
      }
      let ee = canAdviseModel(mainLoopModel, advisorModel) ? "on" : "pairing";
      if (h === ee) return;
      ((h = ee),
        addNotification({
          key: "advisor-experimental",
          kind: "event",
          text:
            ee === "on"
              ? "Advisor Tool (experimental) is on and may use more tokens \xB7 /advisor"
              : "Advisor will not activate on the main model (advisor is less capable); subagents may still use it and may use more tokens \xB7 /advisor",
          priority: "medium",
          fold: (ke, Re) => Re,
        }));
    };
  },
};
//@ chunk-18hwfzwa.js:1752682-1752730 placement
var antOrgAuthCheckNoticeSpec = { id: "ant-org-auth-check", setup: () => CKo };
//@ chunk-18hwfzwa.js:1752730-1752746 placement
function CKo() {}
/**
 * 会话通知规格：提议开启自动压缩。
 */
//@ chunk-18hwfzwa.js:1752746-1755611 placement
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
    let h,
      x,
      D = new Set(),
      L,
      ee = new Set(),
      ke = new Set(),
      Re = null,
      Be = new Set(),
      He = new Set();
    return (
      {
        turnAtRender: { isLoading: We, lastTurnEnd: ze },
        transcript: transcript,
        initialMessage: initialMessage,
        queuedCommandCount: queuedCommandCount,
        isRemoteSession: isRemoteSession,
        disabled: disabled,
        replBridgeActive: replBridgeActive,
        mainLoopModel: mainLoopModel,
        store: store,
        storageV5: storageV5,
        requestDialog: requestDialog,
        dialogStore: dialogStore,
        terminalSize: terminalSize,
        isTranscriptAtBottom: isTranscriptAtBottom,
      },
      po,
    ) => {
      let ao = {
        getLiveModel: () => po().mainLoopModel,
        getLiveWindow: () => store.getState().autoCompactWindow,
        getLiveContextTokens: () => Y_t(po()),
      };
      if (Re !== null && (replBridgeActive || !makeAutocompactOfferPayload(Re, ao)))
        dialogStore.dismissKind(AUTOCOMPACT_OFFER_DIALOG.kind);
      if (
        isRemoteSession ||
        disabled ||
        We ||
        queuedCommandCount > 0 ||
        replBridgeActive ||
        initialMessage !== null ||
        ze !== "completed"
      )
        return;
      let co = Y_t({ transcript: transcript, mainLoopModel: mainLoopModel });
      if (co < T8) return;
      let snapshot = transcript.getSnapshot(),
        lastIndex = snapshot.findLastIndex((Mn) => Mn.type === "assistant"),
        Bo = snapshot[lastIndex]?.uuid;
      if (L === void 0 || L.reply !== Bo) L = { reply: Bo, model: mainLoopModel };
      else if (L.model !== mainLoopModel) return;
      let Ro = autocompactOfferEligibility({
        model: mainLoopModel,
        configuredWindow: store.getState().autoCompactWindow,
      });
      if (Ro === void 0) return;
      let { accountUuid: accountUuid, modelKey: modelKey, windowTokens: windowTokens } = Ro,
        mn = readAutoCompactOffer(getGlobalConfig(), accountUuid, modelKey);
      if (
        mn?.isAnswered ||
        !hasFreshGrowthBookFeatures() ||
        getGrowthBookClientIdentity().accountUuid !== accountUuid
      )
        return;
      let Cn = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BINARY_MUSIC, {});
      if (Cn !== h) ((h = Cn), (x = autocompactOfferConfig(Cn)));
      let No = x;
      if (No === void 0 || co < No.triggerTokens) return;
      let now = Date.now(),
        Yo = `${accountUuid}:${modelKey}`,
        kn = fit(Ro, No.defaultTokens);
      if (mn === void 0 && !D.has(Yo))
        (D.add(Yo),
          logEvent("tengu_autocompact_offer_eligible", {
            arm: fromEnum(No.arm),
            window_model: telemetrySafeModelName(modelKey),
            surface: lit_2("cli"),
            context_tokens: co,
            trigger_tokens: No.triggerTokens,
            default_tokens: No.defaultTokens,
            window_tokens: windowTokens,
            current_setting: fromEnum(Ro.currentSetting),
            offerable: kn === void 0,
            not_offered_reason: fromEnumOpt(kn),
            async_on: isPrecomputedCompactEnabled(),
          }));
      if (mn === void 0)
        saveGlobalConfig(
          (Mn) => markAutoCompactOfferEligibleLogged(Mn, accountUuid, modelKey, now),
          storageV5,
        );
      let { currentSetting: currentSetting } = Ro;
      if (
        No.arm === "control" ||
        kn !== void 0 ||
        (currentSetting !== "auto" &&
          currentSetting !== "own_per_model" &&
          currentSetting !== "own_top_level") ||
        ee.has(Yo) ||
        (mn?.escCount ?? 0) >= No.maxAsks ||
        Re !== null
      )
        return;
      if (Be.has(Bo)) return;
      if ((Be.add(Bo), ke.has(Yo) && !isUserDrivenHere(snapshot.slice(0, lastIndex + 1)))) return;
      let bn =
        terminalSize.rows < hit && !isScreenReaderMode()
          ? "terminal_too_short"
          : !isTranscriptAtBottom()
            ? "scrolled_away"
            : void 0;
      if (bn !== void 0) {
        if (!He.has(bn)) (He.add(bn), logFeatureSad("autocompact_offer", bn));
        return;
      }
      let Go = getModelContextInfo(mainLoopModel),
        hn = {
          order: resolveOfferOrder(No.order, accountUuid),
          accountUuid: accountUuid,
          modelKey: modelKey,
          sizes: No.sizes
            .filter((size) => size < windowTokens)
            .map((Mn) => ({ tokens: Mn, firesAt: getAutoCompactThresholdTokens(Go, Mn) })),
          defaultTokens: No.defaultTokens,
          triggerTokens: No.triggerTokens,
          contextTokens: co,
          windowTokens: windowTokens,
          currentSetting: currentSetting,
          askNumber: (mn?.escCount ?? 0) + 1,
        };
      ((Re = hn),
        showAutocompactOffer(requestDialog, hn, {
          ...ao,
          applyFlagSettings: (Mn) => applySessionSettingsPatch(Mn, store.setState),
          appendSystemLine: (Mn, Xo) =>
            transcript.apply({ type: "append", messages: [createSystemMessage(Mn, Xo)] }),
          storageV5: storageV5,
        })
          .then((Mn) => {
            if (Mn === "withdrawn") ke.add(Yo);
            else if (Mn !== "cancelled") ee.add(Yo);
          })
          .catch((Mn) => {
            (ee.add(Yo), logError(Mn));
          })
          .finally(() => {
            Re = null;
          }));
    };
  },
};
//@ chunk-18hwfzwa.js:1755611-1755693 placement
function Y_t({ transcript: transcript, mainLoopModel: mainLoopModel }) {
  return Tp(Us(transcript.getSnapshot()), bytesPerTokenForModel(mainLoopModel));
}
/**
 * 启动通知"auto-mode-entry-warning"：进入 auto 模式（非回退、非后台会话）且需要时，延迟追加一条自动模式说明系统消息并记录已看过。
 */
//@ chunk-18hwfzwa.js:1755693-1756430 placement
var AUTO_MODE_WARNING_DELAY_MS = 800,
  autoModeEntryWarningSpec = {
    id: "auto-mode-entry-warning",
    deps: (h) => [h.permissionMode, h.transcript, h.clock, h.storageV5, h.store],
    setup() {
      let h = !1;
      return ({
        permissionMode: permissionMode,
        transcript: transcript,
        clock: clock,
        storageV5: storageV5,
        store: store,
      }) => {
        if (permissionMode !== "auto") return;
        if (h) return;
        return clock.setTimeout(() => {
          (async () => {
            let { isAutoModeFromFallback: isAutoModeFromFallback } = await import("./chunk-dbas1xsr.js");
            if (isAutoModeFromFallback()) {
              h = !0;
              return;
            }
            if (((h = !0), isBgSession())) return;
            let { shouldShowAutoModeEntryWarning: shouldShowAutoModeEntryWarning } =
              await import("./chunk-vrb83jkc.js");
            if (shouldShowAutoModeEntryWarning()) {
              let { getAutoModeDescription: getAutoModeDescription } = await import("./chunk-w1graenk.js");
              (await saveGlobalConfig(
                (We) => (We.hasSeenAutoModeEntryWarning ? We : { ...We, hasSeenAutoModeEntryWarning: !0 }),
                storageV5,
              ),
                logEvent("tengu_auto_mode_entry_warning_shown", {}),
                transcript.apply({
                  type: "append",
                  messages: [createSystemMessage(getAutoModeDescription(), "notice")],
                }));
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
    let h = !1;
    return ({
      addNotification: addNotification,
      transcript: transcript,
      session: session,
      isRemoteSession: isRemoteSession,
      credentials: credentials,
    }) => {
      return;
    };
  },
};
//@ chunk-18hwfzwa.js:1785355-1785931 placement
var replMountLogNoticeSpec = {
    id: "repl-mount-log",
    deps: (h) => [h.disabled],
    setup() {
      return ({ disabled: disabled }) => (
        logForDebugging(`[REPL:mount] REPL mounted, disabled=${disabled}`),
        () => logForDebugging("[REPL:unmount] REPL unmounting")
      );
    },
  },
  YTt = {
    id: "dialog-waiting-in-transcript",
    deps: (h) => [h.screen, h.hasOpenDialog],
    setup() {
      return ({ screen: screen, hasOpenDialog: hasOpenDialog }) => {
        if (screen === "transcript" && hasOpenDialog)
          (logEvent("tengu_dialog_waiting_in_transcript", {}), uiSignals.autoDenyPresence.emit());
      };
    },
  },
  JTt = {
    id: "attach-paint-marks",
    setup() {
      return ({ session: session, transcript: transcript }) => {
        if (!Xj(session.host)) return;
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
var slackFooterOfferNoticeSpec = { id: "slack-footer-offer", setup: () => uGo };
//@ chunk-18hwfzwa.js:1787594-1787616 placement
function uGo() {
  return;
}
//@ chunk-18hwfzwa.js:1787616-1787959 placement
var subscriptionSwitchCheckNoticeSpec = {
  id: "subscription-switch-check",
  deps: (h) => [h.store],
  setup() {
    let h = !1;
    return ({ store: store }) => {
      if (getIsRemoteMode() || h) return;
      if (((h = !0), !useCanSwitchToExistingSubscription() || isPromoOffersBlocked())) return;
      getExistingClaudeSubscription()
        .then((D) => {
          if (D === null) return;
          store.setState((L) => {
            if (L.setupIssues.existingClaudeSubscription === D) return L;
            return { ...L, setupIssues: { ...L.setupIssues, existingClaudeSubscription: D } };
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
    let h = null,
      x = !1,
      D = null,
      L = null,
      ee = () => {},
      ke = null,
      Re = null;
    function Be(We, ze) {
      return !1;
    }
    function He() {}
    return {
      effect: (We) => {},
      dispose: () => {
        (Re?.stop(), (Re = null));
      },
    };
  },
};
/**
 * 启动通知规格：创建工作树耗时超过阈值且未使用稀疏检出时，提示设置 worktree.sparsePaths。
 */
//@ chunk-18hwfzwa.js:1789070-1789557 placement
var SLOW_WORKTREE_THRESHOLD_MS = 15000,
  worktreeSparseTipSpec = {
    id: "worktree-sparse-tip",
    setup() {
      return ({ transcript: transcript }) => {
        let x = getCurrentWorktreeSession();
        if (!x?.creationDurationMs || x.usedSparsePaths) return;
        if (x.creationDurationMs < SLOW_WORKTREE_THRESHOLD_MS) return;
        let rounded = Math.round(x.creationDurationMs / 1000);
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
  FEe,
  replMountLogNoticeSpec,
  JTt,
  repoMemoryImportNoticeSpec,
  antOrgAuthCheckNoticeSpec,
  subscriptionSwitchCheckNoticeSpec,
  advisorToolNoticeSpec,
  wellbeingNoticeSpec,
  YTt,
  autoModeEntryWarningSpec,
  worktreeSparseTipSpec,
  autocompactOfferNoticeSpec,
  slackFooterOfferNoticeSpec,
};
