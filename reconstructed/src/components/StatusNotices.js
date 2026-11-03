/**
 * components/StatusNotices.tsx
 *
 * 沿用旧版路径：启动状态通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StatusNotices.tsx
 * pieces: chunk-18hwfzwa.js (41)
 * attribution: placement 41
 */
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useLatchedBridgeNotice, SegmentedText } from "./PromptInput/Notifications.js";
import { j, y, P, yt, Se, qt, Uy } from "../../vendor/react/cjs/react.production.js";
import { HostScoped } from "../utils/hostScoped.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useHost } from "../context/session.js";
import { getPersistenceSuppressionCause, getTranscriptWriterHealth } from "../utils/sessionStorage.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { usePluginInstallationStatus } from "../hooks/notifs/usePluginInstallationStatus.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { windowsSandboxStartStore } from "../utils/sandbox/sandbox-adapter.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useResetReached } from "./rateLimit/quotaAutoResume.js";
import { PRIORITIES, bye, Kj } from "../context/notifications.js";
import { usePrefilledPromptWarning } from "./PromptInput/usePrefilledPromptWarning.js";
import { getDefaultEffortLevelForOption } from "./ModelPicker.js";
import { useAppState, useAppState_2 } from "../state/AppState.js";
import { Gg } from "../utils/permissions/autoModeRulesPrompt.js";
import { Jn, _C } from "../remote/remoteMode.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { ContextSlotA } from "../context/contextSlots.js";
import { useMeasured, useInterval } from "../ink/components/Input.js";
import { useVoiceAvailable, vXe } from "../hooks/useVoiceIntegration.js";
import { useHasSelection } from "../ink/hooks/use-selection.js";
import { PromptModeHints } from "./PromptInput/PromptInputModeHints.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { getGlobalConfig } from "../utils/config.js";
import { isMaxEffortReminderEnabled } from "../utils/permissions/permissionSetup.js";
import { MAX_EFFORT_DESCRIPTION } from "../utils/settings/permissionRuleCarveOut.js";
import { getSubscriptionType } from "../utils/auth.js";
import { onMicroCompactFlag, getMicroCompactFlag } from "../services/compact/microCompact.js";

//@ chunk-18hwfzwa.js:773347-773396 placement
function D2e() {
  return e(useLatchedBridgeNotice, { isPinnedNotice: !0 });
}
//@ chunk-18hwfzwa.js:773396-773400 placement
j();
//@ chunk-18hwfzwa.js:773400-773481 placement
class O2e {
  emitted = !1;
  claim() {
    if (this.emitted) return !1;
    return ((this.emitted = !0), !0);
  }
}
//@ chunk-18hwfzwa.js:773481-773508 placement
var h8t = new HostScoped(() => new O2e());
//@ chunk-18hwfzwa.js:773508-773549 placement
function ege(h) {
  return h8t.of(h).claim();
}
//@ chunk-18hwfzwa.js:773549-773582 placement
var PERSISTENCE_SUPPRESSED = "persistence-suppressed";
//@ chunk-18hwfzwa.js:773582-773866 placement
function logPersistenceSuppressed() {
  let $ = w(4),
    h = useHost(),
    [x] = y(getPersistenceSuppressionCause),
    L,
    ee;
  if ($[0] !== x || $[1] !== h)
    ((L = () => {
      if (x !== null && ege(h)) logEvent("tengu_persistence_suppressed", { cause: fromEnum(x) });
    }),
      (ee = [x, h]),
      ($[0] = x),
      ($[1] = h),
      ($[2] = L),
      ($[3] = ee));
  else ((L = $[2]), (ee = $[3]));
  (P(L, ee),
    usePluginInstallationStatus(
      PERSISTENCE_SUPPRESSED,
      "high",
      x === "skip_prompt_history" || x === "nested_marker" ? x : null,
      PersistenceOffNotice,
    ));
}
//@ chunk-18hwfzwa.js:773866-774378 placement
function PersistenceOffNotice(h) {
  if (h === "skip_prompt_history")
    return r(Fragment, {
      children: [
        e(Text, { children: "Transcript saving is off \u2014 CLAUDE_CODE_SKIP_PROMPT_HISTORY is set" }),
        r(Text, {
          dimColor: !0,
          children: [" ", "\xB7 --resume will not find this session; if unintended, unset it and restart"],
        }),
      ],
    });
  return r(Fragment, {
    children: [
      e(Text, { children: "Transcript saving is off \u2014 inherited CLAUDE_CODE_CHILD_SESSION marker" }),
      r(Text, {
        dimColor: !0,
        children: [
          " ",
          "\xB7 restart with CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1 to keep future transcripts",
        ],
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:774378-774382 placement
j();
//@ chunk-18hwfzwa.js:774382-774419 placement
var TRANSCRIPT_WRITER_DEGRADED = "transcript-writer-degraded";
//@ chunk-18hwfzwa.js:774419-774558 placement
function useTranscriptWriterDegradedNotice() {
  let $ = w(1),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL) ((x = getTranscriptWriterHealth()), ($[0] = x));
  else x = $[0];
  let { degradedStore: degradedStore } = x,
    L = yt(degradedStore.subscribe, degradedStore.getState);
  usePluginInstallationStatus(TRANSCRIPT_WRITER_DEGRADED, "high", L, TranscriptWriteFailingNotice);
}
//@ chunk-18hwfzwa.js:774558-774727 placement
var WRITE_ERROR_REASONS = {
  ENOSPC: "disk full",
  EROFS: "read-only filesystem",
  EDQUOT: "disk quota exceeded",
  ENAMETOOLONG: "path too long",
  EACCES: "permission denied",
  EPERM: "permission denied",
};
//@ chunk-18hwfzwa.js:774727-774955 placement
function TranscriptWriteFailingNotice(h) {
  let x = WRITE_ERROR_REASONS[h.code];
  return r(Fragment, {
    children: [
      r(Text, { children: ["Transcript writes are failing (", x ? `${x} \u2014 ${h.code}` : h.code, ")"] }),
      e(Text, { dimColor: !0, children: " \xB7 recent messages may not be saved for resume" }),
    ],
  });
}
//@ chunk-18hwfzwa.js:774955-774959 placement
j();
//@ chunk-18hwfzwa.js:774959-775053 placement
var WINDOWS_SANDBOX_STARTING = "windows-sandbox-starting",
  $2e = 15000,
  V2e = { kind: "contextual", color: "inactive", wrap: !0 };
//@ chunk-18hwfzwa.js:775053-775171 placement = getDefaultEffortLevelForOption (1)
function getDefaultEffortLevelForOption_2() {
  let $ = w(1),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL) ((x = windowsSandboxStartStore()), ($[0] = x));
  else x = $[0];
  let D = useStoreSelector(x) !== null;
  usePluginInstallationStatus(WINDOWS_SANDBOX_STARTING, "high", D ? !0 : null, K2e, V2e);
}
//@ chunk-18hwfzwa.js:775171-775203 placement
function K2e() {
  return e(WindowsSandboxStartingNotice, {});
}
//@ chunk-18hwfzwa.js:775203-775515 placement
function WindowsSandboxStartingNotice() {
  let $ = w(3),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL) ((x = windowsSandboxStartStore()), ($[0] = x));
  else x = $[0];
  let D = useStoreSelector(x),
    [L, ee] = y(D);
  if (D !== null && D !== L) ee(D);
  const Re =
    useResetReached(L === null ? null : L + $2e) && " \xB7 setting file permissions can take a few minutes";
  let Be;
  if ($[1] !== Re) ((Be = r(Text, { children: ["Starting the sandbox", Re] })), ($[1] = Re), ($[2] = Be));
  else Be = $[2];
  return Be;
}
//@ chunk-18hwfzwa.js:775515-775563 placement
function selectNotificationsPinned(ze) {
  return ze.notifications.pinned;
}
//@ chunk-18hwfzwa.js:775563-775624 placement
function P8t(Xe, rt) {
  return PRIORITIES[Xe.priority] - PRIORITIES[rt.priority];
}
//@ chunk-18hwfzwa.js:775624-775674 placement
function A8t(kt) {
  return e(StatusNoticeRow, { notice: kt }, kt.key);
}
//@ chunk-18hwfzwa.js:775674-776232 placement
function StatusNoticeList() {
  let $ = w(13);
  (usePrefilledPromptWarning(),
    useTranscriptWriterDegradedNotice(),
    logPersistenceSuppressed(),
    getDefaultEffortLevelForOption_2(),
    getDefaultEffortLevelForOption());
  let h = useAppState(selectNotificationsPinned),
    x = Se($A);
  if (h.length === 0 && x.status === null && x.next === null) {
    return null;
  }
  let L, ee, ke, Re;
  if ($[0] !== h) {
    let sorted = h.slice().sort(P8t);
    L = Box;
    ee = "column";
    ke = 2;
    Re = sorted.map(A8t);
    (($[0] = h), ($[1] = L), ($[2] = ee), ($[3] = ke), ($[4] = Re));
  } else ((L = $[1]), (ee = $[2]), (ke = $[3]), (Re = $[4]));
  let He;
  if ($[5] !== x) ((He = e(StatusNotices, { ...x })), ($[5] = x), ($[6] = He));
  else He = $[6];
  let We;
  if ($[7] !== L || $[8] !== ee || $[9] !== ke || $[10] !== Re || $[11] !== He)
    ((We = r(L, { flexDirection: ee, paddingX: ke, children: [Re, He] })),
      ($[7] = L),
      ($[8] = ee),
      ($[9] = ke),
      ($[10] = Re),
      ($[11] = He),
      ($[12] = We));
  else We = $[12];
  return We;
}
//@ chunk-18hwfzwa.js:776232-776533 placement
function StatusNotices({ status: status, next: x }) {
  return [status, x]
    .filter((notice) => notice !== null)
    .map((L, ee) =>
      ee === 0
        ? r(
            Text,
            {
              color: L.color ?? "warning",
              wrap: "wrap",
              children: [Gg, " ", e(SegmentedText, { segments: L.segments })],
            },
            L.key,
          )
        : e(
            Box,
            {
              paddingLeft: 2,
              children: e(Text, {
                color: L.color ?? "warning",
                wrap: "wrap",
                children: e(SegmentedText, { segments: L.segments }),
              }),
            },
            L.key,
          ),
    );
}
//@ chunk-18hwfzwa.js:776533-776568 placement
var $A = qt({ status: null, next: null });
//@ chunk-18hwfzwa.js:776568-777322 placement
function StatusNoticeRow(h) {
  let $ = w(14),
    { notice: notice } = h,
    D = notice.wrap ? "wrap" : "truncate";
  if ("jsx" in notice) {
    const L = notice.color ?? "warning";
    let ke;
    if ($[0] !== notice.jsx || $[1] !== L || $[2] !== D)
      ((ke = r(Text, { color: L, wrap: D, children: [Gg, " ", notice.jsx] })),
        ($[0] = notice.jsx),
        ($[1] = L),
        ($[2] = D),
        ($[3] = ke));
    else ke = $[3];
    return ke;
  }
  if ("segments" in notice) {
    const L = notice.color ?? "warning";
    let ke;
    if ($[4] !== notice.segments)
      ((ke = e(SegmentedText, { segments: notice.segments })), ($[4] = notice.segments), ($[5] = ke));
    else ke = $[5];
    let Re;
    if ($[6] !== L || $[7] !== ke || $[8] !== D)
      ((Re = r(Text, { color: L, wrap: D, children: [Gg, " ", ke] })),
        ($[6] = L),
        ($[7] = ke),
        ($[8] = D),
        ($[9] = Re));
    else Re = $[9];
    return Re;
  }
  const L = notice.color ?? "warning";
  let ke;
  if ($[10] !== notice.text || $[11] !== L || $[12] !== D)
    ((ke = r(Text, { color: L, wrap: D, children: [Gg, " ", notice.text] })),
      ($[10] = notice.text),
      ($[11] = L),
      ($[12] = D),
      ($[13] = ke));
  else ke = $[13];
  return ke;
}
//@ chunk-18hwfzwa.js:777322-777326 placement
j();
//@ chunk-18hwfzwa.js:777326-777330 placement
j();
//@ chunk-18hwfzwa.js:777330-777355 placement
function I8t(h) {
  return !1;
}
/**
 * 订阅状态通知的变化并返回当前通知行（会话变化时刷新）。
 */
//@ chunk-18hwfzwa.js:777355-777470 placement
function useStatusNoticeLines(h) {
  let [, x] = Uy((ee) => ee + 1, 0),
    D = h ? Jn()?.sessionId : void 0,
    L = renderWithForceUpdate(() => I8t(h));
  return (
    P(() => {
      return;
    }, [D, L]),
    L
  );
}
//@ chunk-18hwfzwa.js:777470-777563 placement
function sge(h) {
  let x = Se(ContextSlotA),
    D = useMeasured(() => {
      let L = x?.() ?? null;
      return L !== null && L < 0;
    });
  return h && !D;
}
//@ chunk-18hwfzwa.js:777563-778316 placement
function PromptHintRow({
  enabled: enabled,
  exitMessage: exitMessage,
  isPasting: isPasting,
  showExpandPasteHint: showExpandPasteHint,
  mode: mode,
  permissionParked: permissionParked,
  footerNavActive: footerNavActive,
}) {
  let Be = useAppState((kt) =>
      enabled && bye(kt.notifications.current, Kj(kt)) ? (kt.notifications.current?.row1Hint ?? null) : null,
    ),
    He = useVoiceAvailable(),
    We = useAppState_2((kt) => (enabled ? kt.voiceState : "idle")),
    ze = useAppState((kt) => enabled && kt.settings.voice?.mode === "tap"),
    Xe = useHasSelection(enabled),
    rt = useStatusNoticeLines(enabled && mode === "bash");
  if (!enabled) return null;
  return PromptModeHints({
    exitConfirm: exitMessage.show
      ? { keyName: exitMessage.key ?? "", detaches: isBgSession() || _C("catchupReplay") }
      : null,
    isPasting: isPasting,
    voice: !He
      ? null
      : We === "recording"
        ? ze
          ? "listeningTapToSend"
          : "listening"
        : We === "processing"
          ? "processing"
          : null,
    footerNavActive: footerNavActive,
    timed: Be,
    showExpandPaste: showExpandPasteHint,
    selectionCopyShortcut: Xe && !(getGlobalConfig().copyOnSelect ?? !0) ? "ctrl+c" : null,
    permissionParked: permissionParked,
    shellMode: mode === "bash",
    shellRunsOnCloudMachine: rt,
  });
}
//@ chunk-18hwfzwa.js:778316-778351 placement
var MAX_EFFORT = "max-effort",
  e5e = { wrap: !0 };
//@ chunk-18hwfzwa.js:778351-778423 placement
function NJ(h) {
  let x = h === "max" && isMaxEffortReminderEnabled() ? h : null;
  usePluginInstallationStatus(MAX_EFFORT, "medium", x, MaxEffortNotice, e5e);
}
//@ chunk-18hwfzwa.js:778423-778557 placement
function MaxEffortNotice() {
  return r(Fragment, {
    children: [
      r(Text, { children: ["Max effort \xB7 ", MAX_EFFORT_DESCRIPTION] }),
      e(Text, { dimColor: !0, children: " \xB7 /effort to change" }),
    ],
  });
}
//@ chunk-18hwfzwa.js:778557-778561 placement
j();
//@ chunk-18hwfzwa.js:778561-778565 placement
j();
//@ chunk-18hwfzwa.js:778565-778635 placement
function zZt(h) {
  let [x, D] = y(Date.now);
  return (useInterval(() => D(Date.now()), h), x);
}
//@ chunk-18hwfzwa.js:778635-778667 placement
function hj() {
  return (vXe(), getSubscriptionType());
}
//@ chunk-18hwfzwa.js:778667-778671 placement
j();
//@ chunk-18hwfzwa.js:778671-778704 placement
function SN() {
  return yt(onMicroCompactFlag, getMicroCompactFlag);
}
//@ chunk-18hwfzwa.js:778704-778708 placement
j();

export { $A, SN, hj, zZt, D2e, useStatusNoticeLines, sge, PromptHintRow, NJ, StatusNoticeList };
