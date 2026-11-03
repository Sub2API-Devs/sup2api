/**
 * components/design-system/BulletRow.tsx
 *
 * 2.1.316 新增：带圆点前缀的一行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2y83cp75.js (1)
 * attribution: placement 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-2y83cp75.js:371-713 placement
/**
 * 带圆点前缀的一行。
 */
function BulletRow(props) {
  let i = w(4);
  let { children, color } = props;
  let l;
  if (i[0] === MEMO_CACHE_SENTINEL) {
    l = jsxProd_default(Box, {
      "aria-hidden": true,
      width: 2,
      flexShrink: 0,
      children: jsxProd_default(Text, {
        children: figures_default.bullet,
      }),
    });
    i[0] = l;
  } else l = i[0];
  let c;
  if (i[1] !== children || i[2] !== color) {
    c = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        l,
        jsxProd_default(Box, {
          flexGrow: 1,
          flexShrink: 1,
          children: jsxProd_default(Text, {
            color,
            children,
          }),
        }),
      ],
    });
    i[1] = children;
    i[2] = color;
    i[3] = c;
  } else c = i[3];
  return c;
}
export { BulletRow };
