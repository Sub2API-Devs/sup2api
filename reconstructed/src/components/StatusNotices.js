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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useLatchedBridgeNotice, SegmentedText } from "./PromptInput/Notifications.js";
import { init_react_production, y, P, yt, Se, qt, Uy } from "../../vendor/react/cjs/react.production.js";
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
import { PRIORITIES, isHeldNotice, holdsToasts as holdsToasts_2 } from "../context/notifications.js";
import { usePrefilledPromptWarning } from "./PromptInput/usePrefilledPromptWarning.js";
import { getDefaultEffortLevelForOption } from "./ModelPicker.js";
import { useAppState, useAppState_2 } from "../state/AppState.js";
import { WARNING_GLYPH } from "../utils/permissions/autoModeRulesPrompt.js";
import { getRemoteCaps, hasRemoteCap } from "../remote/remoteMode.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { ContextSlotA } from "../context/contextSlots.js";
import { useMeasured, useInterval } from "../ink/components/Input.js";
import { useVoiceAvailable, useVoiceLoginCompleted } from "../hooks/useVoiceIntegration.js";
import { useHasSelection } from "../ink/hooks/use-selection.js";
import { PromptModeHints } from "./PromptInput/PromptInputModeHints.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { getGlobalConfig } from "../utils/config.js";
import { isMaxEffortReminderEnabled } from "../utils/permissions/permissionSetup.js";
import { MAX_EFFORT_DESCRIPTION } from "../utils/settings/permissionRuleCarveOut.js";
import { getSubscriptionType } from "../utils/auth.js";
import { onMicroCompactFlag, getMicroCompactFlag } from "../services/compact/microCompact.js";

//@ chunk-18hwfzwa.js:773347-773396 placement
function PinnedBridgeNotice() {
  return jsxProd_default(useLatchedBridgeNotice, {
    isPinnedNotice: true,
  });
}
//@ chunk-18hwfzwa.js:773396-773400 placement
init_react_production();
//@ chunk-18hwfzwa.js:773400-773481 placement
class OneShotGuard {
  emitted = false;
  claim() {
    if (this.emitted) return false;
    this.emitted = true;
    return true;
  }
}
//@ chunk-18hwfzwa.js:773481-773508 placement
var persistenceSuppressedGuard = new HostScoped(() => new OneShotGuard());
//@ chunk-18hwfzwa.js:773508-773549 placement
function claimPersistenceSuppression(host) {
  return persistenceSuppressedGuard.of(host).claim();
}
//@ chunk-18hwfzwa.js:773549-773582 placement
var PERSISTENCE_SUPPRESSED = "persistence-suppressed";
//@ chunk-18hwfzwa.js:773582-773866 placement
function logPersistenceSuppressed() {
  let $ = w(4);
  let host = useHost();
  let [x] = y(getPersistenceSuppressionCause);
  let L;
  let ee;
  if ($[0] !== x || $[1] !== host) {
    L = () => {
      if (x !== null && claimPersistenceSuppression(host))
        logEvent("tengu_persistence_suppressed", {
          cause: fromEnum(x),
        });
    };
    ee = [x, host];
    $[0] = x;
    $[1] = host;
    $[2] = L;
    $[3] = ee;
  } else {
    L = $[2];
    ee = $[3];
  }
  P(L, ee);
  usePluginInstallationStatus(
    PERSISTENCE_SUPPRESSED,
    "high",
    x === "skip_prompt_history" || x === "nested_marker" ? x : null,
    PersistenceOffNotice,
  );
}
//@ chunk-18hwfzwa.js:773866-774378 placement
function PersistenceOffNotice(h) {
  if (h === "skip_prompt_history")
    return jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default(Text, {
          children: "Transcript saving is off \u2014 CLAUDE_CODE_SKIP_PROMPT_HISTORY is set",
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", "\xB7 --resume will not find this session; if unintended, unset it and restart"],
        }),
      ],
    });
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default(Text, {
        children: "Transcript saving is off \u2014 inherited CLAUDE_CODE_CHILD_SESSION marker",
      }),
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          " ",
          "\xB7 restart with CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1 to keep future transcripts",
        ],
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:774378-774382 placement
init_react_production();
//@ chunk-18hwfzwa.js:774382-774419 placement
var TRANSCRIPT_WRITER_DEGRADED = "transcript-writer-degraded";
//@ chunk-18hwfzwa.js:774419-774558 placement
function useTranscriptWriterDegradedNotice() {
  let $ = w(1);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = getTranscriptWriterHealth();
    $[0] = x;
  } else x = $[0];
  let { degradedStore } = x;
  let L = yt(degradedStore.subscribe, degradedStore.getState);
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
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default_2(Text, {
        children: ["Transcript writes are failing (", x ? `${x} \u2014 ${h.code}` : h.code, ")"],
      }),
      jsxProd_default(Text, {
        dimColor: true,
        children: " \xB7 recent messages may not be saved for resume",
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:774955-774959 placement
init_react_production();
//@ chunk-18hwfzwa.js:774959-775053 placement
var WINDOWS_SANDBOX_STARTING = "windows-sandbox-starting";
var SANDBOX_STARTING_GRACE_MS = 15000;
var WINDOWS_SANDBOX_NOTICE_OPTIONS = {
  kind: "contextual",
  color: "inactive",
  wrap: true,
};
//@ chunk-18hwfzwa.js:775053-775171 placement = getDefaultEffortLevelForOption (1)
function getDefaultEffortLevelForOption_2() {
  let $ = w(1);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = windowsSandboxStartStore();
    $[0] = x;
  } else x = $[0];
  let D = useStoreSelector(x) !== null;
  usePluginInstallationStatus(
    WINDOWS_SANDBOX_STARTING,
    "high",
    D ? true : null,
    WindowsSandboxStartingNotice,
    WINDOWS_SANDBOX_NOTICE_OPTIONS,
  );
}
//@ chunk-18hwfzwa.js:775171-775203 placement
function WindowsSandboxStartingNotice() {
  return jsxProd_default(WindowsSandboxStartingNotice_2, {});
}
//@ chunk-18hwfzwa.js:775203-775515 placement
function WindowsSandboxStartingNotice_2() {
  let $ = w(3);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = windowsSandboxStartStore();
    $[0] = x;
  } else x = $[0];
  let storeSelector = useStoreSelector(x);
  let [L, ee] = y(storeSelector);
  if (storeSelector !== null && storeSelector !== L) ee(storeSelector);
  const Re =
    useResetReached(L === null ? null : L + SANDBOX_STARTING_GRACE_MS) &&
    " \xB7 setting file permissions can take a few minutes";
  let Be;
  if ($[1] !== Re) {
    Be = jsxProd_default_2(Text, {
      children: ["Starting the sandbox", Re],
    });
    $[1] = Re;
    $[2] = Be;
  } else Be = $[2];
  return Be;
}
//@ chunk-18hwfzwa.js:775515-775563 placement
function selectNotificationsPinned(ze) {
  return ze.notifications.pinned;
}
//@ chunk-18hwfzwa.js:775563-775624 placement
function compareNoticePriority(Xe, rt) {
  return PRIORITIES[Xe.priority] - PRIORITIES[rt.priority];
}
//@ chunk-18hwfzwa.js:775624-775674 placement
function renderNoticeRow(kt) {
  return jsxProd_default(
    StatusNoticeRow,
    {
      notice: kt,
    },
    kt.key,
  );
}
//@ chunk-18hwfzwa.js:775674-776232 placement
function StatusNoticeList() {
  let $ = w(13);
  usePrefilledPromptWarning();
  useTranscriptWriterDegradedNotice();
  logPersistenceSuppressed();
  getDefaultEffortLevelForOption_2();
  getDefaultEffortLevelForOption();
  let appState = useAppState(selectNotificationsPinned);
  let x = Se(noticeQueueStore);
  if (appState.length === 0 && x.status === null && x.next === null) {
    return null;
  }
  let L;
  let flexDirection;
  let paddingX;
  let Re;
  if ($[0] !== appState) {
    let sorted = appState.slice().sort(compareNoticePriority);
    L = Box;
    flexDirection = "column";
    paddingX = 2;
    Re = sorted.map(renderNoticeRow);
    $[0] = appState;
    $[1] = L;
    $[2] = flexDirection;
    $[3] = paddingX;
    $[4] = Re;
  } else {
    L = $[1];
    flexDirection = $[2];
    paddingX = $[3];
    Re = $[4];
  }
  let He;
  if ($[5] !== x) {
    He = jsxProd_default(StatusNotices, {
      ...x,
    });
    $[5] = x;
    $[6] = He;
  } else He = $[6];
  let We;
  if ($[7] !== L || $[8] !== flexDirection || $[9] !== paddingX || $[10] !== Re || $[11] !== He) {
    We = jsxProd_default_2(L, {
      flexDirection,
      paddingX,
      children: [Re, He],
    });
    $[7] = L;
    $[8] = flexDirection;
    $[9] = paddingX;
    $[10] = Re;
    $[11] = He;
    $[12] = We;
  } else We = $[12];
  return We;
}
//@ chunk-18hwfzwa.js:776232-776533 placement
function StatusNotices({ status, next: x }) {
  return [status, x]
    .filter((notice) => notice !== null)
    .map((L, ee) =>
      ee === 0
        ? jsxProd_default_2(
            Text,
            {
              color: L.color ?? "warning",
              wrap: "wrap",
              children: [
                WARNING_GLYPH,
                " ",
                jsxProd_default(SegmentedText, {
                  segments: L.segments,
                }),
              ],
            },
            L.key,
          )
        : jsxProd_default(
            Box,
            {
              paddingLeft: 2,
              children: jsxProd_default(Text, {
                color: L.color ?? "warning",
                wrap: "wrap",
                children: jsxProd_default(SegmentedText, {
                  segments: L.segments,
                }),
              }),
            },
            L.key,
          ),
    );
}
//@ chunk-18hwfzwa.js:776533-776568 placement
var noticeQueueStore = qt({
  status: null,
  next: null,
});
//@ chunk-18hwfzwa.js:776568-777322 placement
function StatusNoticeRow(props) {
  let $ = w(14);
  let { notice } = props;
  let wrap = notice.wrap ? "wrap" : "truncate";
  if ("jsx" in notice) {
    const color = notice.color ?? "warning";
    let ke;
    if ($[0] !== notice.jsx || $[1] !== color || $[2] !== wrap) {
      ke = jsxProd_default_2(Text, {
        color,
        wrap,
        children: [WARNING_GLYPH, " ", notice.jsx],
      });
      $[0] = notice.jsx;
      $[1] = color;
      $[2] = wrap;
      $[3] = ke;
    } else ke = $[3];
    return ke;
  }
  if ("segments" in notice) {
    const color = notice.color ?? "warning";
    let ke;
    if ($[4] !== notice.segments) {
      ke = jsxProd_default(SegmentedText, {
        segments: notice.segments,
      });
      $[4] = notice.segments;
      $[5] = ke;
    } else ke = $[5];
    let Re;
    if ($[6] !== color || $[7] !== ke || $[8] !== wrap) {
      Re = jsxProd_default_2(Text, {
        color,
        wrap,
        children: [WARNING_GLYPH, " ", ke],
      });
      $[6] = color;
      $[7] = ke;
      $[8] = wrap;
      $[9] = Re;
    } else Re = $[9];
    return Re;
  }
  const color = notice.color ?? "warning";
  let ke;
  if ($[10] !== notice.text || $[11] !== color || $[12] !== wrap) {
    ke = jsxProd_default_2(Text, {
      color,
      wrap,
      children: [WARNING_GLYPH, " ", notice.text],
    });
    $[10] = notice.text;
    $[11] = color;
    $[12] = wrap;
    $[13] = ke;
  } else ke = $[13];
  return ke;
}
//@ chunk-18hwfzwa.js:777322-777326 placement
init_react_production();
//@ chunk-18hwfzwa.js:777326-777330 placement
init_react_production();
//@ chunk-18hwfzwa.js:777330-777355 placement
function useStatusNoticeLines(h) {
  return false;
}
//@ chunk-18hwfzwa.js:777355-777470 placement
/**
 * 订阅状态通知的变化并返回当前通知行（会话变化时刷新）。
 */
function useStatusNoticeLines_2(h) {
  let [, x] = Uy((ee) => ee + 1, 0);
  let sessionId = h ? getRemoteCaps()?.sessionId : undefined;
  let L = renderWithForceUpdate(() => useStatusNoticeLines(h));
  P(() => {
    return;
  }, [sessionId, L]);
  return L;
}
//@ chunk-18hwfzwa.js:777470-777563 placement
function shouldShowStatusNotices(h) {
  let x = Se(ContextSlotA);
  let D = useMeasured(() => {
    let L = x?.() ?? null;
    return L !== null && L < 0;
  });
  return h && !D;
}
//@ chunk-18hwfzwa.js:777563-778316 placement
function PromptHintRow({
  enabled,
  exitMessage,
  isPasting,
  showExpandPasteHint,
  mode,
  permissionParked,
  footerNavActive,
}) {
  let timed = useAppState((kt) =>
    enabled && isHeldNotice(kt.notifications.current, holdsToasts_2(kt))
      ? (kt.notifications.current?.row1Hint ?? null)
      : null,
  );
  let voiceAvailable = useVoiceAvailable();
  let We = useAppState_2((kt) => (enabled ? kt.voiceState : "idle"));
  let ze = useAppState((kt) => enabled && kt.settings.voice?.mode === "tap");
  let hasSelection = useHasSelection(enabled);
  let shellRunsOnCloudMachine = useStatusNoticeLines_2(enabled && mode === "bash");
  if (!enabled) return null;
  return PromptModeHints({
    exitConfirm: exitMessage.show
      ? {
          keyName: exitMessage.key ?? "",
          detaches: isBgSession() || hasRemoteCap("catchupReplay"),
        }
      : null,
    isPasting,
    voice: !voiceAvailable
      ? null
      : We === "recording"
        ? ze
          ? "listeningTapToSend"
          : "listening"
        : We === "processing"
          ? "processing"
          : null,
    footerNavActive,
    timed,
    showExpandPaste: showExpandPasteHint,
    selectionCopyShortcut: hasSelection && !(getGlobalConfig().copyOnSelect ?? true) ? "ctrl+c" : null,
    permissionParked,
    shellMode: mode === "bash",
    shellRunsOnCloudMachine,
  });
}
//@ chunk-18hwfzwa.js:778316-778351 placement
var MAX_EFFORT = "max-effort";
var MAX_EFFORT_NOTICE_OPTIONS = {
  wrap: true,
};
//@ chunk-18hwfzwa.js:778351-778423 placement
function useMaxEffortNotice(h) {
  let x = h === "max" && isMaxEffortReminderEnabled() ? h : null;
  usePluginInstallationStatus(MAX_EFFORT, "medium", x, MaxEffortNotice, MAX_EFFORT_NOTICE_OPTIONS);
}
//@ chunk-18hwfzwa.js:778423-778557 placement
function MaxEffortNotice() {
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default_2(Text, {
        children: ["Max effort \xB7 ", MAX_EFFORT_DESCRIPTION],
      }),
      jsxProd_default(Text, {
        dimColor: true,
        children: " \xB7 /effort to change",
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:778557-778561 placement
init_react_production();
//@ chunk-18hwfzwa.js:778561-778565 placement
init_react_production();
//@ chunk-18hwfzwa.js:778565-778635 placement
/**
 * 函数 useNowTicker（按间隔刷新的当前时间）；位于「沿用旧版路径：启动状态通知」模块。
 */
function useNowTicker(h) {
  let [now, setNow] = y(Date.now);
  useInterval(() => setNow(Date.now()), h);
  return now;
}
//@ chunk-18hwfzwa.js:778635-778667 placement
function getSubscriptionTypeWithRefresh() {
  useVoiceLoginCompleted();
  return getSubscriptionType();
}
//@ chunk-18hwfzwa.js:778667-778671 placement
init_react_production();
//@ chunk-18hwfzwa.js:778671-778704 placement
function useMicroCompactFlag() {
  return yt(onMicroCompactFlag, getMicroCompactFlag);
}
//@ chunk-18hwfzwa.js:778704-778708 placement
init_react_production();
export {
  shouldShowStatusNotices,
  PromptHintRow,
  useMaxEffortNotice,
  StatusNoticeList,
  noticeQueueStore,
  useMicroCompactFlag,
  getSubscriptionTypeWithRefresh,
  useNowTicker,
  PinnedBridgeNotice,
  useStatusNoticeLines_2,
};
