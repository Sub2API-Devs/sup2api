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
import {
  init_react_production,
  useState,
  useEffect,
  useSyncExternalStore,
  useContext,
  createContext,
  useReducer,
} from "../../vendor/react/cjs/react.production.js";
import { HostScoped } from "../utils/hostScoped.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
import { WARNING_GLYPH } from "../constants/figures.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:773347-773396 placement
function PinnedBridgeNotice() {
  return jsxProd_default(useLatchedBridgeNotice, {
    isPinnedNotice: true,
  });
}
//@ chunk-18hwfzwa.js:773396-773400 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:773396", () => {
  init_react_production();
});
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
var persistenceSuppressedGuard; // deferred: uses OneShotGuard of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:773481", () => {
  persistenceSuppressedGuard = new HostScoped(() => new OneShotGuard());
});
//@ chunk-18hwfzwa.js:773508-773549 placement
function claimPersistenceSuppression(host) {
  return persistenceSuppressedGuard.of(host).claim();
}
//@ chunk-18hwfzwa.js:773549-773582 placement
var PERSISTENCE_SUPPRESSED = "persistence-suppressed";
//@ chunk-18hwfzwa.js:773582-773866 placement
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
//@ chunk-18hwfzwa.js:773866-774378 placement
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
//@ chunk-18hwfzwa.js:774378-774382 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:774378", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:774382-774419 placement
var TRANSCRIPT_WRITER_DEGRADED = "transcript-writer-degraded";
//@ chunk-18hwfzwa.js:774419-774558 placement
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
//@ chunk-18hwfzwa.js:774955-774959 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:774955", () => {
  init_react_production();
});
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
//@ chunk-18hwfzwa.js:775171-775203 placement
function WindowsSandboxStartingNotice() {
  return jsxProd_default(WindowsSandboxStartingNotice_2, {});
}
//@ chunk-18hwfzwa.js:775203-775515 placement
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
//@ chunk-18hwfzwa.js:775515-775563 placement
function selectNotificationsPinned(state) {
  return state.notifications.pinned;
}
//@ chunk-18hwfzwa.js:775563-775624 placement
function compareNoticePriority(a, b) {
  return PRIORITIES[a.priority] - PRIORITIES[b.priority];
}
//@ chunk-18hwfzwa.js:775624-775674 placement
function renderNoticeRow(notice) {
  return jsxProd_default(
    StatusNoticeRow,
    {
      notice,
    },
    notice.key,
  );
}
//@ chunk-18hwfzwa.js:775674-776232 placement
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
//@ chunk-18hwfzwa.js:776232-776533 placement
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
//@ chunk-18hwfzwa.js:776533-776568 placement
var noticeQueueStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:776533", () => {
  noticeQueueStore = createContext({
    status: null,
    next: null,
  });
});
//@ chunk-18hwfzwa.js:776568-777322 placement
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
//@ chunk-18hwfzwa.js:777322-777326 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:777322", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:777326-777330 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:777326", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:777330-777355 placement
function useStatusNoticeLines(deps) {
  return false;
}
//@ chunk-18hwfzwa.js:777355-777470 placement
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
//@ chunk-18hwfzwa.js:777470-777563 placement
function shouldShowStatusNotices(enabled) {
  let contextSlot = useContext(ContextSlotA);
  let isOverflowing = useMeasured(() => {
    let height = contextSlot?.() ?? null;
    return height !== null && height < 0;
  });
  return enabled && !isOverflowing;
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
//@ chunk-18hwfzwa.js:778316-778351 placement
var MAX_EFFORT_NOTICE_KEY = "max-effort";
var MAX_EFFORT_NOTICE_OPTIONS = {
  wrap: true,
};
//@ chunk-18hwfzwa.js:778351-778423 placement
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
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:778557", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:778561-778565 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:778561", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:778565-778635 placement
/**
 * 函数 useNowTicker（按间隔刷新的当前时间）；位于「沿用旧版路径：启动状态通知」模块。
 */
function useNowTicker(intervalMs) {
  let [now, setNow] = useState(Date.now);
  useInterval(() => setNow(Date.now()), intervalMs);
  return now;
}
//@ chunk-18hwfzwa.js:778635-778667 placement
function getSubscriptionTypeWithRefresh() {
  useVoiceLoginCompleted();
  return getSubscriptionType();
}
//@ chunk-18hwfzwa.js:778667-778671 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:778667", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:778671-778704 placement
function useMicroCompactFlag() {
  return useSyncExternalStore(onMicroCompactFlag, getMicroCompactFlag);
}
//@ chunk-18hwfzwa.js:778704-778708 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:778704", () => {
  init_react_production();
});
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
