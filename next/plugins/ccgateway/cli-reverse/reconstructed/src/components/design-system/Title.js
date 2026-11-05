/**
 * components/design-system/Title.tsx
 *
 * 2.1.316 新增。设计系统标题组件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mmcsqv8e.js (1)
 * attribution: placement 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-mmcsqv8e.js:300-616 placement
/**
 * 标题组件：粗体标题加可选副标题。
 */
function Title(props) {
  let $ = useMemoCache(7);
  let { children, subtitle } = props;
  let titleText;
  if ($[0] !== children) {
    titleText = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[0] = children;
    $[1] = titleText;
  } else titleText = $[1];
  let subtitleText;
  if ($[2] !== subtitle) {
    subtitleText =
      subtitle &&
      jsxProd_default(Text, {
        dimColor: true,
        children: subtitle,
      });
    $[2] = subtitle;
    $[3] = subtitleText;
  } else subtitleText = $[3];
  let layout;
  if ($[4] !== titleText || $[5] !== subtitleText) {
    layout = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [titleText, subtitleText],
    });
    $[4] = titleText;
    $[5] = subtitleText;
    $[6] = layout;
  } else layout = $[6];
  return layout;
}
export { Title };
