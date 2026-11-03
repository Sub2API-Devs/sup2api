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
import { Ar } from "../../runtime/bun-runtime.js";
import { init_react_production, Q, Oo, P } from "../../vendor/react/cjs/react.production.js";
import { chordToString, parseChord } from "../keybindings/parser.js";
import { isKbCohesionFixesOn } from "../utils/kbCohesionFixes.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { env } from "../utils/env.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "./pluginUi/render/actionKeys.js";

//@ chunk-s06523pk.js:983-992 placement
var ToolProgressHintNamespace = {};
//@ chunk-s06523pk.js:992-1063 placement
Ar(ToolProgressHintNamespace, {
  PILL_INDENT_COLUMNS: () => PILL_INDENT_COLUMNS,
  ToolProgressHint: () => ToolProgressHint,
  default: () => ToolProgressHintNamespace,
});
//@ chunk-s06523pk.js:1063-1067 placement
init_react_production();
//@ chunk-s06523pk.js:1067-1138 placement
var PROGRESS_HINT_KEY = "ctrl+b";
var PROGRESS_HINT_CHORD = "ctrl+x ctrl+b";
var _ = new Set([PROGRESS_HINT_KEY, PROGRESS_HINT_CHORD].map((a) => chordToString(parseChord(a))));
//@ chunk-s06523pk.js:1138-1324 placement = LEGACY_AGENT_TOOL_NAME (0.566)
/**
 * 检测键位绑定中 Task 上下文的 task:background 是否被改动/冲突（与 Agent 工具名无关，切分误归）。
 */
function hasTaskBackgroundKeybindingConflict(bindings) {
  for (let o of bindings) {
    if (o.context !== "Task") continue;
    let m = chordToString(o.chord);
    if (o.action === "task:background") {
      if (!_.has(m)) return true;
    } else if (o.action === null && _.has(m)) return true;
  }
  return false;
}
//@ chunk-s06523pk.js:1324-1757 placement
/**
 * 注册 task:background 快捷键处理器，并显示把当前任务转入后台的按键提示；与其他绑定冲突或不在活动状态时不显示。
 */
function BackgroundTaskHint({ handler, isActive }) {
  let m = isKbCohesionFixesOn();
  let shortcutDisplay = useShortcutDisplay("task:background", "Task", PROGRESS_HINT_KEY);
  let keybindingContext = useKeybindingContext();
  let bindings = keybindingContext?.bindings;
  let t = Q(() => (bindings ? hasTaskBackgroundKeybindingConflict(bindings) : false), [bindings]);
  let u = Oo(handler);
  let p = !(m && !t);
  P(() => {
    if (!keybindingContext || !isActive) return;
    return keybindingContext.registerHandler({
      action: "task:background",
      context: "Task",
      handler: () => u(),
      singleKey: p,
    });
  }, [keybindingContext, isActive, p]);
  let f = t ? shortcutDisplay : PROGRESS_HINT_CHORD;
  let gateOnShortcut =
    shortcutDisplay === ""
      ? ""
      : env.terminal === "tmux"
        ? f
            .split(" ")
            .map((k) => (k === PROGRESS_HINT_KEY ? `${PROGRESS_HINT_KEY} ${PROGRESS_HINT_KEY}` : k))
            .join(" ")
        : f;
  return {
    cohesionFixes: m,
    gateOnShortcut,
    resolvedShortcut: shortcutDisplay,
  };
}
//@ chunk-s06523pk.js:1757-1765 placement
var PILL_INDENT_COLUMNS = 5;
//@ chunk-s06523pk.js:1765-1880 placement
function ToolProgressHintRow(t) {
  return t.props.hint === ""
    ? null
    : jsxProd_default(Box, {
        paddingLeft: PILL_INDENT_COLUMNS,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: t.props.hint,
        }),
      });
}
//@ chunk-s06523pk.js:1880-2147 placement
var ToolProgressHint = (props) => {
  let l = w(4);
  let { toolUseId, hint } = props;
  let d;
  let c;
  if (l[0] !== hint || l[1] !== toolUseId) {
    d = () => ({
      requestId: toolUseId,
      props: {
        tool_use_id: toolUseId,
        kind: "background_hint",
        hint,
      },
    });
    c = [toolUseId, hint];
    l[0] = hint;
    l[1] = toolUseId;
    l[2] = d;
    l[3] = c;
  } else {
    d = l[2];
    c = l[3];
  }
  return actionKeysNamespace.useRenderHook(
    actionKeysNamespace.useRenderInput("ToolProgress", d, c),
    ToolProgressHintRow,
  );
};
export { BackgroundTaskHint, ToolProgressHintNamespace };
