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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-8jawqfvg.js:332-632 fingerprint = AgentNavigationFooter (0.695)
function AgentNavigationFooter(props) {
  let $ = w(3);
  let { children, exitActive, onInterrupt, italic } = props;
  let R = exitActive === undefined ? true : exitActive;
  let italic_2 = italic === undefined ? false : italic;
  let { pending, keyName } = useGlobalExitKeybindings(undefined, onInterrupt, R);
  const children_2 = pending ? `Press ${keyName} again to exit` : children;
  let t3;
  if ($[0] !== italic_2 || $[1] !== children_2) {
    t3 = jsxProd_default(Text, {
      dimColor: true,
      italic: italic_2,
      children: children_2,
    });
    $[0] = italic_2;
    $[1] = children_2;
    $[2] = t3;
  } else t3 = $[2];
  return t3;
}
export { AgentNavigationFooter };
