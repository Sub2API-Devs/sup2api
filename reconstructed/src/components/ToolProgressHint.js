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
import { j, Q, Oo, P } from "../../vendor/react/cjs/react.production.js";
import { chordToString, parseChord } from "../keybindings/parser.js";
import { CC } from "../utils/kbCohesionFixes.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { env } from "../utils/env.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
j();
//@ chunk-s06523pk.js:1067-1138 placement
var g = "ctrl+b",
  B = "ctrl+x ctrl+b",
  _ = new Set([g, B].map((a) => chordToString(parseChord(a))));
/**
 * 检测键位绑定中 Task 上下文的 task:background 是否被改动/冲突（与 Agent 工具名无关，切分误归）。
 */
//@ chunk-s06523pk.js:1138-1324 placement = LEGACY_AGENT_TOOL_NAME (0.566)
function hasTaskBackgroundKeybindingConflict(a) {
  for (let o of a) {
    if (o.context !== "Task") continue;
    let m = chordToString(o.chord);
    if (o.action === "task:background") {
      if (!_.has(m)) return !0;
    } else if (o.action === null && _.has(m)) return !0;
  }
  return !1;
}
/**
 * 注册 task:background 快捷键处理器，并显示把当前任务转入后台的按键提示；与其他绑定冲突或不在活动状态时不显示。
 */
//@ chunk-s06523pk.js:1324-1757 placement
function BackgroundTaskHint({ handler: handler, isActive: isActive }) {
  let m = CC(),
    l = useShortcutDisplay("task:background", "Task", g),
    d = useKeybindingContext(),
    c = d?.bindings,
    t = Q(() => (c ? hasTaskBackgroundKeybindingConflict(c) : !1), [c]),
    u = Oo(handler),
    p = !(m && !t);
  P(() => {
    if (!d || !isActive) return;
    return d.registerHandler({
      action: "task:background",
      context: "Task",
      handler: () => u(),
      singleKey: p,
    });
  }, [d, isActive, p]);
  let f = t ? l : B,
    x =
      l === ""
        ? ""
        : env.terminal === "tmux"
          ? f
              .split(" ")
              .map((k) => (k === g ? `${g} ${g}` : k))
              .join(" ")
          : f;
  return { cohesionFixes: m, gateOnShortcut: x, resolvedShortcut: l };
}
//@ chunk-s06523pk.js:1757-1765 placement
var PILL_INDENT_COLUMNS = 5;
//@ chunk-s06523pk.js:1765-1880 placement
function ToolProgressHintRow(t) {
  return t.props.hint === ""
    ? null
    : e(Box, {
        paddingLeft: PILL_INDENT_COLUMNS,
        children: e(Text, { dimColor: !0, children: t.props.hint }),
      });
}
//@ chunk-s06523pk.js:1880-2147 placement
var ToolProgressHint = (a) => {
  let l = w(4),
    { toolUseId: toolUseId, hint: hint } = a,
    d,
    c;
  if (l[0] !== hint || l[1] !== toolUseId)
    ((d = () => ({
      requestId: toolUseId,
      props: { tool_use_id: toolUseId, kind: "background_hint", hint: hint },
    })),
      (c = [toolUseId, hint]),
      (l[0] = hint),
      (l[1] = toolUseId),
      (l[2] = d),
      (l[3] = c));
  else ((d = l[2]), (c = l[3]));
  return actionKeysNamespace.useRenderHook(
    actionKeysNamespace.useRenderInput("ToolProgress", d, c),
    ToolProgressHintRow,
  );
};

export { BackgroundTaskHint, ToolProgressHintNamespace };
