/**
 * components/agents/AgentNavigationFooter.tsx
 *
 * 向导/菜单页脚导航提示（"Press X again to exit"），被 8 处使用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentNavigationFooter.tsx
 * pieces: chunk-8jawqfvg.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-8jawqfvg.js:332-632 fingerprint = AgentNavigationFooter (0.695)
function AgentNavigationFooter(t0) {
  let $ = w(3),
    { children: children, exitActive: exitActive, onInterrupt: onInterrupt, italic: italic } = t0,
    R = exitActive === void 0 ? !0 : exitActive,
    t = italic === void 0 ? !1 : italic,
    { pending: pending, keyName: keyName } = useGlobalExitKeybindings(void 0, onInterrupt, R);
  const i = pending ? `Press ${keyName} again to exit` : children;
  let t3;
  if ($[0] !== t || $[1] !== i)
    ((t3 = e(Text, { dimColor: !0, italic: t, children: i })), ($[0] = t), ($[1] = i), ($[2] = t3));
  else t3 = $[2];
  return t3;
}

export { AgentNavigationFooter };
