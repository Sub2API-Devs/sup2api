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
import { di } from "../ink/terminal.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { selectExpandedView } from "../components/tasks/BackgroundTaskStatus.js";
import { useNotifications } from "../context/notifications.js";
import { useDialogStore } from "../state/dialogQueue.js";
import { useSession } from "../context/session.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";
import { P } from "../../vendor/react/cjs/react.production.js";
import { lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";

//@ chunk-18hwfzwa.js:133882-133967 placement = useTasksV2WithCollapseEffect (1)
function useTasksV2WithCollapseEffect(Wo) {
  return { ...Wo, expandedView: Wo.expandedView === "tasks" ? "none" : "tasks" };
}
//@ chunk-18hwfzwa.js:133967-134006 layout
function selectIsBriefOnly(mn) {
  return mn.isBriefOnly;
}
//@ chunk-18hwfzwa.js:134006-134082 layout
function WDt(Cn) {
  if (!Cn.isBriefOnly) {
    return Cn;
  }
  return { ...Cn, isBriefOnly: !1 };
}
//@ chunk-18hwfzwa.js:134082-134158 layout
function jDt(No) {
  if (!No.isBriefOnly) {
    return No;
  }
  return { ...No, isBriefOnly: !1 };
}
//@ chunk-18hwfzwa.js:134158-134174 layout
function noop() {}
//@ chunk-18hwfzwa.js:134174-134229 layout
function $Dt() {
  di().get(process.stdout)?.forceRedraw();
}
/**
 * 全局快捷键处理：ctrl+o 切换 transcript（tengu_toggle_transcript）、ctrl+t 任务/todo 面板（tengu_toggle_todos）、brief 视图切换等；只在 prompt 屏挂载。
 */
//@ chunk-18hwfzwa.js:134229-136066 fingerprint = GlobalKeybindingHandlers (0.687)
function GlobalKeybindingHandlers(h) {
  let $ = w(22),
    {
      screen: screen,
      onToggleTranscript: onToggleTranscript,
      showAllInTranscript: showAllInTranscript,
      messageCount: messageCount,
    } = h,
    ke = showAllInTranscript === void 0 ? !1 : showAllInTranscript,
    expandedView = useAppState(selectExpandedView),
    Be = useSetAppState();
  useNotifications();
  let setAppState = useDialogStore();
  useSession();
  let ze;
  if ($[0] !== expandedView || $[1] !== Be)
    ((ze = () => {
      (logEvent("tengu_toggle_todos", { is_expanded: expandedView === "tasks" }),
        logFeatureOk("todo_toggle_panel"),
        Be(useTasksV2WithCollapseEffect));
    }),
      ($[0] = expandedView),
      ($[1] = Be),
      ($[2] = ze));
  else ze = $[2];
  let Xe = ze,
    isBriefOnly = useAppState(selectIsBriefOnly),
    kt,
    At;
  if ($[3] !== Be)
    ((kt = () => {
      let { isBriefEnabled: isBriefEnabled } = require("./chunk-cv3kgbt2.js");
      let Ot = isBriefEnabled;
      let Et = () => {
        if (Ot()) {
          return;
        }
        Be(WDt);
      };
      return (Et(), onGrowthBookRefresh(Et));
    }),
      (At = [Be]),
      ($[3] = Be),
      ($[4] = kt),
      ($[5] = At));
  else ((kt = $[4]), (At = $[5]));
  P(kt, At);
  let It;
  if (
    $[6] !== setAppState ||
    $[7] !== isBriefOnly ||
    $[8] !== messageCount ||
    $[9] !== onToggleTranscript ||
    $[10] !== screen ||
    $[11] !== Be ||
    $[12] !== ke
  )
    ((It = () => {
      let { isBriefEnabled: isBriefEnabled } = require("./chunk-cv3kgbt2.js");
      if (!isBriefEnabled() && isBriefOnly && screen !== "transcript") {
        Be(jDt);
        return;
      }
      (logEvent("tengu_toggle_transcript", {
        is_entering: screen !== "transcript",
        show_all: ke,
        message_count: messageCount,
        open_dialog_count: setAppState.getState().open.length,
      }),
        onToggleTranscript());
    }),
      ($[6] = setAppState),
      ($[7] = isBriefOnly),
      ($[8] = messageCount),
      ($[9] = onToggleTranscript),
      ($[10] = screen),
      ($[11] = Be),
      ($[12] = ke),
      ($[13] = It));
  else It = $[13];
  let Lt = It,
    oo;
  if ($[14] !== isBriefOnly || $[15] !== Be)
    ((oo = () => {
      let { isBriefEnabled: isBriefEnabled } = require("./chunk-cv3kgbt2.js");
      if (!isBriefEnabled() && !isBriefOnly) {
        return;
      }
      let next = !isBriefOnly;
      (logEvent("tengu_brief_mode_toggled", { enabled: next, gated: !1, source: lit_2("keybinding") }),
        Be((prev_2) => {
          if (prev_2.isBriefOnly === next) {
            return prev_2;
          }
          return { ...prev_2, isBriefOnly: next };
        }));
    }),
      ($[14] = isBriefOnly),
      ($[15] = Be),
      ($[16] = oo));
  else oo = $[16];
  let po = oo,
    ao;
  if ($[17] === MEMO_CACHE_SENTINEL) ((ao = { context: "Global" }), ($[17] = ao));
  else ao = $[17];
  useKeybinding("app:toggleTodos", Xe, ao);
  let co;
  if ($[18] === MEMO_CACHE_SENTINEL) ((co = { context: "Global" }), ($[18] = co));
  else co = $[18];
  useKeybinding("app:toggleTranscript", Lt, co);
  let bo;
  if ($[19] === MEMO_CACHE_SENTINEL) ((bo = { context: "Global" }), ($[19] = bo));
  else bo = $[19];
  useKeybinding("app:toggleBrief", po, bo);
  let Ao = noop,
    Bo;
  if ($[20] === MEMO_CACHE_SENTINEL) ((Bo = { context: "Global" }), ($[20] = Bo));
  else Bo = $[20];
  useKeybinding("app:toggleTerminal", Ao, Bo);
  let Ro = $Dt,
    Ho;
  if ($[21] === MEMO_CACHE_SENTINEL) ((Ho = { context: "Global" }), ($[21] = Ho));
  else Ho = $[21];
  return (useKeybinding("app:redraw", Ro, Ho), null);
}

export { GlobalKeybindingHandlers };
