/**
 * hooks/useGlobalKeybindings.tsx
 *
 * 全局快捷键处理：ctrl+o 切换 transcript、ctrl+t 任务面板、brief 视图等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useGlobalKeybindings.tsx
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 1, layout 5, fingerprint 1
 */
import { getSecondRootError } from "../ink/terminal.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { selectExpandedView } from "../components/tasks/BackgroundTaskStatus.js";
import { useNotifications } from "../context/notifications.js";
import { useDialogStore } from "../state/dialogQueue.js";
import { useSession } from "../context/session.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";
import { useEffect } from "../../vendor/react/cjs/react.production.js";
import { lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";

//@ chunk-18hwfzwa.js:133882-133967 placement = useTasksV2WithCollapseEffect (1)
function useTasksV2WithCollapseEffect(appState) {
  return {
    ...appState,
    expandedView: appState.expandedView === "tasks" ? "none" : "tasks",
  };
}
//@ chunk-18hwfzwa.js:133967-134006 layout
function selectIsBriefOnly(appState) {
  return appState.isBriefOnly;
}
//@ chunk-18hwfzwa.js:134006-134082 layout
function clearBriefOnly(appState) {
  if (!appState.isBriefOnly) {
    return appState;
  }
  return {
    ...appState,
    isBriefOnly: false,
  };
}
//@ chunk-18hwfzwa.js:134082-134158 layout
function clearBriefOnlyOnToggle(appState) {
  if (!appState.isBriefOnly) {
    return appState;
  }
  return {
    ...appState,
    isBriefOnly: false,
  };
}
//@ chunk-18hwfzwa.js:134158-134174 layout
function noop() {}
//@ chunk-18hwfzwa.js:134174-134229 layout
function forceRedraw() {
  getSecondRootError().get(process.stdout)?.forceRedraw();
}
//@ chunk-18hwfzwa.js:134229-136066 fingerprint = GlobalKeybindingHandlers (0.687)
/**
 * 全局快捷键处理：ctrl+o 切换 transcript（tengu_toggle_transcript）、ctrl+t 任务/todo 面板（tengu_toggle_todos）、brief 视图切换等；只在 prompt 屏挂载。
 */
function GlobalKeybindingHandlers(props) {
  let $ = useMemoCache(22);
  let { screen, onToggleTranscript, showAllInTranscript, messageCount } = props;
  let showAll = showAllInTranscript === undefined ? false : showAllInTranscript;
  let expandedView = useAppState(selectExpandedView);
  let setAppState = useSetAppState();
  useNotifications();
  let setAppState_2 = useDialogStore();
  useSession();
  let toggleTasks;
  if ($[0] !== expandedView || $[1] !== setAppState) {
    toggleTasks = () => {
      logEvent("tengu_toggle_todos", {
        is_expanded: expandedView === "tasks",
      });
      logFeatureOk("todo_toggle_panel");
      setAppState(useTasksV2WithCollapseEffect);
    };
    $[0] = expandedView;
    $[1] = setAppState;
    $[2] = toggleTasks;
  } else toggleTasks = $[2];
  let toggleTasks_ = toggleTasks;
  let isBriefOnly = useAppState(selectIsBriefOnly);
  let clearBriefOnlyEffect;
  let clearBriefOnlyDeps;
  if ($[3] !== setAppState) {
    clearBriefOnlyEffect = () => {
      let { isBriefEnabled } = require("../tools/BriefTool/BriefTool.js");
      let isBriefEnabledFn = isBriefEnabled;
      let clearIfDisabled = () => {
        if (isBriefEnabledFn()) {
          return;
        }
        setAppState(clearBriefOnly);
      };
      clearIfDisabled();
      return onGrowthBookRefresh(clearIfDisabled);
    };
    clearBriefOnlyDeps = [setAppState];
    $[3] = setAppState;
    $[4] = clearBriefOnlyEffect;
    $[5] = clearBriefOnlyDeps;
  } else {
    clearBriefOnlyEffect = $[4];
    clearBriefOnlyDeps = $[5];
  }
  useEffect(clearBriefOnlyEffect, clearBriefOnlyDeps);
  let handler;
  if (
    $[6] !== setAppState_2 ||
    $[7] !== isBriefOnly ||
    $[8] !== messageCount ||
    $[9] !== onToggleTranscript ||
    $[10] !== screen ||
    $[11] !== setAppState ||
    $[12] !== showAll
  ) {
    handler = () => {
      let { isBriefEnabled } = require("../tools/BriefTool/BriefTool.js");
      if (!isBriefEnabled() && isBriefOnly && screen !== "transcript") {
        setAppState(clearBriefOnlyOnToggle);
        return;
      }
      logEvent("tengu_toggle_transcript", {
        is_entering: screen !== "transcript",
        show_all: showAll,
        message_count: messageCount,
        open_dialog_count: setAppState_2.getState().open.length,
      });
      onToggleTranscript();
    };
    $[6] = setAppState_2;
    $[7] = isBriefOnly;
    $[8] = messageCount;
    $[9] = onToggleTranscript;
    $[10] = screen;
    $[11] = setAppState;
    $[12] = showAll;
    $[13] = handler;
  } else handler = $[13];
  let handler_ = handler;
  let handlerA;
  if ($[14] !== isBriefOnly || $[15] !== setAppState) {
    handlerA = () => {
      let { isBriefEnabled } = require("../tools/BriefTool/BriefTool.js");
      if (!isBriefEnabled() && !isBriefOnly) {
        return;
      }
      let next = !isBriefOnly;
      logEvent("tengu_brief_mode_toggled", {
        enabled: next,
        gated: false,
        source: lit_2("keybinding"),
      });
      setAppState((prev) => {
        if (prev.isBriefOnly === next) {
          return prev;
        }
        return {
          ...prev,
          isBriefOnly: next,
        };
      });
    };
    $[14] = isBriefOnly;
    $[15] = setAppState;
    $[16] = handlerA;
  } else handlerA = $[16];
  let handlerB = handlerA;
  let deps;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    deps = {
      context: "Global",
    };
    $[17] = deps;
  } else deps = $[17];
  useKeybinding("app:toggleTodos", toggleTasks_, deps);
  let handlerC;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    handlerC = {
      context: "Global",
    };
    $[18] = handlerC;
  } else handlerC = $[18];
  useKeybinding("app:toggleTranscript", handler_, handlerC);
  let handlerD;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    handlerD = {
      context: "Global",
    };
    $[19] = handlerD;
  } else handlerD = $[19];
  useKeybinding("app:toggleBrief", handlerB, handlerD);
  let handlerE = noop;
  let handlerF;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    handlerF = {
      context: "Global",
    };
    $[20] = handlerF;
  } else handlerF = $[20];
  useKeybinding("app:toggleTerminal", handlerE, handlerF);
  let handlerG = forceRedraw;
  let handlerH;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    handlerH = {
      context: "Global",
    };
    $[21] = handlerH;
  } else handlerH = $[21];
  useKeybinding("app:redraw", handlerG, handlerH);
  return null;
}
export { GlobalKeybindingHandlers };
