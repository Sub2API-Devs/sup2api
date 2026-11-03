/**
 * components/PromptInput/Notifications.tsx
 *
 * 输入框右下的通知区：显示通知队列当前项（语音录制/处理、IDE、apiKeyHelper 慢、用量额度等），超时自动消失。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/Notifications.tsx
 * pieces: chunk-18hwfzwa.js (24), chunk-8jypjjdf.js (6)
 * attribution: placement 19, sole-consumer 7, affinity 1, fingerprint 3
 */
import { j, y, R, P, Rh, Se, Q, qt } from "../../../vendor/react/cjs/react.production.js";
import { useAppState, useAppState_2 } from "../../state/AppState.js";
import { getRiskColor, l5e, a5e } from "../permissions/PermissionExplanation.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useNotifications, pTe, bye, Kj, KDe, MRr } from "../../context/notifications.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import {
  selectNumber,
  X8t,
  acknowledgeClosedIssues,
  selectNumber2,
  readClosedIssuesCache,
  unacknowledgedClosedIssues,
  fetchMyClosedIssues,
} from "../../services/closedIssues.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { setEnvHookNotifier } from "../../utils/hooks/fileChangedWatcher.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { getContextTokenCount } from "../../utils/tokens.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { t7t, o7t, n7t } from "./_new/Notifications.helpers-18hw.js";
import { calculateTokenWarningState } from "../../services/compact/autoCompact.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { SN, hj, zZt } from "../StatusNotices.js";
import { rHt } from "../../utils/Cursor.js";
import { useRateLimitState } from "../rateLimit/quotaAutoResume.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { useVoiceAvailable } from "../../hooks/useVoiceIntegration.js";
import { VoiceIndicatorImpl, VoiceStateIndicator } from "./VoiceIndicator.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { wM } from "../../utils/editor.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { toIDEDisplayName } from "../../utils/ide.js";
import { TokenWarning } from "../TokenWarning.js";
import { AutoUpdaterWrapper } from "../AutoUpdaterWrapper.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { GoalActiveIndicator } from "./_new/GoalActiveIndicator.js";
import { SentryErrorBoundary } from "../SentryErrorBoundary.js";
import { wt } from "../../remote/remoteMode.js";
import { getLastApiCompletionTimestamp } from "../../bootstrap/state.js";
import { getConfiguredApiKeyHelper, getApiKeyHelperElapsedMs } from "../../utils/auth.js";
import { formatDuration } from "../../utils/format.js";
import { useInterval } from "../../ink/components/Input.js";
import { env } from "../../utils/env.js";
import { j8n, noGatewayNotice } from "../../services/api/errors.js";
import { MemoryUsageIndicator } from "../MemoryUsageIndicator.js";
import { SandboxPromptFooterHint } from "./SandboxPromptFooterHint.js";
import { oR } from "../../services/api/promptCacheBreakDetection.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { ctn } from "../FullscreenLayout.js";
import { mergeClients } from "../../hooks/useMergedClients.js";
import { Oy } from "./footerGates.js";

//@ chunk-18hwfzwa.js:643509-643513 placement
j();
//@ chunk-18hwfzwa.js:643547-643551 placement
j();
//@ chunk-18hwfzwa.js:643551-643569 placement
function XQt(Be) {}
/**
 * 订阅 bridge 提示并锁存最后一次出现的值（置顶提示时在消失后仍保留）。
 */
//@ chunk-18hwfzwa.js:643569-643741 placement
function useLatchedBridgeNotice(h) {
  let { saysWhatToDo: saysWhatToDo, isPinnedNotice: isPinnedNotice } = h;
  saysWhatToDo === void 0 ? !1 : saysWhatToDo;
  let L = isPinnedNotice === void 0 ? !1 : isPinnedNotice,
    ee = useAppState(XQt),
    [ke, Re] = y(ee);
  if (ee !== void 0 && ee !== ke) Re(ee);
  return (L ? (ee ?? ke) : ee, null);
}
/**
 * 生成 "你的 issue 已关闭" 通知的分段文本（单个或多个 issue 编号）。
 */
//@ chunk-18hwfzwa.js:781742-782121 placement
function formatClosedIssuesNotice(h) {
  if (h.length === 1)
    return [
      { text: "\u2713 Your issue ", color: "success" },
      getRiskColor(h[0].number),
      { text: " has been closed. Thanks for reporting!", color: "success" },
    ];
  return [
    { text: `\u2713 ${h.length} of your issues have been closed (`, color: "success" },
    ...h.flatMap((x, D) => [...(D > 0 ? [{ text: ", ", color: "success" }] : []), getRiskColor(x.number)]),
    { text: "). Thanks for reporting!", color: "success" },
  ];
}
/**
 * 一方提供商下挂载时检查"我提交的 issue 已关闭"：先读缓存再拉取，新增未确认的关闭 issue 时弹出低优先级通知并标记已提示，记 tengu_closed_issue_notice_shown。
 */
//@ chunk-18hwfzwa.js:782121-782955 sole-consumer
function ClosedIssueNotifier() {
  let L = w(4),
    { storageV5: storageV5 } = Me(),
    { addNotification: addNotification } = useNotifications(),
    startedRef = R(!1),
    effect,
    deps;
  if (L[0] !== addNotification || L[1] !== storageV5)
    ((effect = () => {
      if (startedRef.current) {
        return;
      }
      if (((startedRef.current = !0), isFirstPartyProvider())) {
        let Xe = function (Re) {
          let He = new Set(Be.map(selectNumber));
          let filtered = Re.filter((We) => !He.has(We.number));
          if (filtered.length === 0) {
            return;
          }
          (Be.push(...filtered),
            logEvent("tengu_closed_issue_notice_shown", {
              newClosedIssueCount: filtered.length,
              totalClosedIssueCount: Be.length,
            }),
            addNotification({
              key: "closed-issue-notice",
              kind: "event",
              segments: formatClosedIssuesNotice(Be),
              priority: "low",
              timeoutMs: l5e,
              fold: X8t,
            }),
            acknowledgeClosedIssues(filtered.map(selectNumber2), storageV5));
        };
        let rt = !1;
        let Be = [];
        let Et = async function Et() {
          let kt = await readClosedIssuesCache(storageV5);
          let At = unacknowledgedClosedIssues(kt);
          if (!rt && At.length > 0) Xe(At);
          let It = await fetchMyClosedIssues(storageV5);
          if (rt || It === null || It > a5e) {
            return;
          }
          let Ot = unacknowledgedClosedIssues(await readClosedIssuesCache(storageV5));
          if (!rt && Ot.length > 0) Xe(Ot);
        };
        return (
          Et().catch(logError),
          () => {
            rt = !0;
          }
        );
      }
    }),
      (deps = [addNotification, storageV5]),
      (L[0] = addNotification),
      (L[1] = storageV5),
      (L[2] = effect),
      (L[3] = deps));
  else ((effect = L[2]), (deps = L[3]));
  return (P(effect, deps), null);
}
//@ chunk-18hwfzwa.js:782955-782959 sole-consumer
j();
//@ chunk-18hwfzwa.js:782959-782963 sole-consumer
j();
//@ chunk-18hwfzwa.js:785667-785671 placement
j();
//@ chunk-18hwfzwa.js:787830-787884 sole-consumer
function hasActiveGoal($r) {
  return $r.activeGoal?.setAt !== void 0;
}
//@ chunk-18hwfzwa.js:787884-787916 sole-consumer
function clearEnvHookNotifier() {
  return setEnvHookNotifier(null);
}
//@ chunk-18hwfzwa.js:787916-787946 sole-consumer
function a7t(Yr, Er) {
  return Er;
}
//@ chunk-18hwfzwa.js:787946-787984 sole-consumer
function selectVoiceState(kn) {
  return kn.voiceState;
}
//@ chunk-18hwfzwa.js:787984-788022 affinity
function selectVoiceError(Fn) {
  return Fn.voiceError;
}
//@ chunk-18hwfzwa.js:788022-791970 fingerprint = Notifications (0.62)
var NOTIFICATION_TIMEOUT_MS = 5000,
  Notifications = Rh(function (x) {
    let $ = w(59),
      {
        apiKeyVerification: apiKeyVerification,
        hideLoginNotice: hideLoginNotice,
        isAutoUpdating: isAutoUpdating,
        verbose: verbose,
        transcript: transcript,
        onChangeIsUpdating: onChangeIsUpdating,
        isInputWrapped: isInputWrapped,
        hasStash: hasStash,
        row1HintId: row1HintId,
      } = x,
      Xe = isInputWrapped === void 0 ? !1 : isInputWrapped,
      rt = hasStash === void 0 ? !1 : hasStash,
      kt = row1HintId === "timed",
      At = row1HintId === "voice",
      It = useStoreSelector(apiKeyVerification),
      Ot = It === "invalid" || It === "missing",
      Et = !hideLoginNotice && Ot,
      Dt = verbose && !Ot,
      Lt = useStoreSelector(transcript, getContextTokenCount),
      oo = useMainLoopModel_3(),
      autoCompactWindow = useAppState(t7t),
      remoteAutocompactState = useAppState(o7t),
      po;
    if ($[0] !== autoCompactWindow || $[1] !== oo || $[2] !== remoteAutocompactState || $[3] !== Lt)
      ((po = calculateTokenWarningState(
        Lt,
        getModelContextInfo(oo),
        autoCompactWindow,
        remoteAutocompactState,
      )),
        ($[0] = autoCompactWindow),
        ($[1] = oo),
        ($[2] = remoteAutocompactState),
        ($[3] = Lt),
        ($[4] = po));
    else po = $[4];
    let ao = po.level !== "ok",
      co = SN(),
      bo = rHt(),
      isBriefOnly = useAppState(n7t),
      Bo = pTe(),
      Ro;
    if ($[5] !== Bo || $[6] !== kt)
      ((Ro = (Ho) => bye(Ho.notifications.current, Kj(Ho)) && !kt && !KDe(Ho.notifications.current, Bo)),
        ($[5] = Bo),
        ($[6] = kt),
        ($[7] = Ro));
    else Ro = $[7];
    let Io = useAppState(Ro),
      { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
      Cn = useRateLimitState(),
      No = useIsFullscreen(),
      vo = useVoiceAvailable(),
      Yo = useAppState_2(VoiceIndicatorImpl),
      kn = useAppState(hasActiveGoal),
      [Fn, bn] = y(!1),
      Go,
      hn;
    if ($[8] !== addNotification)
      ((Go = () => (
        setEnvHookNotifier((Mn, Xo) => {
          addNotification({
            key: "env-hook",
            kind: "event",
            text: Mn,
            color: Xo ? "error" : void 0,
            priority: Xo ? "medium" : "low",
            timeoutMs: Xo ? 8000 : 5000,
          });
        }),
        clearEnvHookNotifier
      )),
        (hn = [addNotification]),
        ($[8] = addNotification),
        ($[9] = Go),
        ($[10] = hn));
    else ((Go = $[9]), (hn = $[10]));
    P(Go, hn);
    let isUsingOverage = Cn.isUsingOverage,
      $n = hj(),
      on = $n === "team" || $n === "enterprise",
      _o;
    if ($[11] === MEMO_CACHE_SENTINEL) ((_o = wM()), ($[11] = _o));
    else _o = $[11];
    let cn = _o,
      Dn = Xe && !ao && It !== "invalid" && It !== "missing" && cn !== void 0,
      wn,
      mr;
    if ($[12] !== addNotification || $[13] !== removeNotification || $[14] !== Dn)
      ((wn = () => {
        if (Dn && cn)
          (logEvent("tengu_external_editor_hint_shown", {}),
            addNotification({
              key: "external-editor-hint",
              kind: "hint",
              jsx: e(Text, {
                dimColor: !0,
                children: e(ConfigurableShortcutHint, {
                  action: "chat:externalEditor",
                  context: "Chat",
                  fallback: "ctrl+g",
                  description: `edit in ${toIDEDisplayName(cn)}`,
                }),
              }),
              priority: "immediate",
              timeoutMs: 5000,
            }));
        else removeNotification("external-editor-hint");
      }),
        (mr = [Dn, cn, addNotification, removeNotification]),
        ($[12] = addNotification),
        ($[13] = removeNotification),
        ($[14] = Dn),
        ($[15] = wn),
        ($[16] = mr));
    else ((wn = $[15]), (mr = $[16]));
    P(wn, mr);
    let Kn, Wn;
    if (
      $[17] !== addNotification ||
      $[18] !== isBriefOnly ||
      $[19] !== ao ||
      $[20] !== oo ||
      $[21] !== removeNotification ||
      $[22] !== co ||
      $[23] !== Lt
    )
      ((Kn = () => {
        if (ao && !co && !isBriefOnly)
          addNotification({
            key: "token-warning",
            jsx: e(TokenWarning, { tokenUsage: Lt, model: oo }),
            priority: "medium",
            timeoutMs: 18000000,
            fold: a7t,
            exemptFromDiffPanelHold: !0,
          });
        else removeNotification("token-warning");
      }),
        (Wn = [ao, co, isBriefOnly, Lt, oo, addNotification, removeNotification]),
        ($[17] = addNotification),
        ($[18] = isBriefOnly),
        ($[19] = ao),
        ($[20] = oo),
        ($[21] = removeNotification),
        ($[22] = co),
        ($[23] = Lt),
        ($[24] = Kn),
        ($[25] = Wn));
    else ((Kn = $[24]), (Wn = $[25]));
    P(Kn, Wn);
    let Fr = Boolean(Io || (isUsingOverage && !on) || Et || Dt || (!No && isAutoUpdating)),
      Zn = Fr || rt || kn;
    const Un = bo && !ao,
      dr = No ? Zn : void 0;
    let or;
    if (
      $[26] !== isAutoUpdating ||
      $[27] !== onChangeIsUpdating ||
      $[28] !== Un ||
      $[29] !== dr ||
      $[30] !== verbose
    )
      ((or = e(AutoUpdaterWrapper, {
        verbose: verbose,
        isUpdating: isAutoUpdating,
        onChangeIsUpdating: onChangeIsUpdating,
        showSuccessMessage: Un,
        withSeparator: dr,
        atPrompt: !0,
      })),
        ($[26] = isAutoUpdating),
        ($[27] = onChangeIsUpdating),
        ($[28] = Un),
        ($[29] = dr),
        ($[30] = verbose),
        ($[31] = or));
    else or = $[31];
    let pr = or;
    const Qn = isUsingOverage ?? !1,
      ur = No ? null : pr;
    let Ir;
    if (
      $[32] !== on ||
      $[33] !== Et ||
      $[34] !== Dt ||
      $[35] !== Qn ||
      $[36] !== ur ||
      $[37] !== kt ||
      $[38] !== Lt ||
      $[39] !== At
    )
      ((Ir = e(Box, {
        flexDirection: "column",
        alignItems: "flex-end",
        flexShrink: 1,
        overflowX: "hidden",
        children: e(NotificationContent, {
          isInOverageMode: Qn,
          isTeamOrEnterprise: on,
          showLoginNotice: Et,
          showVerboseTokens: Dt,
          tokenUsage: Lt,
          autoUpdater: ur,
          onCriticalMemoryShowingChange: bn,
          toastOnRow1: kt,
          voiceOnRow1: At,
        }),
      })),
        ($[32] = on),
        ($[33] = Et),
        ($[34] = Dt),
        ($[35] = Qn),
        ($[36] = ur),
        ($[37] = kt),
        ($[38] = Lt),
        ($[39] = At),
        ($[40] = Ir));
    else Ir = $[40];
    let Pr;
    if ($[41] !== Fr || $[42] !== rt)
      ((Pr =
        rt &&
        r(Box, {
          flexShrink: 0,
          children: [
            e(Text, { dimColor: !0, children: Fr ? " \xB7 " : " " }),
            r(Text, { dimColor: !0, children: [re.pointerSmall, " stashed"] }),
          ],
        })),
        ($[41] = Fr),
        ($[42] = rt),
        ($[43] = Pr));
    else Pr = $[43];
    const ts = Fr || rt;
    let Gn;
    if ($[44] !== ts) ((Gn = e(GoalActiveIndicator, { withSeparator: ts })), ($[44] = ts), ($[45] = Gn));
    else Gn = $[45];
    let Ur;
    if (
      $[46] !== pr ||
      $[47] !== Zn ||
      $[48] !== Fn ||
      $[49] !== No ||
      $[50] !== Yo ||
      $[51] !== vo ||
      $[52] !== At
    )
      ((Ur =
        No &&
        e(Box, {
          flexShrink: 0,
          maxWidth: Zn ? "60%" : void 0,
          display: (vo && Yo && !At) || Fn ? "none" : "flex",
          children: pr,
        })),
        ($[46] = pr),
        ($[47] = Zn),
        ($[48] = Fn),
        ($[49] = No),
        ($[50] = Yo),
        ($[51] = vo),
        ($[52] = At),
        ($[53] = Ur));
    else Ur = $[53];
    let Zr;
    if ($[54] !== Ir || $[55] !== Pr || $[56] !== Gn || $[57] !== Ur)
      ((Zr = e(SentryErrorBoundary, {
        children: r(Box, {
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "flex-end",
          flexShrink: 0,
          overflowX: "hidden",
          children: [Ir, Pr, Gn, Ur],
        }),
      })),
        ($[54] = Ir),
        ($[55] = Pr),
        ($[56] = Gn),
        ($[57] = Ur),
        ($[58] = Zr));
    else Zr = $[58];
    return Zr;
  });
/**
 * 通知内容：语音 recording/processing、apiKeyHelper 慢、"Now using usage credits"、IDE 状态等按类型渲染；无通知时显示其他状态。
 */
//@ chunk-18hwfzwa.js:791970-794488 fingerprint = NotificationContent (0.431)
function NotificationContent(h) {
  let $ = w(41),
    {
      isInOverageMode: isInOverageMode,
      isTeamOrEnterprise: isTeamOrEnterprise,
      showLoginNotice: showLoginNotice,
      showVerboseTokens: showVerboseTokens,
      tokenUsage: tokenUsage,
      autoUpdater: autoUpdater,
      onCriticalMemoryShowingChange: onCriticalMemoryShowingChange,
      toastOnRow1: toastOnRow1,
      voiceOnRow1: voiceOnRow1,
    } = h,
    ze = hj(),
    rt;
  if ($[0] !== ze) ((rt = !wt() && ze === "pro"), ($[0] = ze), ($[1] = rt));
  else rt = $[1];
  let kt = rt,
    At = zZt(kt ? 30000 : null),
    It;
  if ($[2] !== At || $[3] !== kt || $[4] !== tokenUsage)
    ((It = kt ? uncachedContextHint(tokenUsage, getLastApiCompletionTimestamp(), At) : null),
      ($[2] = At),
      ($[3] = kt),
      ($[4] = tokenUsage),
      ($[5] = It));
  else It = $[5];
  let Ot = It,
    [Et, Dt] = y(null),
    Lt = !wt() && Boolean(getConfiguredApiKeyHelper()),
    oo;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((oo = () => {
      let ms = getApiKeyHelperElapsedMs();
      let io = ms >= 1e4 ? formatDuration(ms) : null;
      Dt((prev) => (io === prev ? prev : io));
    }),
      ($[6] = oo));
  else oo = $[6];
  useInterval(oo, Lt ? 1000 : null);
  let po = useAppState_2(selectVoiceState),
    ao = useVoiceAvailable(),
    co = useAppState_2(selectVoiceError);
  if (!voiceOnRow1 && ao && (po === "recording" || po === "processing")) {
    let bo;
    if ($[7] !== po) ((bo = e(VoiceStateIndicator, { voiceState: po })), ($[7] = po), ($[8] = bo));
    else bo = $[8];
    return bo;
  }
  let bo;
  if ($[9] !== isInOverageMode || $[10] !== isTeamOrEnterprise)
    ((bo =
      isInOverageMode &&
      !isTeamOrEnterprise &&
      e(Box, { children: e(Text, { dimColor: !0, wrap: "truncate", children: "Now using usage credits" }) })),
      ($[9] = isInOverageMode),
      ($[10] = isTeamOrEnterprise),
      ($[11] = bo));
  else bo = $[11];
  let Ao;
  if ($[12] !== Et)
    ((Ao =
      Et &&
      r(Box, {
        children: [
          r(Text, { color: "warning", wrap: "truncate", children: ["apiKeyHelper is taking a while", " "] }),
          r(Text, { dimColor: !0, wrap: "truncate", children: ["(", Et, ")"] }),
        ],
      })),
      ($[12] = Et),
      ($[13] = Ao));
  else Ao = $[13];
  let Bo;
  if ($[14] !== showLoginNotice)
    ((Bo =
      showLoginNotice &&
      e(Box, {
        children: e(Text, {
          color: "error",
          wrap: "truncate",
          children: env.CLAUDE_CODE_REMOTE
            ? "Authentication error \xB7 Try again"
            : j8n()
              ? noGatewayNotice()
              : "Not logged in \xB7 Run /login",
        }),
      })),
      ($[14] = showLoginNotice),
      ($[15] = Bo));
  else Bo = $[15];
  let Ro;
  if ($[16] !== showVerboseTokens || $[17] !== tokenUsage)
    ((Ro =
      showVerboseTokens &&
      e(Box, { children: r(Text, { dimColor: !0, wrap: "truncate", children: [tokenUsage, " tokens"] }) })),
      ($[16] = showVerboseTokens),
      ($[17] = tokenUsage),
      ($[18] = Ro));
  else Ro = $[18];
  let Ho;
  if ($[19] !== Ot)
    ((Ho = Ot && e(Box, { children: e(Text, { dimColor: !0, wrap: "truncate", children: Ot }) })),
      ($[19] = Ot),
      ($[20] = Ho));
  else Ho = $[20];
  let Io;
  if ($[21] === MEMO_CACHE_SENTINEL) ((Io = e(ClosedIssueNotifier, {})), ($[21] = Io));
  else Io = $[21];
  let Wo;
  if ($[22] !== ao || $[23] !== co)
    ((Wo = ao && co && e(Box, { children: e(Text, { color: "error", wrap: "truncate", children: co }) })),
      ($[22] = ao),
      ($[23] = co),
      ($[24] = Wo));
  else Wo = $[24];
  let mn, Cn;
  if ($[25] === MEMO_CACHE_SENTINEL)
    ((mn = e(MemoryUsageIndicator, { tier: "high" })),
      (Cn = !wt() && e(SandboxPromptFooterHint, {})),
      ($[25] = mn),
      ($[26] = Cn));
  else ((mn = $[25]), (Cn = $[26]));
  let No;
  if ($[27] !== toastOnRow1)
    ((No = e(PromptToast, { drawnOnRow1: toastOnRow1 })), ($[27] = toastOnRow1), ($[28] = No));
  else No = $[28];
  let vo;
  if ($[29] !== onCriticalMemoryShowingChange)
    ((vo = e(MemoryUsageIndicator, { tier: "critical", onShowingChange: onCriticalMemoryShowingChange })),
      ($[29] = onCriticalMemoryShowingChange),
      ($[30] = vo));
  else vo = $[30];
  let Yo;
  if (
    $[31] !== autoUpdater ||
    $[32] !== Wo ||
    $[33] !== No ||
    $[34] !== vo ||
    $[35] !== bo ||
    $[36] !== Ao ||
    $[37] !== Bo ||
    $[38] !== Ro ||
    $[39] !== Ho
  )
    ((Yo = r(Fragment, { children: [bo, Ao, Bo, Ro, Ho, autoUpdater, Io, Wo, mn, Cn, No, vo] })),
      ($[31] = autoUpdater),
      ($[32] = Wo),
      ($[33] = No),
      ($[34] = vo),
      ($[35] = bo),
      ($[36] = Ao),
      ($[37] = Bo),
      ($[38] = Ro),
      ($[39] = Ho),
      ($[40] = Yo));
  else Yo = $[40];
  return Yo;
}
//@ chunk-18hwfzwa.js:794488-794502 placement
var e7t = 50000;
//@ chunk-18hwfzwa.js:794502-794658 placement
function uncachedContextHint(h, x, D) {
  if (x === null) return null;
  if (h < e7t) return null;
  if (D - x <= oR) return null;
  return `~${Math.round(h / 1000)}k uncached \xB7 /clear to start fresh`;
}
//@ chunk-18hwfzwa.js:794658-794662 placement
j();
/**
 * 通知区的绝对定位容器：宽度扣掉右侧占用列数，底部对齐、超出隐藏。
 */
//@ chunk-18hwfzwa.js:794662-795108 placement
function NotificationOverlay(h) {
  let $ = w(5),
    { columns: columns } = useTerminalSize(),
    D = Se(ctn);
  const { marginTop: marginTop, height: height } = h,
    ke = D > 0 ? Math.max(0, columns - D) : "100%";
  let Be;
  if ($[0] !== h.children || $[1] !== h.height || $[2] !== h.marginTop || $[3] !== ke)
    ((Be = e(Box, {
      position: "absolute",
      marginTop: marginTop,
      height: height,
      width: ke,
      paddingX: 2,
      flexDirection: "column",
      justifyContent: "flex-end",
      overflow: "hidden",
      children: h.children,
    })),
      ($[0] = h.children),
      ($[1] = h.height),
      ($[2] = h.marginTop),
      ($[3] = ke),
      ($[4] = Be));
  else Be = $[4];
  return Be;
}
//@ chunk-18hwfzwa.js:795108-795112 placement
j();
//@ chunk-18hwfzwa.js:795112-795116 placement
j();
//@ chunk-18hwfzwa.js:795116-795120 placement
j();
//@ chunk-18hwfzwa.js:795120-795165 placement
function jw(h, x) {
  return Q(() => mergeClients(h, x), [h, x]);
}
//@ chunk-8jypjjdf.js:20372-20520 placement = _temp2 (0.843)
function ToastText(o) {
  let $ = w(2),
    { text: text } = o,
    l;
  if ($[0] !== text)
    ((l = e(Text, { dimColor: !0, italic: !0, wrap: "truncate-end", children: text })),
      ($[0] = text),
      ($[1] = l));
  else l = $[1];
  return l;
}
/**
 * 渲染通知的分段文本（颜色、加粗、可点链接）。
 */
//@ chunk-8jypjjdf.js:20520-20697 placement = StyledText (0.767)
function SegmentedText({ segments: segments }) {
  return segments.map((a, t) => {
    let l = e(Text, { color: a.color, dimColor: a.dim, bold: a.bold, children: a.text }, t);
    return a.url === void 0 ? l : e(Link, { url: a.url, children: l }, t);
  });
}
//@ chunk-8jypjjdf.js:20697-20743 fingerprint = _temp (1)
function selectNotificationsCurrent(s) {
  return s.notifications.current;
}
/**
 * 输入框上方的 toast 通知行（第一行绘制时隐藏）。
 */
//@ chunk-8jypjjdf.js:20743-21713 placement
function PromptToast(o) {
  let d = w(18),
    { drawnOnRow1: drawnOnRow1 } = o,
    t = drawnOnRow1 === void 0 ? !1 : drawnOnRow1,
    l = useAppState(selectNotificationsCurrent),
    c = useAppState(Kj),
    m = Oy(),
    p = pTe();
  if (!l || !bye(l, c) || (m && KDe(l, p))) {
    return null;
  }
  if (t) {
    return null;
  }
  let f;
  if (d[0] !== l || d[1] !== m) ((f = m ? MRr(l) : void 0), (d[0] = l), (d[1] = m), (d[2] = f));
  else f = d[2];
  let h = f;
  if (h?.surface === "toast") {
    let u;
    if (d[3] !== l.key || d[4] !== h.text)
      ((u = e(ToastText, { text: h.text }, l.key)), (d[3] = l.key), (d[4] = h.text), (d[5] = u));
    else u = d[5];
    return u;
  }
  if ("jsx" in l) {
    let u;
    if (d[6] !== l.jsx || d[7] !== l.key)
      ((u = e(Text, { wrap: "truncate", children: l.jsx }, l.key)),
        (d[6] = l.jsx),
        (d[7] = l.key),
        (d[8] = u));
    else u = d[8];
    return u;
  }
  if ("segments" in l) {
    let u;
    if (d[9] !== l.segments)
      ((u = e(SegmentedText, { segments: l.segments })), (d[9] = l.segments), (d[10] = u));
    else u = d[10];
    let b;
    if (d[11] !== l.key || d[12] !== u)
      ((b = e(Text, { wrap: "truncate", children: u }, l.key)), (d[11] = l.key), (d[12] = u), (d[13] = b));
    else b = d[13];
    return b;
  }
  const u = !l.color;
  let b;
  if (d[14] !== l.color || d[15] !== l.text || d[16] !== u)
    ((b = e(Text, { color: l.color, dimColor: u, wrap: "truncate", children: l.text })),
      (d[14] = l.color),
      (d[15] = l.text),
      (d[16] = u),
      (d[17] = b));
  else b = d[17];
  return b;
}
//@ chunk-8jypjjdf.js:21713-21717 placement
j();
//@ chunk-8jypjjdf.js:21717-21747 placement
var xyo = 2,
  Qtn = 15,
  Ztn = qt(null);

export {
  jw,
  NOTIFICATION_TIMEOUT_MS,
  SegmentedText,
  useLatchedBridgeNotice,
  NotificationOverlay,
  Notifications,
  Ztn,
  Qtn,
  PromptToast,
  xyo,
};
