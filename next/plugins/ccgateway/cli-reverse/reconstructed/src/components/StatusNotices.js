/**
 * components/StatusNotices.tsx
 *
 * 沿用旧版路径：启动状态通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StatusNotices.tsx
 * pieces: chunk-czq1j3j2.js (45)
 * attribution: placement 41, sole-consumer 2, affinity 1, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useEffect,
  useSyncExternalStore,
  useContext,
  createContext,
  useReducer,
} from "../../vendor/react/cjs/react.production.js";
import { useInterval, useMeasured } from "../ink/components/Input.js";
import { useAppState, useAppState_2 } from "../state/AppState.js";
import { usePluginInstallationStatus } from "../hooks/notifs/usePluginInstallationStatus.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useLatchedBridgeNotice, SegmentedText } from "./PromptInput/Notifications.js";
import { HostScoped } from "../utils/hostScoped.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useHost } from "../context/session.js";
import { getPersistenceSuppressionCause, getTranscriptWriterHealth } from "../utils/sessionStorage.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { windowsSandboxStartStore } from "../utils/sandbox/sandbox-adapter.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useResetReached } from "./rateLimit/quotaAutoResume.js";
import { PRIORITIES, isHeldNotice, holdsToasts as holdsToasts_2 } from "../context/notifications.js";
import { usePrefilledPromptWarning } from "./PromptInput/usePrefilledPromptWarning.js";
import { WARNING_GLYPH } from "../constants/figures.js";
import { getRemoteCaps, hasRemoteCap } from "../remote/remoteMode.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { ContextSlotA } from "../context/contextSlots.js";
import { useVoiceAvailable, useVoiceLoginCompleted } from "../hooks/useVoiceIntegration.js";
import { useHasSelection } from "../ink/hooks/use-selection.js";
import { useStatusLineSuppressed } from "./StatusLine.js";
import { canShowCloseSessionConfirm, hasPaneContext } from "./pluginUi/PaneBody.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { chordToDisplayString } from "../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { PromptModeHints } from "./PromptInput/PromptInputModeHints.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { getGlobalConfig } from "../utils/config.js";
import { isMaxEffortReminderEnabled } from "../utils/permissions/permissionSetup.js";
import { MAX_EFFORT_DESCRIPTION } from "../utils/settings/permissionRuleCarveOut.js";
import { getSubscriptionType } from "../utils/auth.js";
import { onMicroCompactFlag, getMicroCompactFlag } from "../services/compact/microCompact.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:787238-787242 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:787238", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:790944-790948 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:790944", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:790948-790952 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:790948", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:790952-791021 placement
/**
 * 函数 useNowTicker（按间隔刷新的当前时间）；位于「沿用旧版路径：启动状态通知」模块。
 */
function useNowTicker(intervalMs) {
  let [now, setNow] = useState(Date.now);
  useInterval(() => setNow(Date.now()), intervalMs);
  return now;
}
//@ chunk-czq1j3j2.js:791021-791025 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:791021", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:803415-803419 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:803415", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:805001-805005 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:805001", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:805005-805009 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:805005", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:805650-805675 sole-consumer
function selectFalseAppState(state) {
  return false;
}
//@ chunk-czq1j3j2.js:805675-805712 sole-consumer
var LIVE_PREVIEW = "live-preview";
var LIVE_PREVIEW_WRAP_OPTIONS = {
  wrap: true,
};
//@ chunk-czq1j3j2.js:805712-805772 affinity (2.1.88 match: getDefaultEffortLevelForOption, 1)
function getDefaultEffortLevelForOption() {
  let defaultValue = useAppState(selectFalseAppState);
  usePluginInstallationStatus(
    LIVE_PREVIEW,
    "high",
    defaultValue ? true : null,
    PinnedBridgeNotice,
    LIVE_PREVIEW_WRAP_OPTIONS,
  );
}
//@ chunk-czq1j3j2.js:805772-805821 placement
function PinnedBridgeNotice() {
  return jsxProd_default(useLatchedBridgeNotice, {
    isPinnedNotice: true,
  });
}
//@ chunk-czq1j3j2.js:805821-805825 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:805821", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:805825-805906 placement
class OneShotGuard {
  emitted = false;
  claim() {
    if (this.emitted) return false;
    this.emitted = true;
    return true;
  }
}
//@ chunk-czq1j3j2.js:805906-805933 placement
var persistenceSuppressedGuard; // deferred: uses OneShotGuard of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:805906", () => {
  persistenceSuppressedGuard = new HostScoped(() => new OneShotGuard());
});
//@ chunk-czq1j3j2.js:805933-805974 placement
function claimPersistenceSuppression(host) {
  return persistenceSuppressedGuard.of(host).claim();
}
//@ chunk-czq1j3j2.js:805974-806007 placement
var PERSISTENCE_SUPPRESSED = "persistence-suppressed";
//@ chunk-czq1j3j2.js:806007-806291 placement
function logPersistenceSuppressed() {
  let $ = useMemoCache(4);
  let host = useHost();
  let [cause] = useState(getPersistenceSuppressionCause);
  let logEffect;
  let logDeps;
  if ($[0] !== cause || $[1] !== host) {
    logEffect = () => {
      if (cause !== null && claimPersistenceSuppression(host))
        logEvent("tengu_persistence_suppressed", {
          cause: fromEnum(cause),
        });
    };
    logDeps = [cause, host];
    $[0] = cause;
    $[1] = host;
    $[2] = logEffect;
    $[3] = logDeps;
  } else {
    logEffect = $[2];
    logDeps = $[3];
  }
  useEffect(logEffect, logDeps);
  usePluginInstallationStatus(
    PERSISTENCE_SUPPRESSED,
    "high",
    cause === "skip_prompt_history" || cause === "nested_marker" ? cause : null,
    PersistenceOffNotice,
  );
}
//@ chunk-czq1j3j2.js:806291-806805 placement
function PersistenceOffNotice(reason) {
  if (reason === "skip_prompt_history")
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
//@ chunk-czq1j3j2.js:806805-806809 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:806805", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:806809-806846 placement
var TRANSCRIPT_WRITER_DEGRADED = "transcript-writer-degraded";
//@ chunk-czq1j3j2.js:806846-806985 placement
function useTranscriptWriterDegradedNotice() {
  let $ = useMemoCache(1);
  let health;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    health = getTranscriptWriterHealth();
    $[0] = health;
  } else health = $[0];
  let { degradedStore } = health;
  let degraded = useSyncExternalStore(degradedStore.subscribe, degradedStore.getState);
  usePluginInstallationStatus(TRANSCRIPT_WRITER_DEGRADED, "high", degraded, TranscriptWriteFailingNotice);
}
//@ chunk-czq1j3j2.js:806985-807154 placement
var WRITE_ERROR_REASONS = {
  ENOSPC: "disk full",
  EROFS: "read-only filesystem",
  EDQUOT: "disk quota exceeded",
  ENAMETOOLONG: "path too long",
  EACCES: "permission denied",
  EPERM: "permission denied",
};
//@ chunk-czq1j3j2.js:807154-807383 placement
function TranscriptWriteFailingNotice(error) {
  let reason = WRITE_ERROR_REASONS[error.code];
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default_2(Text, {
        children: [
          "Transcript writes are failing (",
          reason ? `${reason} \u2014 ${error.code}` : error.code,
          ")",
        ],
      }),
      jsxProd_default(Text, {
        dimColor: true,
        children: " \xB7 recent messages may not be saved for resume",
      }),
    ],
  });
}
//@ chunk-czq1j3j2.js:807383-807387 layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:807383", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:807387-807481 placement
var WINDOWS_SANDBOX_STARTING = "windows-sandbox-starting";
var SANDBOX_STARTING_GRACE_MS = 15000;
var WINDOWS_SANDBOX_NOTICE_OPTIONS = {
  kind: "contextual",
  color: "inactive",
  wrap: true,
};
//@ chunk-czq1j3j2.js:807481-807599 placement (2.1.88 match: getDefaultEffortLevelForOption, 1)
function getDefaultEffortLevelForOption_2() {
  let $ = useMemoCache(1);
  let startStore;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    startStore = windowsSandboxStartStore();
    $[0] = startStore;
  } else startStore = $[0];
  let isStarting = useStoreSelector(startStore) !== null;
  usePluginInstallationStatus(
    WINDOWS_SANDBOX_STARTING,
    "high",
    isStarting ? true : null,
    WindowsSandboxStartingNotice,
    WINDOWS_SANDBOX_NOTICE_OPTIONS,
  );
}
//@ chunk-czq1j3j2.js:807599-807631 placement
function WindowsSandboxStartingNotice() {
  return jsxProd_default(WindowsSandboxStartingNotice_2, {});
}
//@ chunk-czq1j3j2.js:807631-807943 placement
function WindowsSandboxStartingNotice_2() {
  let $ = useMemoCache(3);
  let startStore;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    startStore = windowsSandboxStartStore();
    $[0] = startStore;
  } else startStore = $[0];
  let storeSelector = useStoreSelector(startStore);
  let [startedAt, setStartedAt] = useState(storeSelector);
  if (storeSelector !== null && storeSelector !== startedAt) setStartedAt(storeSelector);
  const slowHint =
    useResetReached(startedAt === null ? null : startedAt + SANDBOX_STARTING_GRACE_MS) &&
    " \xB7 setting file permissions can take a few minutes";
  let textElement;
  if ($[1] !== slowHint) {
    textElement = jsxProd_default_2(Text, {
      children: ["Starting the sandbox", slowHint],
    });
    $[1] = slowHint;
    $[2] = textElement;
  } else textElement = $[2];
  return textElement;
}
//@ chunk-czq1j3j2.js:807943-807991 placement
function selectNotificationsPinned(state) {
  return state.notifications.pinned;
}
//@ chunk-czq1j3j2.js:807991-808052 placement
function compareNoticePriority(a, b) {
  return PRIORITIES[a.priority] - PRIORITIES[b.priority];
}
//@ chunk-czq1j3j2.js:808052-808102 placement
function renderNoticeRow(notice) {
  return jsxProd_default(
    StatusNoticeRow,
    {
      notice,
    },
    notice.key,
  );
}
//@ chunk-czq1j3j2.js:808102-808660 placement
function StatusNoticeList() {
  let $ = useMemoCache(13);
  usePrefilledPromptWarning();
  useTranscriptWriterDegradedNotice();
  logPersistenceSuppressed();
  getDefaultEffortLevelForOption_2();
  getDefaultEffortLevelForOption();
  let appState = useAppState(selectNotificationsPinned);
  let queue = useContext(noticeQueueStore);
  if (appState.length === 0 && queue.status === null && queue.next === null) {
    return null;
  }
  let containerComponent;
  let flexDirection;
  let paddingX;
  let noticeElements;
  if ($[0] !== appState) {
    let sorted = appState.slice().sort(compareNoticePriority);
    containerComponent = Box;
    flexDirection = "column";
    paddingX = 2;
    noticeElements = sorted.map(renderNoticeRow);
    $[0] = appState;
    $[1] = containerComponent;
    $[2] = flexDirection;
    $[3] = paddingX;
    $[4] = noticeElements;
  } else {
    containerComponent = $[1];
    flexDirection = $[2];
    paddingX = $[3];
    noticeElements = $[4];
  }
  let statusNoticesElement;
  if ($[5] !== queue) {
    statusNoticesElement = jsxProd_default(StatusNotices, {
      ...queue,
    });
    $[5] = queue;
    $[6] = statusNoticesElement;
  } else statusNoticesElement = $[6];
  let containerComponentElement;
  if (
    $[7] !== containerComponent ||
    $[8] !== flexDirection ||
    $[9] !== paddingX ||
    $[10] !== noticeElements ||
    $[11] !== statusNoticesElement
  ) {
    containerComponentElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      paddingX,
      children: [noticeElements, statusNoticesElement],
    });
    $[7] = containerComponent;
    $[8] = flexDirection;
    $[9] = paddingX;
    $[10] = noticeElements;
    $[11] = statusNoticesElement;
    $[12] = containerComponentElement;
  } else containerComponentElement = $[12];
  return containerComponentElement;
}
//@ chunk-czq1j3j2.js:808660-808961 placement
function StatusNotices({ status, next }) {
  return [status, next]
    .filter((notice) => notice !== null)
    .map((notice, index) =>
      index === 0
        ? jsxProd_default_2(
            Text,
            {
              color: notice.color ?? "warning",
              wrap: "wrap",
              children: [
                WARNING_GLYPH,
                " ",
                jsxProd_default(SegmentedText, {
                  segments: notice.segments,
                }),
              ],
            },
            notice.key,
          )
        : jsxProd_default(
            Box,
            {
              paddingLeft: 2,
              children: jsxProd_default(Text, {
                color: notice.color ?? "warning",
                wrap: "wrap",
                children: jsxProd_default(SegmentedText, {
                  segments: notice.segments,
                }),
              }),
            },
            notice.key,
          ),
    );
}
//@ chunk-czq1j3j2.js:808961-808996 placement
var noticeQueueStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:808961", () => {
  noticeQueueStore = createContext({
    status: null,
    next: null,
  });
});
//@ chunk-czq1j3j2.js:808996-809750 placement
function StatusNoticeRow(props) {
  let $ = useMemoCache(14);
  let { notice } = props;
  let wrap = notice.wrap ? "wrap" : "truncate";
  if ("jsx" in notice) {
    const color = notice.color ?? "warning";
    let jsxElement;
    if ($[0] !== notice.jsx || $[1] !== color || $[2] !== wrap) {
      jsxElement = jsxProd_default_2(Text, {
        color,
        wrap,
        children: [WARNING_GLYPH, " ", notice.jsx],
      });
      $[0] = notice.jsx;
      $[1] = color;
      $[2] = wrap;
      $[3] = jsxElement;
    } else jsxElement = $[3];
    return jsxElement;
  }
  if ("segments" in notice) {
    const color = notice.color ?? "warning";
    let segmentedTextElement;
    if ($[4] !== notice.segments) {
      segmentedTextElement = jsxProd_default(SegmentedText, {
        segments: notice.segments,
      });
      $[4] = notice.segments;
      $[5] = segmentedTextElement;
    } else segmentedTextElement = $[5];
    let segmentedElement;
    if ($[6] !== color || $[7] !== segmentedTextElement || $[8] !== wrap) {
      segmentedElement = jsxProd_default_2(Text, {
        color,
        wrap,
        children: [WARNING_GLYPH, " ", segmentedTextElement],
      });
      $[6] = color;
      $[7] = segmentedTextElement;
      $[8] = wrap;
      $[9] = segmentedElement;
    } else segmentedElement = $[9];
    return segmentedElement;
  }
  const color = notice.color ?? "warning";
  let textElement;
  if ($[10] !== notice.text || $[11] !== color || $[12] !== wrap) {
    textElement = jsxProd_default_2(Text, {
      color,
      wrap,
      children: [WARNING_GLYPH, " ", notice.text],
    });
    $[10] = notice.text;
    $[11] = color;
    $[12] = wrap;
    $[13] = textElement;
  } else textElement = $[13];
  return textElement;
}
//@ chunk-czq1j3j2.js:809758-809783 placement
function useStatusNoticeLines(deps) {
  return false;
}
//@ chunk-czq1j3j2.js:809783-809898 placement
/**
 * 订阅状态通知的变化并返回当前通知行（会话变化时刷新）。
 */
function useStatusNoticeLines_2(enabled) {
  let [, forceUpdate] = useReducer((counter) => counter + 1, 0);
  let sessionId = enabled ? getRemoteCaps()?.sessionId : undefined;
  let lines = renderWithForceUpdate(() => useStatusNoticeLines(enabled));
  useEffect(() => {
    return;
  }, [sessionId, lines]);
  return lines;
}
//@ chunk-czq1j3j2.js:809898-809991 placement
function shouldShowStatusNotices(enabled) {
  let contextSlot = useContext(ContextSlotA);
  let isOverflowing = useMeasured(() => {
    let height = contextSlot?.() ?? null;
    return height !== null && height < 0;
  });
  return enabled && !isOverflowing;
}
//@ chunk-czq1j3j2.js:809991-811008 placement
function PromptHintRow({
  enabled,
  exitMessage,
  isPasting,
  showExpandPasteHint,
  mode,
  permissionParked,
  footerNavActive,
}) {
  let timed = useAppState((state) =>
    enabled && isHeldNotice(state.notifications.current, holdsToasts_2(state))
      ? (state.notifications.current?.row1Hint ?? null)
      : null,
  );
  let voiceAvailable = useVoiceAvailable();
  let voiceState = useAppState_2((state) => (enabled ? state.voiceState : "idle"));
  let isTapMode = useAppState((state) => enabled && state.settings.voice?.mode === "tap");
  let hasSelection = useHasSelection(enabled);
  let shellRunsOnCloudMachine = useStatusNoticeLines_2(enabled && mode === "bash");
  let statusLineSuppressed = useStatusLineSuppressed();
  let showCloseSessionConfirm = canShowCloseSessionConfirm(statusLineSuppressed);
  let keybindingContext = useKeybindingContext();
  let pendingChord = keybindingContext?.pendingChord;
  let displayText = keybindingContext?.getDisplayText("app:closeSession", "SessionTabs");
  let pendingChordText = pendingChord
    ? chordToDisplayString(pendingChord, getShortcutDisplayPlatform())
    : undefined;
  if (!enabled) return null;
  return PromptModeHints({
    exitConfirm: exitMessage.show
      ? {
          keyName: exitMessage.key ?? "",
          leaves: statusLineSuppressed
            ? "quit"
            : isBgSession() || hasRemoteCap("catchupReplay")
              ? "detach"
              : "exit",
        }
      : null,
    closeSessionConfirm:
      showCloseSessionConfirm &&
      keybindingContext !== null &&
      !hasPaneContext(keybindingContext.activeContexts) &&
      pendingChordText !== undefined &&
      displayText === `${pendingChordText} ${pendingChordText}`
        ? {
            keyName: pendingChordText,
          }
        : null,
    isPasting,
    voice: !voiceAvailable
      ? null
      : voiceState === "recording"
        ? isTapMode
          ? "listeningTapToSend"
          : "listening"
        : voiceState === "processing"
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
//@ chunk-czq1j3j2.js:811008-811043 placement
var MAX_EFFORT_NOTICE_KEY = "max-effort";
var MAX_EFFORT_NOTICE_OPTIONS = {
  wrap: true,
};
//@ chunk-czq1j3j2.js:811043-811115 placement
function useMaxEffortNotice(level) {
  let noticeLevel = level === "max" && isMaxEffortReminderEnabled() ? level : null;
  usePluginInstallationStatus(
    MAX_EFFORT_NOTICE_KEY,
    "medium",
    noticeLevel,
    MaxEffortNotice,
    MAX_EFFORT_NOTICE_OPTIONS,
  );
}
//@ chunk-czq1j3j2.js:811115-811250 placement
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
//@ chunk-czq1j3j2.js:811254-811286 placement
function getSubscriptionTypeWithRefresh() {
  useVoiceLoginCompleted();
  return getSubscriptionType();
}
//@ chunk-czq1j3j2.js:811290-811323 placement
function useMicroCompactFlag() {
  return useSyncExternalStore(onMicroCompactFlag, getMicroCompactFlag);
}
export {
  useStatusNoticeLines_2,
  useNowTicker,
  shouldShowStatusNotices,
  PromptHintRow,
  useMaxEffortNotice,
  StatusNoticeList,
  noticeQueueStore,
  useMicroCompactFlag,
  getSubscriptionTypeWithRefresh,
};
