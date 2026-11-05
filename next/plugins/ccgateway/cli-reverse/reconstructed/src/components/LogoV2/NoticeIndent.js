/**
 * components/LogoV2/NoticeIndent.tsx
 *
 * 提示行的“连接符 + 缩进”布局包装（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (2)
 * attribution: placement 2
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useContext, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { slashCommandLinkContext } from "../SlashCommandLink.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { PROPORTION } from "../../constants/figures.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:45551-45966 placement
/**
 * 提示行缩进包装：全屏关闭时纯缩进，否则前置连接符并排成两列。
 */
function SlashIndentBox(props) {
  let $ = useMemoCache(5);
  let { children } = props;
  if (!useContext(slashCommandLinkContext)) {
    let plainBox;
    if ($[0] !== children) {
      plainBox = jsxProd_default(Box, {
        paddingLeft: 2,
        flexDirection: "column",
        children,
      });
      $[0] = children;
      $[1] = plainBox;
    } else plainBox = $[1];
    return plainBox;
  }
  let proportionPrefix;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    proportionPrefix = jsxProd_default_2(Text, {
      italic: true,
      dimColor: true,
      "aria-hidden": true,
      children: [PROPORTION, " "],
    });
    $[2] = proportionPrefix;
  } else proportionPrefix = $[2];
  let indentedRow;
  if ($[3] !== children) {
    indentedRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        proportionPrefix,
        jsxProd_default(Box, {
          flexDirection: "column",
          flexGrow: 1,
          children,
        }),
      ],
    });
    $[3] = children;
    $[4] = indentedRow;
  } else indentedRow = $[4];
  return indentedRow;
}
//@ chunk-hnxhr3bs.js:162657-162661 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:162657", () => {
  init_react_production();
});
export { SlashIndentBox };
