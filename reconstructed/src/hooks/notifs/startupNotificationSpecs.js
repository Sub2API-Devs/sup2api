/**
 * hooks/notifs/startupNotificationSpecs.ts
 *
 * 2.1.316 新增。启动通知规格汇总。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (13)
 * attribution: placement 13
 */
import { COMPUTED_NOTICE_SPECS, installIssuesNoticeSpec } from "./specs/installNotices.js";
import { useNotifications } from "../../context/notifications.js";
import { useSession } from "../../context/session.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { R, P, j, Q, yt } from "../../../vendor/react/cjs/react.production.js";
import { getIsRemoteMode, onAttacherCapsChange, getAttacherCaps } from "../../bootstrap/state.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import {
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
} from "./specs/sessionNotices.js";
import {
  deviceToolNoticesNoticeSpec,
  chromeExtensionCheckNoticeSpec,
  signinOfferNoticeSpec,
  complianceTaintNoticeSpec,
  rTt,
  costThresholdNoticeSpec,
} from "./specs/environmentNotices.js";
import {
  managedSettingsNoticeNoticeSpec,
  officialMarketplaceCheckNoticeSpec,
  _Tt,
  planModeBypassNoticeSpec,
} from "./specs/settingsNotices.js";
import {
  promoCreditCheckSpec,
  projectTelemetryEnvNoticeSpec,
  projectChromeEnvNoticeSpec,
  projectSignInEnvNoticeSpec,
  fableUsageCreditsNoticeSpec,
  proTrialExpiredAutoOpenNoticeSpec,
  promptQueueUseCountNoticeSpec,
} from "./specs/projectEnvNotices.js";
import { IDE_DISCONNECTED_NOTICE_SPEC, IDE_INSTALL_ERROR_NOTICE_SPEC } from "./useIDEStatusIndicator.js";
import { useAutoModeUnavailableNotification } from "./useAutoModeUnavailableNotification.js";
import { usePluginAutoupdateNotification } from "./usePluginAutoupdateNotification.js";
import { SETTINGS_ERRORS_NOTIFICATION_KEY } from "./useSettingsErrors.js";
import { sandboxDeniesOnAnotherHostNoticeSpec, ZTt } from "./specs/sandboxNotices.js";
import {
  LIMIT_REACHED_NOTICE_SPEC,
  RATE_LIMIT_WARNING_NOTICE_SPEC,
} from "./useRateLimitWarningNotification.js";
import { uTt, OVERAGE_REJECTED_KEY, fTt, pTt } from "./useFastModeNotification.js";
import { useDeprecationWarningNotification } from "./useDeprecationWarningNotification.js";
import { lspInitializationNoticeSpec } from "./useLspInitializationNotification.js";
import { TEAMMATE_LIFECYCLE_NOTICE_SPEC } from "./_new/TEAMMATE_LIFECYCLE_NOTICE_SPEC.js";
import { ROLLOUT_COHORT_NOTICE_SPEC } from "./_new/ROLLOUT_COHORT_NOTICE_SPEC.js";
import { issueFlagNotification } from "../useIssueFlagBanner.js";
import { KTt, rcLongTurnNudgeNoticeSpec, jTt } from "./specs/remoteControlNudges.js";
import { useStoreSelector } from "../useStoreSelector.js";
import { Cr, useAppStateSession, useAppState } from "../../state/AppState.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useTerminalSize } from "../useTerminalSize.js";
import { useForceRender } from "../useForceRender.js";
import { qd } from "../useSettings.js";
import { useRateLimitState } from "../../components/rateLimit/quotaAutoResume.js";
import { useCommandQueue } from "../../components/Messages.js";
import { dg } from "../../context/QueuedMessageContext.js";
import { teammateStatusSignature } from "./_new/teammateStatusSignature.js";

//@ chunk-18hwfzwa.js:1751044-1751835 placement
function runStartupNotificationSpecs(h = COMPUTED_NOTICE_SPECS) {
  let { addNotification: addNotification } = useNotifications(),
    D = useSession(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    ke = R(!1);
  P(() => {
    if (getIsRemoteMode() || ke.current) return;
    ke.current = !0;
    let Re = getGlobalConfig().seenNotifications ?? {},
      Be = [];
    Promise.allSettled(
      h.map(async (He) => {
        if (He.maxImpressions !== void 0 && (Re[He.id] ?? 0) >= He.maxImpressions) return;
        let compute = await He.compute({ session: D, storageV5: storageV5, credentials: credentials });
        if (!compute || (Array.isArray(compute) && compute.length === 0)) return;
        for (let ze of Array.isArray(compute) ? compute : [compute]) addNotification(ze);
        if ((He.onShown?.(), He.maxImpressions !== void 0)) Be.push(He.id);
      }),
    ).then((He) => {
      for (let We of He)
        if (We.status === "rejected")
          logError(withTelemetryMessage(toError(We.reason), "startup notification spec failed"));
      if (Be.length === 0) return;
      saveGlobalConfig((We) => {
        let ze = { ...(We.seenNotifications ?? {}) };
        for (let Xe of Be) ze[Xe] = (ze[Xe] ?? 0) + 1;
        return { ...We, seenNotifications: ze };
      }, storageV5);
    });
  }, [addNotification, D, h, storageV5, credentials]);
}
//@ chunk-18hwfzwa.js:1751835-1751839 placement
j();
//@ chunk-18hwfzwa.js:1789557-1789771 placement
var STARTUP_NOTIFICATION_SPECS = [
  replMountLogNoticeSpec,
  JTt,
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
  _Tt,
  projectTelemetryEnvNoticeSpec,
  projectChromeEnvNoticeSpec,
  projectSignInEnvNoticeSpec,
  complianceTaintNoticeSpec,
  rTt,
  fableUsageCreditsNoticeSpec,
  LIMIT_REACHED_NOTICE_SPEC,
  RATE_LIMIT_WARNING_NOTICE_SPEC,
  uTt,
  OVERAGE_REJECTED_KEY,
  fTt,
  pTt,
  advisorToolNoticeSpec,
  useDeprecationWarningNotification,
  ZTt,
  lspInitializationNoticeSpec,
  TEAMMATE_LIFECYCLE_NOTICE_SPEC,
  ROLLOUT_COHORT_NOTICE_SPEC,
  wellbeingNoticeSpec,
  issueFlagNotification,
  KTt,
  rcLongTurnNudgeNoticeSpec,
  jTt,
  YTt,
  autoModeEntryWarningSpec,
  planModeBypassNoticeSpec,
  worktreeSparseTipSpec,
  costThresholdNoticeSpec,
  autocompactOfferNoticeSpec,
  proTrialExpiredAutoOpenNoticeSpec,
  promptQueueUseCountNoticeSpec,
  slackFooterOfferNoticeSpec,
];
//@ chunk-18hwfzwa.js:1789771-1789775 placement
j();
//@ chunk-18hwfzwa.js:1789775-1791674 placement
function useStartupNotifications({
  mainLoopModel: mainLoopModel,
  mcpClients: mcpClients,
  ideInstallationStatus: ideInstallationStatus,
  dynamicMcpConfig: dynamicMcpConfig,
  turn: turn,
  transcript: transcript,
  requestDialog: requestDialog,
  dialogStore: dialogStore,
  hasOpenDialog: hasOpenDialog,
  submitPrompt: submitPrompt,
  screen: screen,
  disabled: disabled,
  isRemoteSession: isRemoteSession,
  isTranscriptAtBottom: isTranscriptAtBottom,
}) {
  let At = useStoreSelector(turn, selectIsLoading6),
    It = useStoreSelector(turn, selectLastQueryCompletionTime),
    Ot = useStoreSelector(turn, selectLastTurnEnd2),
    Et = useStoreSelector(turn, selectSubmitCount3);
  useStoreSelector(transcript);
  let Dt = Q(
      () => ({ isLoading: At, lastQueryCompletionTime: It, lastTurnEnd: Ot, submitCount: Et }),
      [At, It, Ot, Et],
    ),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    Xt = Cr(),
    io = useAppStateSession(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    ao = useClock(),
    co = useTerminalSize(),
    bo = useForceRender(),
    Ao = yt(onAttacherCapsChange, () => getAttacherCaps() !== null),
    Bo = qd(),
    Ro = useRateLimitState(),
    Ho = useAppState((Mn) => Mn.toolPermissionContext.mode),
    Io = useAppState((Mn) => Mn.toolPermissionContext.isAutoModeAvailable),
    Wo = useAppState((Mn) => Mn.toolPermissionContext.isBypassPermissionsModeAvailable),
    mn = useAppState((Mn) => Mn.attribution.permissionPromptCount),
    Cn = useAppState((Mn) => Mn.replBridgeConnected && !Mn.replBridgeOutboundOnly),
    No = useAppState((Mn) => Mn.replBridgeSessionUrl),
    vo = useAppState((Mn) => Mn.fastMode),
    Yo = useAppState((Mn) => Mn.advisorModel),
    kn = useAppState(gGo),
    Fn = useAppState((Mn) => Mn.initialMessage),
    bn = useCommandQueue().length,
    Go = useAppState((Mn) => Mn.mainLoopModelForSession ?? Mn.mainLoopModel),
    hn = dg();
  return Q(
    () => ({
      mainLoopModel: mainLoopModel,
      mcpClients: mcpClients,
      ideInstallationStatus: ideInstallationStatus,
      dynamicMcpConfig: dynamicMcpConfig,
      turn: turn,
      turnAtRender: Dt,
      transcript: transcript,
      requestDialog: requestDialog,
      submitPrompt: submitPrompt,
      screen: screen,
      disabled: disabled,
      isRemoteSession: isRemoteSession,
      isTranscriptAtBottom: isTranscriptAtBottom,
      addNotification: addNotification,
      removeNotification: removeNotification,
      store: Xt,
      dialogStore: dialogStore,
      hasOpenDialog: hasOpenDialog,
      session: io,
      storageV5: storageV5,
      credentials: credentials,
      clock: ao,
      terminalSize: co,
      growthBookVersion: bo,
      hasBgAttacher: Ao,
      settings: Bo,
      claudeAiLimits: Ro,
      permissionMode: Ho,
      isAutoModeAvailable: Io,
      isBypassPermissionsModeAvailable: Wo,
      permissionPromptCount: mn,
      replBridgeActive: Cn,
      replBridgeSessionUrl: No,
      fastMode: vo,
      advisorModel: Yo,
      teammateStatusSignature: kn,
      initialMessage: Fn,
      queuedCommandCount: bn,
      userSpecifiedModel: Go,
      effortValue: hn,
    }),
    [
      mainLoopModel,
      mcpClients,
      ideInstallationStatus,
      dynamicMcpConfig,
      turn,
      Dt,
      transcript,
      requestDialog,
      submitPrompt,
      screen,
      disabled,
      isRemoteSession,
      isTranscriptAtBottom,
      addNotification,
      removeNotification,
      Xt,
      dialogStore,
      hasOpenDialog,
      io,
      storageV5,
      credentials,
      ao,
      co,
      bo,
      Ao,
      Bo,
      Ro,
      Ho,
      Io,
      Wo,
      mn,
      Cn,
      No,
      vo,
      Yo,
      kn,
      Fn,
      bn,
      Go,
      hn,
    ],
  );
}
//@ chunk-18hwfzwa.js:1791674-1791710 placement
function gGo(h) {
  return teammateStatusSignature(h.tasks);
}
//@ chunk-18hwfzwa.js:1791710-1791745 placement
function selectIsLoading6(h) {
  return h.isLoading;
}
//@ chunk-18hwfzwa.js:1791745-1791794 placement
function selectLastQueryCompletionTime(h) {
  return h.lastQueryCompletionTime;
}
//@ chunk-18hwfzwa.js:1791794-1791831 placement
function selectLastTurnEnd2(h) {
  return h.lastTurnEnd;
}
//@ chunk-18hwfzwa.js:1791831-1791868 placement
function selectSubmitCount3(h) {
  return h.submitCount;
}
//@ chunk-18hwfzwa.js:1791868-1791872 placement
j();
//@ chunk-18hwfzwa.js:1791941-1792030 placement
var mRt = 180000,
  vGo = 30000,
  CGo = 3600000,
  _Go = 300000,
  pRt = 500,
  TGo = 2000,
  RGo = 3,
  xGo = 3,
  AGo = 2,
  MGo = 3;
//@ chunk-18hwfzwa.js:1792030-1792115 placement
function noe(h) {
  return h.type === "user" && !h.isMeta && !h.isCompactSummary && !h.isVirtual;
}

export {
  runStartupNotificationSpecs,
  useStartupNotifications,
  STARTUP_NOTIFICATION_SPECS,
  noe,
  xGo,
  AGo,
  mRt,
  vGo,
  RGo,
  MGo,
  CGo,
  TGo,
  _Go,
  pRt,
};
