/**
 * components/dialogs/DialogHost.tsx
 *
 * 2.1.316 新增。REPL 统一对话框宿主。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (21)
 * attribution: placement 19, affinity 1, sole-consumer 1
 */
import {
  init_react_production,
  useLayoutEffect,
  useState,
  useRef,
  useContext,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { topBlockingDialog, NON_BLOCKING_DIALOG_KINDS } from "../../screens/replDialogState.js";
import {
  topAutoDialog,
  useDialogStore,
  useTopUserDialog,
  useDialogSelector,
  topUserDialog,
  useHasAutoDialog,
} from "../../state/dialogQueue.js";
import { uiSignals } from "../../state/uiSignals.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { DIALOG_REGISTRY, useHasBlockingDialog } from "./registry.js";
import { DIALOG_KIND_META, dialogLayout, dialogNotification, dialogCueBehindDraft } from "./dialogKinds.js";
import { useRenderMode } from "../../ink/renderModeContext.js";
import { useAutoDialogKind, getActiveBottomSurface, sessionStore } from "../../screens/repl/storeHooks.js";
import {
  useRecentInputStamp,
  RECENT_INPUT_GUARD_MS_2,
  INPUT_SETTLE_MS,
  isWithinRecentInput,
} from "../../hooks/useRecentInputGuard.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { permissionTitleRef, useOnFirstReveal } from "../permissions/PermissionRequestTitle.js";
import { Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { endAnnouncementHold } from "../../utils/accessibility/screenReader.js";
import { useInputClock, nodeRowRange, nodeScreenBox } from "../../ink/components/Input.js";
import { APP_CONTEXT } from "../../../vendor/convert-to-spaces/dist/index.js";
import { isDecstbmRendererEnabled } from "../../ink/nativeCursor.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { dispatcher } from "../../ink/reconciler.js";
import { KeybindingActionEvent } from "../../keybindings/KeybindingProviderSetup.js";
import { KeyboardEvent } from "../../ink/events/keyboard-event.js";
import { ScrollColumn, SCROLL_COLUMN_MIN_ROWS } from "../design-system/ScrollColumn.js";
import { usePermissionPromptNotification } from "../permissions/PermissionRequest.js";
import { useScreenReaderBell } from "../../hooks/useScreenReaderBell.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { CHROME_ROWS } from "../../ink/outputReplay.js";
import { WORKFLOW_PROGRESS_LIMITS } from "../workflow/WorkflowProgress.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1484013-1484017 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1484013", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1486071-1486075 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1486071", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1486408-1486442 placement
function isNull(value) {
  return value === null;
}
//@ chunk-czq1j3j2.js:1486442-1486481 placement
function topBlockingOrAutoDialog(state) {
  return topBlockingDialog(state) ?? topAutoDialog(state);
}
//@ chunk-czq1j3j2.js:1486481-1486513 placement
function selectOpen2(state) {
  return state.open;
}
//@ chunk-czq1j3j2.js:1486513-1486599 placement
function notifyAutoDenyPresence(input, key) {
  if (!key.wheelUp && !key.wheelDown) uiSignals.autoDenyPresence.emit();
  return false;
}
//@ chunk-czq1j3j2.js:1486599-1488813 placement
/**
 * 对话框宿主：按 dialogStore 中打开的对话框与 DIALOG_REGISTRY 渲染，处理 inline/fullscreen 变体、草稿遮挡时延迟显示、首次显示时响铃通知。
 */
function DialogHost(props) {
  let $ = useMemoCache(39);
  let { transport, variant, components, meta, scrollRegion } = props;
  let variantValue = variant === undefined ? "inline" : variant;
  let components_2 = components === undefined ? DIALOG_REGISTRY : components;
  let componentMap = meta === undefined ? DIALOG_KIND_META : meta;
  useExternalDialogBridge(transport);
  let dialogStore = useDialogStore();
  let renderMode = useRenderMode();
  let topUserDialog = useTopUserDialog();
  let autoDialogKind = useAutoDialogKind();
  let { hidden, reason } = useHiddenDialogReason();
  let showUserDialog =
    topUserDialog !== null && dialogLayout(componentMap, topUserDialog, renderMode) === variantValue;
  let showAutoDialog =
    autoDialogKind !== null && dialogLayout(componentMap, autoDialogKind, renderMode) === variantValue;
  let hiddenNotificationCached;
  if ($[0] !== hidden || $[1] !== componentMap || $[2] !== renderMode || $[3] !== variantValue) {
    hiddenNotificationCached =
      hidden !== null && dialogLayout(componentMap, hidden, renderMode) === variantValue
        ? dialogNotification(componentMap, hidden)
        : undefined;
    $[0] = hidden;
    $[1] = componentMap;
    $[2] = renderMode;
    $[3] = variantValue;
    $[4] = hiddenNotificationCached;
  } else hiddenNotificationCached = $[4];
  let hiddenNotification = hiddenNotificationCached;
  let suppressedAutoDialogs = useSuppressedAutoDialogs(autoDialogKind, hidden);
  let activeRequest = showAutoDialog ? autoDialogKind : showUserDialog ? topUserDialog : null;
  let inputReleaseTiming = useInputReleaseTiming(activeRequest?.id ?? "");
  let shownDrawnAt = useRecentInputStamp(activeRequest?.shownAt ?? 0);
  let { displacedAt } = inputReleaseTiming;
  let timeout = useTimeout(RECENT_INPUT_GUARD_MS_2, displacedAt);
  let isInputSettled = displacedAt === 0 || timeout;
  let canShowFrame = activeRequest !== null && activeRequest.userInvoked === true && !isInputSettled;
  let bellElement;
  if ($[5] !== hidden || $[6] !== hiddenNotification) {
    bellElement =
      hidden !== null && hiddenNotification !== undefined
        ? jsxProd_default(
            permissionTitleRef,
            {
              value: hidden.id,
              children: jsxProd_default(DialogBell, {
                notification: hiddenNotification,
              }),
            },
            hidden.id,
          )
        : null;
    $[5] = hidden;
    $[6] = hiddenNotification;
    $[7] = bellElement;
  } else bellElement = $[7];
  let bell = bellElement;
  let draftCueCached;
  if (
    $[8] !== hidden ||
    $[9] !== reason ||
    $[10] !== componentMap ||
    $[11] !== renderMode ||
    $[12] !== variantValue
  ) {
    draftCueCached =
      hidden !== null && reason === "draft" && dialogLayout(componentMap, hidden, renderMode) === variantValue
        ? jsxProd_default(Text, {
            dimColor: true,
            children:
              dialogCueBehindDraft(componentMap, hidden) ??
              componentMap[hidden.kind]?.draftHiddenCue ??
              (NON_BLOCKING_DIALOG_KINDS.has(hidden.kind)
                ? SUGGESTION_WAITING_NOTICE
                : QUESTION_WAITING_NOTICE),
          })
        : null;
    $[8] = hidden;
    $[9] = reason;
    $[10] = componentMap;
    $[11] = renderMode;
    $[12] = variantValue;
    $[13] = draftCueCached;
  } else draftCueCached = $[13];
  let bellElement_2 = draftCueCached;
  let matchesVariant;
  if ($[14] !== componentMap || $[15] !== renderMode || $[16] !== variantValue) {
    matchesVariant = (request) => dialogLayout(componentMap, request, renderMode) === variantValue;
    $[14] = componentMap;
    $[15] = renderMode;
    $[16] = variantValue;
    $[17] = matchesVariant;
  } else matchesVariant = $[17];
  const filtered = suppressedAutoDialogs.filter(matchesVariant);
  let renderBuriedCue;
  if ($[18] !== dialogStore || $[19] !== componentMap) {
    renderBuriedCue = (request) => {
      let notification = dialogNotification(componentMap, request);
      return notification === undefined || dialogStore.hasRevealed(request.id, BURIED_IDLE_CUE)
        ? null
        : jsxProd_default(
            BuriedPermissionCue,
            {
              requestId: request.id,
              notification,
            },
            request.id,
          );
    };
    $[18] = dialogStore;
    $[19] = componentMap;
    $[20] = renderBuriedCue;
  } else renderBuriedCue = $[20];
  let mapped = filtered.map(renderBuriedCue);
  let showFrame = activeRequest !== null && !canShowFrame;
  let dialogLeaveEffect;
  let dialogLeaveDeps;
  if ($[21] !== scrollRegion || $[22] !== showFrame) {
    dialogLeaveEffect = () => (showFrame ? () => scrollRegion?.onDialogLeft() : undefined);
    dialogLeaveDeps = [scrollRegion, showFrame];
    $[21] = scrollRegion;
    $[22] = showFrame;
    $[23] = dialogLeaveEffect;
    $[24] = dialogLeaveDeps;
  } else {
    dialogLeaveEffect = $[23];
    dialogLeaveDeps = $[24];
  }
  useLayoutEffect(dialogLeaveEffect, dialogLeaveDeps);
  if (bell === null && bellElement_2 === null && !showFrame && mapped.every(isNull)) {
    return null;
  }
  let frameElement;
  if (
    $[25] !== components_2 ||
    $[26] !== inputReleaseTiming ||
    $[27] !== componentMap ||
    $[28] !== scrollRegion ||
    $[29] !== showFrame ||
    $[30] !== shownDrawnAt ||
    $[31] !== variantValue ||
    $[32] !== activeRequest
  ) {
    frameElement =
      showFrame &&
      jsxProd_default(
        DialogFrame,
        {
          variant: variantValue,
          request: activeRequest,
          components: components_2,
          notification: dialogNotification(componentMap, activeRequest),
          hostShown: inputReleaseTiming,
          shownDrawnAt,
          scrollRegion,
        },
        activeRequest.id,
      );
    $[25] = components_2;
    $[26] = inputReleaseTiming;
    $[27] = componentMap;
    $[28] = scrollRegion;
    $[29] = showFrame;
    $[30] = shownDrawnAt;
    $[31] = variantValue;
    $[32] = activeRequest;
    $[33] = frameElement;
  } else frameElement = $[33];
  let hostElement;
  if ($[34] !== mapped || $[35] !== bellElement_2 || $[36] !== bell || $[37] !== frameElement) {
    hostElement = jsxProd_default_2(Fragment, {
      children: [bell, mapped, bellElement_2, frameElement],
    });
    $[34] = mapped;
    $[35] = bellElement_2;
    $[36] = bell;
    $[37] = frameElement;
    $[38] = hostElement;
  } else hostElement = $[38];
  return hostElement;
}
//@ chunk-czq1j3j2.js:1488813-1489102 placement
function useHiddenDialogReason() {
  let $ = useMemoCache(5);
  let hidden = useDialogSelector(topBlockingOrAutoDialog);
  let activeBottomSurface = getActiveBottomSurface();
  switch (activeBottomSurface) {
    case "panel":
    case "progress":
    case "draft": {
      let hiddenState;
      if ($[0] !== hidden || $[1] !== activeBottomSurface) {
        hiddenState = {
          hidden,
          reason: activeBottomSurface,
        };
        $[0] = hidden;
        $[1] = activeBottomSurface;
        $[2] = hiddenState;
      } else hiddenState = $[2];
      return hiddenState;
    }
    case "typing":
    case null: {
      let visibleState;
      if ($[3] !== activeBottomSurface) {
        visibleState = {
          hidden: null,
          reason: activeBottomSurface,
        };
        $[3] = activeBottomSurface;
        $[4] = visibleState;
      } else visibleState = $[4];
      return visibleState;
    }
  }
}
//@ chunk-czq1j3j2.js:1489102-1489556 placement
/**
 * 有用户对话框时返回空列表；否则列出被抑制的自动对话框（非用户触发、非当前顶层与指定排除项）。
 */
function useSuppressedAutoDialogs(autoDialogKind, hidden) {
  let $ = useMemoCache(12);
  let dialogSelector = useDialogSelector(selectOpen2);
  let topAutoCached;
  if ($[0] !== dialogSelector) {
    topAutoCached = topAutoDialog({
      open: dialogSelector,
    });
    $[0] = dialogSelector;
    $[1] = topAutoCached;
  } else topAutoCached = $[1];
  let topAuto = topAutoCached;
  if (
    topUserDialog({
      open: dialogSelector,
    }) !== null
  ) {
    let noneSuppressed;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      noneSuppressed = [];
      $[2] = noneSuppressed;
    } else noneSuppressed = $[2];
    return noneSuppressed;
  }
  let suppressed;
  if ($[3] !== hidden || $[4] !== dialogSelector || $[5] !== topAuto || $[6] !== autoDialogKind) {
    let keepSuppressed;
    if ($[8] !== hidden || $[9] !== topAuto || $[10] !== autoDialogKind) {
      keepSuppressed = (request) =>
        !request.userInvoked && request !== topAuto && request !== autoDialogKind && request !== hidden;
      $[8] = hidden;
      $[9] = topAuto;
      $[10] = autoDialogKind;
      $[11] = keepSuppressed;
    } else keepSuppressed = $[11];
    suppressed = dialogSelector.filter(keepSuppressed);
    $[3] = hidden;
    $[4] = dialogSelector;
    $[5] = topAuto;
    $[6] = autoDialogKind;
    $[7] = suppressed;
  } else suppressed = $[7];
  return suppressed;
}
//@ chunk-czq1j3j2.js:1489556-1489752 placement
var QUESTION_WAITING_NOTICE =
  "Claude has a question for you \u2014 it shows once you send or clear what you're typing.";
var SUGGESTION_WAITING_NOTICE =
  "Claude has a suggestion for you \u2014 it shows once you send or clear what you're typing.";
//@ chunk-czq1j3j2.js:1489752-1490395 placement
/**
 * 跟踪底部输入区占用状态：输入结束时记录释放时间与宽限期（有未发送草稿用更长宽限），输入内容被替换时记录时间，返回给对话框判断何时可以弹出。
 */
function useInputReleaseTiming(requestId) {
  let $ = useMemoCache(7);
  let activeSurface = getActiveBottomSurface();
  let draftStore = sessionStore();
  let [lastSurface, setLastSurface] = useState(activeSurface);
  let initialRelease;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialRelease = {
      at: 0,
      graceMs: RECENT_INPUT_GUARD_MS_2,
    };
    $[0] = initialRelease;
  } else initialRelease = $[0];
  let [release, setRelease] = useState(initialRelease);
  if (lastSurface !== activeSurface) {
    setLastSurface(activeSurface);
    if (activeSurface === null) {
      let hadDraft =
        (lastSurface === "typing" || lastSurface === "draft") && draftStore.getState().value.trim() !== "";
      setRelease({
        at: Date.now(),
        graceMs: hadDraft ? INPUT_SETTLE_MS : RECENT_INPUT_GUARD_MS_2,
      });
      endAnnouncementHold();
    }
  }
  let [lastValue, setLastValue] = useState(requestId);
  let [displacedAt, setDisplacedAt] = useState(0);
  if (lastValue !== requestId) {
    setLastValue(requestId);
    if (lastValue !== "" && requestId !== "") setDisplacedAt(Date.now());
  }
  let releaseDrawnAt = useRecentInputStamp(release.at);
  let displaceDrawnAt = useRecentInputStamp(displacedAt);
  let result;
  if (
    $[1] !== displaceDrawnAt ||
    $[2] !== displacedAt ||
    $[3] !== releaseDrawnAt ||
    $[4] !== release.at ||
    $[5] !== release.graceMs
  ) {
    result = {
      releasedAt: release.at,
      releaseGraceMs: release.graceMs,
      displacedAt,
      releaseDrawnAt,
      displaceDrawnAt,
    };
    $[1] = displaceDrawnAt;
    $[2] = displacedAt;
    $[3] = releaseDrawnAt;
    $[4] = release.at;
    $[5] = release.graceMs;
    $[6] = result;
  } else result = $[6];
  return result;
}
//@ chunk-czq1j3j2.js:1490395-1490724 placement
/**
 * 按对话框外层无边框无内边距的纵向容器偏移，修正可见行范围。
 */
function offsetVisibleRows(range, node) {
  let offsetRows = 0;
  let current = node;
  while (
    current?.yogaNode &&
    current.style.flexDirection === "column" &&
    current.yogaNode.getComputedBorder(1) === 0
  ) {
    let found = current.childNodes.find((childNode) => childNode.yogaNode !== undefined);
    if (!found?.yogaNode) break;
    offsetRows += found.yogaNode.getComputedTop();
    current = found;
  }
  if (!range || offsetRows <= 0) return range;
  return range.last < offsetRows
    ? null
    : {
        first: Math.max(0, range.first - offsetRows),
        last: range.last - offsetRows,
        of: range.of - offsetRows,
      };
}
//@ chunk-czq1j3j2.js:1490724-1490811 placement
function isScrollAtEnd(range, viewportRows) {
  return (
    range !== null &&
    range.last === range.of - 1 &&
    range.last - range.first + 1 >= Math.min(range.of, viewportRows)
  );
}
//@ chunk-czq1j3j2.js:1490811-1493592 placement
function DialogFrame(props) {
  let $ = useMemoCache(34);
  let { variant, request, components, notification, hostShown, shownDrawnAt, scrollRegion } = props;
  let dialogStore = useDialogStore();
  let inputClock = useInputClock();
  let boxRef = useRef(null);
  let revealedAtRef = useRef(null);
  let followedRef = useRef(false);
  let rowRangeRef = useRef(undefined);
  let viewportRowsRef = useRef(0);
  let { subscribeFrames } = useContext(APP_CONTEXT);
  let followEffect;
  let followDeps;
  if ($[0] !== scrollRegion || $[1] !== subscribeFrames) {
    followEffect = () => {
      if (scrollRegion === undefined) {
        return;
      }
      let syncFollow = function updateFollow() {
        rowRangeRef.current = offsetVisibleRows(nodeRowRange(boxRef.current), boxRef.current);
        let screenBox = nodeScreenBox(boxRef.current);
        viewportRowsRef.current = screenBox?.viewportRows ?? 0;
        if (
          followedRef.current &&
          rowRangeRef.current !== undefined &&
          isScrollAtEnd(rowRangeRef.current, viewportRowsRef.current)
        ) {
          followedRef.current = false;
          revealedAtRef.current = Date.now();
        }
        scrollRegion?.followDialog(screenBox);
      };
      syncFollow();
      return subscribeFrames(syncFollow);
    };
    followDeps = [scrollRegion, subscribeFrames];
    $[0] = scrollRegion;
    $[1] = subscribeFrames;
    $[2] = followEffect;
    $[3] = followDeps;
  } else {
    followEffect = $[2];
    followDeps = $[3];
  }
  useLayoutEffect(followEffect, followDeps);
  let DialogComponent = components[request.kind];
  let reserve = dialogReservedRows({
    variant,
    fullscreen: useRenderMode() === "fullscreen",
    decstbm: isDecstbmRendererEnabled(),
    promptShown: !useHasBlockingDialog(),
    rows: useTerminalSize().rows,
  });
  usePreDispatchKeyHandler(notifyAutoDenyPresence);
  let wouldTakeAnswerCached;
  if (
    $[4] !== dialogStore ||
    $[5] !== hostShown ||
    $[6] !== inputClock ||
    $[7] !== request.id ||
    $[8] !== request.payload ||
    $[9] !== scrollRegion ||
    $[10] !== shownDrawnAt
  ) {
    wouldTakeAnswerCached = function wouldTakeAnswer() {
      let found = dialogStore.getState().open.find((entry) => entry.id === request.id);
      if (!found) {
        return false;
      }
      if (found.payload !== request.payload) {
        return false;
      }
      if (isWithinRecentInput(inputClock, shownDrawnAt(found.shownAt ?? 0))) {
        return false;
      }
      if (found.userInvoked) {
        return true;
      }
      let currentEvent = dispatcher.currentEvent;
      let sourceEvent =
        currentEvent instanceof KeybindingActionEvent ? currentEvent.sourceEvent : currentEvent;
      let isEscapeKey = sourceEvent instanceof KeyboardEvent && sourceEvent.name === "escape";
      let knownRange = rowRangeRef.current;
      let isFirstShow = knownRange === undefined && (nodeScreenBox(boxRef.current)?.rows ?? 0) > 0;
      if (
        scrollRegion !== undefined &&
        sourceEvent instanceof KeyboardEvent &&
        !isEscapeKey &&
        (isFirstShow || (knownRange !== undefined && !isScrollAtEnd(knownRange, viewportRowsRef.current)))
      ) {
        if (scrollRegion.showDialog(nodeScreenBox(boxRef.current), knownRange === null || isFirstShow)) {
          revealedAtRef.current = Date.now();
          followedRef.current = true;
        } else if (
          revealedAtRef.current !== null &&
          isWithinRecentInput(inputClock, revealedAtRef.current, INPUT_SETTLE_MS)
        )
          revealedAtRef.current = Date.now();
        return false;
      }
      let isRecentlyRevealed =
        revealedAtRef.current !== null &&
        isWithinRecentInput(
          inputClock,
          revealedAtRef.current,
          isEscapeKey ? RECENT_INPUT_GUARD_MS_2 : INPUT_SETTLE_MS,
        );
      if (isRecentlyRevealed && sourceEvent instanceof KeyboardEvent && !isEscapeKey)
        revealedAtRef.current = Date.now();
      return !(
        isWithinRecentInput(inputClock, hostShown.displaceDrawnAt(hostShown.displacedAt)) ||
        isWithinRecentInput(
          inputClock,
          hostShown.releaseDrawnAt(hostShown.releasedAt),
          isEscapeKey ? RECENT_INPUT_GUARD_MS_2 : hostShown.releaseGraceMs,
        ) ||
        isRecentlyRevealed
      );
    };
    $[4] = dialogStore;
    $[5] = hostShown;
    $[6] = inputClock;
    $[7] = request.id;
    $[8] = request.payload;
    $[9] = scrollRegion;
    $[10] = shownDrawnAt;
    $[11] = wouldTakeAnswerCached;
  } else wouldTakeAnswerCached = $[11];
  let wouldTakeAnswer = wouldTakeAnswerCached;
  if (!DialogComponent) {
    dialogStore.dismiss(request.id);
    return null;
  }
  let firstRevealHook;
  if ($[12] !== request.onFirstReveal) {
    firstRevealHook =
      request.onFirstReveal !== undefined &&
      jsxProd_default(OnFirstRevealHook, {
        onFirstReveal: request.onFirstReveal,
      });
    $[12] = request.onFirstReveal;
    $[13] = firstRevealHook;
  } else firstRevealHook = $[13];
  let bellNotificationElement;
  if ($[14] !== notification) {
    bellNotificationElement =
      notification !== undefined &&
      jsxProd_default(DialogBell, {
        notification,
      });
    $[14] = notification;
    $[15] = bellNotificationElement;
  } else bellNotificationElement = $[15];
  let answer;
  if ($[16] !== dialogStore || $[17] !== request.id || $[18] !== wouldTakeAnswer) {
    answer = (value) => {
      if (!wouldTakeAnswer()) {
        return false;
      }
      dialogStore.answer(request.id, value);
      return true;
    };
    $[16] = dialogStore;
    $[17] = request.id;
    $[18] = wouldTakeAnswer;
    $[19] = answer;
  } else answer = $[19];
  let dialogElement;
  if (
    $[20] !== DialogComponent ||
    $[21] !== request.payload ||
    $[22] !== answer ||
    $[23] !== wouldTakeAnswer
  ) {
    dialogElement = jsxProd_default(DialogComponent, {
      payload: request.payload,
      wouldTakeAnswer,
      answer,
    });
    $[20] = DialogComponent;
    $[21] = request.payload;
    $[22] = answer;
    $[23] = wouldTakeAnswer;
    $[24] = dialogElement;
  } else dialogElement = $[24];
  let scrollColumnElement;
  if (
    $[25] !== request.id ||
    $[26] !== reserve ||
    $[27] !== bellNotificationElement ||
    $[28] !== dialogElement
  ) {
    scrollColumnElement = jsxProd_default_2(
      ScrollColumn,
      {
        box: boxRef,
        reserve,
        children: [bellNotificationElement, dialogElement],
      },
      request.id,
    );
    $[25] = request.id;
    $[26] = reserve;
    $[27] = bellNotificationElement;
    $[28] = dialogElement;
    $[29] = scrollColumnElement;
  } else scrollColumnElement = $[29];
  let titledElement;
  if ($[30] !== request.id || $[31] !== firstRevealHook || $[32] !== scrollColumnElement) {
    titledElement = jsxProd_default_2(permissionTitleRef, {
      value: request.id,
      children: [firstRevealHook, scrollColumnElement],
    });
    $[30] = request.id;
    $[31] = firstRevealHook;
    $[32] = scrollColumnElement;
    $[33] = titledElement;
  } else titledElement = $[33];
  return titledElement;
}
//@ chunk-czq1j3j2.js:1493592-1493667 placement
function OnFirstRevealHook(props) {
  let { onFirstReveal } = props;
  useOnFirstReveal("on-first-reveal", onFirstReveal);
  return null;
}
//@ chunk-czq1j3j2.js:1493667-1493812 placement
function DialogBell(props) {
  let $ = useMemoCache(1);
  let { notification } = props;
  usePermissionPromptNotification(notification);
  let screenReaderBell = useScreenReaderBell();
  let addBellOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    addBellOptions = {
      perReveal: true,
    };
    $[0] = addBellOptions;
  } else addBellOptions = $[0];
  useOnFirstReveal("bell", screenReaderBell, addBellOptions);
  return null;
}
//@ chunk-czq1j3j2.js:1493812-1493838 affinity
var BURIED_IDLE_CUE = "buried-idle-cue";
//@ chunk-czq1j3j2.js:1493838-1494019 sole-consumer
function BuriedPermissionCue(props) {
  let $ = useMemoCache(3);
  let { requestId, notification } = props;
  let dialogStore = useDialogStore();
  let revealCue;
  if ($[0] !== dialogStore || $[1] !== requestId) {
    revealCue = () => dialogStore.firstReveal(requestId, BURIED_IDLE_CUE);
    $[0] = dialogStore;
    $[1] = requestId;
    $[2] = revealCue;
  } else revealCue = $[2];
  usePermissionPromptNotification(notification, revealCue);
  return null;
}
//@ chunk-czq1j3j2.js:1494078-1494319 placement
function useLogDialogSuppressed(enabled) {
  let $ = useMemoCache(5);
  let hasAutoDialog = useHasAutoDialog();
  let activeBottomSurface = getActiveBottomSurface();
  let logSuppressed;
  let logDeps;
  if ($[0] !== hasAutoDialog || $[1] !== enabled || $[2] !== activeBottomSurface) {
    logSuppressed = () => {
      if (!enabled || !hasAutoDialog || activeBottomSurface === null) {
        return;
      }
      logEvent("tengu_dialoghost_suppressed", {
        reason: fromEnum(activeBottomSurface),
      });
    };
    logDeps = [enabled, hasAutoDialog, activeBottomSurface];
    $[0] = hasAutoDialog;
    $[1] = enabled;
    $[2] = activeBottomSurface;
    $[3] = logSuppressed;
    $[4] = logDeps;
  } else {
    logSuppressed = $[3];
    logDeps = $[4];
  }
  useEffect(logSuppressed, logDeps);
}
//@ chunk-czq1j3j2.js:1494319-1494922 placement
/**
 * 把外部对话框来源（SDK/桥接）接到对话框存储：订阅打开/取消/更新，关闭时回复结果或取消；卸载时把未答复的全部取消。
 */
function useExternalDialogBridge(source) {
  let $ = useMemoCache(4);
  useLogDialogSuppressed(source !== undefined);
  let dialogStore = useDialogStore();
  let bridgeEffect;
  let bridgeDeps;
  if ($[0] !== dialogStore || $[1] !== source) {
    bridgeEffect = () => {
      if (!source) {
        return;
      }
      let bridgedIds = new Set();
      let unsubscribeOpen = source.subscribe((request) => {
        bridgedIds.add(request.id);
        dialogStore.open(request);
      });
      let unsubscribeCancel = source.onCancel((id) => {
        dialogStore.dismiss(id);
      });
      let unsubscribeUpdate = source.onUpdate((update) => {
        let { id, payload } = update;
        if (bridgedIds.has(id)) dialogStore.update(id, payload);
      });
      let unsubscribeClosed = dialogStore.onClosed((closed) => {
        if (!bridgedIds.delete(closed.id)) {
          return;
        }
        source.reply(
          closed.type === "answered"
            ? {
                id: closed.id,
                result: closed.result,
              }
            : {
                id: closed.id,
                cancelled: true,
              },
        );
      });
      return () => {
        unsubscribeOpen();
        unsubscribeCancel();
        unsubscribeUpdate();
        unsubscribeClosed();
        for (const id of bridgedIds) {
          dialogStore.dismiss(id);
          source.reply({
            id,
            cancelled: true,
          });
        }
        bridgedIds.clear();
      };
    };
    bridgeDeps = [source, dialogStore];
    $[0] = dialogStore;
    $[1] = source;
    $[2] = bridgeEffect;
    $[3] = bridgeDeps;
  } else {
    bridgeEffect = $[2];
    bridgeDeps = $[3];
  }
  useEffect(bridgeEffect, bridgeDeps);
}
//@ chunk-czq1j3j2.js:1494922-1495064 placement
function dialogReservedRows({ variant, fullscreen, decstbm, promptShown, rows }) {
  if (fullscreen) return variant === "inline" ? Math.floor(rows / 2) : 0;
  return (decstbm ? CHROME_ROWS : SCROLL_COLUMN_MIN_ROWS) + (promptShown ? WORKFLOW_PROGRESS_LIMITS : 0);
}
export { useExternalDialogBridge, DialogHost };
