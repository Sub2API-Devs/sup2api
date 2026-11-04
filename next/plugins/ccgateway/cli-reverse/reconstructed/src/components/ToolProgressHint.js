/**
 * components/ToolProgressHint.tsx
 *
 * 2.1.316 新增。工具进度提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s06523pk.js (9)
 * attribution: placement 9
 */
import { __export } from "../../runtime/bun-runtime.js";
import {
  init_react_production,
  useMemo,
  useEffectEvent,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { chordToString, parseChord } from "../keybindings/parser.js";
import { isKbCohesionFixesOn } from "../utils/kbCohesionFixes.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { env } from "../utils/env.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "./pluginUi/render/actionKeys.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s06523pk.js:983-992 placement
var ToolProgressHintNamespace = {};
//@ chunk-s06523pk.js:992-1063 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s06523pk.js:992", () => {
  __export(ToolProgressHintNamespace, {
    PILL_INDENT_COLUMNS: () => PILL_INDENT_COLUMNS,
    ToolProgressHint: () => ToolProgressHint,
    default: () => ToolProgressHintNamespace,
  });
});
//@ chunk-s06523pk.js:1063-1067 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s06523pk.js:1063", () => {
  init_react_production();
});
//@ chunk-s06523pk.js:1067-1138 placement
var PROGRESS_HINT_KEY; // deferred: uses chordToString (../keybindings/parser.js) of its import cycle while loading; runs once the cycle is complete
var PROGRESS_HINT_CHORD;
var _;
deferInit("chunk-s06523pk.js:1067", () => {
  PROGRESS_HINT_KEY = "ctrl+b";
  PROGRESS_HINT_CHORD = "ctrl+x ctrl+b";
  _ = new Set([PROGRESS_HINT_KEY, PROGRESS_HINT_CHORD].map((chord) => chordToString(parseChord(chord))));
});
//@ chunk-s06523pk.js:1138-1324 placement (2.1.88 match: LEGACY_AGENT_TOOL_NAME, 0.566)
/**
 * 检测键位绑定中 Task 上下文的 task:background 是否被改动/冲突（与 Agent 工具名无关，切分误归）。
 */
function hasTaskBackgroundKeybindingConflict(bindings) {
  for (let binding of bindings) {
    if (binding.context !== "Task") continue;
    let normalizedChord = chordToString(binding.chord);
    if (binding.action === "task:background") {
      if (!_.has(normalizedChord)) return true;
    } else if (binding.action === null && _.has(normalizedChord)) return true;
  }
  return false;
}
//@ chunk-s06523pk.js:1324-1757 placement
/**
 * 注册 task:background 快捷键处理器，并显示把当前任务转入后台的按键提示；与其他绑定冲突或不在活动状态时不显示。
 */
function BackgroundTaskHint({ handler, isActive }) {
  let cohesionFixes = isKbCohesionFixesOn();
  let shortcutDisplay = useShortcutDisplay("task:background", "Task", PROGRESS_HINT_KEY);
  let keybindingContext = useKeybindingContext();
  let bindings = keybindingContext?.bindings;
  let hasConflict = useMemo(
    () => (bindings ? hasTaskBackgroundKeybindingConflict(bindings) : false),
    [bindings],
  );
  let stableHandler = useEffectEvent(handler);
  let singleKey = !(cohesionFixes && !hasConflict);
  useEffect(() => {
    if (!keybindingContext || !isActive) return;
    return keybindingContext.registerHandler({
      action: "task:background",
      context: "Task",
      handler: () => stableHandler(),
      singleKey,
    });
  }, [keybindingContext, isActive, singleKey]);
  let baseShortcut = hasConflict ? shortcutDisplay : PROGRESS_HINT_CHORD;
  let gateOnShortcut =
    shortcutDisplay === ""
      ? ""
      : env.terminal === "tmux"
        ? baseShortcut
            .split(" ")
            .map((part) => (part === PROGRESS_HINT_KEY ? `${PROGRESS_HINT_KEY} ${PROGRESS_HINT_KEY}` : part))
            .join(" ")
        : baseShortcut;
  return {
    cohesionFixes,
    gateOnShortcut,
    resolvedShortcut: shortcutDisplay,
  };
}
//@ chunk-s06523pk.js:1757-1765 placement
var PILL_INDENT_COLUMNS = 5;
//@ chunk-s06523pk.js:1765-1880 placement
function ToolProgressHintRow(input) {
  return input.props.hint === ""
    ? null
    : jsxProd_default(Box, {
        paddingLeft: PILL_INDENT_COLUMNS,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: input.props.hint,
        }),
      });
}
//@ chunk-s06523pk.js:1880-2147 placement
var ToolProgressHint = (props) => {
  let $ = useMemoCache(4);
  let { toolUseId, hint } = props;
  let renderInput;
  let renderInputDeps;
  if ($[0] !== hint || $[1] !== toolUseId) {
    renderInput = () => ({
      requestId: toolUseId,
      props: {
        tool_use_id: toolUseId,
        kind: "background_hint",
        hint,
      },
    });
    renderInputDeps = [toolUseId, hint];
    $[0] = hint;
    $[1] = toolUseId;
    $[2] = renderInput;
    $[3] = renderInputDeps;
  } else {
    renderInput = $[2];
    renderInputDeps = $[3];
  }
  return actionKeysNamespace.useRenderHook(
    actionKeysNamespace.useRenderInput("ToolProgress", renderInput, renderInputDeps),
    ToolProgressHintRow,
  );
};
export { BackgroundTaskHint, ToolProgressHintNamespace };
