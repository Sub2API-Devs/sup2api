/**
 * components/PromptInput/PromptInputFooterLeftSide.tsx
 *
 * 页脚左侧：权限模式指示与 shift+tab 循环、双击退出提示、后台任务数、语音"按住说话"提示、PR 状态、其他 Claude 会话列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputFooterLeftSide.tsx
 * pieces: chunk-18hwfzwa.js (30), chunk-5cp2fssw.js (1)
 * attribution: placement 18, layout 8, fingerprint 5
 */
import { parse, parse as parse_2, parse as parse_3 } from "path";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import {
  permissionModeSymbol,
  permissionModeIndicator,
  permissionModeTitle,
  toExternalPermissionMode,
  isDefaultMode,
} from "../../utils/permissions/PermissionMode.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useAppState, useSetAppState, useAppState_2 } from "../../state/AppState.js";
import { gj, visibleArtifactFrames, ZT, ArtifactFramesPill } from "../artifacts/artifactFrames.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { useSession } from "../../context/session.js";
import { Q, j, yt, P, R, y, Kc, Rh } from "../../../vendor/react/cjs/react.production.js";
import { countVisibleTasks } from "../../utils/claudeInChrome/toolRendering.js";
import {
  useVisibleAgentTaskCount,
  TaskPanelFooterHints,
  hasEvictableIdleSubagent,
  getVisibleBackgroundTasks,
  Em,
} from "../CoordinatorAgentStatus.js";
import { shouldHideTasksFooter } from "../tasks/taskStatusUtils.js";
import { sequential } from "../../utils/sequential.js";
import { Jn, _C, wt } from "../../remote/remoteMode.js";
import { tabCycleState } from "../../hooks/useWorkspaceDiff.js";
import { isPublishToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import {
  normalizeIdeSelectionLabel,
  wJe,
  FooterStatusRow,
  KA,
  footerStatusStyle,
} from "./PromptInputFooterStatus.js";
import { PUn, StatusIcon } from "../design-system/StatusIcon.js";
import { hf, Gg, DOWN_RIGHT_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import { truncateToWidth, formatDuration } from "../../utils/format.js";
import { formatShortcutHint, KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { plural } from "../../utils/stringUtils.js";
import { uiSignals } from "../../state/uiSignals.js";
import { Me } from "../design-system/ThemeProvider.js";
import { R5 } from "../../services/feedbackDrafts.js";
import {
  tryStartDraftSeed,
  countSessionQueuedDrafts,
  seedSessionDraftCount,
} from "../../services/feedback/feedbackDrafts.js";
import { getSessionId, getIsRemoteMode } from "../../bootstrap/state.js";
import { useSubagentStatusLineTick } from "../../utils/subagentStatusLine.js";
import { vye } from "../../ink/hooks/use-terminal-focus.js";
import {
  usePrStatus,
  useBgSessionPr,
  INITIAL_STATE as INITIAL_STATE_2,
  khe,
  useFooterLinks,
  FooterLink,
} from "../../hooks/usePrStatus.js";
import { vhe } from "../../utils/detectRepository.js";
import { See, zM, prStatusHint } from "../../utils/ghPrStatus.js";
import { jho } from "../PrBadge.js";
import { setKeyedFooterLink } from "./footerLinks.js";
import { CURRENT_PR } from "./_new/CURRENT_PR.js";
import { Oy } from "./footerGates.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useMeasured, useSelection } from "../../ink/components/Input.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import {
  getCachedClientData,
  getGlobalConfig,
  subscribeGlobalConfigInstalled,
  saveGlobalConfig,
} from "../../utils/config.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { useForceRender } from "../../hooks/useForceRender.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { Xre } from "../../utils/transcriptDiagnostics.js";
import { useVoiceAvailable } from "../../hooks/useVoiceIntegration.js";
import { useHasSelection } from "../../ink/hooks/use-selection.js";
import { QPs } from "../../hooks/useTasksV2.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useStatusLineSuppressed } from "../StatusLine.js";
import { AgentsPill } from "./AgentsPill.js";
import { env } from "../../utils/env.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { resolveFooterIndicator } from "../../utils/messages/systemInit.js";
import { isModelMissingFromClientData } from "../../services/clientDataUrl.js";
import { P7 } from "../LogoV2/LogoV2.js";
import { useStatusNoticeLines } from "../StatusNotices.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeepHoldingHint } from "./VoiceIndicator.js";
import { BackgroundTaskStatus } from "../tasks/BackgroundTaskStatus.js";
import { OKn, aUt } from "../../utils/backgroundHandoff.js";
import { isXtermJs } from "../../ink/terminal.js";
import { getPlatform } from "../../utils/platform.js";
import { Byline } from "../design-system/Byline.js";

/**
 * 渲染带颜色的权限模式标签：模式符号 + 模式名 + " on"（bare 时不加）+ children。
 */
//@ chunk-18hwfzwa.js:678423-678969 placement
function PermissionModeLabel(props) {
  let $ = w(14),
    { mode: mode, bare: bare, children: children } = props,
    ke;
  if ($[0] !== mode) ((ke = themeColorOf(mode)), ($[0] = mode), ($[1] = ke));
  else ke = $[1];
  let Re;
  if ($[2] !== mode) ((Re = permissionModeSymbol(mode)), ($[2] = mode), ($[3] = Re));
  else Re = $[3];
  let Be;
  if ($[4] !== Re) ((Be = r(Text, { "aria-hidden": !0, children: [Re, " "] })), ($[4] = Re), ($[5] = Be));
  else Be = $[5];
  let He;
  if ($[6] !== mode) ((He = permissionModeIndicator(mode)), ($[6] = mode), ($[7] = He));
  else He = $[7];
  const We = bare ? "" : " on";
  let ze;
  if ($[8] !== children || $[9] !== ke || $[10] !== Be || $[11] !== He || $[12] !== We)
    ((ze = r(Text, { color: ke, children: [Be, He, We, children] })),
      ($[8] = children),
      ($[9] = ke),
      ($[10] = Be),
      ($[11] = He),
      ($[12] = We),
      ($[13] = ze));
  else ze = $[13];
  return ze;
}
//@ chunk-18hwfzwa.js:819599-819647 placement
function GA() {
  let h = useKeybindingContext();
  return "chat:cycleMode";
}
//@ chunk-18hwfzwa.js:819647-819693 placement
function Rj(h) {
  return permissionModeTitle(toExternalPermissionMode(h)).toLowerCase();
}
//@ chunk-18hwfzwa.js:819693-819726 placement
function RXe(h) {
  return bunStringWidth(Rj(h));
}
//@ chunk-18hwfzwa.js:819726-820072 placement
function PermissionModeLabel_2(h) {
  let $ = w(8),
    { mode: mode } = h,
    L;
  if ($[0] !== mode) ((L = toExternalPermissionMode(mode)), ($[0] = mode), ($[1] = L));
  else L = $[1];
  let ee = L === "bypassPermissions";
  const ke = ee ? "error" : void 0,
    Re = !ee;
  let Be;
  if ($[2] !== mode) ((Be = Rj(mode)), ($[2] = mode), ($[3] = Be));
  else Be = $[3];
  let He;
  if ($[4] !== ke || $[5] !== Re || $[6] !== Be)
    ((He = e(Text, { color: ke, dimColor: Re, children: Be })),
      ($[4] = ke),
      ($[5] = Re),
      ($[6] = Be),
      ($[7] = He));
  else He = $[7];
  return He;
}
//@ chunk-18hwfzwa.js:820072-820101 placement
var xXe = null,
  Eeo = 24,
  PXe = "  ";
//@ chunk-18hwfzwa.js:820101-822055 placement
function FooterLeftSide({
  toolPermissionContext: toolPermissionContext,
  rowWidth: rowWidth,
  showHint: showHint,
  isLoading: isLoading,
  tasksSelected: tasksSelected,
}) {
  let { columns: columns } = useTerminalSize(),
    Re = rowWidth === void 0 ? columns : rowWidth < 0 ? 0 : rowWidth,
    Be = useAppState((Yo) => Yo.tasks),
    He = useAppState((Yo) => Yo.remoteBackgroundTasks),
    We = useAppState((Yo) => Yo.viewingAgentTaskId),
    ze = useAppState((Yo) => Yo.viewSelectionMode),
    Xe = useAppState(
      (Yo) =>
        (Yo.footerSelection === "tasks" && Yo.coordinatorTaskIndex >= 0) ||
        Yo.footerSelection === "workflows",
    ),
    rt = useAppState((Yo) => Yo.frameUrls),
    kt = gj(),
    At = useAppState((Yo) => Yo.footerSelection === "frame"),
    lower = useShortcutDisplay_2("chat:cancel", "Chat", "esc").toLowerCase(),
    Ot = useShortcutDisplay_2(GA(), "Chat", "shift+tab"),
    host = useSession().host,
    Dt = Q(() => countVisibleTasks(Be, He), [Be, He]),
    Lt = useVisibleAgentTaskCount() > 0 || Dt > 0,
    oo = Q(
      () =>
        xXe !== null &&
        Object.values(Be).some((Yo) => shouldHideTasksFooter(Yo) && xXe.backgroundTaskDot(Yo) === "needsYou"),
      [Be],
    ),
    Xt = sequential.level === 0,
    io = null;
  if (Xe) return e(Box, { height: 1, overflow: "hidden", children: e(TaskPanelFooterHints, {}) });
  let so = Jn(),
    po = so ? _C("setPermissionMode") && !so.viewerOnly : !wt(),
    mode = toolPermissionContext.mode,
    cycled = tabCycleState.of(host).cycled,
    bo = po ? Oeo(mode) : null,
    Ao = visibleArtifactFrames(rt),
    Bo = Ao.length > 0 && isPublishToolEnabled() ? Ao[0] : void 0,
    Ro = Bo
      ? normalizeIdeSelectionLabel(Bo.sourceFile !== void 0 ? parse_3(Bo.sourceFile).name : Bo.title)
      : null,
    Ho = ze === "viewing-agent" && We !== void 0 ? Be[We] : void 0,
    Io = Ho !== void 0 && Ho.status !== "running",
    Wo = null;
  if (showHint) {
    if (Io) {
      if (Ho.type === "in_process_teammate" && lower !== "")
        Wo = footerHintSegment({ chord: lower, action: "return to team lead", format: { keyCase: "lower" } });
    } else if (isLoading) {
      if (lower !== "")
        Wo = footerHintSegment({ chord: lower, action: "interrupt", format: { keyCase: "lower" } });
    } else if (bo && !cycled && Ot !== "")
      Wo = footerHintSegment({ chord: Ot, action: "cycle", format: { keyCase: "lower" } });
  }
  let mn = {
      backgroundCount: Dt,
      needsYou: oo,
      frameCount: Ao.length,
      activeFrameName: Ro,
      frameOpenFailedUnseen: kt,
      tasksSelected: tasksSelected,
      frameSelected: At,
      colorless: Xt,
    },
    Cn = Lt || Ro !== null || !1,
    No = chooseFooterLayout({
      pill: bo,
      kept: [[]],
      sparse: BackgroundTasksPill(!1, mn),
      dense: BackgroundTasksPill(!0, mn),
      hint: null?.selected === !0 ? null.keys : Wo,
      keptSelected: null?.selected === !0,
      width: Cn ? Re - wJe : Re,
    }),
    vo = tasksSelected || At ? No.filter((Yo) => Yo.key !== "hint") : No;
  return e(FooterStatusRow, {
    left: vo.map((Yo) => Yo.node),
    width: Re,
    leading: Cn,
    leadingPressed: vo.some(
      (Yo) =>
        (Yo.key === "background" && tasksSelected) ||
        (Yo.key === "artifacts" && At) ||
        (Yo.key === "browser" && null?.selected === !0),
    ),
  });
}
/**
 * 在给定宽度下挑页脚左侧要显示的段：先尝试带提示的紧凑排列，再依次尝试稀疏/紧凑/去掉 artifacts/只留胶囊，取第一个放得下的。
 */
//@ chunk-18hwfzwa.js:822055-822523 placement
function chooseFooterLayout({
  pill: pill,
  kept: kept,
  sparse: sparse,
  dense: dense,
  hint: hint,
  keptSelected: keptSelected,
  width: width,
}) {
  let Be = kept[0] ?? [],
    He = keptSelected ? (kept.at(-1) ?? []) : [];
  if (hint !== null) {
    let found = kept.map((Xe) => [...dense, pill, ...Xe, hint].filter(AXe)).find((Xe) => KA(Xe) <= width);
    if (found !== void 0) return found;
  }
  let mapped = [
    [...sparse, pill, ...Be],
    ...kept.map((ze) => [...dense, pill, ...ze]),
    ...(pill === null
      ? []
      : [
          [...dense, pill, ...He],
          [...dense.filter((ze) => ze.key !== "artifacts"), pill, ...He],
          [pill, ...He],
        ]),
  ].map((ze) => ze.filter(AXe));
  return mapped.find((ze) => KA(ze) <= width) ?? (pill === null ? mapped[0] : mapped.at(-1)) ?? [];
}
//@ chunk-18hwfzwa.js:822523-822555 placement
function AXe(h) {
  return h !== null;
}
//@ chunk-18hwfzwa.js:822555-822630 placement
function Oeo(h) {
  return { key: "mode", width: RXe(h), node: e(PermissionModeLabel_2, { mode: h }, "mode") };
}
//@ chunk-18hwfzwa.js:822630-823262 placement
function BackgroundTasksPill(
  h,
  {
    backgroundCount: backgroundCount,
    needsYou: needsYou,
    frameCount: frameCount,
    activeFrameName: activeFrameName,
    frameOpenFailedUnseen: frameOpenFailedUnseen,
    tasksSelected: tasksSelected,
    frameSelected: frameSelected,
    colorless: colorless,
  },
) {
  let We = [];
  if (backgroundCount > 0) {
    let ze = `${backgroundCount} bg`;
    We.push({
      key: "background",
      width: bunStringWidth(ze) + (needsYou ? PUn() : 0),
      node: r(
        Text,
        {
          children: [
            e(Text, {
              ...footerStatusStyle(tasksSelected, colorless, "background"),
              dimColor: !tasksSelected,
              children: ze,
            }),
            needsYou && e(StatusIcon, { status: "needsYou", slot: "trailing" }),
          ],
        },
        "background",
      ),
    });
  }
  if (activeFrameName !== null) {
    let ze = h
        ? `${hf}${PXe}${frameCount}`
        : `${hf}${PXe}${frameCount}: ${truncateToWidth(activeFrameName, Eeo)}`,
      Xe = footerStatusStyle(frameSelected, colorless, frameOpenFailedUnseen ? "error" : "claude");
    We.push({
      key: "artifacts",
      width: bunStringWidth(ze),
      node: e(
        Text,
        {
          ...Xe,
          color: Xe.color ?? (frameOpenFailedUnseen ? "claude" : void 0),
          dimColor: !frameSelected && !frameOpenFailedUnseen,
          children: ze,
        },
        "artifacts",
      ),
    });
  }
  return We;
}
//@ chunk-18hwfzwa.js:823262-823375 placement
function footerHintSegment(h) {
  return {
    key: "hint",
    width: bunStringWidth(formatShortcutHint(h)),
    node: e(Text, { dimColor: !0, italic: !0, children: e(KeyboardShortcutHint, { ...h }) }, "hint"),
  };
}
//@ chunk-18hwfzwa.js:823375-823700 placement
function FeedbackDraftCount(h) {
  let $ = w(7),
    { count: count } = h;
  if (count <= 0) {
    return null;
  }
  let L;
  if ($[0] !== count) ((L = e(Text, { dimColor: !1, children: count })), ($[0] = count), ($[1] = L));
  else L = $[1];
  let ee;
  if ($[2] !== count) ((ee = plural(count, "feedback draft")), ($[2] = count), ($[3] = ee));
  else ee = $[3];
  let ke;
  if ($[4] !== L || $[5] !== ee)
    ((ke = r(Text, { dimColor: !0, children: [L, " ", ee] })), ($[4] = L), ($[5] = ee), ($[6] = ke));
  else ke = $[6];
  return ke;
}
//@ chunk-18hwfzwa.js:823700-823704 placement
j();
//@ chunk-18hwfzwa.js:823704-823791 placement
function Ahe() {
  return yt(uiSignals.feedbackNotice.subscribe, () => uiSignals.feedbackNotice.getState());
}
//@ chunk-18hwfzwa.js:823791-823942 placement
function useSessionDraftCount() {
  let h = Ahe(),
    { storageV5: storageV5 } = Me();
  return (
    P(() => {
      if (!R5() || !tryStartDraftSeed()) return;
      countSessionQueuedDrafts(getSessionId(), storageV5)
        .then(seedSessionDraftCount)
        .catch(() => {});
    }, [storageV5]),
    R5() ? h.sessionDraftCount : 0
  );
}
//@ chunk-18hwfzwa.js:823942-823993 layout
function selectPrUrlTemplate(zr) {
  return zr.settings?.prUrlTemplate;
}
//@ chunk-18hwfzwa.js:823993-824084 layout
function incrementVoiceFooterHintSeenCount(He) {
  return { ...He, voiceFooterHintSeenCount: (He.voiceFooterHintSeenCount ?? 0) + 1 };
}
//@ chunk-18hwfzwa.js:824084-824129 layout
var d3e = require("./chunk-yxywkh50.js"),
  Neo = 3;
/**
 * 页脚左侧：显示权限模式（shift+tab 循环 default/acceptEdits/plan/auto/bypass）、"Press Ctrl-C again to exit"、后台任务计数（可点开）、PR 状态、语音提示、catchupReplay/detach 提示。
 */
//@ chunk-18hwfzwa.js:824129-829071 fingerprint = PromptInputFooterLeftSide (0.393)
function PromptInputFooterLeftSide(t0) {
  let $ = w(65),
    {
      exitMessage: exitMessage,
      row1Hint: row1Hint,
      leftArrowDetachAvailable: leftArrowDetachAvailable,
      proactivityLevelStepped: proactivityLevelStepped,
      proactivityPillCollapsed: proactivityPillCollapsed,
      vimMode: vimMode,
      hideVimModeIndicator: hideVimModeIndicator,
      mode: mode,
      toolPermissionContext: toolPermissionContext,
      suppressHint: suppressHint,
      suppressHintExceptStatusline: suppressHintExceptStatusline,
      isInputEmpty: isInputEmpty,
      isLoading: isLoading,
      isExternalLoading: isExternalLoading,
      betweenCalls: betweenCalls,
      tasksSelected: tasksSelected,
      isPasting: isPasting,
      showExpandPasteHint: showExpandPasteHint,
      isSearching: isSearching,
      historyQuery: historyQuery,
      setHistoryQuery: setHistoryQuery,
      historyFailedMatch: historyFailedMatch,
      onOpenTasksDialog: onOpenTasksDialog,
      onOpenArtifacts: onOpenArtifacts,
      rowWidth: rowWidth,
      wrappedRowWidth: wrappedRowWidth,
    } = t0,
    bo = row1Hint === void 0 ? null : row1Hint,
    Ao = suppressHintExceptStatusline === void 0 ? suppressHint : suppressHintExceptStatusline,
    Bo = isExternalLoading === void 0 ? !1 : isExternalLoading,
    Ro = betweenCalls === void 0 ? !0 : betweenCalls;
  useSubagentStatusLineTick();
  let Ho = vye(),
    Wo;
  if ($[0] !== Ho) ((Wo = isPrStatusEnabled(Ho) && !wt()), ($[0] = Ho), ($[1] = Wo));
  else Wo = $[1];
  let mn = Wo,
    Cn = usePrStatus(isLoading, mn),
    No = useBgSessionPr(),
    vo;
  if ($[2] !== No || $[3] !== Cn.pr || $[4] !== mn)
    ((vo =
      mn && Cn.pr
        ? Cn.pr
        : No
          ? { number: No.number, url: No.url, reviewState: void 0, kind: vhe(No.url) ? "mr" : void 0 }
          : null),
      ($[2] = No),
      ($[3] = Cn.pr),
      ($[4] = mn),
      ($[5] = vo));
  else vo = $[5];
  let Yo = vo,
    kn = !Yo && mn && Cn.needsAuth,
    Fn = useAppState(selectPrUrlTemplate),
    bn;
  if ($[6] !== Yo || $[7] !== Fn)
    ((bn = Yo ? See(Yo.url, Fn) : void 0), ($[6] = Yo), ($[7] = Fn), ($[8] = bn));
  else bn = $[8];
  jho(bn, Yo?.url, Yo?.kind);
  let Go = useSetAppState(),
    hn = Yo?.number,
    Mn = Yo?.url,
    Xo = Yo?.reviewState,
    Sn = Yo?.kind,
    $n;
  if ($[9] !== Cn.lastUpdated)
    (($n = Cn.lastUpdated > 0 || zM().pollerDisabled), ($[9] = Cn.lastUpdated), ($[10] = $n));
  else $n = $[10];
  let on = $n,
    _o,
    cn;
  if (
    $[11] !== Sn ||
    $[12] !== hn ||
    $[13] !== Xo ||
    $[14] !== Mn ||
    $[15] !== on ||
    $[16] !== Fn ||
    $[17] !== Go
  )
    ((cn = () => {
      Go((Dn) => {
        let wn =
          !on &&
          Dn.prStatus !== null &&
          (hn === void 0 ||
            (hn === Dn.prStatus.number &&
              Dn.prStatus.kind === Sn &&
              Xo === void 0 &&
              Dn.prStatus.reviewState !== void 0));
        let mr =
          Dn.prStatus?.number === hn &&
          Dn.prStatus?.url === Mn &&
          Dn.prStatus?.reviewState === Xo &&
          Dn.prStatus?.kind === Sn;
        let Kn =
          wn || mr
            ? Dn.prStatus
            : hn !== void 0 && Mn !== void 0
              ? { number: hn, url: Mn, reviewState: Xo, kind: Sn }
              : null;
        let Wn = setKeyedFooterLink(
          Dn.footerLinks,
          CURRENT_PR,
          INITIAL_STATE_2(Kn, Kn ? (Kn.kind !== void 0 ? Kn.url : See(Kn.url, Fn)) : void 0),
        );
        if (Kn === Dn.prStatus && Wn === Dn.footerLinks) {
          return Dn;
        }
        return { ...Dn, prStatus: Kn, footerLinks: Wn };
      });
    }),
      (_o = [hn, Mn, Xo, Sn, on, Fn, Go]),
      ($[11] = Sn),
      ($[12] = hn),
      ($[13] = Xo),
      ($[14] = Mn),
      ($[15] = on),
      ($[16] = Fn),
      ($[17] = Go),
      ($[18] = _o),
      ($[19] = cn));
  else ((_o = $[18]), (cn = $[19]));
  P(cn, _o);
  let Fr, Zn;
  if ($[20] !== kn || $[21] !== Go)
    ((Fr = () => {
      Go((Un) => (Un.prNeedsAuth === kn ? Un : { ...Un, prNeedsAuth: kn }));
    }),
      (Zn = [kn, Go]),
      ($[20] = kn),
      ($[21] = Go),
      ($[22] = Fr),
      ($[23] = Zn));
  else ((Fr = $[22]), (Zn = $[23]));
  P(Fr, Zn);
  let dr = Oy(),
    or = R(null),
    pr;
  if ($[24] === MEMO_CACHE_SENTINEL)
    ((pr = () => (or.current === null ? 0 : measureElement(or.current).width)), ($[24] = pr));
  else pr = $[24];
  let Qn = useMeasured(pr);
  if (!dr && exitMessage.show) {
    const key = exitMessage.key;
    const Ir = isBgSession() || _C("catchupReplay") ? "detach (session keeps running)" : "exit";
    let Pr;
    if ($[25] !== exitMessage.key)
      ((Pr = r(Text, { dimColor: !0, children: ["Press ", key, " again to", " ", Ir] }, "exit-message")),
        ($[25] = exitMessage.key),
        ($[26] = Pr));
    else Pr = $[26];
    return Pr;
  }
  if (!dr && isPasting) {
    let ur;
    if ($[27] === MEMO_CACHE_SENTINEL)
      ((ur = e(Text, { dimColor: !0, children: "Pasting\u2026" }, "pasting-message")), ($[27] = ur));
    else ur = $[27];
    return ur;
  }
  if (!dr && showExpandPasteHint && !isSearching) {
    let ur;
    if ($[28] === MEMO_CACHE_SENTINEL)
      ((ur = e(Text, { dimColor: !0, children: "paste again to expand" }, "expand-paste-hint")),
        ($[28] = ur));
    else ur = $[28];
    return ur;
  }
  let ts = vimMode !== void 0 && !hideVimModeIndicator && vimMode !== "NORMAL" && !isSearching,
    Gn = (ts ? bunStringWidth(`-- ${vimMode} --`) + 1 : 0) + (isSearching ? Qn + 1 : 0),
    Ur = rowWidth === void 0 ? void 0 : rowWidth - Gn,
    Zr = wrappedRowWidth === void 0 ? void 0 : wrappedRowWidth - Gn,
    ur;
  if (
    $[29] !== historyFailedMatch ||
    $[30] !== historyQuery ||
    $[31] !== dr ||
    $[32] !== isSearching ||
    $[33] !== setHistoryQuery
  )
    ((ur =
      isSearching &&
      e(Box, {
        ref: or,
        flexShrink: dr ? 0 : 1,
        children: e(khe, {
          value: historyQuery,
          onChange: setHistoryQuery,
          historyFailedMatch: historyFailedMatch,
        }),
      })),
      ($[29] = historyFailedMatch),
      ($[30] = historyQuery),
      ($[31] = dr),
      ($[32] = isSearching),
      ($[33] = setHistoryQuery),
      ($[34] = ur));
  else ur = $[34];
  let Ir;
  if ($[35] !== ts || $[36] !== vimMode)
    ((Ir = ts
      ? e(
          Box,
          { flexShrink: 0, children: r(Text, { dimColor: !0, children: ["-- ", vimMode, " --"] }) },
          "vim-indicator",
        )
      : null),
      ($[35] = ts),
      ($[36] = vimMode),
      ($[37] = Ir));
  else Ir = $[37];
  let Pr;
  if (
    $[38] !== Ro ||
    $[39] !== Ur ||
    $[40] !== Zr ||
    $[41] !== Bo ||
    $[42] !== dr ||
    $[43] !== isInputEmpty ||
    $[44] !== isLoading ||
    $[45] !== isSearching ||
    $[46] !== leftArrowDetachAvailable ||
    $[47] !== mode ||
    $[48] !== onOpenArtifacts ||
    $[49] !== onOpenTasksDialog ||
    $[50] !== kn ||
    $[51] !== proactivityLevelStepped ||
    $[52] !== proactivityPillCollapsed ||
    $[53] !== bo ||
    $[54] !== ts ||
    $[55] !== suppressHint ||
    $[56] !== Ao ||
    $[57] !== tasksSelected ||
    $[58] !== toolPermissionContext ||
    $[59] !== vimMode
  )
    ((Pr = dr
      ? bo !== null
        ? e(
            Box,
            {
              height: 1,
              width: Ur === void 0 ? void 0 : Math.max(0, Ur),
              overflow: "hidden",
              children: e(Text, { dimColor: !0, italic: !0, wrap: "truncate-end", children: bo.text }),
            },
            bo.id,
          )
        : e(FooterLeftSide, {
            toolPermissionContext: toolPermissionContext,
            showHint: !Ao && !ts,
            isLoading: isLoading,
            rowWidth: Ur,
            tasksSelected: tasksSelected,
          })
      : e(ModeIndicator, {
          mode: mode,
          toolPermissionContext: toolPermissionContext,
          showHint: !suppressHint && !ts,
          denseShowHint: !Ao && !ts,
          denseVimOnlySuppression: !Ao && ts,
          vimIndicatorShown: ts,
          vimBlocksGesture: vimMode === "VISUAL" || vimMode === "VISUAL LINE",
          isInputEmpty: isInputEmpty,
          isLoading: isLoading,
          isExternalLoading: Bo,
          betweenCalls: Ro,
          leftArrowDetachAvailable: leftArrowDetachAvailable,
          tasksSelected: tasksSelected,
          onOpenTasksDialog: onOpenTasksDialog,
          onOpenArtifacts: onOpenArtifacts,
          prNeedsAuth: kn,
          levelPillCollapsed: proactivityPillCollapsed,
          levelStepped: proactivityLevelStepped,
          rowWidth: isSearching ? void 0 : Ur,
          wrappedRowWidth: isSearching ? void 0 : Zr,
          isSearching: isSearching,
        })),
      ($[38] = Ro),
      ($[39] = Ur),
      ($[40] = Zr),
      ($[41] = Bo),
      ($[42] = dr),
      ($[43] = isInputEmpty),
      ($[44] = isLoading),
      ($[45] = isSearching),
      ($[46] = leftArrowDetachAvailable),
      ($[47] = mode),
      ($[48] = onOpenArtifacts),
      ($[49] = onOpenTasksDialog),
      ($[50] = kn),
      ($[51] = proactivityLevelStepped),
      ($[52] = proactivityPillCollapsed),
      ($[53] = bo),
      ($[54] = ts),
      ($[55] = suppressHint),
      ($[56] = Ao),
      ($[57] = tasksSelected),
      ($[58] = toolPermissionContext),
      ($[59] = vimMode),
      ($[60] = Pr));
  else Pr = $[60];
  let wr;
  if ($[61] !== ur || $[62] !== Ir || $[63] !== Pr)
    ((wr = r(Box, { justifyContent: "flex-start", gap: 1, children: [ur, Ir, Pr] })),
      ($[61] = ur),
      ($[62] = Ir),
      ($[63] = Pr),
      ($[64] = wr));
  else wr = $[64];
  return wr;
}
//@ chunk-18hwfzwa.js:829071-829099 layout
function rto(h) {
  return null;
}
//@ chunk-18hwfzwa.js:829099-829124 layout
function sto(h) {
  return 0;
}
//@ chunk-18hwfzwa.js:829124-829169 layout
function getFooterIndicatorConfig() {
  return getCachedClientData()?.footer_indicator;
}
/**
 * 权限模式指示与切换提示（shift+tab），含 frame/artifact 链接（tengu_copper_thistle）。
 */
//@ chunk-18hwfzwa.js:829169-839108 fingerprint = ModeIndicator (0.519)
function ModeIndicator({
  mode: mode,
  toolPermissionContext: toolPermissionContext,
  showHint: showHint,
  denseShowHint: denseShowHint,
  denseVimOnlySuppression: denseVimOnlySuppression,
  vimBlocksGesture: vimBlocksGesture,
  vimIndicatorShown: vimIndicatorShown,
  isInputEmpty: isInputEmpty,
  isLoading: isLoading,
  isExternalLoading: isExternalLoading,
  betweenCalls: betweenCalls,
  leftArrowDetachAvailable: leftArrowDetachAvailable,
  tasksSelected: tasksSelected,
  onOpenTasksDialog: onOpenTasksDialog,
  onOpenArtifacts: onOpenArtifacts,
  prNeedsAuth: prNeedsAuth,
  levelPillCollapsed: levelPillCollapsed,
  levelStepped: levelStepped,
  rowWidth: rowWidth,
  wrappedRowWidth: wrappedRowWidth,
  isSearching: isSearching = !1,
}) {
  let Xt = useIsFullscreen(),
    { columns: columns } = useTerminalSize(),
    so = ZT(),
    po = useAppState((yi) => yi.footerSelection === "frame"),
    ao = wt(),
    co = useAppState((yi) => (ao ? visibleArtifactFrames(yi.frameUrls).length : 0)),
    bo = ao && co === 1 ? "open in browser" : "view artifacts";
  useForceRender();
  let Ao = getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_thistle", !1),
    Bo = useShortcutDisplay_2(GA(), "Chat", "shift+tab"),
    tasks = useAppState((yi) => yi.tasks),
    tasks_2 = useAppState((yi) => yi.remoteBackgroundTasks),
    taskDecorations = useAppState((s_0) => s_0.taskDecorations),
    store = Xre(),
    viewSelectionMode = useAppState(
      (s_1) =>
        (s_1.footerSelection === "tasks" && s_1.coordinatorTaskIndex >= 0) ||
        s_1.footerSelection === "workflows",
    ),
    viewingAgentTaskId = useAppState((s_2) => s_2.footerSelection !== null),
    viewSelectionMode_2 = useAppState((s_3) => s_3.viewSelectionMode),
    viewingAgentTaskId_2 = useAppState((yi) => yi.viewingAgentTaskId),
    expandedView = useAppState((yi) => yi.expandedView),
    kn = useFooterLinks({ excludeKeyed: Ao }),
    Fn = R(null),
    bn = R(null),
    Go = R(null),
    hn = R(null),
    Mn = null,
    Xo = 0,
    Sn = 0,
    $n = 0,
    on = null,
    attentionBudget = useAppState((yi) => yi.attentionBudget),
    proactivityLevel = useAppState((s_4) => s_4.proactivityLevel),
    Dn = useVoiceAvailable(),
    wn = useAppState_2((s_5) => s_5.voiceState),
    mr = useAppState_2((s_6) => s_6.voiceWarmingUp),
    hasSelection = useHasSelection(),
    selGetState = useSelection().getState,
    isCoordinatorMode = d3e.isCoordinatorMode(),
    runningTaskCount = Q(() => countVisibleTasks(tasks, tasks_2), [tasks, tasks_2, store]),
    tasksV2 = QPs(),
    escShortcut = useShortcutDisplay_2("chat:cancel", "Chat", "esc").toLowerCase(),
    todosShortcut = useShortcutDisplay_2("app:toggleTodos", "Global", "ctrl+t"),
    pr = useShortcutDisplay_2("voice:pushToTalk", "Chat", "space"),
    Qn = useShortcutDisplay("footer:openSelected", "Footer", "enter"),
    [ur] = y(() => {
      let yi = announcementState();
      if (yi.voiceFooterHintUnderCap === void 0)
        yi.voiceFooterHintUnderCap = (getGlobalConfig().voiceFooterHintSeenCount ?? 0) < Neo;
      return yi.voiceFooterHintUnderCap;
    }),
    Ir = useIsScreenReaderEnabled(),
    Pr = useStatusLineSuppressed(),
    ts = AgentsPill({
      available: leftArrowDetachAvailable && isInputEmpty && !viewingAgentTaskId && !vimBlocksGesture,
      restingHintExpired: useAppState((prev) => prev.agentsHintExpired === !0),
    }),
    Gn = useSessionDraftCount(),
    Ur = yt(subscribeGlobalConfigInstalled, getFooterIndicatorConfig),
    CLAUDE_CODE_FOOTER_INDICATOR = env.CLAUDE_CODE_FOOTER_INDICATOR,
    wr = useMainLoopModel_3(),
    zr = Q(
      () => resolveFooterIndicator(CLAUDE_CODE_FOOTER_INDICATOR, wr, Ur),
      [CLAUDE_CODE_FOOTER_INDICATOR, wr, Ur],
    ),
    _r = Q(() => isModelMissingFromClientData(wr), [wr]),
    fr = P7("zdr"),
    $r = P7("ldr"),
    isKillAgentsConfirmShowing = useStatusNoticeLines(mode === "bash");
  if (mode === "bash") return e(Text, { color: "bashBorder", children: "! for shell mode" });
  let Er = toolPermissionContext?.mode,
    Vr = Jn(),
    ms = !Vr && !wt(),
    Xs = ms ? rto(attentionBudget) : null,
    Ls = ms ? sto(attentionBudget) : 0,
    hasActiveMode = !isDefaultMode(Er),
    ws = viewingAgentTaskId_2 ? tasks[viewingAgentTaskId_2] : void 0,
    Ci = viewSelectionMode_2 === "viewing-agent" && ws?.type === "in_process_teammate",
    oi = !1,
    Oi = 0,
    Hi = oi && levelStepped && !levelPillCollapsed && !viewingAgentTaskId && !isLoading && !mr,
    Zi = Ci && ws != null && ws.status !== "running",
    da = runningTaskCount > 0,
    qn = (isCoordinatorMode || hasActiveMode ? 1 : 0) + (da ? 1 : 0),
    ps =
      !Ao && prNeedsAuth && !kn.some((yi) => yi.key === CURRENT_PR)
        ? e(Text, { dimColor: !0, children: prStatusHint(prNeedsAuth) }, "pr-status")
        : null,
    xs = null,
    kr = xs
      ? r(
          Text,
          { color: "success", children: [r(Text, { "aria-hidden": !0, children: [re.lozenge, " "] }), xs] },
          "retention",
        )
      : null,
    ls = _r
      ? r(
          Text,
          {
            color: "warning",
            children: [r(Text, { "aria-hidden": !0, children: [Gg, " "] }), "wrong model?"],
          },
          "footer-indicator",
        )
      : zr
        ? r(
            Text,
            { color: "ide", children: [r(Text, { "aria-hidden": !0, children: [re.lozenge, " "] }), zr] },
            "footer-indicator",
          )
        : null,
    qs = (_r ? bunStringWidth(`${Gg} wrong model?`) + 3 : zr ? bunStringWidth(zr) + 5 : 0) + Ls + Oi,
    gs =
      qn < 2 &&
      !((ps || kn.length > 0) && columns < 60 + (kr ? 8 : 0) + qs) &&
      !(kr && columns < 56 + qs) &&
      !(ls && columns < 48 + qs) &&
      !(Xs && columns < 48 + Ls + Oi),
    es = Vr ? _C("setPermissionMode") && !Vr.viewerOnly : !wt(),
    ds = !Ir && hasEvictableIdleSubagent(tasks, viewingAgentTaskId_2);
  if (viewSelectionMode)
    return e(Box, { height: 1, overflow: "hidden", children: e(TaskPanelFooterHints, {}) });
  if (Ao) {
    let yi = runningTaskCount,
      Ws = yi >= 2,
      za = runningTaskCount >= 1,
      cl = !!Er && es,
      Ol =
        getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId_2).length > 0 ||
        (!store && viewingAgentTaskId_2 !== void 0 && Em(tasks[viewingAgentTaskId_2])),
      as = leftArrowDetachAvailable && !Ci && isInputEmpty && !viewingAgentTaskId && !vimBlocksGesture,
      pi = Dn && wn === "idle" && ur && showHint && pr !== "",
      qa = "none";
    if (Dn && mr) qa = "warmup";
    else if (Zi) qa = "interrupt";
    else if (!denseShowHint) qa = denseVimOnlySuppression && as && ts !== null && !Ir ? "agents" : "none";
    else if (isLoading) qa = as && ts !== null && !Ir ? "interrupt_agents" : "interrupt";
    else if (po) qa = "artifacts";
    else if (on?.selected) qa = "none";
    else if ((za || Ol) && !viewSelectionMode) qa = "manage";
    else if (tasksV2) qa = "ctrl_t";
    else if (as && !Ir) qa = ts !== null ? "agents" : "none";
    else if (ds) qa = "none";
    else if (pi) qa = "voice";
    else if (cl && (hasActiveMode || oi) && Bo !== "") qa = "cycle";
    else qa = showHint && !Ir ? "shortcuts" : "none";
    let pd =
        qa === "cycle" && !oi
          ? formatShortcutHint({ chord: Bo, action: "cycle", parens: !0, format: { keyCase: "lower" } })
          : qa === "manage" && za && (!tasksSelected || Qn)
            ? tasksSelected
              ? formatShortcutHint({ chord: Qn, action: "view tasks", parens: !0 })
              : formatShortcutHint({ chord: "down", action: "manage", parens: !0 })
            : "",
      $l = pd === "" ? 0 : 1 + bunStringWidth(pd),
      Yi = on !== null && Mn !== null && Mn >= Sn,
      El = Mn === null ? null : Mn + (Yi ? 0 : (wrappedRowWidth ?? rowWidth ?? 0) - (rowWidth ?? 0)),
      Ll = on !== null && El !== null && $l > 0 && El - $l < Sn;
    if (Ll) qa = "none";
    let _c = isSearching ? Sn : El === null ? void 0 : Math.max(Sn, El - (Ll ? 0 : $l) - $n),
      mc = null,
      Vd = expandedView === "tasks" ? "hide tasks" : "show tasks",
      cd =
        qa === "cycle" && pd !== "" && Er
          ? e(Box, {
              ref: bn,
              children: r(Text, { color: themeColorOf(Er), dimColor: !0, children: [" ", pd] }),
            })
          : null,
      Ka =
        qa === "manage" && pd !== ""
          ? e(Box, { ref: bn, children: r(Text, { dimColor: !0, children: [" ", pd] }) })
          : null,
      pl = null;
    if (qa === "warmup") pl = e(KeepHoldingHint, {}, "voice-warmup");
    else if (qa === "manage" && !za && (!tasksSelected || Qn))
      pl = e(Text, {
        dimColor: !0,
        children: tasksSelected
          ? e(KeyboardShortcutHint, { chord: Qn, action: "view tasks" })
          : e(KeyboardShortcutHint, { chord: "down", action: "manage" }),
      });
    else if (qa === "artifacts" && Qn)
      pl = e(Text, { dimColor: !0, children: e(KeyboardShortcutHint, { chord: Qn, action: bo }) });
    else if (qa === "interrupt" || qa === "interrupt_agents")
      pl = r(Fragment, {
        children: [
          r(Text, {
            dimColor: !0,
            children: [
              e(KeyboardShortcutHint, {
                chord: escShortcut,
                action: Zi ? "return to team lead" : "interrupt",
                format: { keyCase: "lower" },
              }),
              qa === "interrupt_agents" && " \xB7 ",
            ],
          }),
          qa === "interrupt_agents" && ts,
        ],
      });
    else if (qa === "ctrl_t")
      pl = e(Text, {
        dimColor: !0,
        children: e(KeyboardShortcutHint, { chord: todosShortcut, action: Vd, format: { keyCase: "lower" } }),
      });
    else if (qa === "agents") pl = ts;
    else if (qa === "voice") pl = e(VoiceHoldToSpeakHint, { keyDisplay: pr });
    else if (qa === "shortcuts") pl = e(Text, { dimColor: !0, children: "? for shortcuts" });
    let Gl =
      cl && Er
        ? r(Box, { flexShrink: 0, children: [e(PermissionModeLabel, { mode: Er }), cd] }, "mode")
        : null;
    if (Hi && Gl) return e(Box, { height: 1, overflow: "hidden", children: Gl });
    let gd = za
      ? Ws
        ? e(BackgroundTaskCountPill, { count: yi, selected: tasksSelected, onClick: onOpenTasksDialog })
        : e(BackgroundTaskStatus, { tasksSelected: tasksSelected, onOpenDialog: onOpenTasksDialog })
      : null;
    if (!Gl && !Xs && !kr && !ls && !gd && !so && !on && kn.length === 0 && !pl && Gn === 0 && !ds)
      return Xt ? e(Text, { children: " " }) : null;
    let hd = gd || so || on || kn.length > 0,
      bd = e(Text, { dimColor: !0, children: " \xB7 " }),
      Od = !!(hd || Gl || Xs || kr || ls),
      pc = Od || ds,
      Kd = pc || !!pl,
      ec = r(Fragment, {
        children: [
          ds && r(Text, { wrap: "truncate", children: [Od && bd, e(TasksForSubagentsHint, {})] }),
          pl && r(Text, { wrap: "truncate", children: [pc && bd, pl] }),
          Gn > 0 && r(Text, { wrap: "truncate", children: [Kd && bd, e(FeedbackDraftCount, { count: Gn })] }),
        ],
      });
    return r(Box, {
      height: 1,
      overflow: "hidden",
      maxWidth: Yi ? Math.max(0, rowWidth ?? 0) : void 0,
      children: [
        r(Box, {
          ref: Fn,
          flexShrink: 0,
          children: [
            Gl,
            Gl &&
              (Xs || kr || ls || hd) &&
              e(Box, { flexShrink: 0, children: e(Text, { dimColor: !0, children: " \xB7 " }) }),
            Xs &&
              r(Box, {
                flexShrink: 0,
                children: [Xs, (kr || ls || hd) && e(Text, { dimColor: !0, children: " \xB7 " })],
              }),
            kr &&
              r(Box, {
                flexShrink: 0,
                children: [kr, (ls || hd) && e(Text, { dimColor: !0, children: " \xB7 " })],
              }),
            ls &&
              r(Box, { flexShrink: 0, children: [ls, hd && e(Text, { dimColor: !0, children: " \xB7 " })] }),
            gd &&
              r(Box, {
                flexShrink: 0,
                children: [
                  gd,
                  Ka,
                  (so || on || kn.length > 0) && e(Text, { dimColor: !0, children: " \xB7 " }),
                ],
              }),
            so &&
              r(Box, {
                flexShrink: 0,
                children: [
                  e(ArtifactFramesPill, { onOpen: onOpenArtifacts }),
                  (on || kn.length > 0) && e(Text, { dimColor: !0, children: " \xB7 " }),
                ],
              }),
          ],
        }),
        on &&
          r(Box, {
            flexShrink: 0,
            children: [
              e(Text, { children: mc }),
              kn.length > 0 && e(Text, { dimColor: !0, children: " \xB7 " }),
            ],
          }),
        kn.length > 0 &&
          e(Box, {
            ref: Go,
            flexShrink: 0,
            children: kn.map((qu, Ku) =>
              r(
                Box,
                {
                  flexShrink: 0,
                  children: [
                    e(FooterLink, { link: qu }),
                    Ku < kn.length - 1 && e(Text, { dimColor: !0, children: " \xB7 " }),
                  ],
                },
                qu.url,
              ),
            ),
          }),
        on ? e(Box, { ref: hn, flexShrink: 0, children: ec }) : ec,
      ],
    });
  }
  let mapped = kn.map((t_2) => e(FooterLink, { link: t_2 }, t_2.key ?? t_2.url)),
    _s = [...(on ? [on.pill] : [])];
  if (ds) _s.push(e(TasksForSubagentsHint, {}, "tasks-subagents"));
  let fs = showHint ? getSpinnerHintParts(isLoading, escShortcut, todosShortcut, tasksV2, expandedView) : [];
  if (Zi)
    _s.push(
      e(
        Text,
        {
          dimColor: !0,
          children: e(KeyboardShortcutHint, {
            chord: escShortcut,
            action: "return to team lead",
            format: { keyCase: "lower" },
          }),
        },
        "esc-return",
      ),
    );
  else if (showHint) _s.push(...fs);
  let ii =
      (isBgSession() || getIsRemoteMode()) &&
      leftArrowDetachAvailable &&
      isInputEmpty &&
      !viewingAgentTaskId &&
      !vimBlocksGesture &&
      !Ir
        ? ts
        : null,
    La =
      !Pr &&
      !Ci &&
      isInputEmpty &&
      !viewingAgentTaskId &&
      !vimBlocksGesture &&
      OKn(
        aUt({
          isBg: isBgSession(),
          isLoading: isLoading,
          isExternalLoading: isExternalLoading,
          betweenCalls: betweenCalls,
          inFlight: { count: 0, kinds: [] },
        }),
      ) &&
      getGlobalConfig().leftArrowOpensAgents !== !1 &&
      !Ir &&
      ts !== null
        ? e(Kc, { children: ts }, "fg-agents")
        : null,
    Xa =
      getVisibleBackgroundTasks(tasks, taskDecorations, viewingAgentTaskId_2).length > 0 ||
      (!store && viewingAgentTaskId_2 !== void 0 && Em(tasks[viewingAgentTaskId_2])),
    dl = da
      ? e(BackgroundTaskStatus, { tasksSelected: tasksSelected, onOpenDialog: onOpenTasksDialog })
      : null;
  if (
    _s.length === 0 &&
    !dl &&
    !(Er && es && hasActiveMode) &&
    !ps &&
    mapped.length === 0 &&
    !ii &&
    showHint
  ) {
    if (!Ir) _s.push(e(Text, { dimColor: !0, children: "? for shortcuts" }, "shortcuts-hint"));
  }
  if (La) _s.push(La);
  if (Gn > 0) _s.push(e(FeedbackDraftCount, { count: Gn }, "feedback-drafts"));
  let Vl = getGlobalConfig().copyOnSelect ?? !0,
    Hd = hasSelection && (!Vl || isXtermJs());
  if (Dn && mr) _s.push(e(KeepHoldingHint, {}, "voice-warmup"));
  else if (Xt && Hd) {
    let yi = getPlatform() === "macos",
      Ws = yi && (selGetState()?.lastPressHadAlt ?? !1);
    _s.push(
      e(
        Text,
        {
          dimColor: !0,
          children: r(Byline, {
            children: [
              !Vl && e(KeyboardShortcutHint, { chord: "ctrl+c", action: "copy" }),
              isXtermJs() &&
                (Ws
                  ? e(Text, { children: "set macOptionClickForcesSelection in VS Code settings" })
                  : r(Text, { children: [yi ? "option+click" : "shift+click", " to native select"] })),
            ],
          }),
        },
        "selection-copy",
      ),
    );
  } else if (_s.length > 0 && showHint && Dn && wn === "idle" && fs.length === 0 && ur && pr !== "")
    _s.push(e(VoiceHoldToSpeakHint, { keyDisplay: pr }, "voice-hint"));
  if ((dl || Xa) && showHint && !viewSelectionMode && !po && (!tasksSelected || Qn))
    _s.push(
      e(
        Text,
        {
          dimColor: !0,
          children: tasksSelected
            ? e(KeyboardShortcutHint, { chord: Qn, action: "view tasks" })
            : e(KeyboardShortcutHint, { chord: "down", action: "manage" }),
        },
        "manage-tasks",
      ),
    );
  if (po && showHint && Qn)
    _s.push(
      e(
        Text,
        { dimColor: !0, children: e(KeyboardShortcutHint, { chord: Qn, action: bo }) },
        "view-artifacts",
      ),
    );
  let Ss =
    Er && es
      ? e(
          Box,
          {
            flexShrink: 0,
            children: e(PermissionModeLabel, {
              mode: Er,
              children:
                hasActiveMode &&
                gs &&
                r(Text, {
                  dimColor: !0,
                  children: [
                    " ",
                    e(KeyboardShortcutHint, {
                      chord: Bo,
                      action: "cycle",
                      parens: !0,
                      format: { keyCase: "lower" },
                    }),
                  ],
                }),
            }),
          },
          "mode",
        )
      : null;
  if (Hi && Ss) return e(Box, { height: 1, overflow: "hidden", children: Ss });
  if (_s.length === 0 && !dl && !Ss && !Xs && !kr && !ls && !ps && mapped.length === 0 && !ii && !so)
    return Xt ? e(Text, { children: " " }) : null;
  return r(Box, {
    height: 1,
    overflow: "hidden",
    children: [
      Ss,
      Ss &&
        (Xs || kr || ls || ii || ps || mapped.length > 0 || dl || so || _s.length > 0) &&
        e(Box, { flexShrink: 0, children: e(Text, { dimColor: !0, children: " \xB7 " }) }),
      Xs &&
        r(Box, {
          flexShrink: 0,
          children: [
            Xs,
            (kr || ls || ii || ps || mapped.length > 0 || dl || so || _s.length > 0) &&
              e(Text, { dimColor: !0, children: " \xB7 " }),
          ],
        }),
      kr &&
        r(Box, {
          flexShrink: 0,
          children: [
            kr,
            (ls || ii || ps || mapped.length > 0 || dl || so || _s.length > 0) &&
              e(Text, { dimColor: !0, children: " \xB7 " }),
          ],
        }),
      ls &&
        r(Box, {
          flexShrink: 0,
          children: [
            ls,
            (ii || ps || mapped.length > 0 || dl || so || _s.length > 0) &&
              e(Text, { dimColor: !0, children: " \xB7 " }),
          ],
        }),
      ii &&
        r(Box, {
          flexShrink: 0,
          children: [
            ii,
            (ps || mapped.length > 0 || dl || so || _s.length > 0) &&
              e(Text, { dimColor: !0, children: " \xB7 " }),
          ],
        }),
      ps &&
        r(Box, {
          flexShrink: 0,
          children: [
            ps,
            (mapped.length > 0 || dl || so || _s.length > 0) && e(Text, { dimColor: !0, children: " \xB7 " }),
          ],
        }),
      mapped.length > 0 &&
        r(Box, {
          flexShrink: 0,
          children: [
            e(Byline, { children: mapped }),
            (dl || so || _s.length > 0) && e(Text, { dimColor: !0, children: " \xB7 " }),
          ],
        }),
      dl &&
        r(Box, {
          flexShrink: 0,
          children: [dl, (so || _s.length > 0) && e(Text, { dimColor: !0, children: " \xB7 " })],
        }),
      so &&
        r(Box, {
          flexShrink: 0,
          children: [
            e(ArtifactFramesPill, { onOpen: onOpenArtifacts }),
            _s.length > 0 && e(Text, { dimColor: !0, children: " \xB7 " }),
          ],
        }),
      _s.length > 0 && e(Text, { wrap: "truncate", children: e(Byline, { children: _s }) }),
    ],
  });
}
//@ chunk-18hwfzwa.js:839108-839458 layout
function VoiceHoldToSpeakHint(h) {
  let $ = w(5),
    { keyDisplay: keyDisplay } = h,
    { storageV5: storageV5 } = Me(),
    ee,
    ke;
  if ($[0] !== storageV5)
    ((ee = () => {
      let Re = announcementState();
      if (Re.voiceFooterHintCounted) {
        return;
      }
      ((Re.voiceFooterHintCounted = !0), saveGlobalConfig(incrementVoiceFooterHintSeenCount, storageV5));
    }),
      (ke = [storageV5]),
      ($[0] = storageV5),
      ($[1] = ee),
      ($[2] = ke));
  else ((ee = $[1]), (ke = $[2]));
  P(ee, ke);
  let Be;
  if ($[3] !== keyDisplay)
    ((Be = r(Text, { dimColor: !0, children: ["hold ", keyDisplay, " to speak"] })),
      ($[3] = keyDisplay),
      ($[4] = Be));
  else Be = $[4];
  return Be;
}
//@ chunk-18hwfzwa.js:839458-840126 layout
var BackgroundTaskCountPill = Rh(function (x) {
  let $ = w(11),
    { count: count, selected: selected, onClick: onClick } = x,
    [ke, Re] = y(!1);
  const Be = selected || ke;
  let We;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((We = r(Text, { "aria-hidden": !0, children: [DOWN_RIGHT_ARROW, " "] })), ($[0] = We));
  else We = $[0];
  let ze;
  if ($[1] !== count || $[2] !== Be)
    ((ze = r(Text, { color: "background", inverse: Be, children: [We, count, " background"] })),
      ($[1] = count),
      ($[2] = Be),
      ($[3] = ze));
  else ze = $[3];
  let Xe = ze;
  if (!onClick) {
    return Xe;
  }
  let rt;
  if ($[4] !== onClick) ((rt = () => onClick()), ($[4] = onClick), ($[5] = rt));
  else rt = $[5];
  let kt, At;
  if ($[6] === MEMO_CACHE_SENTINEL) ((kt = () => Re(!0)), (At = () => Re(!1)), ($[6] = kt), ($[7] = At));
  else ((kt = $[6]), (At = $[7]));
  let It;
  if ($[8] !== Xe || $[9] !== rt)
    ((It = e(Box, { onClick: rt, onMouseEnter: kt, onMouseLeave: At, children: Xe })),
      ($[8] = Xe),
      ($[9] = rt),
      ($[10] = It));
  else It = $[10];
  return It;
});
//@ chunk-18hwfzwa.js:840126-840417 fingerprint = getSpinnerHintParts (0.72)
function getSpinnerHintParts(h, x, D, L, ee) {
  let ke = ee === "tasks" ? "hide tasks" : "show tasks",
    Re = L;
  return [
    ...(h
      ? [
          e(
            Text,
            {
              dimColor: !0,
              children: e(KeyboardShortcutHint, {
                chord: x,
                action: "interrupt",
                format: { keyCase: "lower" },
              }),
            },
            "esc",
          ),
        ]
      : []),
    ...(Re
      ? [
          e(
            Text,
            {
              dimColor: !0,
              children: e(KeyboardShortcutHint, { chord: D, action: ke, format: { keyCase: "lower" } }),
            },
            "toggle-tasks",
          ),
        ]
      : []),
  ];
}
//@ chunk-18hwfzwa.js:840417-840503 fingerprint = isPrStatusEnabled (1)
function isPrStatusEnabled(h) {
  if (isBgSession() && h === "unknown") return !1;
  return getGlobalConfig().prStatusFooterEnabled ?? !0;
}
//@ chunk-18hwfzwa.js:840503-840627 placement
function TasksForSubagentsHint() {
  let $ = w(1),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, { dimColor: !0, children: "/tasks to see subagents" })), ($[0] = x));
  else x = $[0];
  return x;
}
//@ chunk-18hwfzwa.js:840627-840631 placement
j();
//@ chunk-5cp2fssw.js:14565-14629 fingerprint = ProactiveCountdown (0.737)
function ProactiveCountdown(e) {
  return formatDuration(Math.max(0, e), { mostSignificantOnly: !0 });
}

export {
  Rj,
  PermissionModeLabel,
  PermissionModeLabel_2,
  PromptInputFooterLeftSide,
  GA,
  Ahe,
  useSessionDraftCount,
  ProactiveCountdown,
};
