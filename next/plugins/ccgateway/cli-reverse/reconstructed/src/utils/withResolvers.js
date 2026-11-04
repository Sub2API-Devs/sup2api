/**
 * utils/withResolvers.ts
 *
 * Promise.withResolvers 兼容实现
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/withResolvers.ts
 * pieces: chunk-d4eg9at2.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { use } from "../../vendor/react/cjs/react.production.js";
import { RenderOnceAndExit } from "./staticRender.js";
import { Text } from "../ink/components/Text.js";
import { formatMessageLines } from "../cli/handlers/plugins.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-d4eg9at2.js:30961-31326 fingerprint (2.1.88 match: withResolvers, 0.517)
function ResultMessages(props) {
  let $ = useMemoCache(11);
  let { promise } = props;
  let { messages, summary } = use(promise);
  let TextComponent;
  let RenderOnceAndExitComponent;
  let children;
  if ($[0] !== messages || $[1] !== summary) {
    let lines = [...messages, summary];
    RenderOnceAndExitComponent = RenderOnceAndExit;
    TextComponent = Text;
    children = formatMessageLines(lines);
    $[0] = messages;
    $[1] = summary;
    $[2] = TextComponent;
    $[3] = RenderOnceAndExitComponent;
    $[4] = children;
  } else {
    TextComponent = $[2];
    RenderOnceAndExitComponent = $[3];
    children = $[4];
  }
  let children_2;
  if ($[5] !== TextComponent || $[6] !== children) {
    children_2 = jsxProd_default(TextComponent, {
      children,
    });
    $[5] = TextComponent;
    $[6] = children;
    $[7] = children_2;
  } else children_2 = $[7];
  let element;
  if ($[8] !== RenderOnceAndExitComponent || $[9] !== children_2) {
    element = jsxProd_default(RenderOnceAndExitComponent, {
      children: children_2,
    });
    $[8] = RenderOnceAndExitComponent;
    $[9] = children_2;
    $[10] = element;
  } else element = $[10];
  return element;
}
export { ResultMessages };
